const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  exchange: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  sector: String,
  industry: String,
  marketCap: Number,
  currentPrice: {
    type: Number,
    required: true
  },
  previousClose: Number,
  open: Number,
  high: Number,
  low: Number,
  volume: Number,
  avgVolume: Number,
  priceChange: Number,
  priceChangePercent: Number,
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  priceHistory: [{
    date: {
      type: Date,
      required: true
    },
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number,
    adjustedClose: Number
  }],
  sentimentData: {
    last24h: {
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      avgSentiment: { type: Number, default: 0 }
    },
    last7d: {
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      avgSentiment: { type: Number, default: 0 }
    },
    last30d: {
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      avgSentiment: { type: Number, default: 0 }
    }
  },
  impactEvents: [{
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['earnings', 'news', 'analyst_rating', 'insider_trading', 'other'],
      required: true
    },
    description: String,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    priceImpact: Number,
    volume: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    source: {
      type: String,
      enum: ['yahoo_finance', 'alpha_vantage', 'polygon', 'manual'],
      default: 'yahoo_finance'
    },
    lastSync: Date,
    syncErrors: [String]
  }
}, {
  timestamps: true
});

// Indexes
stockSchema.index({ symbol: 1 });
stockSchema.index({ 'lastUpdated': -1 });
stockSchema.index({ 'currentPrice': -1 });
stockSchema.index({ 'priceChangePercent': -1 });

// Virtual for market cap category
stockSchema.virtual('marketCapCategory').get(function() {
  if (!this.marketCap) return 'Unknown';
  if (this.marketCap >= 200000000000) return 'Mega Cap';
  if (this.marketCap >= 10000000000) return 'Large Cap';
  if (this.marketCap >= 2000000000) return 'Mid Cap';
  if (this.marketCap >= 300000000) return 'Small Cap';
  return 'Micro Cap';
});

// Virtual for sentiment score
stockSchema.virtual('sentimentScore').get(function() {
  const data = this.sentimentData.last24h;
  if (data.total === 0) return 0;
  return (data.positive - data.negative) / data.total;
});

// Static method to get top gainers
stockSchema.statics.getTopGainers = async function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ priceChangePercent: -1 })
    .limit(limit)
    .select('symbol name currentPrice priceChange priceChangePercent volume');
};

// Static method to get top losers
stockSchema.statics.getTopLosers = async function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ priceChangePercent: 1 })
    .limit(limit)
    .select('symbol name currentPrice priceChange priceChangePercent volume');
};

// Static method to get most active
stockSchema.statics.getMostActive = async function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ volume: -1 })
    .limit(limit)
    .select('symbol name currentPrice priceChange priceChangePercent volume');
};

// Static method to get sentiment leaders
stockSchema.statics.getSentimentLeaders = async function(limit = 10) {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $addFields: {
        sentimentScore: {
          $cond: [
            { $eq: ['$sentimentData.last24h.total', 0] },
            0,
            {
              $divide: [
                { $subtract: ['$sentimentData.last24h.positive', '$sentimentData.last24h.negative'] },
                '$sentimentData.last24h.total'
              ]
            }
          ]
        }
      }
    },
    { $sort: { sentimentScore: -1 } },
    { $limit: limit },
    {
      $project: {
        symbol: 1,
        name: 1,
        currentPrice: 1,
        sentimentScore: 1,
        'sentimentData.last24h': 1
      }
    }
  ]);
};

// Method to update sentiment data
stockSchema.methods.updateSentimentData = async function(sentimentStats) {
  const { positive, negative, neutral, total } = sentimentStats;
  
  this.sentimentData.last24h = {
    positive: positive || 0,
    negative: negative || 0,
    neutral: neutral || 0,
    total: total || 0,
    avgSentiment: total > 0 ? (positive - negative) / total : 0
  };
  
  return this.save();
};

// Method to add price history entry
stockSchema.methods.addPriceHistory = function(priceData) {
  this.priceHistory.push(priceData);
  
  // Keep only last 365 days of data
  if (this.priceHistory.length > 365) {
    this.priceHistory = this.priceHistory.slice(-365);
  }
  
  return this.save();
};

// Method to add impact event
stockSchema.methods.addImpactEvent = function(eventData) {
  this.impactEvents.push(eventData);
  
  // Keep only last 100 events
  if (this.impactEvents.length > 100) {
    this.impactEvents = this.impactEvents.slice(-100);
  }
  
  return this.save();
};

module.exports = mongoose.model('Stock', stockSchema);

