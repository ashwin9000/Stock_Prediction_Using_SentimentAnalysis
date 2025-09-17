import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Search, TrendingUp, Building2, Globe } from 'lucide-react';

const CompanySelector = ({ onCompanySelect, selectedCompany }) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Popular companies for quick access
  const popularCompanies = [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
    { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology' },
    { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc.', sector: 'Financial Services' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services' },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Financial Services' },
    { symbol: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Defensive' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare' },
    { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Consumer Cyclical' },
    { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financial Services' },
    { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd', sector: 'Industrials' },
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', sector: 'Energy' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd', sector: 'Technology' },
    { symbol: 'INFY.NS', name: 'Infosys Ltd', sector: 'Technology' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'Financial Services' }
  ];

  useEffect(() => {
    // Initialize with popular companies
    setCompanies(popularCompanies);
    setFilteredCompanies(popularCompanies);
  }, [popularCompanies]);

  useEffect(() => {
    // Filter companies based on search term
    if (searchTerm.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter(company =>
        company.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.sector.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [searchTerm, companies]);

  const handleCompanySelect = (company) => {
    onCompanySelect(company);
    setSearchTerm(company.symbol);
    setShowDropdown(false);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setShowDropdown(true);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setLoading(true);
      try {
        // Try to add the company if it's not in our list
        const company = companies.find(c => 
          c.symbol.toLowerCase() === searchTerm.toLowerCase()
        );
        
        if (company) {
          handleCompanySelect(company);
        } else {
          // Add new company to the list
          const newCompany = {
            symbol: searchTerm.toUpperCase(),
            name: searchTerm.toUpperCase(),
            sector: 'Unknown'
          };
          setCompanies(prev => [newCompany, ...prev]);
          handleCompanySelect(newCompany);
        }
      } catch (error) {
        console.error('Error adding company:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getSectorIcon = (sector) => {
    switch (sector.toLowerCase()) {
      case 'technology':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'financial services':
        return <Building2 className="w-4 h-4 text-green-500" />;
      case 'healthcare':
        return <Globe className="w-4 h-4 text-purple-500" />;
      default:
        return <Building2 className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search companies (e.g., AAPL, TSLA, ADANIENT.NS)"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '...' : 'Go'}
            </button>
          </div>
        </form>

        {/* Dropdown */}
        {showDropdown && filteredCompanies.length > 0 && (
          <div className={`absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg z-50 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-200'
          }`}>
            {filteredCompanies.map((company) => (
              <div
                key={company.symbol}
                onClick={() => handleCompanySelect(company)}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selectedCompany?.symbol === company.symbol
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {getSectorIcon(company.sector)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {company.symbol}
                    </span>
                    {selectedCompany?.symbol === company.symbol && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {company.name}
                  </p>
                  <p className={`text-xs ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {company.sector}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popular Companies */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Popular Companies
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {popularCompanies.slice(0, 12).map((company) => (
            <button
              key={company.symbol}
              onClick={() => handleCompanySelect(company)}
              className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                selectedCompany?.symbol === company.symbol
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : theme === 'dark'
                  ? 'border-gray-600 bg-gray-800 hover:border-gray-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  {getSectorIcon(company.sector)}
                  <span className={`font-semibold text-sm ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {company.symbol}
                  </span>
                </div>
                <p className={`text-xs truncate ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {company.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Company Info */}
      {selectedCompany && (
        <div className={`p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            {getSectorIcon(selectedCompany.sector)}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {selectedCompany.symbol}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedCompany.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedCompany.sector}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySelector;
