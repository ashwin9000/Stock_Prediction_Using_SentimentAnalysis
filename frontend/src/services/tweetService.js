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

export const tweetService = {
  // Get tweets with filters
  async getTweets(filters = {}) {
    try {
      const response = await api.get('/tweets', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tweets');
    }
  },

  // Get single tweet
  async getTweet(id) {
    try {
      const response = await api.get(`/tweets/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tweet');
    }
  },

  // Get tweet statistics
  async getTweetStats(filters = {}) {
    try {
      const response = await api.get('/tweets/stats', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tweet statistics');
    }
  },

  // Get trending companies
  async getTrendingCompanies() {
    try {
      const response = await api.get('/tweets/trending-companies');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch trending companies');
    }
  },

  // Classify tweet (for ML service)
  async classifyTweet(tweetData) {
    try {
      const response = await api.post('/tweets/classify', tweetData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to classify tweet');
    }
  },
};






