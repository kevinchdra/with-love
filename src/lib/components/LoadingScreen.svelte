<!-- <script>
  import { onMount } from 'svelte';

  const cyclingWords = ['Love', 'Family','Moments', 'Memories','Promises','Together','Always','Forever'];
  const finalWord = {'Eddie & Vania'};

  let currentWord = cyclingWords[0];
  let progress = 0;
  let visible = true;
  let fadeOut = false;
  let showButton = false;
  let index = 0;
  let wordInterval;
  let progressInterval;
  let speed = 400;

  let buttonVisible = false;

$: if (showButton) {
  setTimeout(() => {
    buttonVisible = true;
  }, 50); // slight delay so transition works smoothly
}

  onMount(() => {
    document.body.style.overflow = 'hidden';

    function updateWord() {
      index = (index + 1) % cyclingWords.length;
      currentWord = cyclingWords[index];

      const newSpeed = Math.max(150, speed * 1);
      if (newSpeed !== speed) {
        speed = newSpeed;
        clearInterval(wordInterval);
        wordInterval = setInterval(updateWord, speed);
      }
    }

    wordInterval = setInterval(updateWord, speed);

    progressInterval = setInterval(() => {
      progress += 0.025;
      if (progress >= 1) {
        progress = 1;
        clearInterval(progressInterval);
        clearInterval(wordInterval);
        currentWord = finalWord;
        showButton = true;
      }
    }, 100);

    

    return () => {
      clearInterval(wordInterval);
      clearInterval(progressInterval);
      document.body.style.overflow = '';
    };
  });

  function enterSite() {
    fadeOut = true;
    setTimeout(() => {
      visible = false;
      document.body.style.overflow = '';
    }, 600);
  };
</script>

<style>
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(10px); }
    30% { opacity: 1; transform: translateY(0); }
    70% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-10px); }
  }

  .fade-out {
    animation: fadeOut 0.6s ease forwards;
  }

  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
</style>

{#if visible}
  <div
    class={`fixed inset-0 bg-black text-white flex flex-col items-center justify-center text-xl sm:text-3xl font-['Sangbleu_Light'] uppercase tracking-wide z-50 transition-opacity duration-500 ${fadeOut ? 'fade-out' : ''}`}
  >
    <div class="flex items-center gap-2 h-12 sm:h-16 text-gray-300">
      <span>Celebrating</span>
      <span
        class="text-white"
        key={currentWord}
        style="animation: fadeInOut 1s ease-in-out forwards"
      >
        {currentWord}
      </span>
    </div>

    
      {#if progress < 1}
            <div class="mt-6 text-sm sm:text-base text-gray-400 tracking-widest">
                {Math.floor(progress * 100)}%
            </div>
            {/if}
   

    {#if showButton}
    <button
        on:click={enterSite}
        class={`font-caption uppercase tracking-[0.15em] sm:tracking-[0.22em] px-4 sm:px-6 py-2 border border-white mt-10 hover:bg-white hover:text-black text-xs sm:text-sm
        transform transition duration-500 ease-out
        ${buttonVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
        `}
    >
        Tap to Enter
    </button>
    {/if}
    
  </div>
{/if} -->

<script>
  export let invites = { client_name: "Client" };
  import { onMount, onDestroy } from 'svelte';

  let progress = 0;
  let interval;

  // Simulate loading progress
  onMount(() => {
    interval = setInterval(() => {
      if (progress < 100) {
        progress += 1;
      } else {
        clearInterval(interval);
      }
    }, 30); // speed of loading
  });

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<style>
  .loading-screen {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    background: black;
    color: white;
    font-family: sans-serif;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.5rem;
  }
</style>

<div class="loading-screen">
  <h1>{invites.client_name}</h1>
  <p>{progress}%</p>
</div>



