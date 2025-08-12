<script>
  import { onMount, onDestroy } from 'svelte';

  // Set your event date and time here
  export let eventDate = '2025-12-31T23:59:59'; // Format: YYYY-MM-DDTHH:MM:SS

  let days = 0;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let interval;

  function updateCountdown() {
    const now = new Date().getTime();
    const eventTime = new Date(eventDate).getTime();
    const distance = eventTime - now;

    if (distance > 0) {
      days = Math.floor(distance / (1000 * 60 * 60 * 24));
      hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      seconds = Math.floor((distance % (1000 * 60)) / 1000);
    } else {
      // Event has passed
      days = hours = minutes = seconds = 0;
    }
  }

  onMount(() => {
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
  });

  onDestroy(() => {
    if (interval) {
      clearInterval(interval);
    }
  });
</script>

<div class="max-w-sm p-8 bg-deepred border-gray-200 rounded-lg shadow-sm">
<div class="flex flex-col">
  <h3 class="font-english uppercase text-[#FFF1E2]">UNTIL THE CEREMONY</h3>
  <h3 class="font-chinese uppercase text-[#FFF1E2]">直到仪式开始</h3>
  <hr class="mt-4 mb-8 text-[#FFF1E2]">
  
  <div class="grid grid-cols-4 gap-6 text-center">
    <!-- Days -->
    <div class="flex flex-col items-center">
      
        <div class="font-countdowntime">{days}</div>
      
      <div class="font-countdowncap uppercase">Days</div>
    </div>

    <!-- Hours -->
    <div class="flex flex-col items-center">
      
        <div class="font-countdowntime">{hours.toString().padStart(2, '0')}</div>
      
      <div class="font-countdowncap uppercase">Hours</div>
    </div>

    <!-- Minutes -->
    <div class="flex flex-col items-center">
      
        <div class="font-countdowntime">{minutes.toString().padStart(2, '0')}</div>
      
      <div class="font-countdowncap uppercase">Minutes</div>
    </div>

    <!-- Seconds -->
    <div class="flex flex-col items-center">
      
        <div class="font-countdowntime">{seconds.toString().padStart(2, '0')}</div>
      
      <div class="font-countdowncap uppercase">Seconds</div>
    </div>
  </div>

  {#if days === 0 && hours === 0 && minutes === 0 && seconds === 0}
    <div class="mt-8 text-center">
      <p class="text-xl font-semibold text-rose-600">🎉 The big day is here! 🎉</p>
    </div>
  {/if}
</div>
</div>