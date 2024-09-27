import React, { useState } from 'react';
import { Menu, Layout } from 'antd';
import { PlusOutlined} from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ sessions, currentSession, setCurrentSession, createNewSession }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            breakpoint="lg"
            style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
            width={300}
        >
            <div className="sidebar-title">Chat List</div>
            <Menu mode="inline" selectedKeys={[currentSession ? String(currentSession.id) : 'new-chat']}>
                <Menu.Item key="new-chat" onClick={createNewSession} icon={<PlusOutlined />}>
                    New Chat
                </Menu.Item>
                {sessions.map(session => (
                    <Menu.Item key={session.id} onClick={() => setCurrentSession(session)}>
                        {session.title}
                        <div className="session-time">
                            created at: {new Date(session.created_at).toLocaleString(undefined, {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            })}
                        </div>
                    </Menu.Item>
                ))}
            </Menu>
        </Sider>
    );
};


export default Sidebar;
