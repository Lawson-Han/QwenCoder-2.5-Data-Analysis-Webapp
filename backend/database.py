import sqlite3
import os
from datetime import datetime

def get_db_connection():
    # 确保数据目录存在
    os.makedirs('data', exist_ok=True)
    
    # 连接到数据库文件
    conn = sqlite3.connect('data/chat.db')
    conn.row_factory = sqlite3.Row
    return conn

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def init_db():
    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    cursor = conn.cursor()
    
    # 删除现有表（如果存在）
    cursor.execute("DROP TABLE IF EXISTS messages")
    cursor.execute("DROP TABLE IF EXISTS sessions")
    
    # 创建表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT 'New Chat',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)
    
    # 插入示例会话
    sample_sessions = [
        ("Python Programming Help", "2024-11-19 02:00:00"),
        ("Machine Learning Discussion", "2024-11-19 02:10:00"),
        ("Web Development Tips", "2024-11-19 02:20:00")
    ]
    
    cursor.executemany(
        "INSERT INTO sessions (title, created_at) VALUES (?, ?)",
        sample_sessions
    )
    
    # 插入示例消息
    sample_messages = [
        # Python Programming Help 会话
        (1, "user", "How do I use list comprehension in Python?", "2024-11-19 02:01:00"),
        (1, "assistant", "List comprehension is a concise way to create lists in Python. Here's an example:\n\n```python\n# Instead of:\nSquares = []\nfor x in range(10):\n    squares.append(x**2)\n\n# You can write:\nsquares = [x**2 for x in range(10)]\n```\n\nThis creates a list of squares from 0 to 9.", "2024-11-19 02:01:30"),
        
        # Machine Learning Discussion 会话
        (2, "user", "Can you explain what is gradient descent?", "2024-11-19 02:11:00"),
        (2, "assistant", "Gradient descent is an optimization algorithm used to minimize a function by iteratively moving in the direction of steepest descent.\n\nIn machine learning, it's commonly used to minimize the loss function and find the optimal model parameters.", "2024-11-19 02:11:30"),
        
        # Web Development Tips 会话
        (3, "user", "What are the best practices for responsive design?", "2024-11-19 02:21:00"),
        (3, "assistant", "Here are some key responsive design best practices:\n\n1. Use mobile-first approach\n2. Implement flexible grids\n3. Use media queries effectively\n4. Optimize images for different screen sizes\n5. Test on multiple devices", "2024-11-19 02:21:30")
    ]
    
    cursor.executemany(
        "INSERT INTO messages (session_id, role, text, created_at) VALUES (?, ?, ?, ?)",
        sample_messages
    )
    
    conn.commit()
    conn.close()
    
    print("Database initialized with sample data!")
