#!/bin/bash
# Module 2: Seed Complex Trading Scenario

echo "=== Module 2: Seed Complex Scenario ==="
echo "Creating realistic trading memory network..."

# Observation 1: NVDA earnings beat
OBS1=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "observation",
  "agent_id": "trader_1",
  "title": "NVDA Q4 earnings: Revenue +265% YoY",
  "content": "NVIDIA reported Q4 2024 earnings with data center revenue of $18.4B, up 265% YoY. Management guided Q1 2025 to $24B (+/-2%). Gross margins compressed to 76% from 78% due to product mix.",
  "summary": "Massive earnings beat but margin compression signals increasing competition",
  "confidence_score": 0.95,
  "tickers": ["NVDA", "AMD", "INTC"],
  "sectors": ["Technology", "Semiconductors"],
  "tags": ["earnings", "growth", "margins"],
  "timeframe": "Q4-2024"
}' | jq -r '.thought_id')

test_case "Created observation 1" "36" "${#OBS1}"

# Observation 2: AMD launches MI300X
OBS2=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "observation",
  "agent_id": "trader_1",
  "title": "AMD MI300X gaining traction with hyperscalers",
  "content": "AMD announced MI300X wins at Microsoft Azure and Meta. MSFT confirmed MI300X deployments for GPT-4 inference. AMD guided AI revenue to $3.5B in 2024 vs $400M in 2023.",
  "summary": "AMD emerging as credible NVDA alternative for inference workloads",
  "confidence_score": 0.88,
  "tickers": ["AMD", "NVDA", "MSFT", "META"],
  "sectors": ["Technology", "Semiconductors"],
  "tags": ["competition", "AI", "hyperscalers"],
  "timeframe": "Q1-2025"
}' | jq -r '.thought_id')

test_case "Created observation 2" "36" "${#OBS2}"

# Hypothesis 1: NVDA margin compression ahead
HYP1=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "hypothesis",
  "agent_id": "trader_1",
  "title": "NVDA gross margins will compress to 70% by H2 2025",
  "content": "As AMD MI300X and Google TPU v5 gain share, NVIDIA will face pricing pressure. Hopper->Blackwell transition will also pressure mix. Historical GPU cycles show 5-8 pp margin compression when competition intensifies.",
  "summary": "Margin compression likely as competition heats up",
  "confidence_score": 0.72,
  "tickers": ["NVDA", "AMD", "GOOGL"],
  "sectors": ["Semiconductors"],
  "tags": ["valuation", "competition", "margins"],
  "timeframe": "H2-2025",
  "epistemology": {
    "evidence_for": ["AMD wins at MSFT/META", "Historical GPU cycles"],
    "evidence_against": ["CUDA moat", "Blackwell performance lead"],
    "confidence_reasoning": "Medium confidence due to CUDA stickiness"
  }
}' | jq -r '.thought_id')

test_case "Created hypothesis 1" "36" "${#HYP1}"

# Hypothesis 2: ASML becomes supply bottleneck
HYP2=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "hypothesis",
  "agent_id": "trader_1",
  "title": "ASML EUV capacity becomes key AI infrastructure bottleneck",
  "content": "ASML can only produce ~60 High-NA EUV machines per year. TSMC, Samsung, Intel all competing for allocation. This limits wafer capacity for N3/N2 nodes critical for AI chips.",
  "summary": "ASML capacity constraints = long-term AI chip scarcity",
  "confidence_score": 0.81,
  "tickers": ["ASML", "TSM", "NVDA", "AMD"],
  "sectors": ["Semiconductors", "Capital Equipment"],
  "tags": ["supply chain", "bottleneck", "capex"],
  "timeframe": "2025-2027",
  "epistemology": {
    "evidence_for": ["ASML production limits", "TSMC capex guidance"],
    "evidence_against": ["Trailing-edge AI chips viable", "Intel foundry ramp"],
    "confidence_reasoning": "High confidence given ASML monopoly"
  }
}' | jq -r '.thought_id')

test_case "Created hypothesis 2" "36" "${#HYP2}"

# Analysis 1: Semiconductor sector rotation
ANAL1=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "analysis",
  "agent_id": "trader_1",
  "title": "Semiconductor sector: Rotate from design to equipment/materials",
  "content": "NVDA/AMD valuations at 30-40x forward earnings. ASML/LRCX at 25-30x despite being upstream bottlenecks. As AI capex cycle matures, equipment makers capture more value. Historical analog: 2000 telecom buildout favored equipment (CSCO, NOK) over service providers.",
  "summary": "Equipment makers offer better risk/reward than chip designers",
  "confidence_score": 0.76,
  "tickers": ["ASML", "LRCX", "KLAC", "AMAT", "NVDA", "AMD"],
  "sectors": ["Semiconductors", "Capital Equipment"],
  "tags": ["rotation", "valuation", "capex cycle"],
  "timeframe": "2025"
}' | jq -r '.thought_id')

test_case "Created analysis 1" "36" "${#ANAL1}"

# Decision 1: Portfolio rebalance
DEC1=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "decision",
  "agent_id": "trader_1",
  "title": "Trim NVDA 50%, initiate ASML & LRCX positions",
  "content": "Reduce NVDA from 15% to 7.5% of portfolio. Initiate ASML at 5% and LRCX at 2.5%. Rationale: Lock in NVDA gains, position for next phase of AI infrastructure build (upstream equipment). Stop loss: NVDA <$800, ASML <$850, LRCX <$800.",
  "summary": "Rotate from AI compute to AI infrastructure equipment",
  "confidence_score": 0.82,
  "tickers": ["NVDA", "ASML", "LRCX"],
  "sectors": ["Semiconductors", "Capital Equipment"],
  "tags": ["rebalance", "risk management", "rotation"],
  "timeframe": "Q1-2025"
}' | jq -r '.thought_id')

test_case "Created decision 1" "36" "${#DEC1}"

# Reflection 1: Timing lesson
REF1=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{"type":"reflection","agent_id":"trader_1","title":"Learning: Do not fight momentum in secular bull markets","content":"I trimmed NVDA at 600 USD in Nov 2023 expecting a pullback. Stock went to 900 USD by Feb 2024. Error: Applied mean-reversion logic to a paradigm-shift stock. In early stages of secular trends, momentum beats valuation. Should have used trailing stops instead of fixed targets.","summary":"Momentum trumps valuation in early-stage secular trends","confidence_score":0.91,"tickers":["NVDA"],"tags":["lesson","timing","momentum","psychology"]}' | jq -r '.thought_id')

test_case "Created reflection 1" "36" "${#REF1}"

# Question 1: Supply chain dependency
Q1=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "question",
  "agent_id": "trader_1",
  "title": "How vulnerable are AI chip makers to TSMC geopolitical risk?",
  "content": "TSMC produces >90% of advanced AI chips. Taiwan geopolitical risk is rising. Intel/Samsung foundries lag by 2-3 years. What is the true optionality value of geographic diversification? How to hedge?",
  "summary": "Research needed: TSMC concentration risk & hedging strategies",
  "tickers": ["TSM", "NVDA", "AMD", "INTC"],
  "sectors": ["Semiconductors", "Geopolitics"],
  "tags": ["risk", "geopolitics", "supply chain", "research_needed"]
}' | jq -r '.thought_id')

test_case "Created question 1" "36" "${#Q1}"

# === EXPAND NETWORK: Add 20+ more interconnected thoughts ===

# Observation 3: Energy sector analysis
OBS3=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "observation",
  "agent_id": "trader_1",
  "title": "Data center power consumption exploding: 4-5% of US electricity by 2030",
  "content": "Goldman Sachs estimates data centers will grow from 3% to 8% of US power demand by 2030. A single ChatGPT query uses 10x more energy than Google search. Microsoft, Google, Amazon all restarting nuclear plants (Three Mile Island, etc). Utilities in Virginia, Texas seeing unprecedented demand.",
  "summary": "AI power demand = massive opportunity for utilities, nuclear, nat gas",
  "confidence_score": 0.94,
  "tickers": ["MSFT", "GOOGL", "CEG", "VST", "NEE"],
  "sectors": ["Technology", "Utilities", "Energy"],
  "tags": ["energy", "infrastructure", "data centers"],
  "timeframe": "2024-2030"
}' | jq -r '.thought_id')

# Observation 4: Memory/storage bottleneck
OBS4=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "observation",
  "agent_id": "trader_1",
  "title": "HBM memory becoming the real AI bottleneck, not compute",
  "content": "SK Hynix HBM3E supply sold out through 2025. NVIDIA Blackwell requires 8-12 HBM3E stacks vs 6 for Hopper. Samsung, Micron ramping but yield issues. HBM costs now 40% of total GPU BOM vs 20% in 2022.",
  "summary": "HBM supply constraints more critical than logic chips",
  "confidence_score": 0.89,
  "tickers": ["NVDA", "MU", "000660.KS"],
  "sectors": ["Semiconductors", "Memory"],
  "tags": ["supply chain", "HBM", "bottleneck"],
  "timeframe": "2024-2025"
}' | jq -r '.thought_id')

# Hypothesis 3: Utility sector re-rating
HYP3=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "hypothesis",
  "agent_id": "trader_1",
  "title": "Utilities with nuclear/nat-gas exposure will re-rate to tech multiples",
  "content": "Traditional utilities trade at 12-15x P/E. But CEG (Constellation Energy) already at 20x due to Microsoft data center deals. As AI power demand is locked-in for 10+ years, utilities with baseload capacity (nuclear, nat gas) should trade closer to infrastructure/REIT multiples (20-25x) vs cyclical industrials.",
  "summary": "AI power demand transforms utility economics and valuations",
  "confidence_score": 0.71,
  "tickers": ["CEG", "VST", "NEE", "DUK"],
  "sectors": ["Utilities", "Energy"],
  "tags": ["valuation", "re-rating", "AI infrastructure"],
  "timeframe": "2025-2026",
  "epistemology": {
    "evidence_for": ["Microsoft-CEG 20yr deal", "Hyperscaler capex guidance"],
    "evidence_against": ["Regulatory risk", "Utility sector inertia"],
    "confidence_reasoning": "Medium confidence - depends on rate base growth visibility"
  }
}' | jq -r '.thought_id')

# Hypothesis 4: Memory consolidation
HYP4=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "hypothesis",
  "agent_id": "trader_1",
  "title": "Micron will capture 30%+ HBM market share by 2026",
  "content": "Micron currently has <10% HBM share vs SK Hynix 50%+. But MU has strong DRAM technology, relationship with NVIDIA (GDDR partner), and US govt support. As NVIDIA diversifies supply chain and volumes explode, MU positioned to gain share. Target: 30% by 2026 from 10% today.",
  "summary": "Micron = underappreciated HBM beneficiary",
  "confidence_score": 0.68,
  "tickers": ["MU", "NVDA"],
  "sectors": ["Semiconductors", "Memory"],
  "tags": ["market share", "HBM", "supply chain"],
  "timeframe": "2024-2026"
}' | jq -r '.thought_id')

# Analysis 2: Energy play
ANAL2=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "analysis",
  "agent_id": "trader_1",
  "title": "The AI Power Trade: CEG > VST > NEE on risk/reward",
  "content": "CEG: Pure nuclear play, Microsoft anchor customer, 20yr visibility. VST (Vistra): Coal-to-gas transition + Texas data center exposure. NEE: Diversified but Florida residential exposure. Ranking: 1) CEG (best risk/reward, nuclear scarcity) 2) VST (cheap but execution risk) 3) NEE (safe but limited upside).",
  "summary": "CEG is the cleanest AI power play",
  "confidence_score": 0.79,
  "tickers": ["CEG", "VST", "NEE"],
  "sectors": ["Utilities", "Energy"],
  "tags": ["ranking", "AI infrastructure", "power"],
  "timeframe": "2025"
}' | jq -r '.thought_id')

# Analysis 3: Memory semiconductor deep-dive
ANAL3=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "analysis",
  "agent_id": "trader_1",
  "title": "Memory stocks: MU most convex to AI upside, valuation still depressed",
  "content": "MU trades at 3.5x P/B vs 5yr avg of 2.1x - sounds expensive. But: 1) HBM content growing 3x faster than DRAM 2) MU gaining HBM share 3) DRAM pricing stable (oligopoly discipline) 4) CapEx declining as % of sales. MU could do $15 EPS by 2026 (vs $9 consensus). At 15x = $225 stock (vs $105 today).",
  "summary": "MU = 2x upside if HBM thesis plays out",
  "confidence_score": 0.73,
  "tickers": ["MU", "NVDA", "AMD"],
  "sectors": ["Semiconductors", "Memory"],
  "tags": ["valuation", "deep dive", "HBM"],
  "timeframe": "2024-2026"
}' | jq -r '.thought_id')

# Decision 2: Energy allocation
DEC2=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "decision",
  "agent_id": "trader_1",
  "title": "Initiate CEG 3% position, VST 1% as option",
  "content": "Buy CEG at current levels (~$180). Position size: 3% of portfolio. Rationale: Microsoft deal de-risks downside, AI power demand provides 10yr growth visibility. Also buy VST 1% as lottery ticket on Texas data center boom. Stop loss: CEG <$150, VST <$80.",
  "summary": "Add AI power beneficiaries to portfolio",
  "confidence_score": 0.80,
  "tickers": ["CEG", "VST"],
  "sectors": ["Utilities", "Energy"],
  "tags": ["new position", "AI infrastructure"],
  "timeframe": "Q1-2025"
}' | jq -r '.thought_id')

# Decision 3: Memory sector
DEC3=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "decision",
  "agent_id": "trader_1",
  "title": "Build MU position: 2% now, add 2% on any 10% pullback",
  "content": "Initiate MU at 2% portfolio weight (~$105). Plan to add another 2% if stock pulls back 10%+ on macro fears or DRAM pricing concerns. Target exit: $180-200 (18-24 months). Risk: DRAM pricing collapse or HBM execution issues.",
  "summary": "MU = staged entry for HBM upside",
  "confidence_score": 0.75,
  "tickers": ["MU"],
  "sectors": ["Semiconductors", "Memory"],
  "tags": ["new position", "staged entry"],
  "timeframe": "2025"
}' | jq -r '.thought_id')

# Reflection 2: Sector rotation lesson
REF2=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "reflection",
  "agent_id": "trader_1",
  "title": "Learning: Follow the capex, not the hype",
  "content": "In 2023 I focused on AI application layer (C3.AI, PLTR, etc). Stocks were volatile, business models unproven. Should have focused on AI infrastructure (NVDA, data centers, power). Lesson: In early innings of tech cycles, focus on picks & shovels (infrastructure), not prospectors (applications). Same lesson from cloud era: AWS/MSFT crushed app stocks.",
  "summary": "Infrastructure beats applications in early-stage tech cycles",
  "confidence_score": 0.88,
  "tickers": ["NVDA", "MSFT", "CEG"],
  "sectors": ["Technology"],
  "tags": ["lesson", "strategy", "infrastructure vs apps"],
  "timeframe": "2023-2024"
}' | jq -r '.thought_id')

# Question 2: Geopolitical
Q2=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "question",
  "agent_id": "trader_1",
  "title": "How to hedge Taiwan risk without shorting semis outright?",
  "content": "Portfolio is 25% semis (NVDA, AMD, ASML, MU). Taiwan invasion = catastrophic. But shorting semis = giving up AI upside. Better hedge: Long Intel (onshore foundry), long defense (LMT, RTX), buy puts on Taiwan ETF (EWT)? Need to quantify hedge cost vs risk reduction.",
  "summary": "Research needed: Optimal Taiwan risk hedge for semi-heavy portfolio",
  "tickers": ["TSM", "NVDA", "AMD", "INTC", "LMT"],
  "sectors": ["Semiconductors", "Defense", "Geopolitics"],
  "tags": ["risk management", "geopolitics", "hedging"]
}' | jq -r '.thought_id')

# Question 3: Valuation
Q3=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "question",
  "agent_id": "trader_1",
  "title": "What is the terminal margin structure for AI chip industry?",
  "content": "NVDA at 75% gross margins is unprecedented for semiconductors (typically 45-55%). Is this sustainable or will competition/commoditization drive margins down? Historical parallels: 1) INTC peaked at 65% in 2000s, now 45% 2) QCOM peaked at 55%, now 58% (licensing helped). Will NVDA look like INTC (declining margins) or QCOM (stable via software/platform)?",
  "summary": "Research needed: Long-term margin sustainability for AI chips",
  "tickers": ["NVDA", "AMD", "INTC", "QCOM"],
  "sectors": ["Semiconductors"],
  "tags": ["valuation", "margins", "research_needed"]
}' | jq -r '.thought_id')

# Additional observations to create richer semantic network
OBS5=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "observation",
  "agent_id": "trader_1",
  "title": "TSMC N3 yields improving faster than expected",
  "content": "TSMC reported N3 process yields now at 70%, ahead of internal targets. This enables faster ramp of Apple A18, NVIDIA Blackwell, AMD MI350. TSMC raising N3 wafer prices by 5% in 2025 due to strong demand.",
  "summary": "TSMC technology leadership intact, pricing power strong",
  "confidence_score": 0.92,
  "tickers": ["TSM", "NVDA", "AAPL", "AMD"],
  "sectors": ["Semiconductors"],
  "tags": ["manufacturing", "process technology", "pricing"],
  "timeframe": "2024-2025"
}' | jq -r '.thought_id')

OBS6=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "observation",
  "agent_id": "trader_1",
  "title": "OpenAI Sora launch delayed - inference costs too high",
  "content": "OpenAI delayed Sora video generation launch due to infrastructure costs. Generating 1 min of video requires 10-20x more compute than image generation. At scale, could cost $1+ per video. Suggests AI application margins will be squeezed by infrastructure costs.",
  "summary": "AI application economics challenged by infrastructure costs",
  "confidence_score": 0.85,
  "tickers": ["MSFT", "NVDA", "META"],
  "sectors": ["Technology", "AI Applications"],
  "tags": ["AI economics", "inference costs"],
  "timeframe": "2024"
}' | jq -r '.thought_id')

# Export all IDs for later modules
export OBS1 OBS2 OBS3 OBS4 OBS5 OBS6
export HYP1 HYP2 HYP3 HYP4
export ANAL1 ANAL2 ANAL3
export DEC1 DEC2 DEC3
export REF1 REF2
export Q1 Q2 Q3

echo "✅ Seeded 22 interconnected, semantically rich thoughts"
echo "   📊 6 Observations | 4 Hypotheses | 3 Analyses"
echo "   🎯 3 Decisions | 2 Reflections | 3 Questions"
echo ""

