// src/App.js

import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import 'antd/dist/reset.css';
import './styles/Sidebar.css';
import './styles/ChatWindow.css';

const { Header, Content } = Layout;

function App() {
  const [sessions, setSessions] = useState([]);  // Track all sessions
  const [currentSession, setCurrentSession] = useState(null);  // Track current session

  const fetchSessions = async () => {
    const response = await fetch('http://127.0.0.1:5000/get_sessions', {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      setSessions(data.sessions);
      if (data.sessions.length > 0) {
        setCurrentSession(data.sessions[0]);
      }
    } else {
      console.error('Failed to fetch sessions');
    }
  };

  useEffect(() => {
    fetchSessions();  // Fetch sessions at the beginning
  }, []);
  const createNewSession = async () => {
    const response = await fetch('http://127.0.0.1:5000/add_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify()
    });

    if (response.ok) {
      const data = await response.json();
      const newSession = {
        id: data.session.id,
        title: data.session.title,
        created_at: data.session.created_at
      };
      setSessions([...sessions, newSession]);
      setCurrentSession(newSession);
      console.log(`New session created: ${data.session.id}`);
    } else {
      console.error('Failed to create a new session');
    }
  };


  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar
        sessions={sessions}
        currentSession={currentSession}
        setCurrentSession={setCurrentSession}
        createNewSession={createNewSession}
      />
      <Layout>
        <Header style={{ background: '#fff', padding: '0 32px', borderBottom: '1px solid #f0f0f0' }}>
          <h2>{currentSession ? currentSession.title : 'Select a session'}</h2>
        </Header>
        <Content style={{ padding: '16px' }}>
          {currentSession ? <ChatWindow session={currentSession} /> : <div>Please select a session to start chatting.</div>}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
