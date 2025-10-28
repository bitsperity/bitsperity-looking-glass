<script lang="ts">
  export let type: string = '';
  export let payload: any = {};
  export let onChange: ((p: any) => void) | null = null;

  function update(key: string, value: any) {
    if (onChange) {
      payload = { ...payload, [key]: value };
      onChange(payload);
    }
  }
</script>

{#if type === 'hypothesis' && (payload || {})}
  <div class="space-y-3 bg-neutral-800/50 border border-neutral-700 rounded p-4">
    <h3 class="text-sm font-semibold text-indigo-300">Hypothesis Payload</h3>
    
    <div>
      <label class="text-xs font-semibold text-neutral-400">Decision Deadline</label>
      <input
        type="date"
        value={payload.decision_deadline || ''}
        on:change={(e) => update('decision_deadline', e.currentTarget.value)}
        class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>

    <div>
      <label class="text-xs font-semibold text-neutral-400">Validation Criteria</label>
      <textarea
        value={payload.validation_criteria || ''}
        on:change={(e) => update('validation_criteria', e.currentTarget.value)}
        placeholder="How will you know if this hypothesis is true?"
        class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20 resize-none"
      />
    </div>

    <div>
      <label class="text-xs font-semibold text-neutral-400">Risk to Invalid</label>
      <textarea
        value={payload.risk_to_invalid || ''}
        on:change={(e) => update('risk_to_invalid', e.currentTarget.value)}
        placeholder="What's the downside if this is wrong?"
        class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20 resize-none"
      />
    </div>

    <div>
      <label class="text-xs font-semibold text-neutral-400">Expected Outcome</label>
      <textarea
        value={payload.expected_outcome || ''}
        on:change={(e) => update('expected_outcome', e.currentTarget.value)}
        placeholder="What should happen if this hypothesis is true?"
        class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20 resize-none"
      />
    </div>
  </div>

{:else if type === 'decision' && (payload || {})}
  <div class="space-y-3 bg-neutral-800/50 border border-neutral-700 rounded p-4">
    <h3 class="text-sm font-semibold text-amber-300">Decision Payload</h3>
    
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-semibold text-neutral-400">Action</label>
        <select
          value={payload.action || 'buy'}
          on:change={(e) => update('action', e.currentTarget.value)}
          class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
          <option value="hold">Hold</option>
        </select>
      </div>

      <div>
        <label class="text-xs font-semibold text-neutral-400">Instrument</label>
        <input
          type="text"
          value={payload.instrument || ''}
          on:change={(e) => update('instrument', e.currentTarget.value)}
          placeholder="AAPL, BTC, etc"
          class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="text-xs font-semibold text-neutral-400">Size</label>
        <input
          type="text"
          value={payload.size || ''}
          on:change={(e) => update('size', e.currentTarget.value)}
          placeholder="100 shares"
          class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label class="text-xs font-semibold text-neutral-400">Price</label>
        <input
          type="text"
          value={payload.price || ''}
          on:change={(e) => update('price', e.currentTarget.value)}
          placeholder="$150.00"
          class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label class="text-xs font-semibold text-neutral-400">Risk %</label>
        <input
          type="number"
          value={payload.risk || ''}
          on:change={(e) => update('risk', parseFloat(e.currentTarget.value))}
          placeholder="2.5"
          class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
    </div>

    <div>
      <label class="text-xs font-semibold text-neutral-400">Rationale</label>
      <textarea
        value={payload.rationale || ''}
        on:change={(e) => update('rationale', e.currentTarget.value)}
        placeholder="Why are you making this decision?"
        class="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 h-20 resize-none"
      />
    </div>
  </div>
{/if}
