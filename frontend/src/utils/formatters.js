// Currency formatting
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined) return 'N/A';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Percentage formatting
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  
  return `${(value * 100).toFixed(decimals)}%`;
};

// Number formatting
export const formatNumber = (number, decimals = 0) => {
  if (number === null || number === undefined) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

// Large number formatting (K, M, B)
export const formatLargeNumber = (number) => {
  if (number === null || number === undefined) return 'N/A';
  
  if (number >= 1e9) {
    return `${(number / 1e9).toFixed(1)}B`;
  } else if (number >= 1e6) {
    return `${(number / 1e6).toFixed(1)}M`;
  } else if (number >= 1e3) {
    return `${(number / 1e3).toFixed(1)}K`;
  }
  
  return number.toString();
};

// Date formatting
export const formatDate = (date, format = 'short') => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'datetime':
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    default:
      return dateObj.toLocaleDateString();
  }
};

// Relative time formatting
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const now = new Date();
  const dateObj = new Date(date);
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return formatDate(date, 'short');
  }
};

// Stock price change formatting
export const formatPriceChange = (change, changePercent) => {
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';
  
  return {
    change: `${sign}${formatCurrency(Math.abs(change))}`,
    changePercent: `${sign}${formatPercentage(Math.abs(changePercent))}`,
    isPositive,
  };
};

// Sentiment score formatting
export const formatSentimentScore = (score) => {
  if (score === null || score === undefined) return 'N/A';
  
  const percentage = (score * 100).toFixed(1);
  return `${percentage}%`;
};

// Confidence score formatting
export const formatConfidence = (confidence) => {
  if (confidence === null || confidence === undefined) return 'N/A';
  
  const percentage = (confidence * 100).toFixed(1);
  return `${percentage}%`;
};






