# llama3.2-simple-website

It's a simple LLM web app using React.js and Flask, with a MySQL database implemented.

### Time Record

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
