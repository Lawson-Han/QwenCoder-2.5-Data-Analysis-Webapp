import React from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Button, message, Upload } from 'antd';
import '../styles/FileUploader.css';

const props = {
    name: 'file',
    action: 'http://localhost:5001/upload',
    maxCount: 1,
    accept: '.csv,.pdf',
    beforeUpload: (file) => {
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            message.error('File must be smaller than 10MB');
            return Upload.LIST_IGNORE;
        }
        return true;
    },
    onChange(info) {
        if (info.file.status !== 'uploading') {
            console.log(info.file, info.fileList);
        }
        if (info.file.status === 'done') {
            message.success(`${info.file.name} file uploaded successfully`);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} file upload failed.`);
        }
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

const FileUploader = () => (
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

export default FileUploader;