/**
 * Earnings Chart Component
 * Displays monthly revenue trend using Chart.js
 */

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EarningsChart = ({ data }) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Transform data for chart
  const labels = data.map(item => `${monthNames[item._id.month - 1]} ${item._id.year}`);
  const earnings = data.map(item => item.totalEarnings);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Monthly Earnings (ETB)',
        data: earnings,
        borderColor: 'rgb(217, 119, 6)',
        backgroundColor: 'rgba(217, 119, 6, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(217, 119, 6)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Earnings: ${context.parsed.y.toFixed(2)} ETB`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value.toFixed(0) + ' ETB';
          },
        },
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No earnings data available yet. Start selling to see your revenue trend!</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default EarningsChart;
