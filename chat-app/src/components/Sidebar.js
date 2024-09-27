import React, { useState } from 'react';
import { Menu, Layout, Button, Popconfirm } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ sessions, currentSession, setCurrentSession, createNewSession, deleteSession }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            breakpoint="lg"
            style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflowY: 'auto', height: '100vh' }}
            width={300}
        >
            <div className="sidebar-title">Chat List</div>
            <Menu mode="inline" selectedKeys={[currentSession ? String(currentSession.id) : 'new-chat']}>
                <Menu.Item key="new-chat" onClick={createNewSession} icon={<PlusOutlined />}>
                    New Chat
                </Menu.Item>
                {sessions.map(session => (
                    <Menu.Item 
                        key={session.id} 
                        onClick={() => setCurrentSession(session)} 

                    >
                        {collapsed ? (
                            `${session.title} #${session.id} ` 
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                <span style={{ flex: 1 }}>{session.title} {session.id} </span>
                                <span className="session-time" style={{ marginRight: 16 }}>
                                    created at: {new Date(session.created_at).toLocaleString(undefined, {
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                    })}
                                </span>
                            </div>
                        )}
                        {!collapsed && (
                            <Popconfirm
                                title="Are you sure to delete this session?"
                                onConfirm={() => deleteSession(session.id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    type="text"
                                    icon={<CloseOutlined />}
                                    style={{ color: 'red', padding: 0 }}
                                />
                            </Popconfirm>
                        )}
                    </Menu.Item>
                ))}
            </Menu>
        </Sider>
    );
};

export default Sidebar;
