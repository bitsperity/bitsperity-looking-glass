#!/bin/bash
# Setup kostenlose Datenquellen für Daily Research Pipeline

set -e

echo "🔧 Installing Data Source Dependencies..."

# Python Dependencies für Market Data
echo "📦 Installing Python packages (yfinance, pandas_ta)..."
pip3 install --upgrade yfinance pandas-ta requests beautifulsoup4

echo ""
echo "✅ Installation Complete!"
echo ""
echo "📊 Kostenlose Datenquellen konfiguriert:"
echo "  - yfinance: Stock prices, historical data"
echo "  - pandas_ta: Technical indicators (RSI, MACD, etc.)"
echo "  - requests/bs4: Web scraping (Finviz, Yahoo)"
echo ""
echo "🧪 Test yfinance:"
echo "  python3 -c \"import yfinance; df=yfinance.download('NVDA', period='5d'); print(df)\""
echo ""
echo "🎯 Ready for /daily-research with REAL data!"

