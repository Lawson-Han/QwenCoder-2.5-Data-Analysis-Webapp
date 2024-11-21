import React from 'react';
import ChartRenderer from './ChartRenderer';
import { InfoCircleOutlined } from '@ant-design/icons';

const ChartContainer = ({ type, data, columns }) => {
    // 优化提示文字，使其更友好和易于理解
    const getChartHint = (type) => {
        const hints = {
            line: {
                title: "Time Series Visualization",
                desc: "This line chart helps you track changes and identify trends over time. Perfect for analyzing patterns and making predictions."
            },
            bar: {
                title: "Categorical Comparison",
                desc: "This bar chart makes it easy to compare values across different categories, highlighting the differences and similarities between groups."
            },
            column: {
                title: "Group Distribution",
                desc: "This column chart visualizes how values are distributed across different groups, making it easy to spot patterns and outliers."
            },
            pie: {
                title: "Proportion Analysis",
                desc: "This pie chart shows how different parts contribute to the whole, perfect for understanding proportions and percentages."
            },
            scatter: {
                title: "Correlation View",
                desc: "This scatter plot reveals relationships between variables, helping you identify patterns and potential correlations in your data."
            }
        };
        return hints[type] || {
            title: "Data Visualization",
            desc: "A visual representation of your data query results."
        };
    };

    const hint = getChartHint(type);

    return (
        <div className="chart-container" style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            margin: '24px 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
            <div style={{
                marginBottom: '20px',
                borderBottom: '1px solid #f0f0f0',
                paddingBottom: '12px'
            }}>
                <h4 style={{
                    margin: 0,
                    color: '#1f1f1f',
                    fontSize: '16px',
                    fontWeight: 500
                }}>
                    {hint.title}
                </h4>
            </div>
            
            <ChartRenderer
                type={type}
                data={data}
                columns={columns}
            />
            
            <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
            }}>
                <InfoCircleOutlined style={{ 
                    color: '#1890ff',
                    marginTop: '3px'
                }} />
                <span style={{
                    color: '#595959',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    fontWeight: 400
                }}>
                    {hint.desc}
                </span>
            </div>
        </div>
    );
};

export default ChartContainer; 