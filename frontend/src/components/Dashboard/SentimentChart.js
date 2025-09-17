import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SentimentChart = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sentiment Trends
          </h2>
        </div>
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Mock data if no data provided
  const chartData = data.length > 0 ? data : [
    { time: '9AM', positive: 65, negative: 20, neutral: 15 },
    { time: '10AM', positive: 70, negative: 15, neutral: 15 },
    { time: '11AM', positive: 55, negative: 30, neutral: 15 },
    { time: '12PM', positive: 80, negative: 10, neutral: 10 },
    { time: '1PM', positive: 60, negative: 25, neutral: 15 },
    { time: '2PM', positive: 75, negative: 15, neutral: 10 },
    { time: '3PM', positive: 85, negative: 10, neutral: 5 },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sentiment Trends
        </h2>
      </div>
      <div className="card-body">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="positive" stackId="a" fill="#22C55E" name="Positive" />
              <Bar dataKey="negative" stackId="a" fill="#EF4444" name="Negative" />
              <Bar dataKey="neutral" stackId="a" fill="#6B7280" name="Neutral" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Positive</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Negative</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Neutral</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentChart;






