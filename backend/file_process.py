import pandas as pd
import sqlite3
import json
import requests
from typing import Dict, Any, List, Tuple
import os

class FileProcessor:
    def __init__(self, db_path: str = "database.db"):
        self.db_path = db_path

    def execute_query(self, sql_query: str, file_path: str) -> Tuple[bool, Any]:
        """
        按需加载CSV并执行查询，返回Markdown格式的结果
        """
        try:
            # 清理SQL查询字符串
            cleaned_sql = sql_query.replace('```sql', '').replace('```', '').strip()
            
            # 读取CSV并创建临时表
            df = pd.read_csv(file_path)
            table_name = os.path.splitext(os.path.basename(file_path))[0]
            
            with sqlite3.connect(':memory:') as conn:
                # 将DataFrame保存为临时表
                df.to_sql(table_name, conn, if_exists='replace', index=False)
                
                # 执行查询并获取结果
                cursor = conn.cursor()
                cursor.execute(cleaned_sql)
                rows = cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                
                # 构建Markdown表格
                markdown = "| " + " | ".join(columns) + " |\n"
                markdown += "| " + " | ".join(["---"] * len(columns)) + " |\n"
                
                for row in rows:
                    markdown += "| " + " | ".join(str(value) for value in row) + " |\n"
                
                return True, {"results": markdown}
                    
        except Exception as e:
            return False, f"Query error: {str(e)}"

    def get_table_info(self, file_path: str) -> str:
        """
        从CSV文件获取结构信息
        """
        try:
            df = pd.read_csv(file_path, nrows=1)  # 只读取一行来获取结构
            columns = df.columns.tolist()
            dtypes = df.dtypes.tolist()
            
            # 获取文件名（不含扩展名）
            table_name = os.path.splitext(os.path.basename(file_path))[0]
            
            schema_info = f"Table '{table_name}' with columns: "
            schema_info += ", ".join([f"{col} ({dtype})" for col, dtype in zip(columns, dtypes)])
            
            return schema_info
        except Exception as e:
            return f"Error getting table info: {str(e)}"

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
