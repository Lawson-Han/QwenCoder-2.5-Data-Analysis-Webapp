import React, { useState } from 'react';
import { Menu, Layout, Button, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ sessions, currentSession, setCurrentSession, createNewSession, deleteSession }) => {
    const [collapsed, setCollapsed] = useState(false);

    // Generate menu items
    const items = [
        {
            key: 'new-chat',
            icon: <PlusOutlined />,
            onClick: createNewSession,
            label: 'New Chat',
        },
        ...sessions.map((session) => ({
            key: String(session.id),
            onClick: () => setCurrentSession(session),
            label: collapsed ? (
                `${session.title} #${session.id}`
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Tooltip
                        title={`Created at: ${new Date(session.created_at).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                        })}`}
                        placement="right"
                    >
                        <span style={{ flex: 1 }}>
                            {session.title} {session.id}
                        </span>
                    </Tooltip>
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
                </div>
            ),
        })),
    ];

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            breakpoint="lg"
            style={{
                background: '#fff',
                borderRight: '1px solid #f0f0f0',
                overflowY: 'auto',
                height: '100vh',
            }}
            width={300}
        >
            <div className="sidebar-title">Chat List</div>
            <Menu
                mode="inline"
                selectedKeys={[currentSession ? String(currentSession.id) : 'new-chat']}
                items={items}
            />
        </Sider>
    );
};

export default Sidebar;
