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

<svelte:head>
  <title>{data.seo?.title}</title>
  <link rel="canonical" href="{data.seo?.url}" />

  <meta property="og:type" content={data.seo?.ogType} />
  <meta property="og:site_name" content={data.seo?.siteName} />
  <meta property="og:url" content={data.seo?.url} />
  <meta property="og:title" content={data.seo?.title} />
  <meta property="og:description" content={data.seo?.description} />

  <meta property="og:image" content={data.seo?.image} />
  <meta property="og:image:secure_url" content={data.seo?.image} />
  <meta property="og:image:type" content={data.seo?.imageType} />
  <meta property="og:image:width" content={data.seo?.imageWidth} />
  <meta property="og:image:height" content={data.seo?.imageHeight} />

  <meta name="twitter:card" content={data.seo?.twitterCard} />
</svelte:head>


{#if TemplateComponent}
  <div in:fade={{ duration: 200 }}>
    <svelte:component this={TemplateComponent} {data} />
  </div>
{/if}