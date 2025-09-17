const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const { validateStockQuery } = require('../middleware/validation');
const stockService = require('../services/stockService');
const stockDataAgent = require('../services/stockDataAgent');

/**
 * @swagger
 * /api/stocks:
 *   get:
 *     summary: Get list of stocks with optional filtering
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of stocks to return
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [priceChangePercent, volume, marketCap, sentimentScore]
 *         description: Sort field
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, sortBy = 'symbol', sortOrder = 'asc', search } = req.query;

    let filter = { isActive: true };
    if (search) {
      filter.$or = [
        { symbol: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const stocks = await Stock.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .select('symbol name currentPrice priceChange priceChangePercent volume marketCap sentimentData')
      .lean();

    res.json({
      success: true,
      data: stocks
    });

  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stocks',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/stocks/{symbol}/history:
 *   get:
 *     summary: Get stock price history
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max]
 *           default: 1mo
 *         description: Time period for history
 */
router.get('/:symbol/history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1mo' } = req.query;

    // CSV-only source
    try {
      const csvData = await stockDataAgent.getStockData(symbol.toUpperCase(), period);
      return res.json({ success: true, data: csvData });
    } catch (e) {
      console.log(`CSV data unavailable for ${symbol}:`, e.message);
      return res.status(404).json({
        success: false,
        error: 'CSV data not found',
        message: 'Run: npm run fetch-stock-data to populate backend/data/stocks/stock_data.csv'
      });
    }

  } catch (error) {
    console.error(`Error fetching stock history for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock history',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/stocks/{symbol}:
 *   get:
 *     summary: Get detailed stock information
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase(),
      isActive: true 
    }).lean();

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }

    res.json({
      success: true,
      data: stock
    });

  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/stocks/{symbol}/price-history:
 *   get:
 *     summary: Get stock price history
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: 1mo
 *         description: Time period for price history
 */
router.get('/:symbol/price-history', validateStockQuery, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1mo' } = req.validatedQuery;

    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase(),
      isActive: true 
    }).select('priceHistory').lean();

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }

    // Filter price history based on period
    const now = new Date();
    let cutoffDate;
    
    switch (period) {
      case '1d':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '5d':
        cutoffDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case '1mo':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3mo':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6mo':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0); // All data
    }

    const filteredHistory = stock.priceHistory.filter(
      entry => entry.date >= cutoffDate
    );

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        period,
        priceHistory: filteredHistory
      }
    });

  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/stocks/market-summary:
 *   get:
 *     summary: Get market summary with top gainers, losers, and most active
 */
router.get('/market-summary', async (req, res) => {
  try {
    const [topGainers, topLosers, mostActive, sentimentLeaders] = await Promise.all([
      Stock.getTopGainers(10),
      Stock.getTopLosers(10),
      Stock.getMostActive(10),
      Stock.getSentimentLeaders(10)
    ]);

    res.json({
      success: true,
      data: {
        topGainers,
        topLosers,
        mostActive,
        sentimentLeaders,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching market summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market summary',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/stocks/watchlist/add:
 *   post:
 *     summary: Add stock to user's watchlist
 */
router.post('/watchlist/add', async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Stock symbol is required'
      });
    }

    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase(),
      isActive: true 
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }

    // TODO: Add to user's watchlist in database
    // This would require a User model and watchlist functionality

    res.json({
      success: true,
      message: `${symbol.toUpperCase()} added to watchlist`,
      data: {
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.currentPrice
      }
    });

  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add to watchlist',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/stocks/refresh/{symbol}:
 *   post:
 *     summary: Manually refresh stock data
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/refresh/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const updatedStock = await stockService.updateStockData(symbol);
    
    if (!updatedStock) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found or failed to update'
      });
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('stock-update', {
      symbol: symbol.toUpperCase(),
      data: updatedStock,
      type: 'stock-update'
    });

    res.json({
      success: true,
      message: `${symbol.toUpperCase()} data refreshed successfully`,
      data: updatedStock
    });

  } catch (error) {
    console.error('Error refreshing stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh stock data',
      message: error.message
    });
  }
});

module.exports = router;


