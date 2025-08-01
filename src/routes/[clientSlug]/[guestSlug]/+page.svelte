<script>
  import { onMount } from 'svelte';
  export let data;

  let TemplateComponent;
  const { invite, guest, templateName } = data;

  onMount(async () => {
    const mod = await import(`../../../lib/templates/${templateName}.svelte`);
    TemplateComponent = mod.default;
  });
</script>

{#if TemplateComponent}
  <svelte:component this={TemplateComponent} {data} />
{:else}
  <p>Loading guest invite...</p>
{/if}
