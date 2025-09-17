import React from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';

const AlertsPanel = ({ alerts, isLoading, isLive }) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'high_impact':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'sentiment_spike':
        return <Bell className="w-4 h-4 text-yellow-500" />;
      case 'price_movement':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'high_impact':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'sentiment_spike':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      case 'price_movement':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-700';
    }
  };

  const renderAlert = (alert, index) => (
    <motion.div
      key={alert.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`p-3 border-l-4 ${getAlertColor(alert.type)} hover:bg-opacity-75 transition-colors`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getAlertIcon(alert.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {alert.title}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            {alert.message}
          </p>
          
          {alert.details && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {Object.entries(alert.details).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace('_', ' ')}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alerts
          </h2>
        </div>
        <div className="card-body">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 border-l-4 border-gray-300 bg-gray-100 dark:bg-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alerts
          </h2>
          <div className="flex items-center space-x-2">
            {isLive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-600 dark:text-red-400">LIVE</span>
              </div>
            )}
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
      
      <div className="card-body p-0">
        <div className="max-h-96 overflow-y-auto">
          {alerts.length > 0 ? (
            <div className="space-y-2 p-3">
              {alerts.map((alert, index) => renderAlert(alert, index))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No alerts at the moment
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;






