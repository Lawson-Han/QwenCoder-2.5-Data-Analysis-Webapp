from flask import Flask, request, jsonify
from flask_cors import CORS
from database import get_db_connection, init_db
import requests

from datetime import datetime, timezone

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}},
)

OLLAMA_API_URL = "http://localhost:11434/chat"


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


@app.route("/sessions/<int:session_id>/messages", methods=["POST"])
def add_message(session_id):
    json_data = request.get_json()
    text = json_data["text"]
    print(f"Received message for session {session_id}: {text}")

    conn = get_db_connection()

    with conn.cursor() as cursor:
        cursor.execute(
            "INSERT INTO messages (session_id, text) VALUES (%s, %s)",
            (
                session_id,
                text,
            ),
        )

    conn.commit()

    payload = {"model": "llama3.2", "messages": [{"role": "user", "content": text}]}

    headers = {"Content-Type": "application/json"}

    response = requests.post(OLLAMA_API_URL, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        bot_response = data["message"]["content"]

        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO messages (session_id, text) VALUES (%s, %s)",
                (
                    session_id,
                    bot_response,
                ),
            )

        conn.commit()
        print(f"Bot response for session {session_id}: {bot_response}")
        return (
            jsonify({"message": "User message and bot response added successfully!"}),
            201,
        )

    conn.close()
    print(f"Failed to get a response for session {session_id}.")
    return jsonify({"message": "Message added successfully!"}), 201


@app.route("/sessions/<int:session_id>/messages", methods=["GET"])
def get_messages(session_id):
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM messages WHERE session_id = %s", (session_id,))
        messages = cursor.fetchall()
    conn.close()
    print(f"Retrieved messages for session {session_id}.")
    return jsonify({"messages": messages})


if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(debug=True)
