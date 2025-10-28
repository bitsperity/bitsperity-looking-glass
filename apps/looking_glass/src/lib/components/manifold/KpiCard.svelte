<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let subtitle: string = '';
  export let icon: string = '';
</script>

<div class="backdrop-blur-glass bg-coalescence-glass border border-coalescence-border rounded-xl p-6 shadow-glass transition-all hover:shadow-glow">
  <div class="flex items-center justify-between mb-3">
    <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide">{title}</div>
    {#if icon}
      <span class="text-2xl">{icon}</span>
    {/if}
  </div>
  <div class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
    {value}
  </div>
  {#if subtitle}
    <div class="text-xs text-neutral-400 mt-2">{subtitle}</div>
  {/if}
</div>

<style>
  div {
    animation: fadeInSlide 0.3s ease-out;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

