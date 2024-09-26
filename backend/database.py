import pymysql.cursors


def get_db_connection():
    return pymysql.connect(
        host="localhost",
        user="flaskuser",
        password="LawsonHan",
        database="myflaskapp",
        cursorclass=pymysql.cursors.DictCursor,
    )


def init_db():
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS messages;")
        cursor.execute("DROP TABLE IF EXISTS sessions;")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL DEFAULT 'Session',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT,
                role VARCHAR(50) NOT NULL,
                text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """
        )
        cursor.execute(
                """
                INSERT INTO sessions (title)
                VALUES ('Test Session 1'), ('Test Session 2'), ('Test Session 3');
                """
            )
            
            # Insert mock messages for the sessions
        cursor.execute(
                """
                INSERT INTO messages (session_id, role, text)
                VALUES
                    (1, 'user', 'Hello! This is user message 1 for session 1'),
                    (1, 'assistant', 'Hi! Assistant response 1 for session 1'),
                    (2, 'user', 'User message 1 for session 2'),
                    (2, 'assistant', 'Assistant response for session 2'),
                    (3, 'user', 'User message for session 3'),
                    (3, 'assistant', 'Assistant response for session 3');
                """
            )

    conn.commit()
    conn.close()
