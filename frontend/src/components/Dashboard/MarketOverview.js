import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const MarketOverview = ({ topGainers, topLosers, mostActive, isLoading }) => {
  const [activeTab, setActiveTab] = useState('gainers');

  const tabs = [
    { id: 'gainers', label: 'Top Gainers', icon: TrendingUp, data: topGainers },
    { id: 'losers', label: 'Top Losers', icon: TrendingDown, data: topLosers },
    { id: 'active', label: 'Most Active', icon: Activity, data: mostActive },
  ];

  const renderStockItem = (stock, index) => (
    <motion.div
      key={stock.symbol}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {index + 1}
          </span>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {stock.symbol}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-32">
            {stock.name}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <p className="font-medium text-gray-900 dark:text-white">
          {formatCurrency(stock.price)}
        </p>
        <p className={`text-sm ${
          stock.change >= 0 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {stock.change >= 0 ? '+' : ''}{formatPercentage(stock.change / 100)}
        </p>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Market Overview
          </h2>
        </div>
        <div className="card-body">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeData = tabs.find(tab => tab.id === activeTab)?.data || [];

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Market Overview
        </h2>
      </div>
      
      <div className="card-body">
        {/* Tabs */}
        <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Stock list */}
        <div className="space-y-2">
          {activeData.length > 0 ? (
            activeData.map((stock, index) => renderStockItem(stock, index))
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No data available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;






