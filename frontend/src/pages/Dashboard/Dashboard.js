import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  MessageSquare, 
  BarChart3,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

// Components
import DashboardCard from '../../components/Dashboard/DashboardCard';
import MarketOverview from '../../components/Dashboard/MarketOverview';
import SentimentChart from '../../components/Dashboard/SentimentChart';
import TweetStream from '../../components/Dashboard/TweetStream';
import AlertsPanel from '../../components/Dashboard/AlertsPanel';
import StockTicker from '../../components/Dashboard/StockTicker';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorBoundary from '../../components/Common/ErrorBoundary';

// Hooks
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

// Services
import { dashboardService } from '../../services/dashboardService';

// Utils
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/formatters';

const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [isLive, setIsLive] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  // Fetch dashboard data
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery('dashboard-overview', dashboardService.getOverview, {
    refetchInterval: isLive ? 30000 : false, // 30 seconds if live
    staleTime: 10000,
  });

  // Fetch analytics data
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading 
  } = useQuery('dashboard-analytics', dashboardService.getAnalytics, {
    refetchInterval: isLive ? 60000 : false, // 1 minute if live
    staleTime: 30000,
  });

  // Fetch alerts
  const { 
    data: alertsData, 
    isLoading: alertsLoading 
  } = useQuery('dashboard-alerts', dashboardService.getAlerts, {
    refetchInterval: isLive ? 15000 : false, // 15 seconds if live
    staleTime: 5000,
  });

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewTweet = (tweet) => {
      // Handle new tweet notification
      console.log('New tweet received:', tweet);
    };

    const handleStockUpdate = (stock) => {
      // Handle stock price update
      console.log('Stock update received:', stock);
    };

    const handleAlert = (alert) => {
      // Handle new alert
      console.log('New alert received:', alert);
    };

    socket.on('new-tweet', handleNewTweet);
    socket.on('stock-update', handleStockUpdate);
    socket.on('new-alert', handleAlert);

    return () => {
      socket.off('new-tweet', handleNewTweet);
      socket.off('stock-update', handleStockUpdate);
      socket.off('new-alert', handleAlert);
    };
  }, [socket]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message || 'Failed to load dashboard data'}
          </p>
          <button
            onClick={() => refetch()}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    totalTweets,
    totalStocks,
    marketSentiment,
    topGainers,
    topLosers,
    mostActive,
    recentTweets,
    marketSummary
  } = dashboardData || {};

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Welcome back, {user?.name || 'User'}! Here's your market overview.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowSensitiveData(!showSensitiveData)}
                  className="btn-outline"
                >
                  {showSensitiveData ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Sensitive Data
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Show Sensitive Data
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsLive(!isLive)}
                  className={`btn ${isLive ? 'btn-success' : 'btn-secondary'}`}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  {isLive ? 'Live' : 'Paused'}
                </button>
                <button
                  onClick={() => refetch()}
                  className="btn-outline"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Overview Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <DashboardCard
              title="Total Tweets"
              value={formatNumber(totalTweets?.total || 0)}
              change={totalTweets?.change || 0}
              changeType={totalTweets?.changeType || 'neutral'}
              icon={MessageSquare}
              color="blue"
              trend={totalTweets?.trend || []}
            />
            
            <DashboardCard
              title="Market Sentiment"
              value={formatPercentage(marketSentiment?.overall || 0)}
              change={marketSentiment?.change || 0}
              changeType={marketSentiment?.changeType || 'neutral'}
              icon={BarChart3}
              color="green"
              trend={marketSentiment?.trend || []}
            />
            
            <DashboardCard
              title="Active Stocks"
              value={formatNumber(totalStocks?.active || 0)}
              change={totalStocks?.change || 0}
              changeType={totalStocks?.changeType || 'neutral'}
              icon={TrendingUp}
              color="purple"
              trend={totalStocks?.trend || []}
            />
            
            <DashboardCard
              title="Market Cap"
              value={showSensitiveData ? formatCurrency(marketSummary?.totalMarketCap || 0) : '***'}
              change={marketSummary?.marketCapChange || 0}
              changeType={marketSummary?.marketCapChangeType || 'neutral'}
              icon={DollarSign}
              color="yellow"
              trend={marketSummary?.marketCapTrend || []}
            />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Market Overview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <MarketOverview
                topGainers={topGainers || []}
                topLosers={topLosers || []}
                mostActive={mostActive || []}
                isLoading={isLoading}
              />
            </motion.div>

            {/* Sentiment Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SentimentChart
                data={analyticsData?.sentimentTrends || []}
                isLoading={analyticsLoading}
              />
            </motion.div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tweet Stream */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TweetStream
                tweets={recentTweets || []}
                isLive={isLive}
                maxTweets={10}
              />
            </motion.div>

            {/* Alerts Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <AlertsPanel
                alerts={alertsData?.alerts || []}
                isLoading={alertsLoading}
                isLive={isLive}
              />
            </motion.div>
          </div>

          {/* Stock Ticker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8"
          >
            <StockTicker
              stocks={marketSummary?.tickerData || []}
              isLive={isLive}
            />
          </motion.div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;






