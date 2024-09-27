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
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM sessions")
        sessions = cursor.fetchall()
    conn.close()
    return jsonify({"sessions": sessions})


@app.route("/add_session", methods=["POST"])
def start_session():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            created_at = datetime.now(timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S"
            )  # Store as UTC
            cursor.execute(
                "INSERT INTO sessions (title, created_at) VALUES (%s, %s)",
                ("Session", created_at),
            )
            session_id = cursor.lastrowid

            # Fetch the newly created session to return
            cursor.execute("SELECT * FROM sessions WHERE id = %s", (session_id,))
            new_session = cursor.fetchone()
    except Exception as e:
        print(f"Error creating session: {e}")
        return jsonify({"error": "Failed to create session"}), 500
    finally:
        conn.commit()
        conn.close()

    print(f"New session created with ID: {session_id}")
    return jsonify({"session": new_session}), 201


@socketio.on("send_message")
def handle_send_message(data):
    session_id = data["session_id"]
    text = data["text"]
    conn = get_db_connection()

    try:
        # Insert user message into db
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO messages (session_id, role, text) VALUES (%s, %s, %s)",
                (session_id, "user", text),
            )
        conn.commit()
        
        # Get previous messages for the memory function
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM messages WHERE session_id = %s", (session_id,))
            previous_messages = cursor.fetchall()
        
        print(previous_messages)
        
        messages = []
        if previous_messages:
            messages = [{"role": msg['role'], "content": msg['text']} for msg in previous_messages]
            
        messages.append({"role": "user", "content": text}) 

        # Llama API
        payload = {
            "model": "llama3.2",
            "stream": True,
            "messages": messages,
        }
        headers = {"Content-Type": "application/json"}

        response = requests.post(
            OLLAMA_API_URL, data=json.dumps(payload), headers=headers, stream=True
        )
        response.raise_for_status()

        # Process the stream
        bot_response = ""
        for line in response.iter_lines():
            if line:
                json_data = json.loads(line.decode("utf-8"))
                print(json_data)
                
                if "message" in json_data and not json_data["done"]:
                    if "content" in json_data["message"]:
                        bot_response += json_data["message"]["content"]  # Append the response for later insertion

                        message_text = json_data["message"]["content"]
                        emit(
                            "receive_message",
                            {"text": message_text, "done": False},
                            to=request.sid,
                        )
                elif json_data["done"]:
                    emit(
                        "receive_message",
                        {"done": True},
                        to=request.sid,
                    )
                    break 

        # Save the complete bot response to the database once the stream is complete
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO messages (session_id, role, text) VALUES (%s, %s, %s)",
                (session_id, "assistant", bot_response),
            )
        conn.commit()

    except requests.exceptions.RequestException as e:
        print(f"Error during request to LLaMA API: {e}")
        emit(
            "receive_message",
            {"role": "assistant", "text": "Error with LLaMA API"},
            to=request.sid,
        )
    finally:
        conn.close()


@app.route("/sessions/<int:session_id>/messages", methods=["GET"])
def get_messages(session_id):
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM messages WHERE session_id = %s", (session_id,))
        messages = cursor.fetchall()
    conn.close()
    return jsonify({"messages": messages})


if __name__ == "__main__":
    with app.app_context():
        init_db()
    socketio.run(app, debug=True)
