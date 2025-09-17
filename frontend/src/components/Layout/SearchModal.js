import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, MessageSquare, DollarSign } from 'lucide-react';

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Focus the search input when modal opens
      const input = document.getElementById('search-input');
      if (input) {
        input.focus();
      }
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    // Simulate search results
    setTimeout(() => {
      const mockResults = [
        {
          type: 'stock',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.25,
          change: 2.5,
        },
        {
          type: 'tweet',
          id: '1',
          text: 'Apple stock showing strong momentum today!',
          user: 'trader123',
          sentiment: 'positive',
        },
        {
          type: 'company',
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          price: 320.50,
          change: -1.2,
        },
      ].filter(item => 
        item.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.text?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setResults(mockResults);
      setLoading(false);
    }, 500);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'stock':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'tweet':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'company':
        return <DollarSign className="h-4 w-4 text-purple-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleResultClick = (result) => {
    // Handle result click based on type
    console.log('Clicked result:', result);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search stocks, tweets, companies..."
                  value={query}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={onClose}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search results */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="p-2">
                  {results.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleResultClick(result)}
                      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {getResultIcon(result.type)}
                        <div className="flex-1">
                          {result.type === 'tweet' ? (
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                @{result.user}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {result.text}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {result.symbol} - {result.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {result.price && `$${result.price} (${result.change > 0 ? '+' : ''}${result.change}%)`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query ? (
                <div className="p-4 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No results found for "{query}"
                  </p>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Start typing to search...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;






