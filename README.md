# 🚀 FinTweet - Financial Sentiment Analysis Platform

A scalable, real-time financial sentiment tracking platform with AI-powered tweet agents and a professional stock trading dashboard built using the MERN stack.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

FinTweet is a comprehensive financial sentiment analysis platform that:

- **Fetches tweets** in real-time using Twitter API v2
- **Classifies sentiment** using advanced ML models (FinBERT, VADER)
- **Analyzes market impact** with heuristic and future RL-based algorithms
- **Provides real-time dashboard** with professional trading interface
- **Supports multiple data sources** (Twitter, Yahoo Finance, Alpha Vantage)
- **Offers admin panel** for model management and system monitoring

## ✨ Features

### 🤖 AI Agents & ML
- **Tweet Agent**: Autonomous Python microservice for tweet fetching and preprocessing
- **ML Classifier**: FinBERT-based sentiment analysis with fallback to VADER
- **Smart Filtering**: Bot detection, spam filtering, and relevance classification
- **Market Impact Analysis**: Heuristic-based impact prediction (RL-ready)

### 📊 Real-time Dashboard
- **Live Data Streams**: WebSocket-powered real-time updates
- **Professional UI**: TradingView-inspired interface with dark/light themes
- **Interactive Charts**: Sentiment trends, stock prices, market overview
- **Responsive Design**: Mobile-friendly with adaptive layouts

### 🔧 Backend Services
- **RESTful APIs**: Comprehensive API with Swagger documentation
- **Real-time Communication**: Socket.io for live updates
- **Data Management**: MongoDB with Mongoose ODM
- **Security**: JWT authentication, rate limiting, CORS protection

### 📈 Analytics & Insights
- **Sentiment Trends**: Historical sentiment analysis over time
- **Market Correlation**: Tweet sentiment vs stock price movements
- **Company Tracking**: Multi-company sentiment monitoring
- **Alert System**: High-impact tweet notifications

## 🏗️ Architecture

```
FinTweet/
├── frontend/                 # React.js Dashboard (Port 3000)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service layer
│   │   ├── context/        # React context providers
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── backend/                 # Node.js + Express API (Port 5000)
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   ├── middleware/         # Custom middleware
│   └── server.js           # Main server file
├── tweet-agent/            # Python Tweepy Microservice (Port 8000)
│   ├── app.py             # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variables
├── ml-classifier/          # ML/NLP Microservice (Port 8001)
│   ├── app.py             # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variables
└── docs/                   # API Documentation
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Styling and design system
- **Framer Motion** - Animations and transitions
- **Recharts** - Data visualization
- **Socket.io Client** - Real-time communication
- **React Query** - Data fetching and caching

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Joi** - Data validation

### AI/ML Services
- **Python 3.9+** - ML runtime
- **FastAPI** - API framework
- **Tweepy** - Twitter API client
- **Transformers** - Hugging Face models
- **FinBERT** - Financial sentiment model
- **VADER** - Sentiment analysis fallback

### Infrastructure
- **Docker** - Containerization (ready)
- **MongoDB Atlas** - Cloud database
- **Redis** - Caching (optional)
- **Nginx** - Reverse proxy (production)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+ and pip
- MongoDB (local or Atlas)
- Twitter API credentials

### 1. Clone Repository
```bash
git clone <repository-url>
cd fintweet
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. Tweet Agent Setup
```bash
cd tweet-agent
pip install -r requirements.txt
cp .env.example .env
# Edit .env with Twitter API credentials
python app.py
```

### 4. ML Classifier Setup
```bash
cd ml-classifier
pip install -r requirements.txt
cp .env.example .env
# Edit .env with model configuration
python app.py
```

### 5. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 6. Access Application
- **Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Tweet Agent**: http://localhost:8000
- **ML Classifier**: http://localhost:8001

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/fintweet

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# API Keys
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
YAHOO_FINANCE_API_KEY=your_yahoo_finance_api_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key

# Microservices
TWEET_AGENT_URL=http://localhost:8000
ML_CLASSIFIER_URL=http://localhost:8001
```

#### Tweet Agent (.env)
```env
# Twitter API
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret

# Backend
BACKEND_URL=http://localhost:5000
BACKEND_API_KEY=your_backend_api_key

# Server
HOST=0.0.0.0
PORT=8000
```

#### ML Classifier (.env)
```env
# Model Configuration
MODEL_TYPE=finbert
MODEL_PATH=./models/finbert_model
USE_GPU=false
BATCH_SIZE=32

# Performance
CONFIDENCE_THRESHOLD=0.6
RELEVANCE_THRESHOLD=0.5
IMPACT_THRESHOLD=0.7

# Server
HOST=0.0.0.0
PORT=8001
```

## 📖 Usage

### Dashboard Features

1. **Market Overview**
   - Real-time stock data
   - Top gainers/losers
   - Market sentiment indicators

2. **Tweet Analysis**
   - Live tweet stream
   - Sentiment classification
   - Company tagging
   - Impact assessment

3. **Analytics**
   - Historical sentiment trends
   - Correlation analysis
   - Performance metrics

4. **Alerts**
   - High-impact tweet notifications
   - Price movement alerts
   - Sentiment spikes

### API Endpoints

#### Tweets
- `GET /api/tweets` - Get classified tweets
- `POST /api/tweets/classify` - Classify new tweet
- `GET /api/tweets/stats/company/:symbol` - Company sentiment stats

#### Stocks
- `GET /api/stocks` - Get stock list
- `GET /api/stocks/:symbol` - Get stock details
- `GET /api/stocks/market-summary` - Market overview

#### Sentiment
- `GET /api/sentiment/company/:symbol` - Company sentiment
- `GET /api/sentiment/market-overview` - Market sentiment
- `GET /api/sentiment/trends` - Sentiment trends

#### Dashboard
- `GET /api/dashboard/overview` - Dashboard overview
- `GET /api/dashboard/analytics` - Analytics data
- `GET /api/dashboard/alerts` - System alerts

## 🔧 Development

### Project Structure
```
src/
├── components/          # Reusable components
│   ├── Common/         # Generic components
│   ├── Dashboard/      # Dashboard-specific components
│   ├── Layout/         # Layout components
│   └── Charts/         # Chart components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API services
├── context/            # React context
├── utils/              # Utility functions
└── styles/             # Global styles
```

### Development Commands

```bash
# Backend
npm run dev          # Development server
npm run test         # Run tests
npm run lint         # Lint code

# Frontend
npm start            # Development server
npm run build        # Production build
npm run test         # Run tests

# Python Services
python app.py        # Run service
pip install -r requirements.txt  # Install dependencies
```

### Code Style
- **JavaScript**: ESLint + Prettier
- **Python**: Black + Flake8
- **React**: Functional components with hooks
- **API**: RESTful design with proper error handling

## 🚀 Deployment

### Docker Deployment
```bash
# Build images
docker build -t fintweet-backend ./backend
docker build -t fintweet-frontend ./frontend
docker build -t fintweet-tweet-agent ./tweet-agent
docker build -t fintweet-ml-classifier ./ml-classifier

# Run containers
docker-compose up -d
```

### Production Checklist
- [ ] Set production environment variables
- [ ] Configure MongoDB Atlas
- [ ] Set up SSL certificates
- [ ] Configure Nginx reverse proxy
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up CI/CD pipeline

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Follow semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FinBERT**: Financial sentiment analysis model
- **Tweepy**: Twitter API client
- **Recharts**: React charting library
- **Tailwind CSS**: Utility-first CSS framework

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation

---

**FinTweet** - Empowering financial decisions with AI-driven sentiment analysis 🚀
