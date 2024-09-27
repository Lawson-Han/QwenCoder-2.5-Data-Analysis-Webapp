import React from 'react';
import { Card, Typography, Button } from 'antd';
import logo from '../logo.svg';
import '../App.css'; 

const { Title, Paragraph, Link } = Typography;

const DefaultTab = ({ createNewSession }) => {
    return (
        <Card style={{ textAlign: 'center', padding: '40px', background: 'none' }}>
            <img src={logo} className="App-logo" alt="logo" />
            <Title level={2}>Welcome to the ChatGPT-like Application</Title>
            <Paragraph>To begin, start a new session from here.</Paragraph>
            <Button type="primary" onClick={createNewSession}>
                Start Chatting
            </Button>
            <Paragraph style={{ marginTop: '60px' }}>
                Documentation? Check out my <Link href="https://github.com/Lawson-Han" target="_blank">GitHub repository</Link>
            </Paragraph>
        </Card>
    );
};

export default DefaultTab;
