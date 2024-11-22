from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from database import get_db_connection, init_db
import requests
import json
from datetime import datetime, timezone
import os
from werkzeug.utils import secure_filename
import pandas as pd
from file_process import FileProcessor
import numpy as np
from typing import Tuple

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/*": {"origins": ["http://localhost:3000", "http://192.168.0.28:3000"]}
    },
)

socketio = SocketIO(
    app, cors_allowed_origins=["http://localhost:3000", "http://192.168.0.28:3000"]
)

OLLAMA_API_URL = "http://localhost:11434/api/chat"

# 配置上传文件夹
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"csv", "pdf"}

# 确保上传文件夹存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def home():
    return "Welcome to the ChatGPT-like app."


@app.route("/get_sessions", methods=["GET"])
def get_sessions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions")
    sessions = cursor.fetchall()
    # Convert SQLite Row objects to dictionaries
    sessions_list = [dict(session) for session in sessions]
    cursor.close()
    conn.close()
    return jsonify({"sessions": sessions_list})


@app.route("/add_session", methods=["POST"])
def start_session():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO sessions (title, created_at) VALUES (?, ?)",
            ("Session", created_at),
        )
        conn.commit()
        session_id = cursor.lastrowid

        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        new_session = cursor.fetchone()
        return jsonify({"session": dict(new_session)}), 201
    except Exception as e:
        print(f"Error creating session: {e}")
        return jsonify({"error": "Failed to create session"}), 500
    finally:
        conn.close()


@socketio.on("send_message")
def handle_send_message(data):
    session_id = data["session_id"]
    text = data["text"]
    sql_query = ""

    try:
        # 立即发送接收确认，并确保它被发送出去
        socketio.emit("message_received", room=request.sid)
        socketio.sleep(0)  # 让出控制权，确保消息被发送

        conn = get_db_connection()
        cursor = conn.cursor()
        processor = FileProcessor()

        # 1. 检查文件
        cursor.execute(
            "SELECT file_path, file_name FROM session_files WHERE session_id = ?",
            (session_id,),
        )
        file_info = cursor.fetchone()

        if not file_info:
            socketio.emit(
                "receive_message",
                {"text": "Error: No file associated with this session.", "done": True},
                room=request.sid,
            )
            return

        # 2. 分析表结构
        table_info = processor.get_table_info(file_info["file_path"])

        # 3. 保存消息
        cursor.execute(
            "INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, "user", text),
        )
        conn.commit()

        # 4. 准备历史消息
        cursor.execute("SELECT * FROM messages WHERE session_id = ?", (session_id,))
        previous_messages = cursor.fetchall()
        messages = [
            {"role": msg["role"], "content": msg["text"]} for msg in previous_messages
        ]

        # 5. 准备SQL转换提示
        intent, system_prompt = get_prompt_by_intent(text, table_info)
        

        # 6. LLM请求
        payload = {
            "model": "qwen2.5-coder:7b",
            "stream": True,
            "messages": [{"role": "system", "content": system_prompt}, *messages],
        }

        # 7. 流式处理LLM响应
        with requests.post(
            OLLAMA_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True,
        ) as response:
            response.raise_for_status()

            for line in response.iter_lines():
                if line:
                    json_data = json.loads(line.decode("utf-8"))
                    if "message" in json_data and not json_data["done"]:
                        if "content" in json_data["message"]:
                            chunk = json_data["message"]["content"]
                            sql_query += chunk
                            socketio.emit(
                                "receive_message",
                                {"text": chunk, "done": False},
                                room=request.sid,
                            )
                            socketio.sleep(0)
                    elif json_data["done"]:
                        break

        # 8. 执行查询并生成结果
        sql_query = sql_query.strip()
        
        # 先保存助手消息以获取 message_id
        cursor.execute(
            "INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, "assistant", sql_query),
        )
        conn.commit()
        message_id = cursor.lastrowid  # 获取新插入消息的ID

        success, result = processor.execute_query(sql_query, file_info["file_path"])
        print("result", result)

        if success:
            # 存储查询结果
            cursor.execute("""
                INSERT INTO query_results 
                (message_id, session_id, query_data) 
                VALUES (?, ?, ?)
            """, (message_id, session_id, json.dumps(result["raw_data"])))
            conn.commit()
            
            socketio.emit(
                "receive_message",
                {
                    "table_data": result["table_data"],
                    "chart_type": intent,  # 发送图表类型
                    "message_id": message_id,
                    "done": False,
                },
                room=request.sid,
            )
        else:
            socketio.emit(
                "receive_message",
                {"done": True},
                room=request.sid,
            )

        socketio.emit("receive_message", {"done": True}, room=request.sid)

    except Exception as e:
        print(f"Error during processing: {e}")
        socketio.emit(
            "receive_message",
            {"text": f"Error during LLM processing: {str(e)}", "done": True},
            room=request.sid,
        )
    finally:
        cursor.close()
        conn.close()


@app.route("/sessions/<int:session_id>/messages", methods=["GET"])
def get_messages(session_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取消息和查询结果
    cursor.execute("""
        SELECT m.*, qr.query_data 
        FROM messages m 
        LEFT JOIN query_results qr ON m.id = qr.message_id 
        WHERE m.session_id = ?
        ORDER BY m.id
    """, (session_id,))
    
    messages = []
    for row in cursor.fetchall():
        message = dict(row)
        if message['query_data']:
            # 重构表格数据
            raw_data = json.loads(message['query_data'])
            df = pd.DataFrame(
                data=raw_data['result']['data'],
                columns=raw_data['result']['columns']
            )
            message['table_data'] = FileProcessor()._to_antd_format(df)
            
        messages.append(message)
    
    return jsonify({"messages": messages})


#  delete session
@app.route("/delete_session/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        cursor.close()
    except Exception as e:
        print(f"Error deleting session: {e}")
        return jsonify({"error": "Failed to delete session"}), 500
    finally:
        conn.close()

    print(f"Session {session_id} deleted successfully.")
    return jsonify({"message": "Session deleted successfully"}), 200


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    session_id = request.form.get("session_id")

    if not session_id:
        return jsonify({"error": "No session ID provided"}), 400

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        try:
            # 安全地处理文件名并保存
            filename = secure_filename(file.filename)
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(file_path)

            # 处理文件
            processor = FileProcessor()
            conn = get_db_connection()
            try:
                success, result = processor.handle_file_upload(
                    file_path, session_id, conn
                )

                if success:
                    return jsonify(result), 201
                else:
                    return jsonify(result), 500
            finally:
                conn.close()

        except Exception as e:
            app.logger.error(f"Upload error: {str(e)}")
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "File type not allowed"}), 400


@app.route("/sessions/<int:session_id>/file", methods=["GET"])
def get_session_file(session_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT file_path, file_name FROM session_files WHERE session_id = ?",
            (session_id,),
        )
        file_info = cursor.fetchone()

        if file_info:
            return jsonify(
                {
                    "file": {
                        "file_path": file_info["file_path"],
                        "file_name": file_info["file_name"],
                    }
                }
            )
        else:
            return jsonify({"file": None}), 200

    except Exception as e:
        print(f"Error fetching session file: {e}")
        return jsonify({"error": "Failed to fetch session file"}), 500
    finally:
        conn.close()


@app.route("/preview_csv", methods=["POST"])
def preview_csv():
    try:
        data = request.json
        file_path = data.get('file_path')
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404

        # 读取CSV文件（限制预览行数）
        df = pd.read_csv(file_path, nrows=50)  # 限制预览50行
        
        # 处理特殊值（NaN, Infinity等）
        df = df.replace({
            np.nan: None,  # 将 NaN 转换为 None (会被JSON序列化为null)
            np.inf: None,  # 将 Infinity 转换为 None
            -np.inf: None  # 将 -Infinity 转换为 None
        })
        
        # 确保所有数值都能被JSON序列化
        for col in df.select_dtypes(include=[np.number]).columns:
            df[col] = df[col].astype(float).apply(lambda x: None if pd.isna(x) else float(x))
        
        # 构建表格数据
        preview_data = {
            "columns": [
                {"title": str(col), "dataIndex": str(col), "key": str(col)} 
                for col in df.columns
            ],
            "dataSource": df.to_dict('records')
        }
        
        # 验证JSON序列化是否成功
        try:
            json.dumps(preview_data)
        except TypeError as e:
            app.logger.error(f"JSON serialization error: {str(e)}")
            return jsonify({"error": "Data serialization failed"}), 500
        
        return jsonify(preview_data)

    except pd.errors.EmptyDataError:
        return jsonify({"error": "Empty CSV file"}), 400
    except pd.errors.ParserError as e:
        return jsonify({"error": f"CSV parsing error: {str(e)}"}), 400
    except Exception as e:
        app.logger.error(f"Preview error: {str(e)}")
        return jsonify({"error": str(e)}), 500


def get_prompt_by_intent(text: str, table_info: str) -> Tuple[str, str]:
    try:
        # 首先判断用户意图和图表类型
        intent_prompt = f"""Analyze the user's request and determine:
        1. If it's a visualization request or a regular query
        2. What type of chart would be most suitable
        
        User request: "{text}"
        
        Return ONLY one of these options:
        - "query" for regular data queries
        - "line" for time series or trend analysis
        - "bar" for comparisons between categories
        - "pie" for showing proportions
        - "scatter" for correlation analysis
        - "column" for grouped comparisons
        """
        
        # 获取意图
        payload = {
            "model": "qwen2.5-coder:3b",
            "messages": [{"role": "user", "content": intent_prompt}],
            "stream": False
        }
        
        response = requests.post(OLLAMA_API_URL, json=payload)
        response_data = response.json()
        
        # 安全地获取意图并清理
        raw_type = response_data.get("message", {}).get("content", "query").strip().lower()
        
        # 清理和标准化图表类型
        def normalize_chart_type(raw_type: str) -> str:
            # 移除常见的额外字符
            cleaned = raw_type.replace('"', '').replace("'", "").replace("-", "").replace(":", "").strip()
            
            # 定义有效的图表类型
            valid_types = {
                "query": "query",
                "line": "line",
                "bar": "bar",
                "pie": "pie",
                "scatter": "scatter",
                "column": "column"
            }
            
            # 查找最匹配的图表类型
            for valid_type in valid_types:
                if valid_type in cleaned:
                    return valid_types[valid_type]
            
            # 如果没有匹配到任何有效类型，返回默认值
            return "query"
        
        chart_type = normalize_chart_type(raw_type)
        print(f"Raw intent: {raw_type} -> Normalized: {chart_type}")
        
        # 统一的 SQL 生成 prompt
        sql_prompt = f"""You are a SQL expert. Convert the request into a SQL query.
        Current table structure:
        {table_info}
        
        Instructions:
        1. You MUST ONLY return the SQL query
        2. DO NOT include any explanations, comments, or additional text for drawing the chart.
        3. DO NOT mention or suggest any visualization tools or methods, visualization will be handled elsewhere.
        4. DO NOT provide any post-query instructions
        5. If columns don't exist, ONLY return: Requested columns not fond
        
        Example error response:
        ```sql
        ERROR: Requested columns not found
        ```
        
        Remember: Your ONLY task is to generate one SQL query. Data processing and visualization will be handled elsewhere.
        """
        
        return chart_type, sql_prompt
            
    except Exception as e:
        print(f"Error in get_prompt_by_intent: {e}")
        return "query", sql_prompt



if __name__ == "__main__":
    with app.app_context():
        init_db()
    socketio.run(app, port=5001, debug=True)
