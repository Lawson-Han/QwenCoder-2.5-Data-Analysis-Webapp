// src/App.js

import React, { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import 'antd/dist/reset.css';
import './styles/Sidebar.css';
import './styles/ChatWindow.css';

const { Header, Content } = Layout;

// Mock data for sessions
const sessionsData = [
  { id: 1, title: 'Session 1' },
  { id: 2, title: 'Session 2' },
  { id: 3, title: 'Session 3' }
];

function App() {
  const [currentSession, setCurrentSession] = useState(sessionsData[0]);  // Track current session

  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar
        sessions={sessionsData}
        currentSession={currentSession}
        setCurrentSession={setCurrentSession}
      />
      <Layout>
        <Header style={{ background: '#fff', padding: '0 32px', borderBottom: '1px solid #f0f0f0' }}>
          <h2>{currentSession.title}</h2>
        </Header>
        <Content style={{ padding: '16px' }}>
          <ChatWindow session={currentSession} />
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
