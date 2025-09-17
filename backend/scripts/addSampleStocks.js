const mongoose = require('mongoose');
const Stock = require('../models/Stock');
require('dotenv').config();

const sampleStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd' }
];

async function addSampleStocks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if stocks already exist
    const existingStocks = await Stock.find({});
    if (existingStocks.length > 0) {
      console.log(`⚠️ Found ${existingStocks.length} existing stocks in database`);
      console.log('Skipping sample stock creation...');
      return;
    }

    console.log('🔄 Adding sample stocks...');

    // Add each sample stock
    for (const stockData of sampleStocks) {
      try {
        const stock = new Stock({
          symbol: stockData.symbol,
          name: stockData.name,
          currentPrice: 0,
          previousClose: 0,
          priceChange: 0,
          priceChangePercent: 0,
          volume: 0,
          currency: stockData.symbol.includes('.NS') ? 'INR' : 'USD',
          exchange: stockData.symbol.includes('.NS') ? 'NSE' : 'NYSE',
          lastUpdated: new Date(),
          isActive: true,
          sector: 'Unknown',
          industry: 'Unknown',
          priceHistory: [],
          metadata: {
            source: 'manual',
            lastSync: new Date()
          }
        });

        await stock.save();
        console.log(`✅ Added: ${stockData.symbol} - ${stockData.name}`);
      } catch (error) {
        console.error(`❌ Error adding ${stockData.symbol}:`, error.message);
      }
    }

    console.log('✅ Sample stocks added successfully!');
    console.log('💡 Now you can fetch real-time data using the stock service');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addSampleStocks();
