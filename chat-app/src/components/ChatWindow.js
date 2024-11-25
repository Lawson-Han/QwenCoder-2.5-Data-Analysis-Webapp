import React, { useState, useEffect, useRef } from 'react';
import { List, Avatar, Input, Empty, Button, message, Typography, Table } from 'antd';
import { RobotFilled, UserOutlined, WifiOutlined, LoadingOutlined, DownloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import FileUploader from './FileUploader';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import ChartContainer from './ChartContainer';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const { Text } = Typography;
const ChatWindow = ({ session }) => {
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [showInitializing, setShowInitializing] = useState(false);
    const [initializingText, setInitializingText] = useState('');
    const chartRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    useEffect(() => {
        if (session.id) {
            const fetchSessionData = async () => {
                try {
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
                        console.log("data:", data);
                        setMessages(
                            data.messages.map(msg => ({
                                message: msg.text,
                                role: msg.role,
                                message_id: msg.id,
                                tableData: msg.table_data,
                                chart_type: msg.type
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

        newSocket.on('message_received', () => {
            console.log('Message received confirmation from server');
            setInitializingText('analyzing');
        });

        newSocket.on('receive_message', message => {
            setShowInitializing(false);

            setMessages(prevMessages => {
                const updatedMessages = [...prevMessages];
                const lastMessage = updatedMessages[updatedMessages.length - 1];

                if (message.table_data) {
                    if (lastMessage && lastMessage.role === 'assistant') {
                        updatedMessages[updatedMessages.length - 1] = {
                            ...lastMessage,
                            tableData: message.table_data,
                            chart_type: message.chart_type
                        };
                        console.log("chart_type:", message.chart_type);
                    }
                } else if (message.text) {
                    if (lastMessage &&
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
                    }
                }

                if (message.done) {
                    setIsLoading(false);
                }
                return updatedMessages;
            });
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
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
            setShowInitializing(true);
            setInitializingText('connection');

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

    const handleTableExport = (data, type) => {
        if (type === 'csv') {
            const headers = data.columns.map(col => col.title).join(',');
            const rows = data.dataSource.map(row =>
                data.columns.map(col => row[col.dataIndex]).join(',')
            ).join('\n');
            const csvContent = `${headers}\n${rows}`;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'table-export.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } else if (type === 'pdf') {
            const doc = new jsPDF();
            
            // 设置标题
            doc.setFontSize(16);
            doc.text('Data Export', 14, 15);
            
            // 准备表格数据
            const headers = data.columns.map(col => col.title);
            const rows = data.dataSource.map(row =>
                data.columns.map(col => {
                    const value = row[col.dataIndex];
                    return value === null || value === undefined ? '-' : String(value);
                })
            );

            // 生成表格
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 25,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak',
                    cellWidth: 'wrap'
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    // 可以在这里为特定列设置样式
                    // 例如: 0: {cellWidth: 30}
                },
                margin: { top: 25 },
                didDrawPage: function(data) {
                    // 添加页脚
                    doc.setFontSize(8);
                    doc.text(
                        `Generated on ${new Date().toLocaleString()}`,
                        data.settings.margin.left,
                        doc.internal.pageSize.height - 10
                    );
                }
            });

            // 保存文件
            doc.save('table-export.pdf');
        }
    };

    const handleChartExport = (chartRef) => {
        try {
            if (!chartRef?.current) {
                message.error('Chart reference not found');
                return;
            }

            const canvas = chartRef.current.querySelector('canvas');
            if (!canvas) {
                message.error('Canvas element not found');
                return;
            }

            // 创建一个新的 canvas 以保持原始质量
            const newCanvas = document.createElement('canvas');
            const context = newCanvas.getContext('2d');

            // 设置与原始 canvas 相同的尺寸
            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height;

            // 添加白色背景
            context.fillStyle = '#FFFFFF';
            context.fillRect(0, 0, newCanvas.width, newCanvas.height);

            // 绘制原始 canvas 内容
            context.drawImage(canvas, 0, 0);

            // 尝试以更高质量导出
            newCanvas.toBlob((blob) => {
                if (!blob) {
                    message.error('Failed to generate image');
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `chart-${Date.now()}.png`;  // 添加时间戳避免重名

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // 清理 URL 对象
                URL.revokeObjectURL(url);
                message.success('Chart exported successfully');
            }, 'image/png', 1.0);  // 使用 PNG 格式和最高质量

        } catch (error) {
            console.error('Chart export failed:', error);
            message.error('Failed to export chart');
        }
    };

    const renderMessageContent = (msg) => (
        <>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const content = String(children).replace(/\n$/, '');
                        // 判断是否是行内代码
                        if (inline || !className) {
                            // 处理行内代码
                            return (
                                <code style={{
                                    backgroundColor: '#f6f8fa',           // 浅灰色背景
                                    color: '#d56161',                     // 柔和的橙红色
                                    padding: '2px 6px',                   // 简洁的内边距
                                    borderRadius: '4px',                  // 适度的圆角
                                    fontFamily: 'Consolas, SF Mono, Menlo, Andale Mono, Monaco, PT Mono, monospace',
                                    fontSize: '0.9em',                    // 稍小的字号
                                }}>
                                    {content}
                                </code>
                            );
                        } else {
                            // 提取语言类型
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            // 处理代码块
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
                    }
                }}
            >
                {msg.message}
            </ReactMarkdown>

            {msg.tableData && (!msg.chart_type || msg.chart_type === 'query') && (
                <div style={{ marginTop: msg.message ? '16px' : 0 }}>

                    <Table
                        columns={msg.tableData.columns.map(col => ({
                            ...col,
                            key: col.dataIndex || col.key || col.title,
                        }))}
                        dataSource={msg.tableData.dataSource.map((item, idx) => ({
                            ...item,
                            key: item.key || `row-${idx}`,
                        }))}
                        scroll={{ x: true }}
                        size="large"
                        pagination={{
                            hideOnSinglePage: true,    // 只有一页时隐藏分页器
                            pageSize: 10               // 每页显示的条数，可以根据需要调整
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                        <Button.Group size="large">
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={() => handleTableExport(msg.tableData, 'csv')}
                            >
                                Export CSV
                            </Button>
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={() => handleTableExport(msg.tableData, 'pdf')}
                            >
                                Export PDF
                            </Button>
                        </Button.Group>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="chat-container">
            <div className="messages-container">
                <List
                    dataSource={messages}
                    renderItem={(msg, index) => (
                        <React.Fragment key={msg.message_id || `msg-${index}`}>
                            <div className={`message-item ${msg.role === 'user' ? 'message-right' : 'message-left'}`}>
                                {msg.role === 'assistant' ? (
                                    <>
                                        <Avatar size="middle" className="avatar" icon={<RobotFilled />} />
                                        <div className="message-bubble bot-message">
                                            {renderMessageContent(msg)}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="message-bubble user-message">{msg.message}</div>
                                        <Avatar size="middle" className="avatar" icon={<UserOutlined />} />
                                    </>
                                )}
                            </div>

                            {msg.role === 'assistant' && msg.tableData && msg.chart_type && msg.chart_type !== 'query' && (
                                <div className="chart-wrapper" style={{
                                    marginLeft: '48px',
                                    marginRight: '48px',
                                    marginTop: '16px'
                                }}>

                                    <ChartContainer
                                        type={msg.chart_type}
                                        data={msg.tableData.dataSource}
                                        columns={msg.tableData.columns}
                                        ref={chartRef}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                                        <Button
                                            size="large"
                                            icon={<DownloadOutlined />}
                                            onClick={() => handleChartExport(chartRef)}
                                        >
                                            Export Chart
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {showInitializing && index === messages.length - 1 && msg.role === 'user' && (
                                <div className="message-item message-left">
                                    <Avatar size="middle" className="avatar" icon={<RobotFilled />} />
                                    <div className={`message-bubble bot-message initializing-message ${initializingText}-stage`}>
                                        <div className="initializing-content">
                                            {initializingText === 'connection' ? (
                                                <>
                                                    <div className="stage-icon">
                                                        <div className="pulse-ring"></div>
                                                        <WifiOutlined />
                                                    </div>
                                                    <span className="initializing-text">Establishing secure connection...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="stage-icon">
                                                        <LoadingOutlined spin />
                                                    </div>
                                                    <span className="initializing-text">Analyzing your request...</span>
                                                    <div className="progress-bar">
                                                        <div className="progress-fill"></div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    )}
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
