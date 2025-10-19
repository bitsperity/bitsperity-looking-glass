<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'secondary';
  export let size: 'sm' | 'md' = 'sm';
  
  const variants = {
    primary: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    secondary: 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };
</script>

<span class="inline-flex items-center gap-1 border rounded-full font-medium {variants[variant]} {sizes[size]}">
  <slot />
</span>

