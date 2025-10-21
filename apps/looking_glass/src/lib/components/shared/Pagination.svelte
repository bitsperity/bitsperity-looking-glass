<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let currentPage: number = 1;
  export let totalItems: number = 0;
  export let pageSize: number = 100;
  export let disabled: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  $: totalPages = Math.ceil(totalItems / pageSize);
  $: hasPrevious = currentPage > 1;
  $: hasNext = currentPage < totalPages;
  $: startItem = (currentPage - 1) * pageSize + 1;
  $: endItem = Math.min(currentPage * pageSize, totalItems);
  
  function goToPage(page: number) {
    if (page < 1 || page > totalPages || disabled) return;
    dispatch('pagechange', { page });
  }
  
  function previous() {
    if (hasPrevious) goToPage(currentPage - 1);
  }
  
  function next() {
    if (hasNext) goToPage(currentPage + 1);
  }
  
  // Generate page numbers to show (with ellipsis)
  $: pageNumbers = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages: (number | string)[] = [];
    
    // Always show first page
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('...');
    }
    
    // Show pages around current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  })();
</script>

{#if totalItems > 0}
  <div class="flex items-center justify-between gap-4 py-3 px-4 bg-neutral-800/30 border border-neutral-700/50 rounded-xl">
    <!-- Items Info -->
    <div class="text-sm text-neutral-400">
      Showing <span class="font-semibold text-neutral-300">{startItem}-{endItem}</span> of <span class="font-semibold text-neutral-300">{totalItems}</span>
    </div>
    
    <!-- Page Numbers -->
    <div class="flex items-center gap-1">
      <!-- Previous Button -->
      <button
        on:click={previous}
        disabled={!hasPrevious || disabled}
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
               {hasPrevious && !disabled ? 'text-neutral-300 hover:bg-neutral-700/50' : 'text-neutral-600'}"
        title="Previous page"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <!-- Page Numbers -->
      {#each pageNumbers as page}
        {#if page === '...'}
          <span class="px-2 text-neutral-500">...</span>
        {:else}
          <button
            on:click={() => goToPage(page)}
            disabled={disabled}
            class="min-w-[2.5rem] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40
                   {page === currentPage 
                     ? 'bg-blue-600 text-white' 
                     : 'text-neutral-300 hover:bg-neutral-700/50'}"
          >
            {page}
          </button>
        {/if}
      {/each}
      
      <!-- Next Button -->
      <button
        on:click={next}
        disabled={!hasNext || disabled}
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
               {hasNext && !disabled ? 'text-neutral-300 hover:bg-neutral-700/50' : 'text-neutral-600'}"
        title="Next page"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
    
    <!-- Quick Jump (for large datasets) -->
    {#if totalPages > 10}
      <div class="flex items-center gap-2">
        <label class="text-xs text-neutral-500">Go to:</label>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={currentPage}
          on:change={(e) => goToPage(parseInt(e.currentTarget.value))}
          disabled={disabled}
          class="w-16 px-2 py-1 text-sm bg-neutral-700 border border-neutral-600 rounded text-neutral-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none disabled:opacity-40"
        />
      </div>
    {/if}
  </div>
{/if}

