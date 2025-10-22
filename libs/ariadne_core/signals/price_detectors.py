"""
Price event detection using technical indicators
"""

import numpy as np
from datetime import datetime
from typing import List, Dict, Any


class PriceEventDetector:
    """Detect significant price events using technical indicators"""
    
    def __init__(self):
        self.short_ma = 20
        self.long_ma = 50
        self.vol_window = 20
    
    def detect_ma_crossover(
        self,
        symbol: str,
        dates: List[str],
        closes: List[float]
    ) -> List[Dict[str, Any]]:
        """
        Detect moving average crossovers.
        Golden cross (bullish) and death cross (bearish).
        """
        if len(closes) < self.long_ma:
            return []
        
        prices = np.array(closes)
        
        # Calculate MAs
        short_ma = np.convolve(prices, np.ones(self.short_ma)/self.short_ma, mode='valid')
        long_ma = np.convolve(prices, np.ones(self.long_ma)/self.long_ma, mode='valid')
        
        # Align lengths
        min_len = min(len(short_ma), len(long_ma))
        short_ma = short_ma[-min_len:]
        long_ma = long_ma[-min_len:]
        aligned_dates = dates[-min_len:]
        
        events = []
        
        # Detect crossovers
        for i in range(1, len(short_ma)):
            # Golden cross (short crosses above long)
            if short_ma[i-1] <= long_ma[i-1] and short_ma[i] > long_ma[i]:
                events.append({
                    "symbol": symbol,
                    "event_type": "ma_crossover_bullish",
                    "occurred_at": aligned_dates[i],
                    "properties": {
                        "short_ma": float(short_ma[i]),
                        "long_ma": float(long_ma[i]),
                        "signal": "golden_cross"
                    },
                    "confidence": 0.8
                })
            
            # Death cross (short crosses below long)
            elif short_ma[i-1] >= long_ma[i-1] and short_ma[i] < long_ma[i]:
                events.append({
                    "symbol": symbol,
                    "event_type": "ma_crossover_bearish",
                    "occurred_at": aligned_dates[i],
                    "properties": {
                        "short_ma": float(short_ma[i]),
                        "long_ma": float(long_ma[i]),
                        "signal": "death_cross"
                    },
                    "confidence": 0.8
                })
        
        return events
    
    def detect_breakout(
        self,
        symbol: str,
        dates: List[str],
        closes: List[float],
        highs: List[float],
        lows: List[float],
        lookback: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Detect breakouts above resistance or below support.
        """
        if len(closes) < lookback + 1:
            return []
        
        events = []
        
        for i in range(lookback, len(closes)):
            window_highs = highs[i-lookback:i]
            window_lows = lows[i-lookback:i]
            
            resistance = max(window_highs)
            support = min(window_lows)
            
            current_close = closes[i]
            
            # Breakout above resistance
            if current_close > resistance * 1.02:  # 2% above
                events.append({
                    "symbol": symbol,
                    "event_type": "breakout_bullish",
                    "occurred_at": dates[i],
                    "properties": {
                        "resistance": float(resistance),
                        "close": float(current_close),
                        "breakout_pct": float((current_close - resistance) / resistance)
                    },
                    "confidence": 0.75
                })
            
            # Breakdown below support
            elif current_close < support * 0.98:  # 2% below
                events.append({
                    "symbol": symbol,
                    "event_type": "breakout_bearish",
                    "occurred_at": dates[i],
                    "properties": {
                        "support": float(support),
                        "close": float(current_close),
                        "breakdown_pct": float((support - current_close) / support)
                    },
                    "confidence": 0.75
                })
        
        return events
    
    def detect_volatility_regime_change(
        self,
        symbol: str,
        dates: List[str],
        closes: List[float],
        window: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Detect changes in volatility regime.
        """
        if len(closes) < window * 2:
            return []
        
        prices = np.array(closes)
        
        # Calculate rolling volatility (std of returns)
        returns = np.diff(np.log(prices))
        
        events = []
        
        for i in range(window, len(returns) - window):
            recent_vol = np.std(returns[i:i+window])
            historical_vol = np.std(returns[i-window:i])
            
            # Volatility spike (risk-off)
            if recent_vol > historical_vol * 1.5:  # 50% increase
                events.append({
                    "symbol": symbol,
                    "event_type": "vol_regime_high",
                    "occurred_at": dates[i],
                    "properties": {
                        "recent_vol": float(recent_vol),
                        "historical_vol": float(historical_vol),
                        "vol_ratio": float(recent_vol / historical_vol)
                    },
                    "confidence": 0.85
                })
            
            # Volatility compression (calm before storm)
            elif recent_vol < historical_vol * 0.5:  # 50% decrease
                events.append({
                    "symbol": symbol,
                    "event_type": "vol_regime_low",
                    "occurred_at": dates[i],
                    "properties": {
                        "recent_vol": float(recent_vol),
                        "historical_vol": float(historical_vol),
                        "vol_ratio": float(recent_vol / historical_vol)
                    },
                    "confidence": 0.85
                })
        
        return events
    
    def detect_all(
        self,
        symbol: str,
        price_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Run all detectors on price data.
        
        Args:
            symbol: Ticker symbol
            price_data: List of dicts with keys: date, open, high, low, close, volume
        
        Returns:
            List of detected price events
        """
        if not price_data:
            return []
        
        # Extract arrays
        dates = [item["date"] for item in price_data]
        closes = [item["close"] for item in price_data]
        highs = [item.get("high", item["close"]) for item in price_data]
        lows = [item.get("low", item["close"]) for item in price_data]
        
        all_events = []
        
        # MA crossovers
        all_events.extend(self.detect_ma_crossover(symbol, dates, closes))
        
        # Breakouts
        all_events.extend(self.detect_breakout(symbol, dates, closes, highs, lows))
        
        # Volatility regime changes
        all_events.extend(self.detect_volatility_regime_change(symbol, dates, closes))
        
        # Sort by date
        all_events.sort(key=lambda e: e["occurred_at"])
        
        return all_events

