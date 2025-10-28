"""
Scoring utilities for Impact Simulation and Opportunity Scoring.
Provides normalization, weighting, and statistical aggregation functions.
"""

import math
from typing import List, Dict, Tuple


def normalize_minmax(values: List[float], min_val: float = 0.0, max_val: float = 1.0) -> Dict[float, float]:
    """
    Min-Max normalization: scale values to [min_val, max_val].
    
    Args:
        values: List of numeric values
        min_val: Target minimum (default 0.0)
        max_val: Target maximum (default 1.0)
    
    Returns:
        Dictionary mapping original values to normalized values
    """
    if not values or len(values) == 0:
        return {}
    
    raw_min = min(values)
    raw_max = max(values)
    raw_range = raw_max - raw_min
    
    if raw_range == 0:
        # All values are the same
        mid_point = (min_val + max_val) / 2
        return {v: mid_point for v in values}
    
    target_range = max_val - min_val
    result = {}
    for v in values:
        normalized = min_val + ((v - raw_min) / raw_range) * target_range
        result[v] = normalized
    
    return result


def z_score(values: List[float], value: float) -> float:
    """
    Calculate Z-score for a value in a distribution.
    Z-score = (value - mean) / std_dev
    
    Args:
        values: List of numeric values (population)
        value: Value to score
    
    Returns:
        Z-score (float)
    """
    if not values or len(values) < 2:
        return 0.0
    
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std_dev = math.sqrt(variance)
    
    if std_dev == 0:
        return 0.0
    
    return (value - mean) / std_dev


def weighted_score(factors: Dict[str, float], weights: Dict[str, float]) -> float:
    """
    Calculate weighted score from factors and weights.
    
    Args:
        factors: Dict of {factor_name: factor_value}
        weights: Dict of {factor_name: weight} (should sum to 1.0)
    
    Returns:
        Weighted score (float)
    """
    total = 0.0
    for factor_name, factor_value in factors.items():
        weight = weights.get(factor_name, 0.0)
        total += factor_value * weight
    
    return total


def normalize_weights(weights: Dict[str, float]) -> Dict[str, float]:
    """
    Normalize weights to sum to 1.0.
    
    Args:
        weights: Dict of {name: weight}
    
    Returns:
        Normalized weights (sum = 1.0)
    """
    total = sum(weights.values())
    if total == 0:
        # Equal distribution
        equal_weight = 1.0 / len(weights) if weights else 0
        return {k: equal_weight for k in weights}
    
    return {k: v / total for k, v in weights.items()}


def decay_linear(depth: int, max_depth: int, base_value: float = 1.0) -> float:
    """
    Linear decay: value decreases linearly with depth.
    Formula: base_value * (1 - depth / max_depth)
    
    Args:
        depth: Current depth in path
        max_depth: Maximum depth
        base_value: Starting value
    
    Returns:
        Decayed value
    """
    if depth >= max_depth:
        return 0.0
    
    return base_value * (1.0 - depth / max_depth)


def decay_exponential(depth: int, base_value: float = 1.0, rate: float = 0.5) -> float:
    """
    Exponential decay: value decreases exponentially with depth.
    Formula: base_value * rate^depth
    
    Args:
        depth: Current depth in path
        base_value: Starting value
        rate: Decay rate per hop (default 0.5)
    
    Returns:
        Decayed value
    """
    return base_value * (rate ** depth)


def aggregate_confidence(values: List[float], method: str = "product") -> float:
    """
    Aggregate confidence values from a path.
    
    Methods:
    - product: multiply all values (multiplicative)
    - min: take minimum value (conservative)
    - avg: take average value (balanced)
    
    Args:
        values: List of confidence values (0-1)
        method: Aggregation method (product|min|avg)
    
    Returns:
        Aggregated confidence (0-1)
    """
    if not values:
        return 0.0
    
    if method == "product":
        result = 1.0
        for v in values:
            result *= v
        return result
    
    elif method == "min":
        return min(values)
    
    elif method == "avg":
        return sum(values) / len(values)
    
    else:
        raise ValueError(f"Unknown aggregation method: {method}")


def percentile(values: List[float], p: float) -> float:
    """
    Calculate percentile of a list.
    
    Args:
        values: List of numeric values
        p: Percentile (0-100)
    
    Returns:
        Percentile value
    """
    if not values:
        return 0.0
    
    sorted_vals = sorted(values)
    index = (p / 100) * (len(sorted_vals) - 1)
    lower = int(index)
    upper = lower + 1
    
    if upper >= len(sorted_vals):
        return sorted_vals[lower]
    
    weight = index - lower
    return sorted_vals[lower] * (1 - weight) + sorted_vals[upper] * weight


if __name__ == "__main__":
    # Test examples
    print("Scoring Utilities Test")
    print("=" * 50)
    
    # Test normalize_minmax
    values = [10, 20, 30, 40, 50]
    norm_map = normalize_minmax(values)
    print(f"Min-Max Norm: {values} -> {[norm_map[v] for v in values]}")
    
    # Test z_score
    z = z_score(values, 35)
    print(f"Z-Score(35): {z:.3f}")
    
    # Test weighted_score
    factors = {"gap": 0.8, "centrality": 0.6, "anomaly": 0.3}
    weights = normalize_weights({"gap": 0.3, "centrality": 0.4, "anomaly": 0.3})
    score = weighted_score(factors, weights)
    print(f"Weighted Score: {score:.3f}")
    
    # Test decay functions
    print(f"Linear decay (depth=2, max=5): {decay_linear(2, 5):.3f}")
    print(f"Exp decay (depth=2): {decay_exponential(2):.3f}")
    
    # Test aggregation
    conf_vals = [0.9, 0.8, 0.7]
    print(f"Confidence product: {aggregate_confidence(conf_vals, 'product'):.3f}")
    print(f"Confidence min: {aggregate_confidence(conf_vals, 'min'):.3f}")
    print(f"Confidence avg: {aggregate_confidence(conf_vals, 'avg'):.3f}")
