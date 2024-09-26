import pymysql.cursors

def get_db_connection():
    return pymysql.connect(host='localhost',
                           user='flaskuser',
                           password='LawsonHan',
                           database='myflaskapp',
                           cursorclass=pymysql.cursors.DictCursor)

def init_db():
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute('DROP TABLE IF EXISTS messages;')
        cursor.execute('DROP TABLE IF EXISTS sessions;')
        
        # sessions table for different chat session
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL DEFAULT 'new chat',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # messages for msg list under a session
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT,
                text VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        ''')
    conn.commit()
    conn.close()
