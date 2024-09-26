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
    const handleSendMessage = () => {
        if (newMessage.trim()) {
            setMessages([...messages, { from: 'user', text: newMessage }]);
            setNewMessage('');

            // Simulate bot response for testing
            setTimeout(() => {
                setMessages(prevMessages => [...prevMessages, { from: 'bot', text: `Echo: ${newMessage}` }]);
            }, 1000);
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
