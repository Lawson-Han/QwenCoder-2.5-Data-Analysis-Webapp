from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from database import get_db_connection, init_db
import requests
import json
from datetime import datetime, timezone

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://192.168.0.28:3000"]}},
)

socketio = SocketIO(
    app, cors_allowed_origins=["http://localhost:3000", "http://192.168.0.28:3000"]
)

OLLAMA_API_URL = "http://localhost:11434/api/chat"


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
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Insert user message into db
        cursor.execute(
            "INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, "user", text),
        )
        conn.commit()
        
        # Get previous messages for the memory function
        cursor.execute("SELECT * FROM messages WHERE session_id = ?", (session_id,))
        previous_messages = cursor.fetchall()
        
        messages = [{"role": msg['role'], "content": msg['text']} for msg in previous_messages]
        messages.append({"role": "user", "content": text}) 

        # Llama API
        payload = {
            "model": "qwen2.5-coder:7b",
            "stream": True,
            "messages": messages,
        }
        headers = {"Content-Type": "application/json"}

        # 使用with语句确保响应正确关闭
        with requests.post(
            OLLAMA_API_URL, 
            data=json.dumps(payload), 
            headers=headers, 
            stream=True
        ) as response:
            response.raise_for_status()
            bot_response = ""

            # 立即刷新缓冲区的处理方式
            for line in response.iter_lines():
                if line:
                    json_data = json.loads(line.decode("utf-8"))
                    
                    if "message" in json_data and not json_data["done"]:
                        if "content" in json_data["message"]:
                            chunk = json_data["message"]["content"]
                            bot_response += chunk

                            # 立即发送每个块
                            socketio.emit(
                                "receive_message",
                                {"text": chunk, "done": False},
                                room=request.sid
                            )
                            # 强制刷新Socket.IO事件
                            socketio.sleep(0)
                    
                    elif json_data["done"]:
                        # 发送完成信号
                        socketio.emit(
                            "receive_message",
                            {"done": True},
                            room=request.sid
                        )
                        break

            # 完成后保存完整响应
            cursor.execute(
                "INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)",
                (session_id, "assistant", bot_response),
            )
            conn.commit()

    except Exception as e:
        print(f"Error during streaming: {e}")
        socketio.emit(
            "receive_message",
            {"text": "Error occurred during streaming", "done": True},
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


if __name__ == "__main__":
    with app.app_context():
        init_db()
    socketio.run(app, port=5001, debug=True)
