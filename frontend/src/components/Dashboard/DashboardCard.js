import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber, formatPercentage } from '../../utils/formatters';

const DashboardCard = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color = 'blue',
  trend = [],
  className = '',
}) => {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  };

  const bgColorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20',
    green: 'bg-green-100 dark:bg-green-900/20',
    purple: 'bg-purple-100 dark:bg-purple-900/20',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20',
    red: 'bg-red-100 dark:bg-red-900/20',
  };

  const getChangeIcon = () => {
    if (changeType === 'positive') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (changeType === 'negative') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = () => {
    if (changeType === 'positive') {
      return 'text-green-600 dark:text-green-400';
    } else if (changeType === 'negative') {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`card ${className}`}
    >
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`p-2 rounded-lg ${bgColorClasses[color]}`}>
                <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {title}
              </h3>
            </div>
            
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              
              {change !== undefined && change !== null && (
                <div className={`flex items-center space-x-1 text-sm ${getChangeColor()}`}>
                  {getChangeIcon()}
                  <span>
                    {changeType === 'positive' ? '+' : ''}
                    {typeof change === 'number' ? formatPercentage(change / 100) : change}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mini trend chart placeholder */}
          {trend.length > 0 && (
            <div className="flex items-end space-x-1 h-12">
              {trend.map((point, index) => (
                <div
                  key={index}
                  className="w-1 bg-gray-300 dark:bg-gray-600 rounded-full"
                  style={{
                    height: `${Math.max(4, (point / Math.max(...trend)) * 40)}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardCard;






