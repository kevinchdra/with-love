<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  export let data;

  let TemplateComponent;
  const { invite, guest, templateName } = data;

  onMount(async () => {
    const mod = await import(`../../../lib/templates/${templateName}.svelte`);
    TemplateComponent = mod.default;
  });
</script>

{#if TemplateComponent}
  <div in:fade={{ duration: 200 }}>
    <svelte:component this={TemplateComponent} {data} />
  </div>
{/if}