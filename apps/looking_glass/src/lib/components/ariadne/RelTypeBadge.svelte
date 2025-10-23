<script lang="ts">
  export let relType: string;

  const colors: Record<string, string> = {
    SUPPLIES_TO: 'bg-blue-700 text-blue-100',
    COMPETES_WITH: 'bg-red-700 text-red-100',
    AFFECTS: 'bg-orange-700 text-orange-100',
    CORRELATES_WITH: 'bg-purple-700 text-purple-100',
    CORRELATED_WITH: 'bg-purple-700 text-purple-100',
    MENTIONS: 'bg-gray-700 text-gray-100',
    EVIDENCE_FOR: 'bg-green-700 text-green-100',
    CONTRADICTS: 'bg-red-900 text-red-100',
    VALIDATES: 'bg-teal-700 text-teal-100',
    EXTRACTED_FROM: 'bg-pink-700 text-pink-100',
    HAS_PRICE_EVENT: 'bg-yellow-700 text-yellow-100',
    PRICE_EVENT_OF: 'bg-yellow-700 text-yellow-100',
    SAME_COMMUNITY: 'bg-cyan-700 text-cyan-100',
    BENEFITS_FROM: 'bg-indigo-700 text-indigo-100',
  };

  const colorClass = colors[relType] || 'bg-neutral-600 text-neutral-100';
</script>

<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {colorClass}">
  {relType}
</span>

