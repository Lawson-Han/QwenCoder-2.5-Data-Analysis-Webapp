import time
from functools import wraps
from datetime import datetime

def log_time(logger=print):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            logger(f"[{datetime.now().isoformat()}] Starting {func.__name__}...")
            result = func(*args, **kwargs)
            end_time = time.time()
            duration = end_time - start_time
            logger(f"[{datetime.now().isoformat()}] Completed {func.__name__} in {duration:.3f} seconds")
            return result
        return wrapper
    return decorator 