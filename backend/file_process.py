import pandas as pd
import sqlite3
import json
import requests
import re
from typing import Dict, Any, List, Tuple
import os

class FileProcessor:
    def __init__(self, db_path: str = "database.db"):
        self.db_path = db_path

    def execute_query(self, sql_query: str, file_path: str) -> Tuple[bool, Any]:
        """
        执行查询并返回格式化的表格数据
        """
        try:
            # 提取SQL查询
            sql_pattern = r'```sql\n(.*?)\n```'
            sql_match = re.search(sql_pattern, sql_query, re.DOTALL)
            
            if sql_match:
                cleaned_sql = sql_match.group(1).strip()
            else:
                cleaned_sql = sql_query.replace('```sql', '').replace('```', '').strip()
            
            # 读取CSV并标准化列名
            df = pd.read_csv(file_path)
            
            # 标准化列名：转小写，替换空格为下划线，移除特殊字符
            df.columns = df.columns.str.lower()\
                .str.replace(' ', '_')\
                .str.replace(r'[\(\)\$\%\:]', '', regex=True)\
                .str.replace(r'\.', '_', regex=True)\
                .str.replace(r'/', '_', regex=True)
                
            table_name = os.path.splitext(os.path.basename(file_path))[0]
            print("df_columns", df.columns)
            
            with sqlite3.connect(':memory:') as conn:
                # 将DataFrame保存为临时表
                df.to_sql(table_name, conn, if_exists='replace', index=False)
                
                # 执行查询
                result_df = pd.read_sql_query(cleaned_sql, conn)
                
                # 存储原始查询结果
                result_dict = {
                    "sql": cleaned_sql,
                    "result": result_df.to_dict('split'),
                    "columns": result_df.columns.tolist(),
                    "types": result_df.dtypes.astype(str).to_dict()
                }
                
                return True, {
                    "table_data": self._to_antd_format(result_df),
                    "raw_data": result_dict
                }
                    
        except Exception as e:
            return False, f"Query error: {str(e)}"

    def _to_antd_format(self, df: pd.DataFrame) -> Dict:
        """将DataFrame转换为antd Table格式"""
        return {
            "columns": [
                {"title": col, "dataIndex": col, "key": col} 
                for col in df.columns
            ],
            "dataSource": df.to_dict('records')
        }

    def get_table_info(self, file_path: str) -> str:
        """
        从CSV文件获取结构信息，返回适合大模型理解的格式
        """
        try:
            # 读取CSV文件
            df = pd.read_csv(file_path)
            
            # 使用与 execute_query 相同的列名标准化处理
            df.columns = df.columns.str.lower()\
                .str.replace(' ', '_')\
                .str.replace(r'[\(\)\$\%\:]', '', regex=True)\
                .str.replace(r'\.', '_', regex=True)\
                .str.replace(r'/', '_', regex=True)
                
            table_name = os.path.splitext(os.path.basename(file_path))[0]
            
            # 获取基本信息
            row_count = len(df)
            column_info = []
            
            # 分析每列
            for col in df.columns:
                col_type = df[col].dtype
                unique_count = df[col].nunique()
                sample_values = df[col].dropna().head(3).tolist()
                
                col_info = {
                    "name": col,  # 已经标准化过的列名，不需要再处理
                    "type": str(col_type),
                    "unique_values": unique_count,
                    # "sample_values": sample_values
                }
                column_info.append(col_info)
            
            # 构建描述性文本
            info = f"Table '{table_name}' contains {row_count} rows with the following columns:\n\n"
            
            for col in column_info:
                info += f"- {col['name']} ({col['type']})\n"
                info += f"  * {col['unique_values']} unique values\n"
                # info += f"  * Sample values: {', '.join(str(x) for x in col['sample_values'])}\n"
            
            info += "\nYou can reference these columns in your SQL queries using the lowercase names with underscores."
            print("info", info)
            
            return info
            
        except Exception as e:
            return f"Error analyzing table: {str(e)}"

    def handle_file_upload(self, file_path: str, session_id: int, db_conn) -> Tuple[bool, Dict[str, Any]]:
        """
        只存储文件路径
        """
        try:
            # 验证文件是否可读
            pd.read_csv(file_path, nrows=1)  # 测试文件是否可读
            
            # 正确处理文件名，包括中文
            file_name = os.path.basename(file_path)
            table_name = os.path.splitext(file_name)[0]
            
            # 验证文件名不为空
            if not table_name or table_name.lower() == "csv":
                # 如果文件名异常，使用时间戳作为备用名称
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                table_name = f"uploaded_file_{timestamp}"
            
            cursor = db_conn.cursor()
            cursor.execute("""
                REPLACE INTO session_files 
                (session_id, file_path, file_name) 
                VALUES (?, ?, ?)
            """, (session_id, file_path, table_name))
            db_conn.commit()

            return True, {
                'message': 'File validated and registered successfully',
                'file_name': table_name,
                'file_path': file_path
            }

        except Exception as e:
            return False, {"error": str(e)}
