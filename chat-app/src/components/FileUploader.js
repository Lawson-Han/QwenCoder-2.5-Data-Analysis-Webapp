import React, { useState } from 'react';
import { Upload, Button, List, Tag, Progress, message } from 'antd';
import { 
    UploadOutlined, 
    FileTextOutlined, 
    FilePdfOutlined, 
    DeleteOutlined 
} from '@ant-design/icons';
import '../styles/FileUploader.css';

const FileUploader = ({ sessionId }) => {
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [currentUpload, setCurrentUpload] = useState(null);

    const uploadProps = {
        name: 'file',
        multiple: true,
        accept: '.csv,.pdf',
        showUploadList: false,
        fileList: fileList,
        beforeUpload: (file) => {
            const isPDF = file.type === 'application/pdf';
            const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
            
            if (!isPDF && !isCSV) {
                message.error(`${file.name} is not a PDF or CSV file`);
                return Upload.LIST_IGNORE;
            }

            // 模拟上传进度
            setUploading(true);
            setCurrentUpload({
                file: file,
                progress: 0
            });

            // 这里添加实际的文件上传逻辑
            simulateUpload(file);
            
            return false;
        }
    };

    // 模拟上传进度的函数 (实际项目中替换为真实上传逻辑)
    const simulateUpload = (file) => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setCurrentUpload(prev => ({
                ...prev,
                progress: progress
            }));

            if (progress >= 100) {
                clearInterval(interval);
                setUploading(false);
                setFileList(prev => [...prev, {
                    uid: file.uid,
                    name: file.name,
                    status: 'done',
                    type: file.name.endsWith('.csv') ? 'csv' : 'pdf',
                    size: formatFileSize(file.size)
                }]);
                setCurrentUpload(null);
                message.success(`${file.name} uploaded successfully`);
            }
        }, 300);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleDelete = (uid) => {
        setFileList(prev => prev.filter(file => file.uid !== uid));
    };

    return (
        <div className="compact-uploader">
            <Upload {...uploadProps}>
                <Button 
                    icon={<UploadOutlined />}
                    loading={uploading}
                >
                    Upload
                </Button>
            </Upload>

            {currentUpload && (
                <div className="upload-progress">
                    <div className="progress-info">
                        <small>{currentUpload.file.name}</small>
                        <small>{currentUpload.progress}%</small>
                    </div>
                    <Progress 
                        percent={currentUpload.progress} 
                        size="small" 
                        status="active"
                        showInfo={false}
                    />
                </div>
            )}

            {fileList.length > 0 && (
                <List
                    className="compact-file-list"
                    size="small"
                    dataSource={fileList}
                    renderItem={file => (
                        <List.Item
                            actions={[
                                <DeleteOutlined 
                                    onClick={() => handleDelete(file.uid)}
                                    className="delete-icon"
                                />
                            ]}
                        >
                            <div className="file-item-content">
                                {file.type === 'csv' ? 
                                    <FileTextOutlined className="file-icon csv" /> : 
                                    <FilePdfOutlined className="file-icon pdf" />
                                }
                                <span className="file-name">{file.name}</span>
                                <Tag color={file.type === 'csv' ? 'blue' : 'red'}>
                                    {file.type.toUpperCase()}
                                </Tag>
                            </div>
                        </List.Item>
                    )}
                />
            )}
        </div>
    );
};

export default FileUploader; 