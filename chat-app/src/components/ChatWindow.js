import React, { useState, useEffect, useRef } from 'react';
import { List, Avatar, Input, Empty, Upload, Button, message, Typography } from 'antd';
import { RobotFilled, UserOutlined, UploadOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import FileUploader from './FileUploader';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const { Search } = Input;
const { Text } = Typography;
const ChatWindow = ({ session }) => {
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

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

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragIn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = [...e.dataTransfer.files];
        handleFiles(files);
    };

    const handleFiles = (files) => {
        files.forEach(file => {
            const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
            const isPDF = file.type === 'application/pdf';

            if (isCSV || isPDF) {
                // Handle file upload
                console.log('Uploading file:', file.name);
                message.success(`Preparing to upload ${file.name}`);
            } else {
                message.error(`${file.name} is not a supported file type`);
            }
        });
    };

    return (
        <div
            className={`chat-container ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {isDragging && (
                <div className="drag-overlay">
                    <div className="drag-overlay-content">
                        <div className="file-icons">
                            <FileTextOutlined className="file-icon csv" />
                            <FilePdfOutlined className="file-icon pdf" />
                        </div>
                        <h3>Drop your files here</h3>
                        <p>Support for CSV and PDF files</p>
                    </div>
                </div>
            )}

            <div className="messages-container">
                <List
                    dataSource={messages}
                    renderItem={(msg, index) => (
                        <div className={`message-item ${msg.role === 'user' ? 'message-right' : 'message-left'}`}>
                            {msg.role === 'assistant' ? (
                                <>
                                    <Avatar size="middle" className="avatar" icon={<RobotFilled />} />
                                    <div className="message-bubble bot-message">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    // 获取纯文本内容
                                                    const content = String(children).replace(/\n$/, '');

                                                    // 检查是否是代码块 (被 ``` 包围)
                                                    const isCodeBlock = content.includes('\n') || content.length > 50;  // 通常代码块会有换行或较长

                                                    if (!isCodeBlock) {
                                                        // 行内代码 (`code`)
                                                        return (
                                                            <code
                                                                style={{
                                                                    backgroundColor: '#24292e',  // GitHub Dark 风格的背景色
                                                                    color: '#e6f1ff',           // 柔和的浅色文字
                                                                    padding: '0.2em 0.4em',
                                                                    borderRadius: '4px',
                                                                    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
                                                                    fontSize: '0.9em'
                                                                }}
                                                                {...props}
                                                            >
                                                                {content}
                                                            </code>
                                                        );
                                                    }

                                                    // 代码块 (```code```)
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const language = match ? match[1] : '';

                                                    return (
                                                        <div style={{ position: 'relative' }}>
                                                            <Text
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: '10px',
                                                                    top: '10px',
                                                                    fontSize: 'xs',
                                                                    fontWeight: 'bold',
                                                                    color: '#bbb',
                                                                    padding: '6px 8px',
                                                                    borderRadius: 'md',
                                                                    textTransform: 'uppercase'
                                                                }}
                                                            >
                                                                {language}
                                                            </Text>
                                                            <SyntaxHighlighter
                                                                language={language}
                                                                style={oneDark}
                                                                wrapLongLines
                                                                customStyle={{
                                                                    backgroundColor: '#1E1E1E',
                                                                    color: '#D4D4D4',

                                                                    borderRadius: '10px',
                                                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
                                                                }}
                                                                codeTagProps={{
                                                                    style: {
                                                                        color: '#9CDCFE',
                                                                        fontFamily: 'Consolas, SF Mono, Menlo, Andale Mono, Monaco, PT Mono, monospace'
                                                                    },
                                                                }}
                                                            >
                                                                {content}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.message}
                                        </ReactMarkdown>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="message-bubble user-message">{msg.message}</div>
                                    <Avatar size="middle" className="avatar" icon={<UserOutlined />} />
                                </>
                            )}
                        </div>
                    )
                    }
                    locale={{ emptyText: emptyContent }}
                />
                < div ref={messagesEndRef} />
            </div >
            <div className="chat-input-container">
                <Upload
                    accept=".csv,.pdf"
                    showUploadList={false}
                    beforeUpload={(file) => {
                        handleFiles([file]);
                        return false;
                    }}
                >
                    <Button icon={<UploadOutlined />} />
                </Upload>
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
        </div >
    );
};

export default ChatWindow;
