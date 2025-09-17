import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import LoadingSpinner from '../Common/LoadingSpinner';

const StockChart = ({ symbol, period = '1mo', interval = '1d' }) => {
  const { theme } = useTheme();
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line'); // line, area, bar
  const [timeframe, setTimeframe] = useState(period);

  const timeframes = [
    { label: '1D', value: '1d' },
    { label: '5D', value: '5d' },
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
    { label: '5Y', value: '5y' },
    { label: 'Max', value: 'max' }
  ];

  const chartTypes = [
    { label: 'Line', value: 'line' },
    { label: 'Area', value: 'area' },
    { label: 'Bar', value: 'bar' }
  ];

  // Fetch stock data when symbol or timeframe changes
  useEffect(() => {
    if (symbol) {
      fetchStockData(symbol, timeframe);
    }
  }, [symbol, timeframe]);

  const fetchStockData = async (stockSymbol, timePeriod) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stocks/${stockSymbol}/history?period=${timePeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      
      const data = await response.json();
      if (data.success) {
        setStockData(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch stock data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const chartData = useMemo(() => {
    if (!stockData?.priceHistory) return [];
    
    return stockData.priceHistory.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      timestamp: new Date(item.date).getTime(),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseInt(item.volume),
      change: parseFloat(item.close) - parseFloat(item.open),
      changePercent: ((parseFloat(item.close) - parseFloat(item.open)) / parseFloat(item.open)) * 100
    }));
  }, [stockData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!chartData.length) return null;
    
    const prices = chartData.map(d => d.close);
    const volumes = chartData.map(d => d.volume);
    
    return {
      currentPrice: prices[prices.length - 1],
      previousClose: stockData?.previousClose || prices[prices.length - 2] || prices[0],
      change: prices[prices.length - 1] - (stockData?.previousClose || prices[prices.length - 2] || prices[0]),
      changePercent: ((prices[prices.length - 1] - (stockData?.previousClose || prices[prices.length - 2] || prices[0])) / (stockData?.previousClose || prices[prices.length - 2] || prices[0])) * 100,
      high: Math.max(...prices),
      low: Math.min(...prices),
      avgVolume: Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length)
    };
  }, [chartData, stockData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-sm">Open: {formatCurrency(data.open)}</p>
          <p className="text-sm">High: {formatCurrency(data.high)}</p>
          <p className="text-sm">Low: {formatCurrency(data.low)}</p>
          <p className="text-sm">Close: {formatCurrency(data.close)}</p>
          <p className="text-sm">Volume: {data.volume.toLocaleString()}</p>
          <p className={`text-sm ${data.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Change: {formatCurrency(data.change)} ({formatPercentage(data.changePercent)})
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Chart</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchStockData(symbol, timeframe)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stockData || !chartData.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400">Select a company to view stock data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with company info and controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {stockData.name || symbol}
          </h2>
          {summaryStats && (
            <div className="flex items-center gap-4 mt-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summaryStats.currentPrice)}
              </span>
              <span className={`text-lg font-semibold ${
                summaryStats.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summaryStats.change >= 0 ? '+' : ''}{formatCurrency(summaryStats.change)} 
                ({summaryStats.change >= 0 ? '+' : ''}{formatPercentage(summaryStats.changePercent)})
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Chart Type Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {chartTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setChartType(type.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  chartType === type.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeframe === tf.value
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Previous Close</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(summaryStats.previousClose)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Day High</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(summaryStats.high)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Day Low</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(summaryStats.low)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Volume</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {summaryStats.avgVolume.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'line' && (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#3b82f6' }}
              />
            </LineChart>
          )}
          
          {chartType === 'area' && (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          )}
          
          {chartType === 'bar' && (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="close"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Volume</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => (value / 1000).toFixed(0) + 'K'}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className={`p-3 rounded-lg shadow-lg border ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                    }`}>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-sm">Volume: {data.volume.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="volume"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockChart;
