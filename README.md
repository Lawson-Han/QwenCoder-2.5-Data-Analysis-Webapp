# llama3.2-simple-website

It's a simple LLM web app using React.js and Flask, with a MySQL database implemented.

## Time Record
## Time Record

9/26 22:44: Started working.

9/26 23:05: Finished testing on React, Flask, and MySQL database. First connection debugging established.

9/27 0:37: Completed frontend page design; temporarily added a simulated response style.

9/27 1:45: Frontend reading from the database connection completed. New session creation and refresh tested successfully, allowing for persistent rendering. Began beautifying parts of the application.

<img src="./readme-image/Screenshot 2024-09-27 at 03.15.16.png" alt="Screenshot 2024-09-27 at 03.15.16" style="zoom:50%;" />

9/27 2:31: Handled timezone for displaying correct timestamps. Encountered a bug that took some time to fix; currently complete.

9/27, 4:23 AM: Got stuck on the streaming display part—ran into an unusual bug with Socket.io.

9/27 5:06 AM Thought it was due to an outdated OpenSSL version affecting HTTP requests. Got it fixed now.

9/27 6:31 AM Streaming display is up and running! Finished all the tasks. Tomorrow, I'll hunt for bugs and look for areas to optimize—for example, the LLM should store context to continue the conversation.

<img src="./readme-image/Screenshot 2024-09-27 at 06.30.29.png" alt="Screenshot 2024-09-27 at 06.30.29" style="zoom:50%;" />

9/27 14:16 Started optimizing loading display; it should show loading when the large model is returning, and return to normal when generation is complete.

9/27 15:17 Completed loading display, completed scroll bar settings, and correctly rendered Markdown format. Noted that the model did not properly remember conversation history, started working on a fix.

9/27 15:36 Memory mechanics now completed. Started working on the default tab, i.e., the initial landing page.

9/27 16:19 Styling beautification completed, but discovered a sidebar scaling bug.

9/27 16:52 Finalise a more robust sidebar.

<img src="./readme-image/Screenshot 2024-09-27 at 16.51.55.png" alt="Screenshot 2024-09-27 at 06.30.29" style="zoom:20%;" />

<img src="./readme-image/Screenshot 2024-09-27 at 16.53.30.png" alt="Screenshot 2024-09-27 at 06.30.29" style="zoom:30%;" />

## Summary

The development process has been smooth, and the main features are completed. It takes around 10 hours.

## Chat App (Frontend)

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.


## Chat App (Backend)
## Quick Start

1. Install Ollama (Mac/Linux):
```bash
curl https://ollama.ai/install.sh | sh
```

2. Download qwen2.5-coder:32b model:
```bash
ollama pull qwen2.5-coder:32b
```

3. Start the Ollama server:
```bash
ollama serve
```

4. Clone the repository:
```bash
git clone [your-repository-url]
cd llama3.2-simple-website
```

5. Start the Backend:
```bash
cd backend
pip install -r requirements.txt
python app.py
```

6. Start the Frontend (in a new terminal):
```bash
cd chat-app
npm install
npm start
```

### Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Project Structure
```
llama3.2-simple-website/
├── backend/           # Flask backend
│   ├── app.py        # Main application file
│   ├── database.py   # Database operations
│   └── requirements.txt  # Python dependencies
└── chat-app/         # React frontend
    ├── src/          # Source code
    └── package.json  # Node.js dependencies
```

### Troubleshooting

1. Check if Ollama is running:
```bash
ollama serve
```

2. Verify llama3.2 model is installed:
```bash
ollama list
```

3. Check backend logs in the terminal where you ran `python app.py`

4. Check frontend logs in the terminal where you ran `npm start`

5. If you encounter database issues, check if the SQLite database file exists:
```bash
ls backend/data/chat.db
```