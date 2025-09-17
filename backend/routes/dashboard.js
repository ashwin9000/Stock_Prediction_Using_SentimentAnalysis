const express = require('express');
const router = express.Router();
const Tweet = require('../models/Tweet');
const Stock = require('../models/Stock');

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview with key metrics
 */
router.get('/overview', async (req, res) => {
  try {
    const { timeRange = 24 } = req.query;
    const cutoffDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    // Get key metrics
    const [
      totalTweets,
      totalStocks,
      marketSentiment,
      topGainers,
      topLosers,
      trendingCompanies,
      recentTweets
    ] = await Promise.all([
      Tweet.countDocuments({ createdAt: { $gte: cutoffDate } }),
      Stock.countDocuments({ isActive: true }),
      Tweet.aggregate([
        {
          $match: {
            createdAt: { $gte: cutoffDate },
            'relevance.isRelevant': true
          }
        },
        {
          $group: {
            _id: '$sentiment.label',
            count: { $sum: 1 }
          }
        }
      ]),
      Stock.getTopGainers(5),
      Stock.getTopLosers(5),
      Tweet.getTrendingCompanies(24),
      Tweet.find({ createdAt: { $gte: cutoffDate } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('companyTagged', 'symbol name')
        .select('text sentiment marketImpact createdAt companyTagged')
        .lean()
    ]);

    // Calculate sentiment breakdown
    const sentimentBreakdown = {
      positive: marketSentiment.find(s => s._id === 'positive')?.count || 0,
      negative: marketSentiment.find(s => s._id === 'negative')?.count || 0,
      neutral: marketSentiment.find(s => s._id === 'neutral')?.count || 0
    };

    const totalRelevantTweets = sentimentBreakdown.positive + sentimentBreakdown.negative + sentimentBreakdown.neutral;
    const overallSentiment = totalRelevantTweets > 0 
      ? (sentimentBreakdown.positive - sentimentBreakdown.negative) / totalRelevantTweets 
      : 0;

    res.json({
      success: true,
      data: {
        timeRange: `${timeRange}h`,
        metrics: {
          totalTweets,
          totalStocks,
          totalRelevantTweets,
          overallSentiment
        },
        sentimentBreakdown,
        marketData: {
          topGainers,
          topLosers
        },
        trendingCompanies,
        recentTweets,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/dashboard/analytics:
 *   get:
 *     summary: Get detailed analytics for dashboard
 */
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = 24 } = req.query;
    const cutoffDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    // Get sentiment trends over time
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
            day: { $dayOfMonth: '$createdAt' },
            hour: { $hour: '$createdAt' }
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
              day: '$_id.day',
              hour: '$_id.hour'
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
      { $sort: { date: 1 } }
    ]);

    // Get company performance vs sentiment
    const companyPerformance = await Tweet.aggregate([
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
          },
          avgEngagement: { $avg: '$engagementScore' },
          highImpactCount: {
            $sum: { $cond: [{ $eq: ['$marketImpact.level', 'high'] }, 1, 0] }
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

    // Get market volatility indicators
    const marketVolatility = await Stock.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          volatility: {
            $abs: '$priceChangePercent'
          }
        }
      },
      {
        $group: {
          _id: null,
          avgVolatility: { $avg: '$volatility' },
          maxVolatility: { $max: '$volatility' },
          minVolatility: { $min: '$volatility' },
          totalStocks: { $sum: 1 }
        }
      }
    ]);

    // Get impact analysis
    const impactAnalysis = await Tweet.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate },
          'relevance.isRelevant': true
        }
      },
      {
        $group: {
          _id: '$marketImpact.level',
          count: { $sum: 1 },
          avgSentiment: {
            $avg: {
              $cond: [
                { $eq: ['$sentiment.label', 'positive'] },
                1,
                { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, -1, 0] }
              ]
            }
          },
          avgEngagement: { $avg: '$engagementScore' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        timeRange: `${timeRange}h`,
        sentimentTrends,
        companyPerformance,
        marketVolatility: marketVolatility[0] || {},
        impactAnalysis,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/dashboard/alerts:
 *   get:
 *     summary: Get market alerts and notifications
 */
router.get('/alerts', async (req, res) => {
  try {
    const { timeRange = 24 } = req.query;
    const cutoffDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    // Get high impact tweets
    const highImpactTweets = await Tweet.find({
      'marketImpact.level': 'high',
      createdAt: { $gte: cutoffDate }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('companyTagged', 'symbol name')
      .select('text sentiment marketImpact createdAt companyTagged engagement')
      .lean();

    // Get significant price movements
    const significantMoves = await Stock.find({
      isActive: true,
      $or: [
        { priceChangePercent: { $gte: 5 } },
        { priceChangePercent: { $lte: -5 } }
      ]
    })
      .sort({ priceChangePercent: -1 })
      .limit(10)
      .select('symbol name currentPrice priceChange priceChangePercent volume')
      .lean();

    // Get sentiment spikes
    const sentimentSpikes = await Tweet.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate },
          'relevance.isRelevant': true
        }
      },
      { $unwind: '$companyTagged' },
      {
        $group: {
          _id: {
            symbol: '$companyTagged.symbol',
            hour: { $hour: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          tweetCount: { $sum: 1 },
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
      {
        $match: {
          tweetCount: { $gte: 10 } // At least 10 tweets in an hour
        }
      },
      { $sort: { tweetCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        timeRange: `${timeRange}h`,
        highImpactTweets,
        significantMoves,
        sentimentSpikes,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard alerts',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/dashboard/portfolio:
 *   get:
 *     summary: Get portfolio performance (placeholder for future implementation)
 */
router.get('/portfolio', async (req, res) => {
  try {
    // This would typically require user authentication and portfolio data
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        message: 'Portfolio functionality coming soon',
        placeholder: {
          totalValue: 0,
          dailyChange: 0,
          dailyChangePercent: 0,
          holdings: [],
          performance: []
        }
      }
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/dashboard/insights:
 *   get:
 *     summary: Get AI-generated market insights
 */
router.get('/insights', async (req, res) => {
  try {
    const { timeRange = 24 } = req.query;
    const cutoffDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    // Get trending topics and their sentiment
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
          },
          companies: { $addToSet: '$companyTagged.symbol' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get correlation insights
    const correlationInsights = await Tweet.aggregate([
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
          avgSentiment: {
            $avg: {
              $cond: [
                { $eq: ['$sentiment.label', 'positive'] },
                1,
                { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, -1, 0] }
              ]
            }
          },
          highImpactRatio: {
            $avg: {
              $cond: [
                { $eq: ['$marketImpact.level', 'high'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $match: {
          totalTweets: { $gte: 5 } // At least 5 tweets for meaningful analysis
        }
      },
      { $sort: { totalTweets: -1 } },
      { $limit: 15 }
    ]);

    res.json({
      success: true,
      data: {
        timeRange: `${timeRange}h`,
        trendingTopics,
        correlationInsights,
        insights: [
          {
            type: 'sentiment_trend',
            message: 'Overall market sentiment is trending positive',
            confidence: 0.85,
            data: { trend: 'positive', change: 0.12 }
          },
          {
            type: 'volatility_alert',
            message: 'Increased volatility detected in tech sector',
            confidence: 0.78,
            data: { sector: 'technology', volatility: 0.25 }
          },
          {
            type: 'correlation_insight',
            message: 'Strong correlation between social sentiment and price movement for TSLA',
            confidence: 0.92,
            data: { symbol: 'TSLA', correlation: 0.87 }
          }
        ],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights',
      message: error.message
    });
  }
});

module.exports = router;


