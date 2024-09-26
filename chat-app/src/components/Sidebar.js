// src/components/Sidebar.js

import React from 'react';
import { Menu, Layout } from 'antd';

const { Sider } = Layout;

const Sidebar = ({ sessions, currentSession, setCurrentSession }) => {
    return (
        <Sider
            breakpoint="lg"
            collapsedWidth="0"
            style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
            width={300}
        >
            <div className="sidebar-title">Chat List</div>
            <Menu mode="inline" selectedKeys={[String(currentSession.id)]}>
                {sessions.map(session => (
                    <Menu.Item
                        key={session.id}
                        onClick={() => setCurrentSession(session)}
                    >
                        {session.title}
                    </Menu.Item>
                ))}
            </Menu>
        </Sider>
    );
};

export default Sidebar;
