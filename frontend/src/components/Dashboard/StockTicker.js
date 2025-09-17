import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const StockTicker = ({ stocks, isLive }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isLive || stocks.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stocks.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [isLive, stocks.length]);

  if (stocks.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Stock Ticker
          </h2>
        </div>
        <div className="card-body">
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No stock data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentStock = stocks[currentIndex];

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Stock Ticker
          </h2>
          <div className="flex items-center space-x-2">
            {isLive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-600 dark:text-red-400">LIVE</span>
              </div>
            )}
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
      
      <div className="card-body">
        <motion.div
          key={currentStock.symbol}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
        >
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentStock.symbol}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentStock.name}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(currentStock.price)}
              </p>
              <div className={`flex items-center space-x-1 text-sm ${
                currentStock.change >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {currentStock.change >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>
                  {currentStock.change >= 0 ? '+' : ''}
                  {formatCurrency(currentStock.change)}
                </span>
                <span>
                  ({currentStock.change >= 0 ? '+' : ''}
                  {formatPercentage(currentStock.changePercent / 100)})
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            <p>Volume: {currentStock.volume?.toLocaleString() || 'N/A'}</p>
            <p>Market Cap: {currentStock.marketCap ? `$${(currentStock.marketCap / 1e9).toFixed(1)}B` : 'N/A'}</p>
          </div>
        </motion.div>
        
        {/* Progress indicator */}
        <div className="mt-4">
          <div className="flex justify-center space-x-1">
            {stocks.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex
                    ? 'bg-primary-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTicker;






