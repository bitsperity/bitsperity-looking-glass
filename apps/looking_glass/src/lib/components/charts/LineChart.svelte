<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import 'chartjs-adapter-date-fns';
  
  Chart.register(...registerables);
  
  export let data: Array<{ time: string; value: number; series?: string }> = [];
  export let title: string = '';
  export let yLabel: string = 'Value';
  export let height: string = '400px';
  
  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;
  
  $: if (chart && data) {
    updateChart();
  }
  
  function updateChart() {
    if (!chart || !data.length) return;
    
    // Group by series if multi-series
    const seriesMap = new Map<string, Array<{ time: string; value: number }>>();
    
    data.forEach(d => {
      const series = d.series || 'default';
      if (!seriesMap.has(series)) seriesMap.set(series, []);
      seriesMap.get(series)!.push({ time: d.time, value: d.value });
    });
    
    // Sort each series by time
    seriesMap.forEach(values => {
      values.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    const datasets = Array.from(seriesMap.entries()).map(([series, values], idx) => {
      const colors = [
        'rgb(59, 130, 246)', // blue
        'rgb(239, 68, 68)',  // red
        'rgb(34, 197, 94)',  // green
        'rgb(168, 85, 247)', // purple
        'rgb(251, 146, 60)', // orange
      ];
      const color = colors[idx % colors.length];
      
      return {
        label: series,
        data: values.map(v => ({ x: v.time, y: v.value })),
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      };
    });
    
    chart.data.datasets = datasets;
    chart.update('none');
  }
  
  onMount(() => {
    chart = new Chart(canvas, {
      type: 'line',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#a3a3a3',
              font: { size: 12 }
            }
          },
          title: {
            display: !!title,
            text: title,
            color: '#e5e7eb',
            font: { size: 16, weight: 'bold' }
          },
          tooltip: {
            backgroundColor: 'rgba(23, 23, 23, 0.95)',
            titleColor: '#e5e7eb',
            bodyColor: '#d4d4d4',
            borderColor: '#404040',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (context: any) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'month',
              displayFormats: { month: 'MMM yyyy' }
            },
            grid: {
              color: '#262626',
              drawBorder: false
            },
            ticks: {
              color: '#737373',
              font: { size: 11 }
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: '#262626',
              drawBorder: false
            },
            ticks: {
              color: '#737373',
              font: { size: 11 },
              callback: (value: any) => value.toLocaleString()
            },
            title: {
              display: !!yLabel,
              text: yLabel,
              color: '#a3a3a3',
              font: { size: 12 }
            }
          }
        }
      }
    });
    
    updateChart();
  });
  
  onDestroy(() => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });
</script>

<div style="height: {height}; position: relative;">
  <canvas bind:this={canvas}></canvas>
</div>

