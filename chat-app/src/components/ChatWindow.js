import React, { useState, useEffect } from 'react';
import { List, Input, Avatar } from 'antd';
import { UserOutlined, RobotFilled } from '@ant-design/icons';
import { io } from 'socket.io-client';

const { Search } = Input;

const ChatWindow = ({ session }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);

    // Connect to Socket.IO server and setup on first load
    useEffect(() => {
        const newSocket = io('http://127.0.0.1:5000');
        setSocket(newSocket);
        return () => newSocket.close(); // Disconnect on cleanup
    }, []);

    // Fetch all messages for the current session when it changes
    useEffect(() => {
        const fetchMessages = async () => {
            const response = await fetch(`http://127.0.0.1:5000/sessions/${session.id}/messages`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages);
            } else {
                console.error('Failed to fetch messages');
            }
        };

        fetchMessages();
    }, [session]);

    // Setup socket listeners only after messages have been initially fetched
    useEffect(() => {
        if (socket) {
            socket.on('receive_message', message => {
                setMessages(prevMessages => [...prevMessages, message]);
            });

            return () => {
                socket.off('receive_message');
            };
        }
    }, [socket]);

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            const userMessage = { from: 'user', text: newMessage };
            setMessages(prevMessages => [...prevMessages, userMessage]);
            setNewMessage('');

            // Send message to server
            socket.emit('send_message', { session_id: session.id, text: newMessage });
        }
    };

    return (
        <div className="chat-container">
            <div className="messages-container">
                <List
                    dataSource={messages}
                    renderItem={(msg) => (
                        <div className={`message-item ${msg.from === 'user' ? 'message-right' : 'message-left'}`}>
                            {msg.from === 'assistant' ? (
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
