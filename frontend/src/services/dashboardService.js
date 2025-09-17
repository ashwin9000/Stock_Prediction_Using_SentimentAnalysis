import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dashboardService = {
  // Get dashboard overview
  async getOverview() {
    try {
      const response = await api.get('/dashboard/overview');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard overview');
    }
  },

  // Get dashboard analytics
  async getAnalytics(params = {}) {
    try {
      const response = await api.get('/dashboard/analytics', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch analytics');
    }
  },

  // Get alerts
  async getAlerts(params = {}) {
    try {
      const response = await api.get('/dashboard/alerts', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch alerts');
    }
  },

  // Get portfolio data
  async getPortfolio() {
    try {
      const response = await api.get('/dashboard/portfolio');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch portfolio');
    }
  },

  // Get AI insights
  async getInsights() {
    try {
      const response = await api.get('/dashboard/insights');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch insights');
    }
  },

  // Get market summary
  async getMarketSummary() {
    try {
      const response = await api.get('/dashboard/market-summary');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch market summary');
    }
  },

  // Get recent activity
  async getRecentActivity(limit = 10) {
    try {
      const response = await api.get('/dashboard/recent-activity', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch recent activity');
    }
  },

  // Get performance metrics
  async getPerformanceMetrics(timeframe = '1d') {
    try {
      const response = await api.get('/dashboard/performance', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch performance metrics');
    }
  },

  // Get trending topics
  async getTrendingTopics() {
    try {
      const response = await api.get('/dashboard/trending-topics');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch trending topics');
    }
  },

  // Get sentiment overview
  async getSentimentOverview() {
    try {
      const response = await api.get('/dashboard/sentiment-overview');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sentiment overview');
    }
  },
};






