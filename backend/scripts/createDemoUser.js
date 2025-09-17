const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');

async function createDemoUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if demo user already exists
    const existingUser = await User.findOne({ email: 'demo@fintweet.com' });
    if (existingUser) {
      console.log('ℹ️ Demo user already exists');
      return;
    }

    // Create demo user
    const demoUser = new User({
      name: 'Demo User',
      email: 'demo@fintweet.com',
      password: 'demo123',
      role: 'user',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true
        },
        dashboard: {
          layout: 'default',
          widgets: ['market-overview', 'sentiment-chart', 'tweet-stream', 'alerts']
        }
      }
    });

    await demoUser.save();
    console.log('✅ Demo user created successfully');
    console.log('📧 Email: demo@fintweet.com');
    console.log('🔑 Password: demo123');

  } catch (error) {
    console.error('❌ Error creating demo user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createDemoUser();






