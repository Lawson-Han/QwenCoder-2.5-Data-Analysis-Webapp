import React, { useState } from 'react';
import { Upload, Button, List, Tag, Modal, message } from 'antd';
import { 
    UploadOutlined, 
    FileTextOutlined, 
    FilePdfOutlined, 
    DeleteOutlined, 
    EyeOutlined,
    InboxOutlined
} from '@ant-design/icons';
import '../styles/FileUploader.css';

const { Dragger } = Upload;

const FileUploader = ({ sessionId }) => {
    const [fileList, setFileList] = useState([]);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    const uploadProps = {
        name: 'file',
        multiple: true,
        accept: '.csv,.pdf',
        showUploadList: true,
        beforeUpload: (file) => {
            const isPDF = file.type === 'application/pdf';
            const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
            if (!isPDF && !isCSV) {
                message.error(`${file.name} is not a PDF or CSV file`);
                return Upload.LIST_IGNORE;
            }
            return false;
        },
        onChange: (info) => {
            const { status } = info.file;
            if (status !== 'uploading') {
                console.log(info.file, info.fileList);
            }
            if (status === 'done') {
                message.success(`${info.file.name} file uploaded successfully.`);
            } else if (status === 'error') {
                message.error(`${info.file.name} file upload failed.`);
            }
        },
        onDrop(e) {
            console.log('Dropped files', e.dataTransfer.files);
        },
    };

    return (
        <div className="file-uploader-container">
            <div className="upload-section">
                <Dragger {...uploadProps}>
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag files to this area to upload</p>
                    <p className="ant-upload-hint">
                        Support for CSV and PDF files. Strict security checks are implemented.
                    </p>
                    <div className="upload-types">
                        <Tag color="blue" icon={<FileTextOutlined />}>CSV</Tag>
                        <Tag color="red" icon={<FilePdfOutlined />}>PDF</Tag>
                    </div>
                </Dragger>
            </div>

            <div className="files-list-section">
                <h3>Uploaded Files</h3>
                <List
                    className="file-list"
                    itemLayout="horizontal"
                    dataSource={fileList}
                    locale={{ emptyText: 'No files uploaded yet' }}
                    renderItem={(file) => (
                        <List.Item
                            className="file-list-item"
                            actions={[
                                <Button
                                    type="text"
                                    icon={<EyeOutlined />}
                                    className="action-button preview-button"
                                    onClick={() => {/* handle preview */}}
                                >
                                    Preview
                                </Button>,
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    className="action-button delete-button"
                                    onClick={() => {/* handle delete */}}
                                >
                                    Delete
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <div className="file-icon">
                                        {file.type === 'csv' ? <FileTextOutlined /> : <FilePdfOutlined />}
                                    </div>
                                }
                                title={file.name}
                                description={
                                    <div className="file-info">
                                        <Tag color={file.type === 'csv' ? 'blue' : 'red'}>
                                            {file.type.toUpperCase()}
                                        </Tag>
                                        <span className="file-size">{file.size}</span>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </div>
        </div>
    );
};

export default FileUploader; 