const mongoose = require('mongoose');

const tweetSchema = new mongoose.Schema({
  tweetId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  cleanedText: {
    type: String,
    required: true,
    maxlength: 1000
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  userFollowersCount: {
    type: Number,
    default: 0
  },
  userVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    required: true,
    index: true
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  companyTagged: [{
    symbol: {
      type: String,
      uppercase: true
    },
    name: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  }],
  sentiment: {
    label: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    scores: {
      positive: { type: Number, min: 0, max: 1 },
      negative: { type: Number, min: 0, max: 1 },
      neutral: { type: Number, min: 0, max: 1 }
    }
  },
  relevance: {
    isRelevant: {
      type: Boolean,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  marketImpact: {
    level: {
      type: String,
      enum: ['high', 'medium', 'low', 'none'],
      default: 'none'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    reasoning: String
  },
  engagement: {
    retweetCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    quoteCount: { type: Number, default: 0 }
  },
  language: {
    type: String,
    default: 'en'
  },
  isRetweet: {
    type: Boolean,
    default: false
  },
  isReply: {
    type: Boolean,
    default: false
  },
  hashtags: [String],
  urls: [String],
  mentions: [String],
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingErrors: [String],
  metadata: {
    source: {
      type: String,
      enum: ['twitter_api', 'manual', 'import'],
      default: 'twitter_api'
    },
    agentVersion: String,
    modelVersion: String,
    processingTime: Number
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
tweetSchema.index({ createdAt: -1 });
tweetSchema.index({ 'companyTagged.symbol': 1, createdAt: -1 });
tweetSchema.index({ 'sentiment.label': 1, createdAt: -1 });
tweetSchema.index({ 'marketImpact.level': 1, createdAt: -1 });
tweetSchema.index({ 'relevance.isRelevant': 1, createdAt: -1 });
tweetSchema.index({ text: 'text' }); // Text search index

// Virtual for engagement score
tweetSchema.virtual('engagementScore').get(function() {
  return this.engagement.retweetCount * 2 + 
         this.engagement.likeCount + 
         this.engagement.replyCount * 3 + 
         this.engagement.quoteCount * 2;
});

// Virtual for impact score
tweetSchema.virtual('impactScore').get(function() {
  const impactWeights = { high: 3, medium: 2, low: 1, none: 0 };
  const sentimentWeights = { positive: 1, negative: -1, neutral: 0 };
  
  return impactWeights[this.marketImpact.level] * 
         sentimentWeights[this.sentiment.label] * 
         this.sentiment.confidence * 
         this.engagementScore;
});

// Pre-save middleware
tweetSchema.pre('save', function(next) {
  if (this.isModified('text')) {
    this.cleanedText = this.text.replace(/https?:\/\/\S+/g, '').trim();
  }
  next();
});

// Static method to get sentiment statistics
tweetSchema.statics.getSentimentStats = async function(companySymbol, timeRange) {
  const matchStage = {
    'companyTagged.symbol': companySymbol
  };
  
  if (timeRange) {
    matchStage.createdAt = {
      $gte: new Date(Date.now() - timeRange)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$sentiment.label',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$sentiment.confidence' },
        avgEngagement: { $avg: '$engagementScore' }
      }
    }
  ]);
};

// Static method to get trending companies
tweetSchema.statics.getTrendingCompanies = async function(hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { createdAt: { $gte: cutoffDate } } },
    { $unwind: '$companyTagged' },
    {
      $group: {
        _id: '$companyTagged.symbol',
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
        avgImpact: {
          $avg: {
            $cond: [
              { $eq: ['$marketImpact.level', 'high'] },
              3,
              { $cond: [
                { $eq: ['$marketImpact.level', 'medium'] },
                2,
                { $cond: [{ $eq: ['$marketImpact.level', 'low'] }, 1, 0] }
              ]}
            ]
          }
        }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
};

module.exports = mongoose.model('Tweet', tweetSchema);

