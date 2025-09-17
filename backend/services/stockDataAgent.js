const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class StockDataAgent {
  constructor() {
    this.dataDir = path.join(__dirname, '../data/stocks');
    this.csvPath = path.join(this.dataDir, 'stock_data.csv');
    this.lastUpdatePath = path.join(this.dataDir, 'last_update.json');

    // Default companies
    const defaultCompanies = [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical' },
      { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
      { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services' },
      { symbol: 'V', name: 'Visa Inc.', sector: 'Financial Services' },
      { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd', sector: 'Industrials' },
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', sector: 'Energy' },
      { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd', sector: 'Technology' },
      { symbol: 'INFY.NS', name: 'Infosys Ltd', sector: 'Technology' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'Financial Services' }
    ];

    // Optional env override to limit symbols (comma-separated)
    if (process.env.STOCK_SYMBOLS) {
      const wanted = process.env.STOCK_SYMBOLS.split(',').map(s => s.trim().toUpperCase());
      this.companies = wanted.map(sym => ({ symbol: sym, name: sym, sector: 'Unknown' }));
    } else {
      this.companies = defaultCompanies;
    }

    this.days = parseInt(process.env.STOCK_DAYS || '30', 10); // last N days
  }

  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      if (!await this.fileExists(this.csvPath)) {
        await this.createInitialCsv();
      }
      console.log('✅ Stock Data Agent initialized');
    } catch (error) {
      console.error('❌ Error initializing Stock Data Agent:', error);
      throw error;
    }
  }

  async fileExists(filePath) {
    try { await fs.access(filePath); return true; } catch { return false; }
  }

  async createInitialCsv() {
    const csvWriter = createCsvWriter({
      path: this.csvPath,
      header: [
        { id: 'date', title: 'Date' },
        { id: 'symbol', title: 'Symbol' },
        { id: 'name', title: 'Name' },
        { id: 'sector', title: 'Sector' },
        { id: 'open', title: 'Open' },
        { id: 'high', title: 'High' },
        { id: 'low', title: 'Low' },
        { id: 'close', title: 'Close' },
        { id: 'volume', title: 'Volume' },
        { id: 'adjustedClose', title: 'AdjustedClose' },
        { id: 'priceChange', title: 'PriceChange' },
        { id: 'priceChangePercent', title: 'PriceChangePercent' }
      ]
    });
    await csvWriter.writeRecords([]);
    console.log('✅ Initial CSV file created');
  }

  async fetchAllStockData() {
    try {
      console.log('🔄 Starting bulk stock data fetch...');
      if (!process.env.ALPHA_VANTAGE_API_KEY) throw new Error('Alpha Vantage API key not configured');

      let totalRows = 0;
      let successCount = 0;
      let errorCount = 0;

      // Respect free-tier limits: 5 requests/min. Use 1 per 15s for safety.
      const perRequestDelayMs = parseInt(process.env.STOCK_FETCH_DELAY_MS || '15000', 10);

      for (let i = 0; i < this.companies.length; i++) {
        const company = this.companies[i];
        console.log(`🔍 (${i + 1}/${this.companies.length}) Fetching ${company.symbol}...`);
        try {
          const stockData = await this.fetchCompanyData(company);
          if (stockData && stockData.length) {
            // Append rows for this symbol immediately
            await this.saveToCsv(stockData, true);
            totalRows += stockData.length;
            successCount++;
            console.log(`💾 Appended ${stockData.length} rows for ${company.symbol}. CSV total so far ~${totalRows}.`);
          } else {
            console.warn(`⚠️ No data returned for ${company.symbol}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error fetching ${company.symbol}:`, error.message);
          errorCount++;
        }
        // Throttle between symbols
        if (i < this.companies.length - 1) {
          await this.sleep(perRequestDelayMs);
        }
      }

      await this.updateLastUpdateTime();
      console.log(`✅ Bulk fetch completed: ${successCount} ok, ${errorCount} failed. Rows appended: ${totalRows}`);
      return { successCount, errorCount, totalRows };
    } catch (error) {
      console.error('❌ Error in bulk stock data fetch:', error);
      throw error;
    }
  }

  async fetchCompanyData(company) {
    // Helper to call AlphaVantage with retry/backoff when rate-limited
    const callAlpha = async (params, attempt = 1) => {
      const maxAttempts = parseInt(process.env.STOCK_MAX_RETRIES || '5', 10);
      const backoffSec = Math.min(60 * attempt, 180);
      console.log(`➡️ AlphaVantage request`, params);
      const res = await axios.get('https://www.alphavantage.co/query', { params, timeout: 20000 });
      const data = res.data || {};
      const keys = Object.keys(data);
      if (data.Note || data['Error Message']) {
        console.log('⚠️ AlphaVantage responded with Note/Error:', {
          note: data.Note,
          error: data['Error Message'],
          keys: keys.slice(0, 5)
        });
        if (attempt >= maxAttempts) {
          throw new Error(data.Note || data['Error Message'] || 'Alpha Vantage error');
        }
        console.log(`⏳ Rate-limited or error. Waiting ${backoffSec}s before retry ${attempt + 1}/${maxAttempts}...`);
        await this.sleep(backoffSec * 1000);
        return callAlpha(params, attempt + 1);
      }
      if (!data['Time Series (Daily)'] && !data['Time Series (Daily)']) {
        console.log('❔ Unexpected AlphaVantage payload (no daily time series). Top-level keys:', keys);
      }
      return data;
    };

    try {
      // 1) Try Alpha Vantage DAILY_ADJUSTED
      const daily = await callAlpha({
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol: company.symbol,
        outputsize: 'compact',
        apikey: process.env.ALPHA_VANTAGE_API_KEY
      });

      const ts = daily['Time Series (Daily)'];
      if (ts) {
        const dates = Object.keys(ts).sort().slice(-(this.days));
        return dates.map(date => {
          const d = ts[date];
          const open = parseFloat(d['1. open']);
          const high = parseFloat(d['2. high']);
          const low = parseFloat(d['3. low']);
          const close = parseFloat(d['4. close']);
          const adj = parseFloat(d['5. adjusted close']);
          const vol = parseInt(d['6. volume']);
          const priceChange = close - open;
          const priceChangePercent = open ? (priceChange / open) * 100 : 0;
          return {
            date,
            symbol: company.symbol.toUpperCase(),
            name: company.name,
            sector: company.sector,
            open,
            high,
            low,
            close,
            volume: vol,
            adjustedClose: isNaN(adj) ? close : adj,
            priceChange,
            priceChangePercent
          };
        });
      }

      // 2) Fallback to Yahoo Finance if Alpha had no data
      console.log(`↩️ Falling back to Yahoo Finance for ${company.symbol}`);
      const yahooRows = await this.fetchFromYahoo(company.symbol);
      return yahooRows;
    } catch (error) {
      console.error(`❌ Error fetching ${company.symbol}:`, error.message);
      // Final fallback to Yahoo if Alpha threw
      try {
        console.log(`↩️ Final fallback to Yahoo Finance for ${company.symbol}`);
        const yahooRows = await this.fetchFromYahoo(company.symbol);
        return yahooRows;
      } catch (e) {
        console.error(`❌ Yahoo fallback failed for ${company.symbol}:`, e.message);
        return null;
      }
    }
  }

  // Yahoo Finance fallback (chart API)
  async fetchFromYahoo(symbol) {
    try {
      const range = this.days <= 5 ? '5d' : (this.days <= 30 ? '1mo' : '3mo');
      const interval = '1d';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
      const { data } = await axios.get(url, {
        params: { range, interval, includePrePost: false },
        timeout: 20000
      });
      if (!data || !data.chart || !data.chart.result || !data.chart.result[0]) {
        console.log('❔ Unexpected Yahoo payload keys:', Object.keys(data || {}));
        return null;
      }
      const result = data.chart.result[0];
      const quote = result.indicators.quote[0];
      const timestamps = result.timestamp || [];
      const rows = [];
      for (let i = 0; i < timestamps.length; i++) {
        const ts = new Date((timestamps[i] || 0) * 1000);
        if (!isFinite(ts)) continue;
        const open = parseFloat(quote.open?.[i]) || null;
        const high = parseFloat(quote.high?.[i]) || null;
        const low = parseFloat(quote.low?.[i]) || null;
        const close = parseFloat(quote.close?.[i]) || null;
        const vol = parseInt(quote.volume?.[i]) || 0;
        if (open == null || close == null) continue;
        const change = close - open;
        const pct = open ? (change / open) * 100 : 0;
        rows.push({
          date: ts.toISOString().slice(0, 10),
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          sector: 'Unknown',
          open,
          high: high ?? close,
          low: low ?? close,
          close,
          volume: vol,
          adjustedClose: close,
          priceChange: change,
          priceChangePercent: pct
        });
      }
      // Keep last N days
      const limited = rows.slice(-(this.days));
      console.log(`✅ Yahoo fallback provided ${limited.length} rows for ${symbol}`);
      return limited;
    } catch (err) {
      console.error(`❌ Yahoo fetch failed for ${symbol}:`, err.message);
      return null;
    }
  }

  async saveToCsv(stockData, append = false) {
    try {
      const csvWriter = createCsvWriter({
        path: this.csvPath,
        header: [
          { id: 'date', title: 'Date' },
          { id: 'symbol', title: 'Symbol' },
          { id: 'name', title: 'Name' },
          { id: 'sector', title: 'Sector' },
          { id: 'open', title: 'Open' },
          { id: 'high', title: 'High' },
          { id: 'low', title: 'Low' },
          { id: 'close', title: 'Close' },
          { id: 'volume', title: 'Volume' },
          { id: 'adjustedClose', title: 'AdjustedClose' },
          { id: 'priceChange', title: 'PriceChange' },
          { id: 'priceChangePercent', title: 'PriceChangePercent' }
        ],
        append
      });
      await csvWriter.writeRecords(stockData);
      return true;
    } catch (error) {
      console.error('❌ Error saving to CSV:', error);
      throw error;
    }
  }

  async updateLastUpdateTime() {
    try {
      const updateInfo = {
        lastUpdate: new Date().toISOString(),
        totalCompanies: this.companies.length,
        dataPoints: await this.getDataPointCount()
      };
      await fs.writeFile(this.lastUpdatePath, JSON.stringify(updateInfo, null, 2));
    } catch (error) {
      console.error('❌ Error updating last update time:', error);
    }
  }

  async getDataPointCount() {
    try {
      const fileContent = await fs.readFile(this.csvPath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      return Math.max(0, lines.length - 1);
    } catch { return 0; }
  }

  async getStockData(symbol, period = '1mo') {
    try {
      if (!await this.fileExists(this.csvPath)) throw new Error('Stock data file not found. Run bulk fetch first.');
      const fileContent = await fs.readFile(this.csvPath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length <= 1) throw new Error('Stock data file is empty or only contains headers');

      const data = [];
      const headers = lines[0].split(',');
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((h, idx) => { row[h.trim()] = values[idx] ? values[idx].trim() : ''; });
        data.push(row);
      }

      const companyData = data.filter(r => r.Symbol === symbol.toUpperCase());
      if (companyData.length === 0) throw new Error(`No data found for symbol: ${symbol}`);
      companyData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
      const filteredData = this.filterByPeriod(companyData, period);

      return {
        symbol: symbol.toUpperCase(),
        name: companyData[0].Name,
        sector: companyData[0].Sector,
        currentPrice: parseFloat(companyData[0].Close),
        previousClose: companyData.length > 1 ? parseFloat(companyData[1].Close) : parseFloat(companyData[0].Close),
        priceHistory: filteredData.map(r => ({
          date: new Date(r.Date), open: parseFloat(r.Open), high: parseFloat(r.High), low: parseFloat(r.Low), close: parseFloat(r.Close), volume: parseInt(r.Volume), adjustedClose: parseFloat(r.AdjustedClose)
        }))
      };
    } catch (error) {
      console.error(`❌ Error getting stock data for ${symbol}:`, error.message);
      throw error;
    }
  }

  filterByPeriod(data, period) {
    if (!data || data.length === 0) return data;
    
    // Sort data by date (newest first)
    const sortedData = data.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    const latestDate = new Date(sortedData[0].Date);
    
    let daysToKeep;
    switch (period) {
      case '1d': daysToKeep = 1; break;
      case '5d': daysToKeep = 5; break;
      case '1mo': daysToKeep = 30; break;
      case '3mo': daysToKeep = 90; break;
      case '6mo': daysToKeep = 180; break;
      case '1y': daysToKeep = 365; break;
      default: daysToKeep = data.length; // Return all data
    }
    
    // Return the most recent N days of data
    return sortedData.slice(0, daysToKeep);
  }

  async getLastUpdateInfo() {
    try {
      if (await this.fileExists(this.lastUpdatePath)) {
        const content = await fs.readFile(this.lastUpdatePath, 'utf-8');
        return JSON.parse(content);
      }
      return null;
    } catch { return null; }
  }

  async needsUpdate() {
    try {
      const lastUpdate = await this.getLastUpdateInfo();
      if (!lastUpdate) return true;
      const lastUpdateTime = new Date(lastUpdate.lastUpdate);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdateTime) / (1000 * 60 * 60);
      return hoursSinceUpdate > 24;
    } catch { return true; }
  }

  sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

module.exports = new StockDataAgent();
