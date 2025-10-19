#!/usr/bin/env python3
"""
Test kostenlose Datenquellen für Daily Research Pipeline
"""

import sys

def test_yfinance():
    """Test yfinance Stock Data"""
    try:
        import yfinance as yf
        print("✅ yfinance installed")
        
        # Test download
        ticker = yf.Ticker("NVDA")
        hist = ticker.history(period="5d")
        
        if not hist.empty:
            print(f"✅ yfinance data fetch: NVDA last close = ${hist['Close'].iloc[-1]:.2f}")
            return True
        else:
            print("❌ yfinance: No data returned")
            return False
    except ImportError:
        print("❌ yfinance not installed. Run: pip3 install yfinance")
        return False
    except Exception as e:
        print(f"❌ yfinance error: {e}")
        return False

def test_pandas_ta():
    """Test pandas_ta Technical Indicators"""
    try:
        import pandas_ta as ta
        print("✅ pandas_ta installed")
        
        # Test RSI calculation
        import yfinance as yf
        ticker = yf.Ticker("NVDA")
        hist = ticker.history(period="30d")
        
        rsi = ta.rsi(hist['Close'], length=14)
        
        if rsi is not None and not rsi.empty:
            print(f"✅ pandas_ta RSI: NVDA RSI(14) = {rsi.iloc[-1]:.1f}")
            return True
        else:
            print("❌ pandas_ta: RSI calculation failed")
            return False
    except ImportError:
        print("❌ pandas_ta not installed. Run: pip3 install pandas-ta")
        return False
    except Exception as e:
        print(f"❌ pandas_ta error: {e}")
        return False

def test_requests():
    """Test requests for Web Scraping"""
    try:
        import requests
        from bs4 import BeautifulSoup
        print("✅ requests + beautifulsoup4 installed")
        
        # Test Yahoo Finance request
        url = "https://finance.yahoo.com/quote/NVDA"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            print(f"✅ Web request: Yahoo Finance reachable ({response.status_code})")
            return True
        else:
            print(f"⚠️ Web request: Yahoo Finance returned {response.status_code}")
            return False
    except ImportError:
        print("❌ requests or bs4 not installed. Run: pip3 install requests beautifulsoup4")
        return False
    except Exception as e:
        print(f"❌ Web request error: {e}")
        return False

def main():
    print("🧪 Testing Data Sources for Daily Research Pipeline")
    print("=" * 60)
    
    results = []
    
    print("\n📊 Testing Stock Data (yfinance)...")
    results.append(test_yfinance())
    
    print("\n📈 Testing Technical Indicators (pandas_ta)...")
    results.append(test_pandas_ta())
    
    print("\n🌐 Testing Web Scraping (requests)...")
    results.append(test_requests())
    
    print("\n" + "=" * 60)
    
    if all(results):
        print("✅ ALL TESTS PASSED - Ready for /daily-research")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Run scripts/install-data-sources.sh")
        return 1

if __name__ == "__main__":
    sys.exit(main())

