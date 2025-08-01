<script lang="ts">
  import { supabase } from '$lib/supabaseClient'
  import { onMount } from 'svelte'

  let wishesWall: any[] = []
  let loading = true
  let error = ''
  let currentPage = 1
  const itemsPerPage = 3

  
  onMount(async () => {
    const { data, error: err } = await supabase
      .from('guests')
      .select('full_name, wishes, submitted_at')
      .not('wishes', 'is', null)
      .neq('wishes', '')
      .order('submitted_at', { ascending: false })

    if (err) {
      error = err.message
    } else {
      wishesWall = data
    }

    loading = false
  })

  $: totalPages = Math.ceil(wishesWall.length / itemsPerPage)
  $: paginatedWishes = wishesWall.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  function prevPage() {
    if (currentPage > 1) currentPage--
  }

  function nextPage() {
    if (currentPage < totalPages) currentPage++
  }

  onMount(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    {
      threshold: 0.5
    }
  );

  const fadeElements = document.querySelectorAll('.fade-in');
  fadeElements.forEach(el => observer.observe(el));
});

</script>

<div class="px-8 py-12 text-white flex flex-col justify-start fade-in">
    <p class="uppercase text-xs tracking-widest font-caption opacity-80 mb-6">WISHES</p>
   <h2 class="text-3xl sm:text-4xl md:text-5xl font-['Sangbleu_King'] leading-10">Words of Love</h2>
   <hr class="opacity-50 my-4 mb-8">

  {#if loading}
    <p class="text-sm font-caption uppercase">Loading wishes...</p>
  {:else if error}
    <p class="text-red-400">{error}</p>
  {:else if wishesWall.length === 0}
    <p class="text-base font-[Sangbleu_Light] text-white">No wishes yet. Be the first!</p>
  {:else}
    <div class="space-y-10 px-2 w-full max-w-md ">
        {#each paginatedWishes as wish, i}
        <div class={`space-y-2 text-sm text-white/90 ${i % 2 === 0 ? 'text-left' : 'text-right'}`}>
            <p class="font-caption uppercase !text-xs">{wish.full_name}</p>
            <p class="text-base font-[Sangbleu_Light] text-white whitespace-pre-wrap break-words w-full">
                {wish.wishes}
              </p>
            <p class="text-xs text-white/50 tracking-wider">{new Date(wish.submitted_at).toLocaleDateString('en-UK', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</p>
        </div>
        {/each}

    </div>

    <!-- Pagination -->
    <div class="mt-10 sm:mt-12 md:mt-14 flex items-center justify-center gap-6 text-sm text-white/70">
      <button on:click={prevPage} class="text-xl disabled:opacity-30" disabled={currentPage === 1}>
        ‹
      </button>
      <p>{currentPage} / {totalPages}</p>
      <button on:click={nextPage} class="text-xl disabled:opacity-30" disabled={currentPage === totalPages}>
        ›
      </button>
    </div>
  {/if}
  </div>
