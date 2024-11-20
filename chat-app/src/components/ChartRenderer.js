import React from 'react';
import ReactECharts from 'echarts-for-react';

const ChartRenderer = ({ data, chartType }) => {
    const getChartOption = () => {
        switch(chartType) {
            case 'bar':
                return {
                    xAxis: {
                        type: 'category',
                        data: data.datasets.map(item => item[data.labels[0]])
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: [{
                        data: data.datasets.map(item => item[data.labels[1]]),
                        type: 'bar'
                    }]
                };
            // 添加其他图表类型...
        }
    };

    return <ReactECharts option={getChartOption()} />;
}; 