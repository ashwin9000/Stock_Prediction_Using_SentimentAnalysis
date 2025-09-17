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

export const sentimentService = {
  // Get company sentiment
  async getCompanySentiment(symbol, period = '7d') {
    try {
      const response = await api.get(`/sentiment/company/${symbol}`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch company sentiment');
    }
  },

  // Get overall market sentiment
  async getMarketSentiment(period = '7d') {
    try {
      const response = await api.get('/sentiment/market', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch market sentiment');
    }
  },

  // Get sentiment trends
  async getSentimentTrends(filters = {}) {
    try {
      const response = await api.get('/sentiment/trends', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sentiment trends');
    }
  },

  // Get sentiment impact analysis
  async getSentimentImpact(symbol, period = '7d') {
    try {
      const response = await api.get(`/sentiment/impact/${symbol}`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sentiment impact');
    }
  },

  // Get sentiment correlation with price
  async getSentimentCorrelation(symbol, period = '30d') {
    try {
      const response = await api.get(`/sentiment/correlation/${symbol}`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sentiment correlation');
    }
  },
};






