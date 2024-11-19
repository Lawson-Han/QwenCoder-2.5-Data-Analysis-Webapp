import React, { useState, useEffect } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Button, message, Upload } from 'antd';
import '../styles/FileUploader.css';

const FileUploader = ({ sessionId, onFileChange, uploadedFile }) => {
    const [fileList, setFileList] = useState(() => {
        if (uploadedFile) {
            return [{
                uid: '-1',
                name: uploadedFile.name,
                status: 'done',
                url: uploadedFile.filePath
            }];
        }
        return [];
    });

    useEffect(() => {
        if (uploadedFile) {
            setFileList([{
                uid: '-1',
                name: uploadedFile.name,
                status: 'done',
                url: uploadedFile.filePath
            }]);
        } else {
            setFileList([]);
        }
    }, [uploadedFile]);

    const props = {
        name: 'file',
        action: 'http://localhost:5001/upload',
        maxCount: 1,    
        accept: '.csv,.pdf',
        fileList: fileList,
        data: {
            session_id: sessionId
        },
        beforeUpload: (file) => {
            const isLt10M = file.size / 1024 / 1024 < 10;
            if (!isLt10M) {
                message.error('File must be smaller than 10MB');
                return Upload.LIST_IGNORE;
            }
            return true;
        },
        onChange(info) {
            if (info.file.status === 'done') {
                const filePath = info.file.response?.file_path;
                if (filePath) {
                    message.success(`${info.file.name} file uploaded successfully`);
                    onFileChange({
                        name: info.file.response?.file_name,
                        filePath: filePath
                    });
                }
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} file upload failed.`);
                onFileChange(null);
            } else if (info.file.status === 'removed') {
                onFileChange(null);
            }
            setFileList(info.fileList);
        },
        progress: {
            strokeColor: {
                '0%': '#108ee9',
                '100%': '#87d068',
            },
            strokeWidth: 3,
            format: (percent) => {
                const text = percent && `${parseFloat(percent.toFixed(0))}%`;
                return text;
            },
            size: 'small',
        },
        showUploadList: {
            extra: ({ size = 0 }) => (
                <span
                    style={{
                        color: 'grey',
                    }}
                >
                    ({(size / 1024 / 1024).toFixed(2)}MB)
                </span>
            ),
        },
    };

    return (
        <Upload {...props}>
            <Button
                icon={<UploadOutlined />}
                size="large"
                type="dashed"
            >
                Upload File
            </Button>
        </Upload>
    );
};

export default FileUploader;