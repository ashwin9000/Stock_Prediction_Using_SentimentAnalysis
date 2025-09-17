import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

const TweetStream = ({ tweets, isLive, maxTweets = 10 }) => {
  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'border-l-green-500';
      case 'negative':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const renderTweet = (tweet, index) => (
    <motion.div
      key={tweet.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`p-4 border-l-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${getSentimentColor(tweet.sentiment)}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getSentimentIcon(tweet.sentiment)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              @{tweet.username}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(tweet.created_at)}
            </span>
            {tweet.market_impact?.level === 'high' && (
              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                High Impact
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {tweet.text}
          </p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            {tweet.company_tags?.length > 0 && (
              <div className="flex items-center space-x-1">
                <span>Companies:</span>
                {tweet.company_tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {tag.symbol}
                  </span>
                ))}
                {tweet.company_tags.length > 3 && (
                  <span>+{tweet.company_tags.length - 3}</span>
                )}
              </div>
            )}
            
            <span>Confidence: {Math.round(tweet.confidence * 100)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Tweets
          </h2>
          <div className="flex items-center space-x-2">
            {isLive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-600 dark:text-red-400">LIVE</span>
              </div>
            )}
            <MessageSquare className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
      
      <div className="card-body p-0">
        <div className="max-h-96 overflow-y-auto">
          {tweets.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tweets.slice(0, maxTweets).map((tweet, index) => renderTweet(tweet, index))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No tweets available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TweetStream;






