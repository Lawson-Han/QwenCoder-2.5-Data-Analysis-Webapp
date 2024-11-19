import sqlite3
import os
from datetime import datetime
import time

def get_db_connection():
    # 确保数据目录存在
    os.makedirs('data', exist_ok=True)
    
    # 添加超时和错误处理
    for _ in range(3):  # 最多重试3次
        try:
            conn = sqlite3.connect(
                'data/chat.db',
                timeout=20,  # 设置超时时间
                isolation_level=None  # 自动提交模式
            )
            conn.row_factory = sqlite3.Row
            return conn
        except sqlite3.OperationalError as e:
            if 'database is locked' in str(e):
                time.sleep(1)  # 等待1秒后重试
                continue
            raise
    raise sqlite3.OperationalError("Could not connect to database after 3 retries")

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def init_db():
    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    cursor = conn.cursor()
    
    # 删除现有表（保留session_files表）
    cursor.execute("DROP TABLE IF EXISTS messages")
    cursor.execute("DROP TABLE IF EXISTS sessions")
    cursor.execute("DROP TABLE IF EXISTS session_files")
    
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
    
    # 创建session_files表（如果不存在）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS session_files (
            session_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            PRIMARY KEY (session_id)
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
    
    # 插入示例文件关联
    sample_files = [
        (1, "uploads/sample_grade_sheet.csv", "sample_grade_sheet"),
        (2, "uploads/sample_grade_sheet.csv", "sample_grade_sheet"),
        (3, "uploads/sample_grade_sheet.csv", "sample_grade_sheet")
    ]
    
    cursor.executemany(
        "INSERT INTO session_files (session_id, file_path, file_name) VALUES (?, ?, ?)",
        sample_files
    )
    
    # 插入示例消息
    sample_messages = [
        # Python Programming Help 会话
        (1, "user", "How do I use list comprehension in Python?", "2024-11-19 02:01:00"),
        (1, "assistant", "List comprehension is a concise way to create lists in Python. Here's an example:\n\n```python\n# Instead of:\nSquares = []\nfor x in range(10):\n    squares.append(x**2)\n\n# You can write:\nsquares = [x**2 for x in range(10)]\n```\n\nThis creates a list of squares from 0 to 9.", "2024-11-19 02:01:30"),
        
        # Machine Learning Discussion 会话
        (2, "user", "Can you explain what is gradient descent?", "2024-11-19 02:11:00"),
        (2, "assistant", """# Gradient Descent Explained

Gradient descent is an **optimization algorithm** used in machine learning. Here's what you need to know:

## Key Components
* **Learning Rate**: Controls step size
* **Cost Function**: Measures error
* **Gradient**: Direction of steepest descent

### Types of Gradient Descent:
1. **Batch Gradient Descent**
   - Uses entire dataset
   - More stable
   - Slower computation

2. **Stochastic Gradient Descent**
   - Uses single sample
   - Faster updates
   - More noise

3. **Mini-batch Gradient Descent**
   - Best of both worlds
   - Commonly used in practice

```python
# Simple implementation
def gradient_descent(x, y, learning_rate=0.01):
    w = b = 0
    for _ in range(100):
        y_pred = w * x + b
        error = y_pred - y
        w -= learning_rate * error * x
        b -= learning_rate * error
    return w, b
```

| Type | Pros | Cons |
|------|------|------|
| Batch | Stable | Slow |
| SGD | Fast | Noisy |
| Mini-batch | Balanced | Complex |

> *Note*: The choice of learning rate is crucial for convergence.""", "2024-11-19 02:11:30"),
        
        # Web Development Tips 会话
        (3, "user", "What are the best practices for responsive design?", "2024-11-19 02:21:00"),
        (3, "assistant", """# Responsive Design Best Practices

## Core Principles
1. **Mobile-First Approach**
   - Start with mobile layout
   - Progressive enhancement
   - Better performance

2. **Flexible Grids**
   ```css
   .container {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
     gap: 1rem;
   }
   ```

3. **Media Queries**
   | Breakpoint | Device |
   |------------|--------|
   | 320px | Mobile |
   | 768px | Tablet |
   | 1024px | Desktop |

## Key Components
* **Flexible Images**
  ```css
  img {
    max-width: 100%;
    height: auto;
  }
  ```
* **Typography**
  - Use `rem` units
  - Scale font-size with viewport
  - Maintain readability

### Testing Checklist
- [x] Mobile devices
- [x] Tablets
- [x] Desktops
- [ ] Different browsers
- [ ] Screen readers

> **Pro tip**: Always test on real devices when possible.

*Remember*: ~~Pixel-perfect~~ **_Fluid and adaptable_** is the goal.""", "2024-11-19 02:21:30")
    ]
    
    cursor.executemany(
        "INSERT INTO messages (session_id, role, text, created_at) VALUES (?, ?, ?, ?)",
        sample_messages
    )
    
    conn.commit()
    conn.close()
    
    print("Database initialized with sample data!")
