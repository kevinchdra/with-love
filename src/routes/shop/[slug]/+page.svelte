<script lang="ts">
  // Accordion state
  let featuresOpen = false;
  let reviewsOpen = false;

  // Dummy data
  const product = {
    name: 'The Night We Met',
    description:
      `This limited-edition notebook pairs artistic elegance with mindful design. ` +
      `Featuring a soft-touch cover and Mandy Maria’s Velvet Peak, it brings ` +
      `artful calm to your everyday. Inside, premium stone paper offers a silky, ` +
      `fluid writing experience.`,
    priceRange: 'Rp. 158,000 – 200,000'
  };

  const others = [
    { name: product.name, price: product.priceRange, tone: 'bg-[#C7C9E6]' }, // lavender
    { name: product.name, price: product.priceRange, tone: 'bg-[#FFF2DC]' }, // cream
    { name: product.name, price: product.priceRange, tone: 'bg-[#DCDCDC]' }  // grey
  ];

  function openDemo() {
    // Replace with your route or modal logic
    window.open('#demo', '_blank', 'noopener,noreferrer');
  }
</script>

<!-- PAGE WRAPPER -->
<div class="min-h-screen bg-white text-[#0F0F0F] tracking-normal selection:bg-black selection:text-white">

  <!-- HEADER -->
  <header class="border-b border-black/10">
    <div class="mx-auto max-w-[1100px] px-4">
      <div class="flex items-center justify-between h-16">
        <a href="#" class="text-[15px] hover:opacity-70">Shop</a>
        <div class="text-[14px] tracking-[0.3em] font-medium">WITH LOVE</div>
        <a href="#" class="text-[15px] hover:opacity-70">Cart</a>
      </div>
    </div>
  </header>

  <!-- HERO: TWO COLUMNS -->
  <section class="border-b border-black/10">
    <div class="mx-auto max-w-[1100px] px-4 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 py-10 md:py-12">

      <!-- Left column: image + View Demo -->
      <div class="flex flex-col">
        <div class="w-full aspect-[3/4] rounded-[18px] bg-black/10" />
        <div class="mt-4">
          <button
            on:click={openDemo}
            class="inline-flex items-center gap-2 rounded-md border border-black/10 bg-[#EFEFEF] px-4 py-2 text-[14px] hover:bg-[#E7E7E7]">
            <span class="-mt-[1px]">↗</span>
            <span>View Demo</span>
          </button>
        </div>
      </div>

      <!-- Right column: title, copy, CTA, accordions -->
      <div class="flex flex-col">
        <h1 class="text-[15px] font-semibold mb-2">{product.name}</h1>
        <p class="text-[14px] leading-6 text-black/80 max-w-[520px]">
          {product.description}
        </p>

        <div class="mt-7">
          <button
            class="w-full md:w-auto rounded-full bg-[#E7E7E7] hover:bg-[#DFDFDF] px-6 py-3 text-[14px]">
            Add to Cart
          </button>
        </div>

        <!-- Accordions -->
        <div class="mt-8 divide-y divide-black/10 rounded-md border border-black/10 overflow-hidden">
          <!-- Features row -->
          <button
            class="w-full flex items-center justify-between px-4 py-4 text-left text-[14px] hover:bg-black/[0.02] focus:outline-none"
            aria-expanded={featuresOpen}
            on:click={() => (featuresOpen = !featuresOpen)}>
            <span>Features</span>
            <span class="ml-6 select-none transition-transform"
                  class:rotate-45={featuresOpen}>+</span>
          </button>
          {#if featuresOpen}
            <div class="px-4 pb-4 text-[14px] text-black/70">
              • Soft-touch cover<br>
              • Stone paper, silky writing feel<br>
              • Limited edition artwork (Velvet Peak)<br>
              • Rounded corners, lay-flat binding
            </div>
          {/if}

          <!-- Reviews row -->
          <button
            class="w-full flex items-center justify-between px-4 py-4 text-left text-[14px] hover:bg-black/[0.02] focus:outline-none"
            aria-expanded={reviewsOpen}
            on:click={() => (reviewsOpen = !reviewsOpen)}>
            <span>Reviews</span>
            <span class="ml-6 select-none transition-transform"
                  class:rotate-45={reviewsOpen}>+</span>
          </button>
          {#if reviewsOpen}
            <div class="px-4 pb-4 text-[14px] text-black/70">
              “Smooth pages and beautiful minimal design.” — A.<br>
              “Ink doesn’t bleed, feels premium.” — R.
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <!-- OTHERS LIKE THIS -->
  <section class="border-b border-black/10">
    <div class="mx-auto max-w-[1100px] px-4 py-6 md:py-8">
      <div class="text-[12px] tracking-[0.05em] text-black/70 mb-4">OTHERS LIKE THIS</div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        {#each others as item}
          <article class="rounded-md border border-black/10 overflow-hidden">
            <div class={`px-6 py-10 ${item.tone}`}>
              <div class="mx-auto w-[140px] md:w-[160px] aspect-[3/5] rounded-[12px] bg-white/70 shadow-sm" />
            </div>
            <div class="px-5 py-5">
              <div class="text-[14px] mb-1">{item.name}</div>
              <div class="text-[13px] text-black/60">{item.price}</div>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="relative overflow-hidden">
    <!-- Top links panel -->
    <div class="bg-[#C7DBD4]">
      <div class="mx-auto max-w-[1100px] px-4 py-10 md:py-14">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-[14px]">
          <div class="space-y-3">
            <a class="block hover:underline" href="#">Our Story</a>
            <a class="block hover:underline" href="#">Catalog</a>
            <a class="block hover:underline" href="#">Features</a>
            <a class="block hover:underline" href="#">Support</a>
          </div>
          <div class="space-y-3">
            <a class="block hover:underline" href="#">Refund Policy</a>
            <a class="block hover:underline" href="#">FAQ</a>
          </div>
          <div class="space-y-3">
            <a class="block hover:underline" href="#">Instagram</a>
            <a class="block hover:underline" href="#">Tiktok</a>
          </div>
          <div class="flex items-end md:items-start">
            <div class="text-[12px] text-black/60">withlove™. All rights reserved</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Watermark -->
    <div class="pointer-events-none select-none">
      <div class="mx-auto max-w-[1100px] px-4">
        <div class="text-[14vw] md:text-[9rem] leading-none font-light text-black/[0.06] tracking-tight whitespace-nowrap">
          made with love
        </div>
      </div>
    </div>
  </footer>
</div>

<style>
  /* Optional: tighten plus rotation center */
  .rotate-45 { transform: rotate(45deg); }
</style>
