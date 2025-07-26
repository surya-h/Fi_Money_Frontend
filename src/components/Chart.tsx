import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      borderWidth?: number;
    }>;
  };
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartComponentProps {
  chartData: ChartData;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ chartData }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'var(--text-primary)',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: true,
        text: chartData.title,
        color: 'var(--text-primary)',
        font: {
          size: 16,
          weight: 600,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'var(--accent-primary)',
        borderWidth: 1,
      },
    },
    scales: chartData.type !== 'pie' && chartData.type !== 'doughnut' ? {
      x: {
        ticks: {
          color: 'var(--text-secondary)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        ticks: {
          color: 'var(--text-secondary)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    } : undefined,
  };

  // Apply default colors if not provided
  const processedData = {
    ...chartData.data,
    datasets: chartData.data.datasets.map((dataset) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || (
        chartData.type === 'pie' || chartData.type === 'doughnut'
          ? [
              'rgba(0, 194, 159, 0.8)',
              'rgba(41, 182, 246, 0.8)',
              'rgba(255, 193, 7, 0.8)',
              'rgba(76, 175, 80, 0.8)',
              'rgba(244, 67, 54, 0.8)',
              'rgba(156, 39, 176, 0.8)',
            ]
          : `rgba(0, 194, 159, ${chartData.type === 'line' ? 0.2 : 0.8})`
      ),
      borderColor: dataset.borderColor || 'rgba(0, 194, 159, 1)',
      borderWidth: dataset.borderWidth || (chartData.type === 'line' ? 3 : 1),
    })),
  };

  const renderChart = () => {
    switch (chartData.type) {
      case 'line':
        return <Line data={processedData} options={options} />;
      case 'bar':
        return <Bar data={processedData} options={options} />;
      case 'pie':
        return <Pie data={processedData} options={options} />;
      case 'doughnut':
        return <Doughnut data={processedData} options={options} />;
      default:
        return <div>Unsupported chart type: {chartData.type}</div>;
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      margin: '16px 0',
      border: '1px solid var(--bg-border)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{ height: '300px', position: 'relative' }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartComponent;