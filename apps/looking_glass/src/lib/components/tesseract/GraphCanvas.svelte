<script lang="ts">
  import { onMount } from 'svelte';
  import type { GraphNode, GraphEdge } from '$lib/stores/tesseract';

  export let nodes: GraphNode[] = [];
  export let edges: GraphEdge[] = [];
  export let centerNode: GraphNode | null = null;
  export let hoveredNode: GraphNode | null = null;
  export let pinnedNode: GraphNode | null = null;
  export let similarityThreshold: number = 0.7;
  export let panX: number = 0;
  export let panY: number = 0;
  export let zoom: number = 1;
  export let onNodeClick: (node: GraphNode, shiftKey: boolean) => void = () => {};
  export let onNodeHover: (node: GraphNode | null) => void = () => {};
  export let onPanChange: (panX: number, panY: number) => void = () => {};
  export let onZoomChange: (zoom: number) => void = () => {};

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let isPanning = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;
  const NODE_RADIUS = 50;
  const CENTER_RADIUS = 70;

  // Color palette for topics
  const TOPIC_COLORS = [
    'rgba(59, 130, 246, 1)',    // blue
    'rgba(16, 185, 129, 1)',    // green
    'rgba(245, 158, 11, 1)',    // amber
    'rgba(239, 68, 68, 1)',     // red
    'rgba(147, 51, 234, 1)',    // purple
    'rgba(236, 72, 153, 1)',    // pink
    'rgba(20, 184, 166, 1)',    // teal
    'rgba(251, 146, 60, 1)',    // orange
    'rgba(34, 197, 94, 1)',     // lime
    'rgba(168, 85, 247, 1)',    // violet
    'rgba(14, 165, 233, 1)',    // sky
    'rgba(244, 63, 94, 1)',     // rose
  ];

  function getTopicColor(topics: string[] | undefined): string {
    if (!topics || topics.length === 0) return 'rgba(100, 100, 100, 1)';
    const topic = topics[0];
    let hash = 0;
    for (let i = 0; i < topic.length; i++) {
      hash = ((hash << 5) - hash) + topic.charCodeAt(i);
      hash = hash & hash;
    }
    const index = Math.abs(hash) % TOPIC_COLORS.length;
    return TOPIC_COLORS[index];
  }

  function screenToWorld(x: number, y: number) {
    return {
      x: (x - CANVAS_WIDTH / 2 - panX) / zoom + CANVAS_WIDTH / 2,
      y: (y - CANVAS_HEIGHT / 2 - panY) / zoom + CANVAS_HEIGHT / 2
    };
  }

  export function drawGraph() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);
    
    // Filter edges by threshold
    const visibleEdges = edges.filter(edge => edge.similarity >= similarityThreshold);
    
    // Find nodes with visible edges
    const visibleNodeIds = new Set<string>();
    visibleEdges.forEach(edge => {
      visibleNodeIds.add(edge.from);
      visibleNodeIds.add(edge.to);
    });
    if (centerNode) visibleNodeIds.add(centerNode.id);
    
    // Draw edges
    visibleEdges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        ctx!.beginPath();
        ctx!.moveTo(fromNode.x, fromNode.y);
        ctx!.lineTo(toNode.x, toNode.y);
        ctx!.lineWidth = 1 + edge.similarity * 3;
        const alpha = 0.3 + edge.similarity * 0.7;
        ctx!.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx!.stroke();
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      if (!visibleNodeIds.has(node.id)) return;
      
      const isCenter = node === centerNode;
      const isHovered = node === hoveredNode;
      const isPinned = node === pinnedNode;
      const radius = isCenter ? CENTER_RADIUS : NODE_RADIUS;
      
      // Node circle
      ctx!.beginPath();
      ctx!.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      
      if (isCenter) {
        const gradient = ctx!.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(147, 51, 234, 0.6)');
        ctx!.fillStyle = gradient;
      } else {
        const alpha = isHovered || isPinned ? 0.9 : 0.6;
        ctx!.fillStyle = `rgba(38, 38, 38, ${alpha})`;
      }
      
      ctx!.fill();
      
      // Border - color based on topic
      const topicColor = getTopicColor(node.article.topics);
      
      if (isPinned) {
        ctx!.strokeStyle = 'rgba(147, 51, 234, 1)';
        ctx!.lineWidth = 5;
      } else if (isHovered) {
        ctx!.strokeStyle = topicColor;
        ctx!.lineWidth = 4;
      } else {
        ctx!.strokeStyle = topicColor;
        ctx!.lineWidth = 3;
      }
      ctx!.stroke();
      
      // Node text: Multi-line title
      ctx!.fillStyle = isCenter ? 'rgba(255, 255, 255, 0.95)' : 'rgba(200, 200, 200, 0.9)';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      
      const title = node.article.title || 'Unknown';
      const words = title.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length > 15) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
        if (lines.length >= 2) break;
      }
      if (currentLine && lines.length < 3) lines.push(currentLine);
      if (lines.length === 3 && words.length > lines.join(' ').split(' ').length) {
        lines[2] = lines[2].substring(0, 12) + '...';
      }
      
      ctx!.font = isCenter ? 'bold 10px sans-serif' : '9px sans-serif';
      const lineHeight = 12;
      const startY = node.y - (lines.length - 1) * lineHeight / 2;
      lines.forEach((line, i) => {
        ctx!.fillText(line, node.x, startY + i * lineHeight);
      });
    });
    
    ctx.restore();
  }

  function handleCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const world = screenToWorld(x, y);
    
    const visibleEdges = edges.filter(edge => edge.similarity >= similarityThreshold);
    const visibleNodeIds = new Set<string>();
    visibleEdges.forEach(edge => {
      visibleNodeIds.add(edge.from);
      visibleNodeIds.add(edge.to);
    });
    if (centerNode) visibleNodeIds.add(centerNode.id);
    
    for (const node of nodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      const radius = node === centerNode ? CENTER_RADIUS : NODE_RADIUS;
      const distance = Math.sqrt((world.x - node.x) ** 2 + (world.y - node.y) ** 2);
      
      if (distance <= radius) {
        onNodeClick(node, e.shiftKey);
        return;
      }
    }
  }

  function handleCanvasMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      isPanning = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    }
  }

  function handleCanvasMouseUp() {
    isPanning = false;
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  }

  function handleCanvasMove(e: MouseEvent) {
    if (isPanning) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      onPanChange(panX + dx, panY + dy);
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const world = screenToWorld(x, y);
    
    const visibleEdges = edges.filter(edge => edge.similarity >= similarityThreshold);
    const visibleNodeIds = new Set<string>();
    visibleEdges.forEach(edge => {
      visibleNodeIds.add(edge.from);
      visibleNodeIds.add(edge.to);
    });
    if (centerNode) visibleNodeIds.add(centerNode.id);
    
    let found = false;
    for (const node of nodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      const radius = node === centerNode ? CENTER_RADIUS : NODE_RADIUS;
      const distance = Math.sqrt((world.x - node.x) ** 2 + (world.y - node.y) ** 2);
      
      if (distance <= radius) {
        onNodeHover(node);
        found = true;
        canvas.style.cursor = 'pointer';
        break;
      }
    }
    
    if (!found) {
      onNodeHover(null);
      canvas.style.cursor = isPanning ? 'grabbing' : 'default';
    }
  }

  function handleCanvasWheel(e: WheelEvent) {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldBefore = screenToWorld(mouseX, mouseY);
    const newZoom = e.deltaY < 0 ? Math.min(5, zoom * 1.1) : Math.max(0.1, zoom / 1.1);
    onZoomChange(newZoom);
    
    // Adjust pan to keep mouse position stable
    const worldAfter = screenToWorld(mouseX, mouseY);
    onPanChange(
      panX + (worldAfter.x - worldBefore.x) * newZoom,
      panY + (worldAfter.y - worldBefore.y) * newZoom
    );
  }

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      drawGraph();
    }
  });

  // Redraw when props change
  $: if (ctx && (nodes.length > 0 || edges.length > 0)) {
    drawGraph();
  }
</script>

<canvas
  bind:this={canvas}
  on:click={handleCanvasClick}
  on:contextmenu={(e) => e.preventDefault()}
  on:mousedown={handleCanvasMouseDown}
  on:mouseup={handleCanvasMouseUp}
  on:mousemove={handleCanvasMove}
  on:wheel={handleCanvasWheel}
  class="rounded-xl border border-neutral-700/30 shadow-2xl bg-neutral-900/30 backdrop-blur-sm"
/>

