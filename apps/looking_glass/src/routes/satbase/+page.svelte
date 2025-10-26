<script lang="ts">
</script>

<div class="p-6 max-w-7xl mx-auto space-y-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-neutral-100">Satbase</h1>
    <p class="text-neutral-400 mt-2">Financial data management, analysis, and maintenance</p>
  </div>

  <!-- Main Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Data Understanding (New) -->
    <a
      href="/satbase/overview"
      class="group bg-gradient-to-br from-blue-900/20 to-blue-900/10 border border-blue-700/30 hover:border-blue-600/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="text-4xl">📊</div>
        <span class="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">New</span>
      </div>
      <h2 class="text-lg font-semibold text-blue-300 group-hover:text-blue-200 mb-2">Data Overview</h2>
      <p class="text-sm text-neutral-400 group-hover:text-neutral-300">
        Coverage analysis, heatmaps, quality metrics for all data sources
      </p>
    </a>

    <!-- Data Maintenance (New) -->
    <a
      href="/satbase/maintenance"
      class="group bg-gradient-to-br from-amber-900/20 to-amber-900/10 border border-amber-700/30 hover:border-amber-600/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="text-4xl">🔧</div>
        <span class="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded">New</span>
      </div>
      <h2 class="text-lg font-semibold text-amber-300 group-hover:text-amber-200 mb-2">Maintenance</h2>
      <p class="text-sm text-neutral-400 group-hover:text-neutral-300">
        Gap detection, smart backfill, and data quality cleanup
      </p>
    </a>

    <!-- News -->
    <a
      href="/satbase/news"
      class="group bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 hover:border-neutral-600/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-500/10"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="text-4xl">📰</div>
      </div>
      <h2 class="text-lg font-semibold text-neutral-200 group-hover:text-white mb-2">News</h2>
      <p class="text-sm text-neutral-400 group-hover:text-neutral-300">
        Browse, search, and manage news articles from all sources
      </p>
    </a>

    <!-- Prices -->
    <a
      href="/satbase/prices"
      class="group bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 hover:border-neutral-600/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-500/10"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="text-4xl">💹</div>
      </div>
      <h2 class="text-lg font-semibold text-neutral-200 group-hover:text-white mb-2">Prices</h2>
      <p class="text-sm text-neutral-400 group-hover:text-neutral-300">
        Historical price data and technical analysis
      </p>
    </a>

    <!-- Macro -->
    <a
      href="/satbase/macro"
      class="group bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 hover:border-neutral-600/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-500/10"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="text-4xl">📈</div>
      </div>
      <h2 class="text-lg font-semibold text-neutral-200 group-hover:text-white mb-2">Macro (FRED)</h2>
      <p class="text-sm text-neutral-400 group-hover:text-neutral-300">
        Economic indicators and Federal Reserve data
      </p>
    </a>

    <!-- Watchlist & Topics -->
    <a
      href="/satbase/watchlist"
      class="group bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 hover:border-neutral-600/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-500/10"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="text-4xl">📋</div>
      </div>
      <h2 class="text-lg font-semibold text-neutral-200 group-hover:text-white mb-2">Watchlist & Topics</h2>
      <p class="text-sm text-neutral-400 group-hover:text-neutral-300">
        Manage tickers and search topics for monitoring
      </p>
    </a>

    <!-- Jobs -->
    <a
      href="/satbase/jobs"
      class="group bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 hover:border-neutral-600/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-500/10"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="text-4xl">⚙️</div>
      </div>
      <h2 class="text-lg font-semibold text-neutral-200 group-hover:text-white mb-2">Ingest Jobs</h2>
      <p class="text-sm text-neutral-400 group-hover:text-neutral-300">
        Monitor and manage background ingestion jobs
      </p>
    </a>

    <!-- Convert -->
    <a
      href="/satbase/convert"
      class="group bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 hover:border-neutral-600/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-500/10"
    >
      <div class="flex items-start justify-between mb-4">
        <div class="text-4xl">💱</div>
      </div>
      <h2 class="text-lg font-semibold text-neutral-200 group-hover:text-white mb-2">Convert</h2>
      <p class="text-sm text-neutral-400 group-hover:text-neutral-300">
        Currency and crypto conversion tools
      </p>
    </a>
  </div>

  <!-- Quick Info -->
  <div class="mt-12 p-6 bg-neutral-800/50 border border-neutral-700/30 rounded-xl">
    <h3 class="font-semibold text-neutral-200 mb-3">About Satbase</h3>
    <p class="text-sm text-neutral-400 leading-relaxed">
      Satbase is a comprehensive financial data platform providing real-time and historical market data, economic indicators, and news analytics. Use the Data Overview to understand your current coverage, Maintenance to identify and fill gaps, and specific modules for deeper analysis.
    </p>
  </div>
</div>

