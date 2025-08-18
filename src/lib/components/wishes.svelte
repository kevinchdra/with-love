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

<style lang="postcss">
  @reference "tailwindcss";

 
  :global(html) {
    background-color: theme(--color-gray-100);
  }
  
  
  :global(body) {
    margin: 0;
    padding: 0;
  }
  
  :global(*) {
    box-sizing: border-box;
  }

  :global(.fade-in) {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 1s ease-out, transform 1s ease-out;
}

:global(.fade-in.visible) {
  opacity: 1;
  transform: translateY(0);
}

.font-subheading {
    font-family:'SangBleu Regular', sans-serif;
    font-size:0.75rem;
    letter-spacing: 0.25em;
}

.font-display {
    font-family:'Snell Roundhand', serif;
    font-size:4.75rem;
}

.font-display.dresscode{
    font-family:'Snell Roundhand', serif;
    font-size:2.25rem;
}

.font-button {
  font-family:'DM Sans ExtraBold', sans-serif;
  font-size:0.75rem;
  letter-spacing: 0.25em;
}

.font-h3 {
  font-family:'SangBleu Light',serif;
  font-size:1.25rem;
  letter-spacing:0.025em;
}

.font-h3.eventtime {
  font-family:'SangBleu Light',serif;
  font-size:1rem;
  margin-top:4px;
  opacity:90%;
}

.font-h2 {
  font-family:'SangBleu Light',serif;
  font-size:1.75rem;
  letter-spacing:0.050em;
}

.font-h2.countdown {
  font-family:'SangBleu Light',serif;
  font-size:2.5rem;
}

.font-p {
  font-family:'SangBleu Light',serif;
  font-size:1.75rem;
}

.font-smallcaption {
  font-family:'DM Sans Bold', sans-serif;
  font-size:0.75rem;
  font-weight:600;
  opacity:70%;
  letter-spacing: 0.25em;
}

</style>

<div class="min-h-screen px-8 md:px-16 lg:px-28 py-12 text-white flex flex-col justify-center text-center items-center fade-in">
    <p class="uppercase font-smallcaption  opacity-80 mb-6">WISHES</p>
   <h2 class="font-h2 mb-3 ">Words of Love</h2>
   <hr class="mb-8 w-full border-t-2 border-white/50 mx-auto">

  {#if loading}
    <p class="text-sm font-smallcaption uppercase">Loading wishes...</p>
  {:else if error}
    <p class="text-red-400">{error}</p>
  {:else if wishesWall.length === 0}
    <p class="text-base font-h3 text-white">No wishes yet. Be the first!</p>
  {:else}
    <div class="space-y-10 px-2 w-full max-w-md ">
        {#each paginatedWishes as wish, i}
        <div class={`space-y-2 text-sm text-white/90 ${i % 2 === 0 ? 'text-left' : 'text-right'}`}>
            <p class="font-smallcaption uppercase !tracking-[0.1em]">{wish.full_name}</p>
            <p class="text-base font-h3 eventtime text-white whitespace-pre-wrap break-words w-full">
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
