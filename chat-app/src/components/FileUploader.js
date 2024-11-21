import React, { useState, useEffect } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Button, message, Upload, Modal, Table, Tooltip } from 'antd';
import { API_BASE_URL } from '../config';
import '../styles/FileUploader.css';

const FileUploader = ({ sessionId, onFileChange, uploadedFile }) => {
    const [fileList, setFileList] = useState([]);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handlePreview = async (file) => {
        try {
            setPreviewData(null);
            
            const response = await fetch(`${API_BASE_URL}/preview_csv`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_path: file.url || uploadedFile?.filePath
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load preview');
            }

            const data = await response.json();
            
            if (!data.columns || !data.dataSource) {
                throw new Error('Invalid preview data format');
            }

            const processedData = {
                columns: data.columns,
                dataSource: data.dataSource.map(row => {
                    const processedRow = {};
                    Object.entries(row).forEach(([key, value]) => {
                        processedRow[key] = value === null ? '-' : value;
                    });
                    return processedRow;
                })
            };

            setPreviewData(processedData);
            setPreviewVisible(true);
        } catch (error) {
            console.error('Error loading preview:', error);
            message.error(error.message || 'Error loading file preview');
        }
    };

    const props = {
        name: 'file',
        action: `${API_BASE_URL}/upload`,
        maxCount: 1,    
        accept: '.csv,.pdf',
        fileList: fileList,
        data: {
            session_id: sessionId
        },
        beforeUpload: (file) => {
            const isLt10M = file.size / 1024 / 1024 < 10;
            const isCsv = file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
            
            if (!isLt10M) {
                message.error('File must be smaller than 10MB');
                return Upload.LIST_IGNORE;
            }
            if (!isCsv) {
                message.error(`${file.name} is not a csv file.`);
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
        onPreview: handlePreview,
        progress: {
            strokeColor: {
                '0%': '#108ee9',
                '100%': '#87d068',
            },
            strokeWidth: 3,
            format: (percent) => percent && `${parseFloat(percent.toFixed(2))}%`,
            size: 'small',
        },
        showUploadList: {
            showPreviewIcon: true,
            showRemoveIcon: true,
        },
        itemRender: (originNode, file) => (
            <Tooltip title="Click to preview" placement="top" color="#3CB17A">
                <div style={{ 
                    cursor: 'pointer',
                   
                }}>
                    {originNode}
                </div>
            </Tooltip>
        )
    };

    return (
        <>
            <Upload {...props}>
                <Button
                    icon={<UploadOutlined />}
                    size="large"
                    type="dashed"
                    className="upload-button"
                >
                    {!isMobile && 'Upload File'}
                </Button>
            </Upload>
            
            <Modal
                title={`Preview: ${uploadedFile?.name}`}
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width={1200}
                centered
                style={{ 
                    maxWidth: '90vw',
                }}
            >
                {previewData && (
                    <Table
                        columns={previewData.columns.map(col => ({
                            ...col,
                            width: col.width || 120,
                            ellipsis: true
                        }))}
                        dataSource={previewData.dataSource}
                        scroll={{ 
                            x: previewData.columns.length * 120,
                            y: 500
                        }}
                        size="large"
                        pagination={false}
                    />
                )}
            </Modal>
        </>
    );
};

export default FileUploader;