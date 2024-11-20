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
        执行查询并返回格式化的表格和图表数据
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
            df.columns = df.columns.str.lower().str.replace(' ', '_')
            table_name = os.path.splitext(os.path.basename(file_path))[0]
            
            with sqlite3.connect(':memory:') as conn:
                # 将DataFrame保存为临时表
                df.to_sql(table_name, conn, if_exists='replace', index=False)
                
                # 执行查询
                result_df = pd.read_sql_query(cleaned_sql, conn)
                print("reading sql query...")
                
                # 1. 构建 antd 表格数据
                table_data = {
                    "columns": [
                        {"title": col, "dataIndex": col, "key": col} 
                        for col in result_df.columns
                    ],
                    "dataSource": result_df.to_dict('records')
                }
                
                # 2. 构建图表数据
                chart_data = {
                    'labels': result_df.columns.tolist(),
                    'datasets': result_df.to_dict('records'),
                    'types': result_df.dtypes.astype(str).to_dict()
                }
                print("finished building chart data...")
                
                return True, {
                    "table_data": table_data,
                    "chart_data": chart_data
                }
                    
        except Exception as e:
            return False, f"Query error: {str(e)}"

    def get_table_info(self, file_path: str) -> str:
        """
        从CSV文件获取结构信息，返回适合大模型理解的格式
        """
        try:
            # 读取CSV文件
            df = pd.read_csv(file_path)
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
                    "name": col.lower().replace(' ', '_'),
                    "type": str(col_type),
                    "unique_values": unique_count,
                    "sample_values": sample_values
                }
                column_info.append(col_info)
            
            # 构建描述性文本
            info = f"Table '{table_name}' contains {row_count} rows with the following columns:\n\n"
            
            for col in column_info:
                info += f"- {col['name']} ({col['type']})\n"
                info += f"  * {col['unique_values']} unique values\n"
                info += f"  * Sample values: {', '.join(str(x) for x in col['sample_values'])}\n"
            
            info += "\nYou can reference these columns in your SQL queries using the lowercase names with underscores."
            
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
            
            table_name = os.path.splitext(os.path.basename(file_path))[0]
            
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

    def get_chart_data(self, sql_query: str, file_path: str) -> Tuple[bool, Dict]:
        """
        执行查询并返回适合前端绘图的数据格式
        """
        try:
            # 读取CSV并执行查询
            df = pd.read_csv(file_path)
            df.columns = df.columns.str.lower().str.replace(' ', '_')
            
            # 执行查询获取数据
            with sqlite3.connect(':memory:') as conn:
                df.to_sql('temp_table', conn, if_exists='replace', index=False)
                result_df = pd.read_sql_query(sql_query, conn)
            
            # 转换为前端可用的格式
            chart_data = {
                'labels': result_df.columns.tolist(),
                'datasets': result_df.to_dict('records'),
                'types': result_df.dtypes.astype(str).to_dict()
            }
            
            return True, chart_data
            
        except Exception as e:
            return False, f"Data processing error: {str(e)}"
