const Tweet = require('../models/Tweet');
const axios = require('axios');

class TweetService {
  /**
   * Fetch new tweets from Twitter API via tweet agent
   */
  async fetchNewTweets() {
    try {
      console.log('🔄 Fetching new tweets from tweet agent...');
      
      const response = await axios.get(`${process.env.TWEET_AGENT_URL}/tweets/fetch`, {
        timeout: 30000
      });

      if (response.data.success && response.data.tweets) {
        const tweets = response.data.tweets;
        console.log(`📥 Received ${tweets.length} new tweets`);

        // Process and save tweets
        const savedTweets = [];
        for (const tweetData of tweets) {
          try {
            // Check if tweet already exists
            const existingTweet = await Tweet.findOne({ tweetId: tweetData.tweetId });
            if (existingTweet) {
              continue;
            }

            // Classify tweet using ML service
            const classification = await this.classifyTweet(tweetData.text);
            
            // Create tweet document
            const tweet = new Tweet({
              ...tweetData,
              ...classification,
              processingStatus: 'completed'
            });

            await tweet.save();
            savedTweets.push(tweet);

          } catch (error) {
            console.error(`❌ Error processing tweet ${tweetData.tweetId}:`, error);
            
            // Save tweet with error status
            const tweet = new Tweet({
              ...tweetData,
              processingStatus: 'failed',
              processingErrors: [error.message]
            });
            await tweet.save();
          }
        }

        console.log(`✅ Successfully processed ${savedTweets.length} tweets`);
        return savedTweets;

      } else {
        throw new Error('Invalid response from tweet agent');
      }

    } catch (error) {
      console.error('❌ Error fetching tweets:', error);
      throw error;
    }
  }

  /**
   * Classify tweet using ML classifier service
   */
  async classifyTweet(text) {
    try {
      const response = await axios.post(`${process.env.ML_CLASSIFIER_URL}/classify`, {
        text: text
      }, {
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.classification;
      } else {
        throw new Error('Classification failed');
      }

    } catch (error) {
      console.error('❌ Error classifying tweet:', error);
      
      // Return default classification on error
      return {
        sentiment: {
          label: 'neutral',
          confidence: 0.5,
          scores: { positive: 0.33, negative: 0.33, neutral: 0.34 }
        },
        relevance: {
          isRelevant: false,
          confidence: 0.5
        },
        marketImpact: {
          level: 'none',
          confidence: 0.5,
          reasoning: 'Classification failed'
        }
      };
    }
  }

  /**
   * Get tweets with advanced filtering
   */
  async getTweets(filters = {}, options = {}) {
    try {
      const {
        company,
        sentiment,
        impact,
        relevance,
        timeRange,
        search,
        limit = 50,
        page = 1,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

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

      if (relevance !== undefined) {
        filter['relevance.isRelevant'] = relevance;
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

      return {
        tweets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasNext: page < Math.ceil(total / parseInt(limit)),
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      };

    } catch (error) {
      console.error('❌ Error getting tweets:', error);
      throw error;
    }
  }

  /**
   * Get sentiment statistics for a company
   */
  async getCompanySentimentStats(symbol, timeRange) {
    try {
      const stats = await Tweet.getSentimentStats(symbol, timeRange);
      
      // Calculate additional metrics
      const totalTweets = stats.reduce((sum, stat) => sum + stat.count, 0);
      const avgSentiment = stats.reduce((sum, stat) => {
        const sentimentValue = stat._id === 'positive' ? 1 : stat._id === 'negative' ? -1 : 0;
        return sum + (sentimentValue * stat.count);
      }, 0) / totalTweets;

      return {
        symbol: symbol.toUpperCase(),
        timeRange: timeRange ? `${timeRange}h` : 'all',
        stats,
        totalTweets,
        avgSentiment: isNaN(avgSentiment) ? 0 : avgSentiment
      };

    } catch (error) {
      console.error('❌ Error getting company sentiment stats:', error);
      throw error;
    }
  }

  /**
   * Get trending companies
   */
  async getTrendingCompanies(hours = 24) {
    try {
      return await Tweet.getTrendingCompanies(hours);
    } catch (error) {
      console.error('❌ Error getting trending companies:', error);
      throw error;
    }
  }

  /**
   * Search tweets by text content
   */
  async searchTweets(query, options = {}) {
    try {
      const { limit = 20, page = 1 } = options;

      if (!query) {
        throw new Error('Search query is required');
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const tweets = await Tweet.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('companyTagged', 'symbol name')
        .lean();

      const total = await Tweet.countDocuments({ $text: { $search: query } });

      return {
        tweets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          limit: parseInt(limit)
        }
      };

    } catch (error) {
      console.error('❌ Error searching tweets:', error);
      throw error;
    }
  }

  /**
   * Update tweet processing status
   */
  async updateProcessingStatus(tweetId, status, errors = []) {
    try {
      const update = { processingStatus: status };
      if (errors.length > 0) {
        update.processingErrors = errors;
      }

      await Tweet.findOneAndUpdate(
        { tweetId },
        update,
        { new: true }
      );

    } catch (error) {
      console.error('❌ Error updating tweet processing status:', error);
      throw error;
    }
  }

  /**
   * Get tweet by ID
   */
  async getTweetById(tweetId) {
    try {
      return await Tweet.findOne({ tweetId })
        .populate('companyTagged', 'symbol name')
        .lean();

    } catch (error) {
      console.error('❌ Error getting tweet by ID:', error);
      throw error;
    }
  }

  /**
   * Delete old tweets
   */
  async cleanupOldTweets(days = 30, keepHighImpact = true) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const filter = { createdAt: { $lt: cutoffDate } };
      if (keepHighImpact) {
        filter['marketImpact.level'] = { $ne: 'high' };
      }

      const result = await Tweet.deleteMany(filter);
      
      console.log(`🗑️ Deleted ${result.deletedCount} old tweets`);
      return result.deletedCount;

    } catch (error) {
      console.error('❌ Error cleaning up old tweets:', error);
      throw error;
    }
  }

  /**
   * Get tweet statistics
   */
  async getTweetStats(timeRange = 24) {
    try {
      const cutoffDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

      const [
        totalTweets,
        sentimentStats,
        impactStats,
        processingStats
      ] = await Promise.all([
        Tweet.countDocuments({ createdAt: { $gte: cutoffDate } }),
        Tweet.aggregate([
          {
            $match: { createdAt: { $gte: cutoffDate } }
          },
          {
            $group: {
              _id: '$sentiment.label',
              count: { $sum: 1 }
            }
          }
        ]),
        Tweet.aggregate([
          {
            $match: { createdAt: { $gte: cutoffDate } }
          },
          {
            $group: {
              _id: '$marketImpact.level',
              count: { $sum: 1 }
            }
          }
        ]),
        Tweet.aggregate([
          {
            $match: { createdAt: { $gte: cutoffDate } }
          },
          {
            $group: {
              _id: '$processingStatus',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      return {
        timeRange: `${timeRange}h`,
        totalTweets,
        sentimentStats,
        impactStats,
        processingStats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting tweet stats:', error);
      throw error;
    }
  }
}

module.exports = new TweetService();






