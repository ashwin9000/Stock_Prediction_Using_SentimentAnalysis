const Joi = require('joi');

// Validation schemas
const tweetQuerySchema = Joi.object({
  company: Joi.string().optional(),
  sentiment: Joi.string().valid('positive', 'negative', 'neutral').optional(),
  relevance: Joi.boolean().optional(),
  impact: Joi.string().valid('high', 'medium', 'low', 'none').optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1)
});

const tweetClassificationSchema = Joi.object({
  text: Joi.string().required().min(1).max(280),
  userId: Joi.string().required(),
  tweetId: Joi.string().required(),
  companyTagged: Joi.string().optional(),
  createdAt: Joi.date().required()
});

const stockQuerySchema = Joi.object({
  symbol: Joi.string().required(),
  period: Joi.string().valid('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max').default('1mo'),
  interval: Joi.string().valid('1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo').default('1d')
});

const sentimentQuerySchema = Joi.object({
  company: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  period: Joi.string().valid('1d', '1w', '1m', '3m', '6m', '1y').default('1m')
});

// Validation middleware
const validateTweetQuery = (req, res, next) => {
  const { error } = tweetQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

const validateTweetClassification = (req, res, next) => {
  const { error } = tweetClassificationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid tweet data',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

const validateStockQuery = (req, res, next) => {
  const { error } = stockQuerySchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid stock parameters',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

const validateSentimentQuery = (req, res, next) => {
  const { error } = sentimentQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid sentiment query parameters',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

module.exports = {
  validateTweetQuery,
  validateTweetClassification,
  validateStockQuery,
  validateSentimentQuery
};
