const stockDataAgent = require('../services/stockDataAgent');
require('dotenv').config();

async function fetchStockData() {
  try {
    console.log('🚀 Starting Stock Data Agent...');
    
    // Check if Alpha Vantage API key is configured
    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      console.error('❌ Alpha Vantage API key not configured in .env file');
      console.log('💡 Please add ALPHA_VANTAGE_API_KEY=your_key_here to your .env file');
      return;
    }

    // Initialize the agent
    await stockDataAgent.initialize();
    
    // Check if data needs updating
    if (await stockDataAgent.needsUpdate()) {
      console.log('📊 Data needs updating, starting bulk fetch...');
      await stockDataAgent.fetchAllStockData();
      console.log('✅ Stock data fetch completed successfully!');
    } else {
      console.log('✅ Data is already up to date');
      const lastUpdate = await stockDataAgent.getLastUpdateInfo();
      if (lastUpdate) {
        console.log(`📅 Last updated: ${lastUpdate.lastUpdate}`);
        console.log(`📊 Total companies: ${lastUpdate.totalCompanies}`);
        console.log(`📈 Data points: ${lastUpdate.dataPoints}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
fetchStockData();
