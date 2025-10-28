<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  export let data: { date: string; count: number; sessions?: Record<string, number> }[] = [];
  export let onSelectRange: (start: string, end: string) => void = () => {};

  let svgElement: SVGSVGElement;
  let selectedRange: [string, string] | null = null;
  let hoveredDate: string | null = null;

  onMount(() => {
    if (!svgElement || data.length === 0) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgElement).selectAll('*').remove();

    const svg = d3.select(svgElement)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .range([height, 0]);

    // Color scale for sessions
    const sessionIds = [...new Set(data.flatMap(d => Object.keys(d.sessions || {})))];
    const colorScale = d3.scaleOrdinal<string>()
      .domain(sessionIds)
      .range(d3.schemeCategory10);

    // Stacked bars by session
    const sessionStack = d3.stack<any>()
      .keys(sessionIds)
      .value((d: any, key: string) => d.sessions?.[key] || 0);

    const stackedData = sessionStack(data.map(d => ({ ...d, date: new Date(d.date) })));

    // Draw stacked bars
    svg.selectAll('g.session-group')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'session-group')
      .attr('fill', (d: any) => colorScale(d.key))
      .selectAll('rect')
      .data((d: any) => d.map((v: any, i: number) => ({ ...v, date: data[i].date, sessionId: d.key })))
      .enter()
      .append('rect')
      .attr('x', (d: any) => xScale(new Date(d.date)))
      .attr('y', (d: any) => yScale(d[1]))
      .attr('height', (d: any) => yScale(d[0]) - yScale(d[1]))
      .attr('width', () => Math.max(2, (width / data.length) * 0.8))
      .style('opacity', 0.8)
      .on('mouseover', function(event: any, d: any) {
        hoveredDate = d.date;
        d3.select(this).style('opacity', 1);
      })
      .on('mouseout', function() {
        hoveredDate = null;
        d3.select(this).style('opacity', 0.8);
      });

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .style('font-size', '12px')
      .style('color', '#999');

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(3))
      .style('font-size', '12px')
      .style('color', '#999');

    // Brush
    const brush = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on('end', (event: any) => {
        if (!event.selection) return;
        const [x0, x1] = event.selection.map((d: number) => xScale.invert(d));
        const start = d3.timeFormat('%Y-%m-%d')(x0);
        const end = d3.timeFormat('%Y-%m-%d')(x1);
        selectedRange = [start, end];
      });

    svg.append('g')
      .attr('class', 'brush')
      .call(brush)
      .style('fill', 'rgba(99, 102, 241, 0.1)')
      .style('stroke', 'rgba(99, 102, 241, 0.5)');
  });
</script>

<div class="space-y-4">
  <svg bind:this={svgElement} class="w-full" />

  {#if selectedRange}
    <div class="flex items-center justify-between gap-2 p-3 rounded bg-indigo-950/30 border border-indigo-500/20">
      <div class="text-sm text-neutral-300">
        Selected: <span class="font-medium text-indigo-400">{selectedRange[0]}</span> to
        <span class="font-medium text-indigo-400">{selectedRange[1]}</span>
      </div>
      <button
        on:click={() => {
          onSelectRange(selectedRange[0], selectedRange[1]);
          selectedRange = null;
        }}
        class="px-3 py-1 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
      >
        Filter →
      </button>
    </div>
  {/if}

  {#if hoveredDate}
    <div class="text-xs text-neutral-400">
      Hovering: {hoveredDate}
    </div>
  {/if}
</div>

<style>
</style>
