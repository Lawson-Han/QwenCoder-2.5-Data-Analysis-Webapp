import React, { useEffect, useRef } from 'react';
import { Line, Column, Bar, Pie, Scatter } from '@antv/g2plot';

const ChartRenderer = ({ type, data, columns }) => {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !data || data.length === 0) return;

        // 清理旧的图表实例
        const cleanup = () => {
            if (chartRef.current) {
                try {
                    chartRef.current.destroy();
                } catch (e) {
                    console.warn('Chart cleanup error:', e);
                }
                chartRef.current = null;
            }
        };

        // 先清理旧实例
        cleanup();

        // 获取数值类型的列
        const numericColumns = columns.filter(col => 
            typeof data[0][col.dataIndex] === 'number'
        ).map(col => col.dataIndex);

        // 获取非数值类型的列
        const categoryColumns = columns.filter(col => 
            typeof data[0][col.dataIndex] !== 'number'
        ).map(col => col.dataIndex);

        // 基础配置
        const baseConfig = {
            data,
            padding: 'auto',
            theme: 'light',
            animation: true,
            appendPadding: [10, 0, 0, 0],
        };

        let chartConfig = null;

        // 根据图表类型创建不同的配置
        if (type === 'line') {
            chartConfig = {
                ...baseConfig,
                xField: categoryColumns[0],
                yField: numericColumns[0],
                point: { size: 5, shape: 'circle' },
                smooth: true,
            };
            chartRef.current = new Line(containerRef.current, chartConfig);
        } else if (type === 'bar') {
            chartConfig = {
                ...baseConfig,
                xField: numericColumns[0],
                yField: categoryColumns[0],
                seriesField: categoryColumns[1],
            };
            chartRef.current = new Bar(containerRef.current, chartConfig);
        } else if (type === 'column') {
            chartConfig = {
                ...baseConfig,
                xField: categoryColumns[0],
                yField: numericColumns[0],
                seriesField: categoryColumns[1],
            };
            chartRef.current = new Column(containerRef.current, chartConfig);
        } else if (type === 'pie') {
            chartConfig = {
                ...baseConfig,
                angleField: numericColumns[0],
                colorField: categoryColumns[0],
                radius: 0.8,
                label: {
                    type: 'outer',
                },
            };
            chartRef.current = new Pie(containerRef.current, chartConfig);
        } else if (type === 'scatter') {
            chartConfig = {
                ...baseConfig,
                xField: numericColumns[0],
                yField: numericColumns[1],
                colorField: categoryColumns[0],
                size: 5,
            };
            chartRef.current = new Scatter(containerRef.current, chartConfig);
        } else {
            console.warn('Unsupported chart type:', type);
            return;
        }

        try {
            if (chartRef.current) {
                chartRef.current.render();
            }
        } catch (e) {
            console.error('Chart rendering error:', e);
        }

        // 组件卸载时清理
        return cleanup;
    }, [type, data, columns]);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: '100%', 
                height: '400px',
                marginTop: '16px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }} 
        />
    );
};

export default ChartRenderer; 