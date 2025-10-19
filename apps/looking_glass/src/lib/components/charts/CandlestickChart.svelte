<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi, type CandlestickData } from 'lightweight-charts';
  
  export let data: CandlestickData[] = [];
  export let ticker: string = '';
  export let btcView: boolean = false;
  
  let chartContainer: HTMLDivElement;
  let chart: IChartApi | null = null;
  let candleSeries: ISeriesApi<'Candlestick'> | null = null;
  
  function initChart() {
    if (!chartContainer) return;
    
    // Remove old chart if exists
    if (chart) {
      chart.remove();
      chart = null;
      candleSeries = null;
    }
    
    chart = createChart(chartContainer, {
      layout: {
        background: { color: '#171717' },
        textColor: '#d4d4d4',
      },
      grid: {
        vertLines: { color: '#262626' },
        horzLines: { color: '#262626' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#404040',
      },
      timeScale: {
        borderColor: '#404040',
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });
    
    candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    
    if (data && data.length > 0) {
      candleSeries.setData(data);
      chart.timeScale().fitContent();
    }
  }
  
  $: if (data && data.length > 0) {
    if (chart && candleSeries) {
      candleSeries.setData(data);
      chart.timeScale().fitContent();
    } else {
      initChart();
    }
  }
  
  onMount(() => {
    if (data && data.length > 0) {
      initChart();
    }
  });
  
  onDestroy(() => {
    if (chart) {
      chart.remove();
      chart = null;
    }
  });
</script>

<div class="w-full h-full flex flex-col">
  <div class="mb-3 flex items-center justify-between">
    <h3 class="text-xl font-bold text-neutral-100">
      {ticker}
      {#if btcView}
        <span class="text-sm text-orange-400 font-normal ml-2">₿ Bitcoin denomination</span>
      {/if}
    </h3>
    <div class="text-sm text-neutral-400">
      {data.length} bars
    </div>
  </div>
  <div bind:this={chartContainer} class="flex-1 rounded-lg overflow-hidden border border-neutral-700/50 bg-neutral-900" />
</div>

