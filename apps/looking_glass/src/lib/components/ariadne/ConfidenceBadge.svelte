<script lang="ts">
  export let confidence: number;

  let colorClass = 'bg-neutral-600 text-neutral-100';
  if (confidence >= 0.8) {
    colorClass = 'bg-green-700 text-green-100';
  } else if (confidence >= 0.6) {
    colorClass = 'bg-yellow-700 text-yellow-100';
  } else if (confidence >= 0.4) {
    colorClass = 'bg-orange-700 text-orange-100';
  } else {
    colorClass = 'bg-red-700 text-red-100';
  }
</script>

<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {colorClass}">
  {Math.round(confidence * 100)}%
</span>

