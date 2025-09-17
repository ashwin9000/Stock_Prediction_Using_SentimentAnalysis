const Stock = require('../models/Stock');
const axios = require('axios');
const stockDataAgent = require('./stockDataAgent');

class StockService {
  /**
   * Initialize stock data agent
   */
  async initialize() {
    try {
      await stockDataAgent.initialize();
      console.log('✅ Stock Data Agent initialized in Stock Service');
    } catch (error) {
      console.error('❌ Error initializing Stock Data Agent:', error);
    }
  }

  /**
   * Update stock data for all active stocks
   */
  async updateStockData(symbol = null) {
    try {
      console.log('🔄 Updating stock data...');
      
      // Check if we need to update CSV data
      if (await stockDataAgent.needsUpdate()) {
        console.log('📊 CSV data is outdated, fetching fresh data...');
        await stockDataAgent.fetchAllStockData();
      } else {
        console.log('✅ CSV data is up to date');
      }

      let stocks;
      if (symbol) {
        stocks = await Stock.find({ symbol: symbol.toUpperCase(), isActive: true });
      } else {
        stocks = await Stock.find({ isActive: true });
      }

      const updatedStocks = [];
      
      for (const stock of stocks) {
        try {
          const stockData = await this.fetchStockData(stock.symbol);
          if (stockData) {
            await this.updateStockRecord(stock, stockData);
            updatedStocks.push(stock);
          }
        } catch (error) {
          console.error(`❌ Error updating stock ${stock.symbol}:`, error);
          stock.metadata.syncErrors = stock.metadata.syncErrors || [];
          stock.metadata.syncErrors.push(error.message);
          await stock.save();
        }
      }

      console.log(`✅ Updated ${updatedStocks.length} stocks`);
      return updatedStocks;

    } catch (error) {
      console.error('❌ Error updating stock data:', error);
      throw error;
    }
  }

  /**
   * Fetch stock data - now uses CSV data agent
   */
  async fetchStockData(symbol) {
    try {
      // Try to get data from CSV first
      try {
        const csvData = await stockDataAgent.getStockData(symbol);
        if (csvData) {
          console.log(`✅ Got ${symbol} data from CSV`);
          return csvData;
        }
      } catch (csvError) {
        console.log(`⚠️ CSV data not available for ${symbol}, trying API...`);
      }

      // Fallback to API if CSV data is not available
      const alphaData = await this.fetchFromAlphaVantage(symbol);
      if (alphaData) {
        return alphaData;
      }

      const yahooData = await this.fetchFromYahooFinance(symbol);
      if (yahooData) {
        return yahooData;
      }

      throw new Error('Failed to fetch stock data from all sources');

    } catch (error) {
      console.error(`❌ Error fetching data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch stock data from Alpha Vantage
   */
  async fetchFromAlphaVantage(symbol) {
    try {
      if (!process.env.ALPHA_VANTAGE_API_KEY) {
        console.log('⚠️ Alpha Vantage API key not configured');
        return null;
      }

      console.log(`🔍 Fetching ${symbol} data from Alpha Vantage...`);

      // Get current quote
      const quoteResponse = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: process.env.ALPHA_VANTAGE_API_KEY
        },
        timeout: 15000
      });

      if (quoteResponse.data && quoteResponse.data['Global Quote']) {
        const quote = quoteResponse.data['Global Quote'];
        
        const currentPrice = parseFloat(quote['05. price']);
        const previousClose = parseFloat(quote['08. previous close']);
        const priceChange = parseFloat(quote['09. change']);
        const priceChangePercent = parseFloat(quote['10. change percent'].replace('%', ''));

        // Get historical data for charts
        const historicalResponse = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol: symbol,
            outputsize: 'compact',
            apikey: process.env.ALPHA_VANTAGE_API_KEY
          },
          timeout: 15000
        });

        let priceHistory = [];
        if (historicalResponse.data && historicalResponse.data['Time Series (Daily)']) {
          const timeSeries = historicalResponse.data['Time Series (Daily)'];
          const dates = Object.keys(timeSeries).sort().slice(-30); // Last 30 days
          
          priceHistory = dates.map(date => {
            const data = timeSeries[date];
            return {
              date: new Date(date),
              open: parseFloat(data['1. open']),
              high: parseFloat(data['2. high']),
              low: parseFloat(data['3. low']),
              close: parseFloat(data['4. close']),
              volume: parseInt(data['5. volume']),
              adjustedClose: parseFloat(data['4. close'])
            };
          });
        }

        // Get company overview
        const overviewResponse = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'OVERVIEW',
            symbol: symbol,
            apikey: process.env.ALPHA_VANTAGE_API_KEY
          },
          timeout: 15000
        });

        let companyInfo = {};
        if (overviewResponse.data && overviewResponse.data.Symbol) {
          companyInfo = {
            name: overviewResponse.data.Name || symbol,
            sector: overviewResponse.data.Sector || 'Unknown',
            industry: overviewResponse.data.Industry || 'Unknown',
            marketCap: overviewResponse.data.MarketCapitalization ? 
              parseFloat(overviewResponse.data.MarketCapitalization) : null,
            peRatio: overviewResponse.data.PERatio ? 
              parseFloat(overviewResponse.data.PERatio) : null,
            dividendYield: overviewResponse.data.DividendYield ? 
              parseFloat(overviewResponse.data.DividendYield) : null,
            beta: overviewResponse.data.Beta ? 
              parseFloat(overviewResponse.data.Beta) : null
          };
        }

        return {
          symbol: symbol.toUpperCase(),
          name: companyInfo.name || symbol,
          currentPrice,
          previousClose,
          priceChange,
          priceChangePercent,
          volume: parseInt(quote['06. volume']),
          open: currentPrice, // Alpha Vantage doesn't provide current day open in GLOBAL_QUOTE
          high: currentPrice, // Will be updated with historical data
          low: currentPrice,  // Will be updated with historical data
          currency: 'USD',
          exchange: quote['01. symbol'].includes('.NS') ? 'NSE' : 'NYSE',
          lastUpdated: new Date(),
          priceHistory,
          companyInfo
        };
      }

      return null;

    } catch (error) {
      console.error(`❌ Error fetching from Alpha Vantage for ${symbol}:`, error);
      if (error.response?.status === 429) {
        console.log('⚠️ Alpha Vantage API rate limit reached, falling back to Yahoo Finance');
      }
      return null;
    }
  }

  /**
   * Fetch stock data from Yahoo Finance
   */
  async fetchFromYahooFinance(symbol) {
    try {
      console.log(`🔍 Fetching ${symbol} data from Yahoo Finance...`);

      const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: {
          range: '1mo',
          interval: '1d',
          includePrePost: false
        },
        timeout: 10000
      });

      if (response.data && response.data.chart && response.data.chart.result) {
        const result = response.data.chart.result[0];
        const quote = result.indicators.quote[0];
        const meta = result.meta;

        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose;
        const priceChange = currentPrice - previousClose;
        const priceChangePercent = (priceChange / previousClose) * 100;

        // Process price history
        const timestamps = result.timestamp;
        const priceHistory = timestamps.map((timestamp, index) => ({
          date: new Date(timestamp * 1000),
          open: quote.open[index] || currentPrice,
          high: quote.high[index] || currentPrice,
          low: quote.low[index] || currentPrice,
          close: quote.close[index] || currentPrice,
          volume: quote.volume[index] || 0,
          adjustedClose: quote.close[index] || currentPrice
        }));

        return {
          symbol: symbol.toUpperCase(),
          name: meta.symbol,
          currentPrice,
          previousClose,
          open: quote.open[quote.open.length - 1],
          high: Math.max(...quote.high.filter(h => h !== null)),
          low: Math.min(...quote.low.filter(l => l !== null)),
          volume: quote.volume[quote.volume.length - 1],
          priceChange,
          priceChangePercent,
          currency: meta.currency,
          exchange: meta.exchangeName,
          lastUpdated: new Date(meta.regularMarketTime * 1000),
          priceHistory
        };
      }

      return null;

    } catch (error) {
      console.error(`❌ Error fetching from Yahoo Finance for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Update stock record with new data
   */
  async updateStockRecord(stock, stockData) {
    try {
      // Update basic stock information
      stock.currentPrice = stockData.currentPrice;
      stock.previousClose = stockData.previousClose;
      stock.priceChange = stockData.priceChange;
      stock.priceChangePercent = stockData.priceChangePercent;
      stock.lastUpdated = stockData.lastUpdated;

      if (stockData.open) stock.open = stockData.open;
      if (stockData.high) stock.high = stockData.high;
      if (stockData.low) stock.low = stockData.low;
      if (stockData.volume) stock.volume = stockData.volume;
      if (stockData.currency) stock.currency = stockData.currency;
      if (stockData.exchange) stock.exchange = stockData.exchange;

      // Update company information
      if (stockData.companyInfo) {
        stock.name = stockData.companyInfo.name || stock.name;
        stock.sector = stockData.companyInfo.sector || stock.sector;
        stock.industry = stockData.companyInfo.industry || stock.industry;
        stock.marketCap = stockData.companyInfo.marketCap || stock.marketCap;
        stock.peRatio = stockData.companyInfo.peRatio || stock.peRatio;
        stock.dividendYield = stockData.companyInfo.dividendYield || stock.dividendYield;
        stock.beta = stockData.companyInfo.beta || stock.beta;
      }

      // Add to price history
      if (stockData.priceHistory && stockData.priceHistory.length > 0) {
        // Clear old history and add new
        stock.priceHistory = stockData.priceHistory;
      }

      // Update metadata
      stock.metadata.lastSync = new Date();
      stock.metadata.syncErrors = [];
      stock.metadata.dataSource = stockData.companyInfo ? 'alpha_vantage' : 'yahoo_finance';

      await stock.save();

    } catch (error) {
      console.error(`❌ Error updating stock record for ${stock.symbol}:`, error);
      throw error;
    }
  }

  /**
   * Add new stock to database
   */
  async addStock(symbol, name = null) {
    try {
      // Check if stock already exists
      const existingStock = await Stock.findOne({ symbol: symbol.toUpperCase() });
      if (existingStock) {
        return existingStock;
      }

      // Fetch initial stock data
      const stockData = await this.fetchStockData(symbol);
      if (!stockData) {
        throw new Error(`Failed to fetch data for ${symbol}`);
      }

      // Create new stock record
      const stock = new Stock({
        symbol: symbol.toUpperCase(),
        name: name || stockData.name || symbol,
        currentPrice: stockData.currentPrice,
        previousClose: stockData.previousClose,
        priceChange: stockData.priceChange,
        priceChangePercent: stockData.priceChangePercent,
        volume: stockData.volume,
        currency: stockData.currency || 'USD',
        exchange: stockData.exchange || 'Unknown',
        lastUpdated: stockData.lastUpdated,
        isActive: true,
        sector: stockData.companyInfo?.sector || 'Unknown',
        industry: stockData.companyInfo?.industry || 'Unknown',
        marketCap: stockData.companyInfo?.marketCap || null,
        peRatio: stockData.companyInfo?.peRatio || null,
        dividendYield: stockData.companyInfo?.dividendYield || null,
        beta: stockData.companyInfo?.beta || null,
        metadata: {
          source: stockData.companyInfo ? 'alpha_vantage' : 'yahoo_finance',
          lastSync: new Date()
        }
      });

      // Add initial price history
      if (stockData.priceHistory && stockData.priceHistory.length > 0) {
        stock.priceHistory = stockData.priceHistory;
      }

      await stock.save();
      console.log(`✅ Added new stock: ${symbol}`);

      return stock;

    } catch (error) {
      console.error(`❌ Error adding stock ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get stock by symbol
   */
  async getStock(symbol) {
    try {
      return await Stock.findOne({ 
        symbol: symbol.toUpperCase(),
        isActive: true 
      }).lean();

    } catch (error) {
      console.error(`❌ Error getting stock ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple stocks with filtering
   */
  async getStocks(filters = {}, options = {}) {
    try {
      const {
        search,
        limit = 50,
        sortBy = 'symbol',
        sortOrder = 'asc'
      } = filters;

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
        .lean();

      return stocks;

    } catch (error) {
      console.error('❌ Error getting stocks:', error);
      throw error;
    }
  }

  /**
   * Get market summary data
   */
  async getMarketSummary() {
    try {
      const [topGainers, topLosers, mostActive] = await Promise.all([
        Stock.getTopGainers(10),
        Stock.getTopLosers(10),
        Stock.getMostActive(10)
      ]);

      return {
        topGainers,
        topLosers,
        mostActive,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting market summary:', error);
      throw error;
    }
  }

  /**
   * Get stock price history
   */
  async getPriceHistory(symbol, period = '1mo') {
    try {
      const stock = await Stock.findOne({ 
        symbol: symbol.toUpperCase(),
        isActive: true 
      }).select('priceHistory currentPrice previousClose').lean();

      if (!stock) {
        throw new Error('Stock not found');
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

      return {
        symbol: symbol.toUpperCase(),
        period,
        priceHistory: filteredHistory,
        currentPrice: stock.currentPrice,
        previousClose: stock.previousClose
      };

    } catch (error) {
      console.error(`❌ Error getting price history for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Update sentiment data for a stock
   */
  async updateSentimentData(symbol, sentimentStats) {
    try {
      const stock = await Stock.findOne({ 
        symbol: symbol.toUpperCase(),
        isActive: true 
      });

      if (!stock) {
        throw new Error('Stock not found');
      }

      await stock.updateSentimentData(sentimentStats);
      return stock;

    } catch (error) {
      console.error(`❌ Error updating sentiment data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get stock statistics
   */
  async getStockStats() {
    try {
      const [
        totalStocks,
        activeStocks,
        avgPriceChange,
        volatilityStats
      ] = await Promise.all([
        Stock.countDocuments(),
        Stock.countDocuments({ isActive: true }),
        Stock.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: null, avgChange: { $avg: '$priceChangePercent' } } }
        ]),
        Stock.aggregate([
          { $match: { isActive: true } },
          {
            $addFields: {
              volatility: { $abs: '$priceChangePercent' }
            }
          },
          {
            $group: {
              _id: null,
              avgVolatility: { $avg: '$volatility' },
              maxVolatility: { $max: '$volatility' },
              minVolatility: { $min: '$volatility' }
            }
          }
        ])
      ]);

      return {
        totalStocks,
        activeStocks,
        avgPriceChange: avgPriceChange[0]?.avgChange || 0,
        volatility: volatilityStats[0] || {},
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting stock stats:', error);
      throw error;
    }
  }
}

module.exports = new StockService();
