from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from database import get_db_connection, init_db
import requests
import json
from datetime import datetime, timezone
import os
from werkzeug.utils import secure_filename
import sqlite3
import pandas as pd
from file_process import FileProcessor

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://192.168.0.28:3000"]}},
)

socketio = SocketIO(
    app, cors_allowed_origins=["http://localhost:3000", "http://192.168.0.28:3000"]
)

OLLAMA_API_URL = "http://localhost:11434/api/chat"

# 配置上传文件夹
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv', 'pdf'}

# 确保上传文件夹存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
    
    conn = get_db_connection()
    cursor = conn.cursor()
    processor = FileProcessor()

    try:
        # 从数据库获取当前session的文件信息
        cursor.execute(
            "SELECT file_path, file_name FROM session_files WHERE session_id = ?",
            (session_id,)
        )
        file_info = cursor.fetchone()
        
        if not file_info:
            socketio.emit(
                "receive_message",
                {"text": "Error: No file associated with this session.", "done": True},
                room=request.sid
            )
            return

        # 使用数据库中存储的文件名获取表信息
        table_info = processor.get_table_info(file_info['file_path'])
        
        # 保存用户消息
        cursor.execute(
            "INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, "user", text),
        )
        conn.commit()
        
        # 获取历史消息
        cursor.execute("SELECT * FROM messages WHERE session_id = ?", (session_id,))
        previous_messages = cursor.fetchall()
        messages = [{"role": msg['role'], "content": msg['text']} for msg in previous_messages]
        messages.append({"role": "user", "content": text})

        # 准备SQL转换提示
        sql_prompt = f"""Given the following table structure:
        {table_info}
        
        Convert user's natural language query to SQL.
        
        Return only the SQL query, nothing else."""

        # 准备LLM请求
        payload = {
            "model": "qwen2.5-coder:7b",
            "stream": True,
            "messages": [
                {"role": "system", "content": sql_prompt},
                *messages
            ],
        }
        print("payload", payload)

        # 流式处理响应，只获取 SQL 查询
        with requests.post(
            OLLAMA_API_URL, 
            json=payload, 
            headers={"Content-Type": "application/json"}, 
            stream=True
        ) as response:
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    json_data = json.loads(line.decode("utf-8"))
                    
                    if "message" in json_data and not json_data["done"]:
                        if "content" in json_data["message"]:
                            chunk = json_data["message"]["content"]
                            sql_query += chunk
                            # 实时发送 SQL 生成过程
                            socketio.emit(
                                "receive_message",
                                {"text": chunk, "done": False},
                                room=request.sid
                            )
                            socketio.sleep(0)
                    
                    elif json_data["done"]:
                        break

        # SQL 生成完成后，尝试执行查询
        sql_query = sql_query.strip()
        print("llama response sql_query: ", sql_query)
        success, result = processor.execute_query(sql_query, file_info['file_path'])

        if success:
            # 发送查询结果
            socketio.emit(
                "receive_message",
                {"text": f"\nQuery Results:\n{result['results']}", "done": False},
                room=request.sid
            )
        else:
            # 发送错误信息
            socketio.emit(
                "receive_message",
                {"text": f"\nError executing query: {result}", "done": False},
                room=request.sid
            )

        # 发送完成信号
        socketio.emit(
            "receive_message",
            {"done": True},
            room=request.sid
        )

        # 保存完整对话记录
        full_response = f"SQL Query:\n```sql\n{sql_query}\n```\n"
        full_response += f"\nResults:\n{result['results'] if success else result}"
        
        cursor.execute(
            "INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, "assistant", full_response),
        )
        conn.commit()

    except Exception as e:
        print(f"Error during processing: {e}")
        socketio.emit(
            "receive_message",
            {"text": f"Error during query processing: {str(e)}", "done": True},
            room=request.sid
        )
    finally:
        cursor.close()
        conn.close()


@app.route("/sessions/<int:session_id>/messages", methods=["GET"])
def get_messages(session_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE session_id = ?", (session_id,))
    messages = cursor.fetchall()
    # Convert SQLite Row objects to dictionaries
    messages_list = [dict(message) for message in messages]
    cursor.close()
    conn.close()
    return jsonify({"messages": messages_list})

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

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    session_id = request.form.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'No session ID provided'}), 400
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
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
                success, result = processor.handle_file_upload(file_path, session_id, conn)
                
                if success:
                    return jsonify(result), 201
                else:
                    return jsonify(result), 500
            finally:
                conn.close()
                
        except Exception as e:
            app.logger.error(f"Upload error: {str(e)}")
            return jsonify({'error': str(e)}), 500
        
    return jsonify({'error': 'File type not allowed'}), 400

@app.route("/sessions/<int:session_id>/file", methods=["GET"])
def get_session_file(session_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT file_path, file_name FROM session_files WHERE session_id = ?",
            (session_id,)
        )
        file_info = cursor.fetchone()
        
        if file_info:
            return jsonify({
                "file": {
                    "file_path": file_info['file_path'],
                    "file_name": file_info['file_name']
                }
            })
        else:
            return jsonify({"file": None}), 200
            
    except Exception as e:
        print(f"Error fetching session file: {e}")
        return jsonify({"error": "Failed to fetch session file"}), 500
    finally:
        conn.close()

if __name__ == "__main__":
    with app.app_context():
        init_db()
    socketio.run(app, port=5001, debug=True)
