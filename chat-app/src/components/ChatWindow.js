// src/components/ChatWindow.js

import React, { useState, useEffect } from 'react';
import { List, Input, Avatar } from 'antd';
import { UserOutlined, RobotFilled } from '@ant-design/icons';
const { Search } = Input;

const ChatWindow = ({ session }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    // Fetch messages when the session changes
    useEffect(() => {
        setMessages([
            { from: 'user', text: `Hello from ${session.title}` },
            { from: 'bot', text: `Hi! This is a response from ${session.title}` },
            { from: 'user', text: `Hello from ${session.title}` },
            { from: 'bot', text: `Hi! This is a response from ${session.title}` }
        ]);
    }, [session]);

    // Sending a new message
    const handleSendMessage = async () => {
        if (newMessage.trim()) {
            setMessages([...messages, { from: 'user', text: newMessage }]);
            setNewMessage('');

            const response = await fetch(`http://127.0.0.1:5000/sessions/${session.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newMessage }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessages(prevMessages => [...prevMessages, { from: 'bot', text: data.response }]);
            } else {
                console.error(data.error);
            }
        }
    };

    return (
        <div className="chat-container">
            <div className="messages-container">
                <List
                    dataSource={messages}
                    renderItem={(msg) => (
                        <div className={`message-item ${msg.from === 'user' ? 'message-right' : 'message-left'}`}>
                            {msg.from === 'bot' ? (
                                <>
                                    <Avatar size="middle" className="avatar" icon={<RobotFilled />} />
                                    <div className="message-bubble bot-message">
                                        {msg.text}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="message-bubble user-message">
                                        {msg.text}
                                    </div>
                                    <Avatar size="middle" className="avatar" icon={<UserOutlined />} />
                                </>
                            )}
                        </div>
                    )}
                />
            </div>
            <div className="chat-input-container">
                <Search
                    placeholder="Type your question..."
                    enterButton="Send"
                    size="large"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onSearch={handleSendMessage}
                />
            </div>
        </div>
    );
};

export default ChatWindow;
