from flask import Flask, request, jsonify
from database import get_db_connection, init_db

app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to the ChatGPT-like app."

# New session
@app.route('/sessions', methods=['POST'])
def start_session():
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute('INSERT INTO sessions () VALUES ()')
        session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"session_id": session_id}), 201

# Insert new msg
@app.route('/sessions/<int:session_id>/messages', methods=['POST'])
def add_message(session_id):
    json_data = request.get_json()
    text = json_data['text']
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute('INSERT INTO messages (session_id, text) VALUES (%s, %s)', (session_id, text,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Message added successfully!"}), 201

# get msg for the session
@app.route('/sessions/<int:session_id>/messages', methods=['GET'])
def get_messages(session_id):
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute('SELECT * FROM messages WHERE session_id = %s', (session_id,))
        messages = cursor.fetchall()
    conn.close()
    return jsonify({"messages": messages})

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True)
