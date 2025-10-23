<script lang="ts">
  export let label: string;

  const colors: Record<string, string> = {
    Company: 'bg-blue-800 text-blue-100',
    Instrument: 'bg-cyan-800 text-cyan-100',
    Event: 'bg-red-800 text-red-100',
    Concept: 'bg-purple-800 text-purple-100',
    Location: 'bg-green-800 text-green-100',
    Observation: 'bg-yellow-800 text-yellow-100',
    PriceEvent: 'bg-orange-800 text-orange-100',
    Pattern: 'bg-pink-800 text-pink-100',
    Hypothesis: 'bg-indigo-800 text-indigo-100',
    Regime: 'bg-teal-800 text-teal-100',
    News: 'bg-gray-800 text-gray-100',
  };

  const colorClass = colors[label] || 'bg-neutral-700 text-neutral-200';
</script>

<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {colorClass}">
  {label}
</span>

