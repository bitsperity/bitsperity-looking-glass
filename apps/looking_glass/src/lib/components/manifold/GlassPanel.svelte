<script lang="ts">
  export let title: string = '';
  export let gradient: string = '';
</script>

<div class="backdrop-blur-glass bg-coalescence-glass border border-coalescence-border rounded-xl p-6 shadow-glass transition-all hover:shadow-glow {gradient}">
  {#if title}
    <div class="text-sm font-semibold text-neutral-200 mb-4">{title}</div>
  {/if}
  <slot />
</div>

<style>
  div {
    animation: fadeInSlide 0.3s ease-out;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
