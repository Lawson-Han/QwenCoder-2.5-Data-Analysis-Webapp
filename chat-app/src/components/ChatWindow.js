import React, { useState, useEffect, useRef } from 'react';
import { List, Avatar, Input, Empty, Button, message, Typography } from 'antd';
import { RobotFilled, UserOutlined,} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import FileUploader from './FileUploader';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const { Text } = Typography;
const ChatWindow = ({ session }) => {
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [uploadedFile, setUploadedFile] = useState(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    useEffect(() => {
        if (session.id) {
            const fetchSessionData = async () => {
                try {
                    // 并行获取消息和文件信息
                    const [messagesResponse, fileResponse] = await Promise.all([
                        fetch(`${API_BASE_URL}/sessions/${session.id}/messages`, {
                            method: 'GET',
                            headers: { 'Content-Type': 'application/json' },
                        }),
                        fetch(`${API_BASE_URL}/sessions/${session.id}/file`, {
                            method: 'GET',
                            headers: { 'Content-Type': 'application/json' },
                        })
                    ]);

                    // 处理消息数据
                    if (messagesResponse.ok) {
                        const data = await messagesResponse.json();
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

                    // 处理文件数据
                    if (fileResponse.ok) {
                        const data = await fileResponse.json();
                        if (data.file) {
                            setUploadedFile({
                                name: data.file.file_name,
                                filePath: data.file.file_path
                            });
                        }
                        console.log("data")
                        console.log(data.file)
                    }
                } catch (error) {
                    console.error('Failed to fetch session data:', error);
                }
            };

            fetchSessionData();
        }
    }, [session.id]);

    const initializeSocket = () => {
        const newSocket = io(SOCKET_URL);
        newSocket.on('receive_message', message => {
            setMessages(prevMessages => {
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

    const handleFileChange = (fileInfo) => {
        setUploadedFile(fileInfo);
    };

    const handleSendMessage = () => {


        if (!uploadedFile) {
            message.warning('Please upload a CSV or PDF file before sending messages');
            return;
        }

        if (newMessage.trim()) {
            const userMessage = { role: 'user', message: newMessage };
            setMessages(prevMessages => [...prevMessages, userMessage]);
            setIsLoading(true);

            if (!socket) {
                const newSocket = initializeSocket();
                newSocket.emit('send_message', { 
                    session_id: session.id, 
                    text: newMessage,
                });
            } else {
                socket.emit('send_message', { 
                    session_id: session.id, 
                    text: newMessage,
                });
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
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    // 获取纯文本内容
                                                    const content = String(children).replace(/\n$/, '');

                                                    // 代码块 (```code```)
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const language = match ? match[1] : '';

                                                    return (
                                                        <div style={{ position: 'relative' }}>
                                                            <Text
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: '10px',
                                                                    top: '8px',
                                                                    fontSize: 'xs',
                                                                    fontWeight: 'bold',
                                                                    color: '#bbb',
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
                                                                    padding: "26px 30px 20px 20px",
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


            <div className="chat-input-wrapper">
                <div className="chat-input-container">
                    <FileUploader 
                        sessionId={session.id} 
                        onFileChange={setUploadedFile}
                        uploadedFile={uploadedFile}
                    />
                    <Input
                        placeholder={uploadedFile 
                            ? "Type your question here..." 
                            : "Please upload a file first"}
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onPressEnter={handleSendMessage}
                        className="chat-input"
                    />
                    <Button
                        type="primary"
                        onClick={handleSendMessage}
                        loading={isLoading}
                        className="submit-button"
                    >
                        Send
                    </Button>
                </div>
            </div>
        </div >
    );
};

export default ChatWindow;
