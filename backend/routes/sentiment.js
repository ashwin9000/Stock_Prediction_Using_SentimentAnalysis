const express = require('express');
const router = express.Router();
const Tweet = require('../models/Tweet');
const Stock = require('../models/Stock');
const { validateSentimentQuery } = require('../middleware/validation');

/**
 * @swagger
 * /api/sentiment/company/{symbol}:
 *   get:
 *     summary: Get sentiment analysis for a specific company
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Time range in hours
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly]
 *           default: daily
 */
router.get('/company/:symbol', validateSentimentQuery, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeRange = 24, granularity = 'daily' } = req.validatedQuery;

    const cutoffDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    // Get sentiment statistics
    const sentimentStats = await Tweet.aggregate([
      {
        $match: {
          'companyTagged.symbol': symbol.toUpperCase(),
          createdAt: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: '$sentiment.label',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$sentiment.confidence' },
          avgEngagement: { $avg: '$engagementScore' }
        }
      }
    ]);

    // Get sentiment over time
    let timeGrouping;
    switch (granularity) {
      case 'hourly':
        timeGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'daily':
        timeGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'weekly':
        timeGrouping = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
    }

    const sentimentOverTime = await Tweet.aggregate([
      {
        $match: {
          'companyTagged.symbol': symbol.toUpperCase(),
          createdAt: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: timeGrouping,
          positive: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] }
          },
          negative: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] }
          },
          neutral: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'neutral'] }, 1, 0] }
          },
          total: { $sum: 1 },
          avgSentiment: {
            $avg: {
              $cond: [
                { $eq: ['$sentiment.label', 'positive'] },
                1,
                { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, -1, 0] }
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Get stock data for comparison
    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase(),
      isActive: true 
    }).select('currentPrice priceChangePercent sentimentData').lean();

    // Calculate overall sentiment metrics
    const totalTweets = sentimentStats.reduce((sum, stat) => sum + stat.count, 0);
    const positiveCount = sentimentStats.find(s => s._id === 'positive')?.count || 0;
    const negativeCount = sentimentStats.find(s => s._id === 'negative')?.count || 0;
    const neutralCount = sentimentStats.find(s => s._id === 'neutral')?.count || 0;

    const overallSentiment = totalTweets > 0 ? (positiveCount - negativeCount) / totalTweets : 0;

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        timeRange: `${timeRange}h`,
        granularity,
        overallSentiment,
        totalTweets,
        sentimentBreakdown: {
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount
        },
        sentimentStats,
        sentimentOverTime,
        stockData: stock ? {
          currentPrice: stock.currentPrice,
          priceChangePercent: stock.priceChangePercent,
          stockSentiment: stock.sentimentData?.last24h?.avgSentiment || 0
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching company sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company sentiment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/sentiment/market-overview:
 *   get:
 *     summary: Get overall market sentiment overview
 */
router.get('/market-overview', async (req, res) => {
  try {
    const { timeRange = 24 } = req.query;
    const cutoffDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    // Get overall market sentiment
    const marketSentiment = await Tweet.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate },
          'relevance.isRelevant': true
        }
      },
      {
        $group: {
          _id: '$sentiment.label',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$sentiment.confidence' }
        }
      }
    ]);

    // Get sentiment by company
    const companySentiment = await Tweet.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate },
          'relevance.isRelevant': true
        }
      },
      { $unwind: '$companyTagged' },
      {
        $group: {
          _id: '$companyTagged.symbol',
          totalTweets: { $sum: 1 },
          positive: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] }
          },
          negative: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] }
          },
          neutral: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'neutral'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          sentimentScore: {
            $cond: [
              { $eq: ['$totalTweets', 0] },
              0,
              { $divide: [{ $subtract: ['$positive', '$negative'] }, '$totalTweets'] }
            ]
          }
        }
      },
      { $sort: { totalTweets: -1 } },
      { $limit: 20 }
    ]);

    // Get trending topics
    const trendingTopics = await Tweet.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate },
          'relevance.isRelevant': true
        }
      },
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          avgSentiment: {
            $avg: {
              $cond: [
                { $eq: ['$sentiment.label', 'positive'] },
                1,
                { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, -1, 0] }
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Calculate overall metrics
    const totalTweets = marketSentiment.reduce((sum, stat) => sum + stat.count, 0);
    const positiveCount = marketSentiment.find(s => s._id === 'positive')?.count || 0;
    const negativeCount = marketSentiment.find(s => s._id === 'negative')?.count || 0;
    const neutralCount = marketSentiment.find(s => s._id === 'neutral')?.count || 0;

    const overallSentiment = totalTweets > 0 ? (positiveCount - negativeCount) / totalTweets : 0;

    res.json({
      success: true,
      data: {
        timeRange: `${timeRange}h`,
        overallSentiment,
        totalTweets,
        sentimentBreakdown: {
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount
        },
        companySentiment,
        trendingTopics,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching market sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market sentiment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/sentiment/trends:
 *   get:
 *     summary: Get sentiment trends over time
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to analyze
 */
router.get('/trends', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sentimentTrends = await Tweet.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate },
          'relevance.isRelevant': true
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          positive: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] }
          },
          negative: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] }
          },
          neutral: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'neutral'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      {
        $addFields: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          sentimentScore: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $divide: [{ $subtract: ['$positive', '$negative'] }, '$total'] }
            ]
          }
        }
      },
      { $sort: { date: 1 } },
      {
        $project: {
          _id: 0,
          date: 1,
          positive: 1,
          negative: 1,
          neutral: 1,
          total: 1,
          sentimentScore: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        days,
        trends: sentimentTrends,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching sentiment trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sentiment trends',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/sentiment/impact-analysis:
 *   get:
 *     summary: Analyze sentiment impact on stock prices
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: Stock symbol to analyze
 */
router.get('/impact-analysis', async (req, res) => {
  try {
    const { symbol, timeRange = 24 } = req.query;
    const cutoffDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Stock symbol is required'
      });
    }

    // Get tweets with high impact
    const highImpactTweets = await Tweet.find({
      'companyTagged.symbol': symbol.toUpperCase(),
      'marketImpact.level': 'high',
      createdAt: { $gte: cutoffDate }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('text sentiment marketImpact createdAt engagement')
      .lean();

    // Get sentiment correlation with price changes
    const sentimentPriceCorrelation = await Tweet.aggregate([
      {
        $match: {
          'companyTagged.symbol': symbol.toUpperCase(),
          createdAt: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: '$sentiment.label',
          avgEngagement: { $avg: '$engagementScore' },
          count: { $sum: 1 },
          avgImpactConfidence: { $avg: '$marketImpact.confidence' }
        }
      }
    ]);

    // Get stock price data for comparison
    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase(),
      isActive: true 
    }).select('currentPrice priceChangePercent priceHistory').lean();

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        timeRange: `${timeRange}h`,
        highImpactTweets,
        sentimentPriceCorrelation,
        stockData: stock ? {
          currentPrice: stock.currentPrice,
          priceChangePercent: stock.priceChangePercent,
          recentPriceHistory: stock.priceHistory?.slice(-10) || []
        } : null
      }
    });

  } catch (error) {
    console.error('Error analyzing sentiment impact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sentiment impact',
      message: error.message
    });
  }
});

module.exports = router;


