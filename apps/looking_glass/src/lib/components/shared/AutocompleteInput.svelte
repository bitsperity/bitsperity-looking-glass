<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value = '';
  export let placeholder = '';
  export let suggestions: string[] = [];
  export let fetchSuggestions: ((query: string) => Promise<string[]>) | null = null;
  export let minChars = 1;
  export let maxSuggestions = 10;
  export let loading = false;
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let showDropdown = false;
  let filteredSuggestions: string[] = [];
  let selectedIndex = -1;
  let inputEl: HTMLInputElement;
  let fetchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Debounced fetch with plain setTimeout
  async function debouncedFetch(query: string) {
    if (!fetchSuggestions) return;
    
    if (fetchTimeout) clearTimeout(fetchTimeout);
    
    fetchTimeout = setTimeout(async () => {
      loading = true;
      try {
        const results = await fetchSuggestions(query);
        filteredSuggestions = results.slice(0, maxSuggestions);
        showDropdown = filteredSuggestions.length > 0;
      } catch (e) {
        console.error('Failed to fetch suggestions:', e);
      } finally {
        loading = false;
      }
    }, 300);
  }

  function handleInput() {
    const query = value.trim();
    
    if (query.length < minChars) {
      showDropdown = false;
      return;
    }

    if (fetchSuggestions) {
      debouncedFetch(query);
    } else {
      // Local filtering
      filteredSuggestions = suggestions
        .filter(s => s.toLowerCase().includes(query.toLowerCase()))
        .slice(0, maxSuggestions);
      showDropdown = filteredSuggestions.length > 0;
    }
    
    selectedIndex = -1;
  }

  function selectSuggestion(suggestion: string) {
    value = suggestion;
    showDropdown = false;
    selectedIndex = -1;
    dispatch('select', suggestion);
    inputEl?.blur();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredSuggestions.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(filteredSuggestions[selectedIndex]);
        } else {
          dispatch('submit', value);
        }
        break;
      case 'Escape':
        showDropdown = false;
        selectedIndex = -1;
        break;
    }
  }

  function handleBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
      showDropdown = false;
      selectedIndex = -1;
    }, 200);
  }
</script>

<div class="relative">
  <input
    bind:this={inputEl}
    type="text"
    bind:value
    on:input={handleInput}
    on:keydown={handleKeydown}
    on:blur={handleBlur}
    on:focus={() => {
      if (value.length >= minChars) handleInput();
    }}
    {placeholder}
    {disabled}
    class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
    autocomplete="off"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={showDropdown}
    aria-controls="suggestions-list"
  />

  {#if loading}
    <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
      <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  {/if}

  {#if showDropdown}
    <ul
      id="suggestions-list"
      role="listbox"
      class="absolute z-50 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded shadow-lg max-h-60 overflow-y-auto"
    >
      {#each filteredSuggestions as suggestion, i}
        <li
          role="option"
          aria-selected={i === selectedIndex}
          class="px-3 py-2 cursor-pointer hover:bg-neutral-700 {i === selectedIndex ? 'bg-neutral-700' : ''}"
          on:mousedown|preventDefault={() => selectSuggestion(suggestion)}
        >
          <span class="text-neutral-100">{suggestion}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

