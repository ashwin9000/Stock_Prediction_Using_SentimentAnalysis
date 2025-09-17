const express = require('express');
const router = express.Router();
const Tweet = require('../models/Tweet');
const { validateTweetQuery } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/tweets:
 *   get:
 *     summary: Get tweets with filtering options
 *     parameters:
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Filter by company symbol
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *           enum: [positive, negative, neutral]
 *         description: Filter by sentiment
 *       - in: query
 *         name: impact
 *         schema:
 *           type: string
 *           enum: [high, medium, low, none]
 *         description: Filter by market impact level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of tweets to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 */
router.get('/', validateTweetQuery, async (req, res) => {
  try {
    const {
      company,
      sentiment,
      impact,
      relevance,
      limit = 50,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      timeRange
    } = req.query;

    // Build filter object
    const filter = {};

    if (company) {
      filter['companyTagged.symbol'] = company.toUpperCase();
    }

    if (sentiment) {
      filter['sentiment.label'] = sentiment;
    }

    if (impact) {
      filter['marketImpact.level'] = impact;
    }

    if (relevance) {
      filter['relevance.isRelevant'] = relevance === 'true';
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (timeRange) {
      const hours = parseInt(timeRange);
      filter.createdAt = {
        $gte: new Date(Date.now() - hours * 60 * 60 * 1000)
      };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const tweets = await Tweet.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('companyTagged', 'symbol name')
      .lean();

    // Get total count for pagination
    const total = await Tweet.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      data: tweets,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNext,
        hasPrev,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching tweets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tweets',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/tweets/{id}:
 *   get:
 *     summary: Get a specific tweet by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tweet ID
 */
router.get('/:id', async (req, res) => {
  try {
    const tweet = await Tweet.findOne({ tweetId: req.params.id })
      .populate('companyTagged', 'symbol name')
      .lean();

    if (!tweet) {
      return res.status(404).json({
        success: false,
        error: 'Tweet not found'
      });
    }

    res.json({
      success: true,
      data: tweet
    });

  } catch (error) {
    console.error('Error fetching tweet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tweet',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/tweets/classify:
 *   post:
 *     summary: Classify a new tweet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - tweetId
 *               - userId
 *             properties:
 *               text:
 *                 type: string
 *               tweetId:
 *                 type: string
 *               userId:
 *                 type: string
 *               username:
 *                 type: string
 */
router.post('/classify', authenticateToken, async (req, res) => {
  try {
    const { text, tweetId, userId, username, ...otherData } = req.body;

    // Check if tweet already exists
    const existingTweet = await Tweet.findOne({ tweetId });
    if (existingTweet) {
      return res.status(409).json({
        success: false,
        error: 'Tweet already exists'
      });
    }

    // Call ML classifier service
    const classifierResponse = await fetch(`${process.env.ML_CLASSIFIER_URL}/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    if (!classifierResponse.ok) {
      throw new Error('Failed to classify tweet');
    }

    const classification = await classifierResponse.json();

    // Create new tweet document
    const tweet = new Tweet({
      tweetId,
      text,
      cleanedText: text.replace(/https?:\/\/\S+/g, '').trim(),
      userId,
      username,
      createdAt: new Date(),
      ...classification,
      ...otherData
    });

    await tweet.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('new-tweet', {
      tweet: tweet.toObject(),
      type: 'new-tweet'
    });

    res.status(201).json({
      success: true,
      data: tweet,
      message: 'Tweet classified and saved successfully'
    });

  } catch (error) {
    console.error('Error classifying tweet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to classify tweet',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/tweets/stats/company/{symbol}:
 *   get:
 *     summary: Get sentiment statistics for a company
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Company symbol
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: integer
 *         description: Time range in hours
 */
router.get('/stats/company/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeRange } = req.query;

    const stats = await Tweet.getSentimentStats(symbol, timeRange);

    // Calculate additional metrics
    const totalTweets = stats.reduce((sum, stat) => sum + stat.count, 0);
    const avgSentiment = stats.reduce((sum, stat) => {
      const sentimentValue = stat._id === 'positive' ? 1 : stat._id === 'negative' ? -1 : 0;
      return sum + (sentimentValue * stat.count);
    }, 0) / totalTweets;

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        timeRange: timeRange ? `${timeRange}h` : 'all',
        stats,
        totalTweets,
        avgSentiment: isNaN(avgSentiment) ? 0 : avgSentiment
      }
    });

  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company statistics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/tweets/trending:
 *   get:
 *     summary: Get trending companies based on tweet volume
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Time range in hours
 */
router.get('/trending/companies', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const trending = await Tweet.getTrendingCompanies(parseInt(hours));

    res.json({
      success: true,
      data: trending,
      timeRange: `${hours}h`
    });

  } catch (error) {
    console.error('Error fetching trending companies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending companies',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/tweets/search:
 *   get:
 *     summary: Search tweets by text content
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tweets = await Tweet.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('companyTagged', 'symbol name')
      .lean();

    const total = await Tweet.countDocuments({ $text: { $search: q } });

    res.json({
      success: true,
      data: tweets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error searching tweets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search tweets',
      message: error.message
    });
  }
});

module.exports = router;

