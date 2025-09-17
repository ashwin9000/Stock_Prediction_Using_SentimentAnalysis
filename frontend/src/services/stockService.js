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

export const stockService = {
  // Get all stocks
  async getStocks(filters = {}) {
    try {
      const response = await api.get('/stocks', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch stocks');
    }
  },

  // Get single stock
  async getStock(symbol) {
    try {
      const response = await api.get(`/stocks/${symbol}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch stock');
    }
  },

  // Get stock price history
  async getStockHistory(symbol, period = '1d') {
    try {
      const response = await api.get(`/stocks/${symbol}/history`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch stock history');
    }
  },

  // Get market summary
  async getMarketSummary() {
    try {
      const response = await api.get('/stocks/market-summary');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch market summary');
    }
  },

  // Add stock to watchlist
  async addToWatchlist(symbol) {
    try {
      const response = await api.post('/stocks/watchlist', { symbol });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add stock to watchlist');
    }
  },

  // Remove stock from watchlist
  async removeFromWatchlist(symbol) {
    try {
      const response = await api.delete(`/stocks/watchlist/${symbol}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove stock from watchlist');
    }
  },

  // Get watchlist
  async getWatchlist() {
    try {
      const response = await api.get('/stocks/watchlist');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch watchlist');
    }
  },

  // Refresh stock data
  async refreshStockData(symbol) {
    try {
      const response = await api.post(`/stocks/${symbol}/refresh`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to refresh stock data');
    }
  },
};






