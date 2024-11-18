import React, { useState, useEffect, useRef } from 'react';
import { List, Avatar, Input, Empty } from 'antd';
import { RobotFilled, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';

const { Search } = Input;

const ChatWindow = ({ session }) => {
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    useEffect(() => {
        if (session.id) {
            const fetchMessages = async () => {
                const response = await fetch(`${API_BASE_URL}/sessions/${session.id}/messages`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.ok) {
                    const data = await response.json();
                    setMessages(
                        data.messages.map(msg => ({
                            message: msg.text,
                            role: msg.role,
                            message_id: msg.message_id || null,
                        }))
                    );
                } else {
                    console.error('Failed to fetch messages');
                }
            };

            fetchMessages();
        }
    }, [session]);
    const initializeSocket = () => {
        const newSocket = io(SOCKET_URL);
        newSocket.on('receive_message', message => {
            setMessages(prevMessages => {
                console.log(message);
                if (message.done) {
                    setIsLoading(false);
                }
                const updatedMessages = [...prevMessages];
                const lastMessage = updatedMessages[updatedMessages.length - 1];

                if (message.text) {
                    if (
                        lastMessage &&
                        lastMessage.role === 'assistant' &&
                        lastMessage.message_id === message.message_id
                    ) {
                        updatedMessages[updatedMessages.length - 1] = {
                            ...lastMessage,
                            message: lastMessage.message + message.text,
                        };
                    } else {
                        updatedMessages.push({
                            role: 'assistant',
                            message: message.text,
                            message_id: message.message_id,
                        });
                        setCurrentAssistantMessageId(message.message_id);
                    }
                }

                return updatedMessages;
            });
        });

        setSocket(newSocket);
        return newSocket;
    };

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            const userMessage = { role: 'user', message: newMessage };
            setMessages(prevMessages => [...prevMessages, userMessage]);
            setIsLoading(true);

            if (!socket) {
                const newSocket = initializeSocket();
                newSocket.emit('send_message', { session_id: session.id, text: newMessage });
            } else {
                socket.emit('send_message', { session_id: session.id, text: newMessage });
            }

            setNewMessage('');
        }
    };

    useEffect(() => {
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [socket]);

    // empty styles

    const emptyContent = (
        <Empty className="empty-message"
            description={
                <>
                    <p>No messages here...</p>
                    <p type="secondary">Start your conversation by sending a message!</p>
                </>
            }

        />


    );

    return (
        <div className="chat-container">
            <div className="messages-container">
                <List
                    dataSource={messages}
                    renderItem={(msg, index) => (

                        <div className={`message-item ${msg.role === 'user' ? 'message-right' : 'message-left'}`}>
                            {msg.role === 'assistant' ? (
                                <>
                                    <Avatar size="middle" className="avatar" icon={<RobotFilled />} />
                                    <div className="message-bubble bot-message">
                                        <ReactMarkdown>{msg.message}</ReactMarkdown>

                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="message-bubble user-message">{msg.message}</div>
                                    <Avatar size="middle" className="avatar" icon={<UserOutlined />} />
                                </>
                            )}
                        </div>
                    )}
                    locale={{ emptyText: emptyContent }}
                />
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-container">
                <Search
                    placeholder="Type your question..."
                    enterButton="Send"
                    size="large"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onSearch={handleSendMessage}
                    loading={isLoading}
                />
            </div>
        </div>
    );
};

export default ChatWindow;
