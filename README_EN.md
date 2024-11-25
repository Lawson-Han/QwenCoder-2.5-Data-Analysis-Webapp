# QwenCoder-2.5 Data Analysis Web-app

[English](README_EN.md) | [中文](README.md)

A streamlined LLM web application built with React.js, Flask, and SQLite3 database.

## Quick Start

1. Install and Start Ollama:
    ```bash
    curl https://ollama.ai/install.sh | sh
    ollama pull qwen2.5-coder:7b
    ollama pull qwen2.5-coder:3b
    ollama serve
    ```
    
2. Start Backend:
    ```bash
    cd backend
    pip install -r requirements.txt
    python app.py
    ```
    
3. Start Frontend:
    ```bash
    cd chat-app
    npm install
    npm start
    ```
    
### Ports
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

## Implementation Details

Users begin by creating a session and uploading data files, which are then parsed and stored by the backend.

When users send query requests, the backend receives the message, validates the session's uploaded files, parses the file structure, prepares historical messages, and generates prompts for the Large Language Model (LLM).

The LLM generates SQL queries based on the prompts, which the backend executes and returns results, formatting them into tables or charts for frontend display and rendering in real-time.

### 1. Session Creation

- Users click the "New Session" button, triggering a request to the backend's `/add_session` endpoint.
- The backend creates a new session record in the database and returns the session ID to the frontend.

### 2. File Upload

- Users select data files to upload within their session.
- The frontend sends the file and session ID to the backend via the `/upload` endpoint.
- The backend saves the file, analyzes its data structure, and after validating, stores the file path and name in the `session_files` table.

### 3. Message Sending

- Users input queries on the frontend, such as "Show sales trends for the past year."
- The frontend sends the message and session ID to the backend's `handle_send_message` function via Socket.IO (real-time connection).

### 4. Message Processing (`handle_send_message` Function)

- **Message Reception**: The `handle_send_message` function receives user message data, including `session_id` and `text` (user input).
- **Reception Confirmation**: Immediately sends confirmation to the frontend, updating the processing status from "Initialize Connection" to "Analyzing Query".
- **File Verification**: Queries the database for files associated with the session. Returns an error if no files are found.
- **Table Structure Analysis**: Uses `FileProcessor` to read uploaded files, extract table structure information (column names, data types, etc.), converts to SQL tables, and captures headers and data structure for LLM comprehension.
- **Message Storage**: Saves user input to the `messages` table in the database.
- **History Preparation**: Retrieves all historical messages for the session from the database, formatting them appropriately for the LLM.
- **Prompt Generation**: Creates LLM prompts based on user input and table structure, using a smaller language model to determine user intent (e.g., chart type needed) and system prompts.
- **LLM Invocation**: Sends the generated prompts and historical messages to the LLM, requesting SQL query generation.
- **Response Processing**: Receives LLM responses via streaming, gradually building complete SQL queries while sending response fragments to the frontend in real-time.
- **Query Execution**: Executes the generated SQL query on uploaded files. Returns results if successful, error messages if not.
- **Response Storage**: Saves the LLM-generated SQL query as assistant messages in the database and stores query results in the `query_results` table.
- **Frontend Response**: Sends query results (table/chart type) to the frontend, which renders appropriate visualizations for user viewing, interaction, and export. 