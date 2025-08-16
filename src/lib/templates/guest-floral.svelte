<!--guest-floral-->

<script>
  // ─── Imports ──────────────────────────────────────────────────────────────
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import PersonalRsvp from '$lib/components/personalrsvp.svelte';
  import LottieClientOnly from '$lib/components/LottieClientOnly.svelte';
  import arrowDown from '$lib/lottie/arrowDown.json';
  import LoadingScreen from '$lib/components/LoadingScreen.svelte';
  import Wishes from '$lib/components/wishes.svelte';
  import { tick } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { fade } from 'svelte/transition';

  // ─── Props ────────────────────────────────────────────────────────────────
 
  // $: eventDateObj = new Date(invite.event_date);

  // ─── State Variables ──────────────────────────────────────────────────────
    export let data;


  if (!data || !data.guest || !data.invite) {
    throw new Error("Missing guest or invite data");
  }

  const invite = data.invite;
  const guest = data.guest;
  const events = data.events || [];
  const couple = data.couple;

  

//   console.log('=== DEBUGGING DATA ===');
// console.log('Full data object:', data);
// console.log('Invite:', invite);
// console.log('Invite ID:', invite?.id);
// console.log('Couple:', couple);
// console.log('========================');

   

  const primaryEvent = events.length > 0 ? events[0] : null;
$: eventDateObj = primaryEvent ? 
  new Date(`${primaryEvent.event_date}T${primaryEvent.start_time || '00:00'}`) : 
  new Date(invite.event_date);
  
$: clientSlug = $page.params.clientSlug;
$: guestSlug = $page.params.guestSlug;

  let showAccount = true;
  let clicked = false;
  
let audio;

let copiedAccounts = {}; // store which account numbers have been copied
   






  // ─── Google Maps Integration ──────────────────────────────────────────────
  const mapsUrl = "https://www.google.com/maps?q=Hotel+Mulia+Senayan,+Jakarta";

  // ─── Google Calendar Integration ─────────────────────────────────────────
  const eventTitle = invite.event_title;
const location = invite.location;

const startDateTime = new Date(invite.event_start_time);
const endDateTime = new Date(invite.event_end_time);

function toGoogleCalendarDate(date) {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
}

const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${toGoogleCalendarDate(startDateTime)}/${toGoogleCalendarDate(endDateTime)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;

  // // ─── Carousel with Swipe + Pause ─────────────────────────────────────────
  // let images = ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg", "/7.jpg", "/8.jpg", "/9.jpg"];
  // let currentIndex1 = 0;
  // let currentIndex2 = 1;

  // let interval1;
  // let interval2;
  // let resumeTimeout;
  // let startX = 0;

  // function startAutoSlide() {
  //   clearInterval(interval1);
  //   interval1 = setInterval(() => {
  //     currentIndex1 = (currentIndex1 + 1) % images.length;
  //   }, 2427);
  // }

  // function startSecondSlide() {
  //   clearInterval(interval2);
  //   interval2 = setInterval(() => {
  //     currentIndex2 = (currentIndex2 + 1) % images.length;
  //   }, 3000);
  // }

  // function handleTouchStart(event) {
  //   startX = event.touches[0].clientX;
  // }

  // function handleTouchEnd(event) {
  //   const endX = event.changedTouches[0].clientX;
  //   const deltaX = endX - startX;

  //   if (Math.abs(deltaX) > 50) {
  //     clearInterval(interval1);
  //     clearTimeout(resumeTimeout);

  //     if (deltaX > 0) {
  //       currentIndex1 = (currentIndex1 - 1 + images.length) % images.length;
  //     } else {
  //       currentIndex1 = (currentIndex1 + 1) % images.length;
  //     }

  //     resumeTimeout = setTimeout(() => {
  //       startAutoSlide();
  //     }, 4000); // Resume after 4 seconds
  //   }
  // }

  // onMount(() => {
  //   startAutoSlide();
  //   startSecondSlide();
  // });

  // onDestroy(() => {
  //   clearInterval(interval1);
  //   clearInterval(interval2);
  //   clearTimeout(resumeTimeout);
  // });


let videoUrl = '';

onMount(() => {
  const { data: publicData, error } = supabase
    .storage
    .from('invites-images')
    .getPublicUrl(`${clientSlug}/video.webm`);

  if (error) {
    console.error('Error getting public URL:', error);
  } else {
    videoUrl = publicData.publicUrl;
    console.log('Video URL:', videoUrl);
  }
});


//Carousel for countdown

let images = [];
let currentIndex = 0;

onMount(async () => {
  // List files in the specific client folder, not root
  const { data, error } = await supabase
    .storage
    .from('invites-images')
    .list(clientSlug, { limit: 100 }); // Use clientSlug as the folder path
    
  console.log(`Files in ${clientSlug} folder:`, data, error);
  console.log("Client slug:", clientSlug);
  
  if (error) {
    console.error('Error listing images:', error);
    return;
  }

  console.log("Files found in folder:", data);

  if (!data || data.length === 0) {
    console.warn(`No files found in folder: ${clientSlug}`);
    return;
  }
 
  const sorted = data
    .filter(file => /\.(jpe?g|png|webp)$/i.test(file.name))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  images = sorted.map(file => {
    const { data: publicData } = supabase
      .storage
      .from('invites-images')
      .getPublicUrl(`${clientSlug}/${file.name}`);
    return publicData.publicUrl;
  });

  console.log("Image URLs:", images);

  if (images.length > 0) startCarousel();
});

function startCarousel() {
  setInterval(() => {
    currentIndex = (currentIndex + 1) % images.length;
  }, 1500); // change every 3s
}

//Parse Client Name
 let clientName = invite.client_name || "";
  let [name1, name2] = clientName.split(" & ");


  // ─── Countdown Timer ──────────────────────────────────────────────────────
  let days = 0;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let intervalTime;

  function updateCountdown() {
    const now = new Date().getTime();
    const eventTime = eventDateObj.getTime();
    
    const distance = eventTime - now;

    if (distance > 0) {
      days = Math.floor(distance / (1000 * 60 * 60 * 24));
      hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      seconds = Math.floor((distance % (1000 * 60)) / 1000);
    } else {
      days = hours = minutes = seconds = 0;
    }
  }

  onMount(() => {
    updateCountdown();
    intervalTime = setInterval(updateCountdown, 1000);

    // ─── BGM Autoplay After Interaction ─────
    window.addEventListener('scroll', playAudio, { once: true });
    window.addEventListener('mousemove', playAudio, { once: true });
    window.addEventListener('click', playAudio, { once: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onDestroy(() => {
    clearInterval(intervalTime);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

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

  // ─── Background Music Logic ───────────────────────────────────────────────
  function fadeInAudio() {
    let volume = 0;
    audio.volume = 0;
    const fade = setInterval(() => {
      volume += 0.02;
      if (volume >= 1) {
        clearInterval(fade);
        volume = 1;
      }
      audio.volume = volume;
    }, 100);
  }

  function playAudio() {
    if (!audio) return;
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => fadeInAudio())
      .catch((error) => console.warn('Autoplay failed:', error));
  }

  // Remove once-after interaction listeners
  window.removeEventListener('scroll', playAudio);
  window.removeEventListener('mousemove', playAudio);
  window.removeEventListener('click', playAudio);
}

// ─── Pause music when tab is hidden ─────────────────────
function handleVisibilityChange() {
  if (!audio) return;
  if (document.hidden) {
    audio.pause();  // stop music when user leaves tab/browser
  } else {
    playAudio();    // resume when they come back
  }
}

  // ─── Scroll to Devotions Section ─────────────────────────────────────────
  function unlockScrollAndScrollDown() {
    const el = document.getElementById('devotions');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ─── Account Copy ─────────────────────────────────────────────────────────
    async function copyAccountNumber(number) {
    try {
      await navigator.clipboard.writeText(number);
      copiedAccounts[number] = true;
      await tick(); // wait for DOM to update

      // Reset after 2 seconds
      setTimeout(() => {
        copiedAccounts[number] = false;
      }, 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  // ─── Dress Code Swatches ─────────────────────────────────────────────────
$: colorSwatches = (() => {
  const eventWithDressCode = events?.find(e => e?.dress_code);
  if (!eventWithDressCode) return [];

  const raw = String(eventWithDressCode.dress_code || '').trim();
  if (!raw) return [];

  // If it looks like JSON, try parsing as JSON first
  if (/^\s*[\[\{]/.test(raw)) {
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.colors)
          ? parsed.colors
          : [];
      return normalizeColors(arr);
    } catch (e) {
      console.warn('dress_code is not valid JSON, falling back to manual parse:', e);
    }
  }

  // Fallback: manual parse for strings like "#945C4E, #AABBCC" or "#fff #000"
  const cleaned = raw.replace(/[\{\}\[\]]/g, ''); // handle postgres-style arrays etc.
  const tokens = cleaned.split(/[,;|\n\s]+/).filter(Boolean);
  return normalizeColors(tokens);

  // Helper: accept #hex, rgb/rgba(), hsl/hsla(), or CSS color names
  function normalizeColors(list) {
    const out = [];
    for (const item of list) {
      const t = String(item).trim().replace(/['"]/g, '');
      let color = null;

      const hex = t.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
      if (hex) color = `#${hex[1].toUpperCase()}`;
      else if (/^rgba?\(/i.test(t) || /^hsla?\(/i.test(t)) color = t;
      else if (/^[a-zA-Z]+$/.test(t)) color = t.toLowerCase();

      if (color) out.push(color);
    }
    // de-duplicate
    return [...new Set(out)];
  }
})();

  // Format time from 24-hour to 12-hour format
function formatTime(time24) {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  
  return `${displayHour}.${minutes} ${ampm}`;
}

// Format event time range
function formatEventTimeRange(startTime, endTime) {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  
  if (start && end) {
    return `${start} - ${end}`;
  } else if (start) {
    return start;
  }
  return '';
}


</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>



<style lang="postcss">
  @reference "tailwindcss";

 
  :global(html) {
    background-color: #000 !important;
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

.with-love{
  font-family:'DM Sans Bold', sans-serif;
  font-size:0.65rem;
  font-weight:600;
  
  letter-spacing: 0.3em;
}

@media (max-width: 376px) {

  

.landing-section {
   transform: scale(1);
    transform-origin: center top; /* Scale from center-top */
    
  }

.events-section {
    transform: scale(0.85); /* 15% smaller (100% - 15% = 85%) */
    transform-origin: center top; /* Scale from center-top */
  }

.wishes-section {
    transform: scale(0.85); /* 15% smaller (100% - 15% = 85%) */
    transform-origin: center top; /* Scale from center-top */
}


    
}



.font-subheading {
    font-family:'SangBleu Regular', sans-serif;
    font-size:0.65rem;
    letter-spacing: 0.25em;
}

.font-display {
    font-family:'Snell Roundhand', serif;
    font-size:4.55rem;
}

.font-display.dresscode{
    font-family:'Snell Roundhand', serif;
    font-size:2.15rem;
}

.font-button {
  font-family:'DM Sans ExtraBold', sans-serif;
  font-size:0.65rem;
  letter-spacing: 0.25em;
}

.font-h3 {
  font-family:'SangBleu Light',serif;
  font-size:1.15rem;
  letter-spacing:0.025em;
}

.font-h3.eventtime {
  font-family:'SangBleu Light',serif;
  font-size:0.9rem;
  margin-top:4px;
  opacity:90%;
}

.font-h2 {
  font-family:'SangBleu Light',serif;
  font-size:1.65rem;
  letter-spacing:0.050em;
}

.font-h2.countdown {
  font-family:'SangBleu Light',serif;
  font-size:2.4rem;
}

.font-p {
  font-family:'SangBleu Light',serif;
  font-size:1.65rem;
}

.font-smallcaption {
  font-family:'DM Sans Bold', sans-serif;
  font-size:0.65rem;
  font-weight:600;
  opacity:70%;
  letter-spacing: 0.25em;
}






</style>

<audio
  bind:this={audio}
  loop
  playsinline
  preload="auto"
  class="hidden"
>
  <source src="/sailorsong-bgm.mp3" type="audio/mp3" />
  Your browser does not support the audio tag.
</audio>

<!-- <LoadingScreen /> -->
<slot />


<div class="h-[100dvh]">

<!--Start of Landing Page-->
<div class="relative w-full min-h-[100dvh]
">
  <!-- Background image -->
   
 <video
  class="fixed top-0 left-0 w-full h-full object-cover z-[-1]"
  style="   height: 100vh; /* Use vh instead of dvh */
    min-height: 100vh;
    background-color: #000;
    object-position: 65%;"
  autoplay
  muted
  loop
  playsinline
>
  {#if videoUrl}
    <source src={videoUrl} type="video/webm" />
  {/if}
  Your browser does not support the video tag.
</video>

  <!-- Dark overlay -->
  <div class="fixed top-0 left-0 w-full h-[100vh] bg-black/50 z-[-1]"></div>

  <!--Introduction-->
  <div class=" landing-section relative z-10 flex flex-col items-center justify-center text-center min-h-[100dvh] fade-in">


    <p class="font-subheading text-white uppercase pb-30">
      Dear {guest.full_name},
    </p>

    <div class="flex flex-col items-center justify-center" >
      <p class="font-subheading uppercase text-white pb-10">
      We Invite You To Celebrate</p>
        <h1 class="font-display text-white rotate-[-6deg] text-center leading-none pb-10">
          <p class="m-0">{name1}</p>
          <p class="-m-3">&</p>
          <p class="m-0">{name2}</p>
        </h1>

      <p class="font-subheading uppercase text-white pb-20">
  {eventDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })}
</p>
    </div>

    <button
       on:click={unlockScrollAndScrollDown}
      class="font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition text-xs sm:text-sm"    >
      JOIN THE CELEBRATION
    </button>
  </div>
</div>


<!--End of Landing-->

<!--Devotions-->
{#if invite.section_toggle.includes("devotions")}
<div id="devotions" class="relative z-10 flex flex-col items-center justify-center text-center min-h-[100dvh] px-4 sm:px-6 space-y-8 sm:space-y-12 "> 
      <img src="/cross.png" alt="cross" class="w-4 h-5 sm:w-3 sm:h-4 object-fill opacity-80 fade-in ">
      <h1 class="font-h2 text-white fade-in ">I have found the one whom my soul loves.</h1>
      <p class="font-smallcaption font-bold text-white uppercase tracking-[1em] sm:tracking-[1.5em] md:tracking-[2em] opacity-90 text-xs sm:text-sm fade-in ">SONG OF SOLOMON 3:4</p>
    <div class="absolute bottom-40 left-1/2 -translate-x-1/2 w-20 h-20 flex justify-center items-center fade-in ">
      <!-- <div class="scale-50 opacity-80">
        <LottieClientOnly {arrowDown} />
      </div> -->
    </div>
  
</div>
{/if}
<!--End of Devotions-->

<!--Couple-->
{#if invite.section_toggle.includes("groom-intro")}
<div class="relative flex flex-col items-center ">
  <div class="absolute inset-0 bg-black/15 z-[5]"></div>

  <!-- Background image -->
  <img src="/groom.png" alt="Background" class="w-full h-full object-cover block">
  <img src="/snow.gif" alt="Overlay" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10">

  <!-- Overlay Content -->
  <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-3 px-4 fade-in">
    
    <img src="/deco3.png" alt="Top Deco" class="w-8 sm:w-10 mb-12 opacity-90">

    <div class="flex items-center space-x-4 mb-4">
      <img src="/deco1.png" alt="Left Deco" class="w-10 sm:w-14">
      <h4 class="font-smallcaption uppercase text-xs sm:text-sm">THE GROOM</h4>
      <img src="/deco2.png" alt="Right Deco" class="w-10 sm:w-14">
    </div>

    <!-- Name -->
    <h2 class="font-['Millionaire_Roman'] text-6xl sm:text-7xl md:text-8xl leading-none mt-0 mb-8">
      {invite.groom_name}
    </h2>

    <div class="flex flex-col items-center space-y-">
      <h4 class="font-smallcaption uppercase text-xs sm:text-sm">
       {invite.groom_parents}
      </h4>
      <img src="/deco4.png" alt="Bottom Deco" class="w-8 sm:w-6 mt-12">
    </div>
  </div>
</div>
{/if}

{#if invite.section_toggle.includes("bride-intro")}
<div class="relative flex flex-col items-center ">
  <div class="absolute inset-0 bg-black/15 z-[5]"></div>

  <!-- Background image -->
  <img src="/bride.png" alt="Background" class="w-full h-full object-cover block">
  <img src="/snow.gif" alt="Overlay" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10">

  <!-- Overlay Content -->
  <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-3 px-4  fade-in">
    
    <img src="/deco3.png" alt="Top Deco" class="w-8 sm:w-10 mb-12 opacity-90">

    <div class="flex items-center space-x-4 mb-4">
      <img src="/deco1.png" alt="Left Deco" class="w-10 sm:w-14">
      <h4 class="font-smallcaption uppercase text-xs sm:text-sm">THE BRIDE</h4>
      <img src="/deco2.png" alt="Right Deco" class="w-10 sm:w-14">
    </div>

    <!-- Name -->
    <h2 class="font-['Millionaire_Roman'] text-6xl sm:text-7xl md:text-8xl leading-none mt-0 mb-8">
      {invite.bride_name}
    </h2>

    <div class="flex flex-col items-center space-y-">
      <h4 class="font-smallcaption uppercase text-xs sm:text-sm">
       {invite.bride_parents}
      </h4>
      <img src="/deco4.png" alt="Bottom Deco" class="w-8 sm:w-6 mt-12">
    </div>
  </div>
</div>
{/if}
<!--End of Couple-->


<!-- Events -->

<div class="flex flex-col events-section min-h-[100dvh] items-center justify-center text-center px-8 sm:px-10 md:px-12 py-10 sm:py-12 md:py-14 text-white ">
  {#each events as event, index}
    <!-- Check if this event type should be shown based on section_toggle -->
    {#if invite.section_toggle.includes(event.event_type) || invite.section_toggle.includes("events")}
      <div class="mb-14 w-full fade-in" class:mb-12={index === events.length - 1}>
        
        <!-- Show "Event" label only for the first event -->
        {#if index === 0}
          <p class="font-smallcaption uppercase opacity-80 mb-6">Event</p>
        {/if}
        
        <!-- Dynamic Event Title -->
          
        <h2 class="font-h2 mb-3 capitalize">
          {event.event_type.replace('-', ' ')}
        </h2>
        <hr class="mb-6 border-t-2 border-white/50">
        
        <!-- Dynamic Date and Time -->
        <div class="">
          <p class="font-h3">
            {new Date(event.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
          <p class="font-h3 eventtime mb-6">
            {formatEventTimeRange(event.start_time, event.end_time)}
          </p>
        </div>
        
        <!-- Dynamic Location -->
        <p class="font-h3 sm:text-xl md:text-2xl mb-6">
          {event.location}
        </p>
        
        <!-- Dynamic Location Button -->
        <a  
          href="https://www.google.com/maps?q={encodeURIComponent(event.location)}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase"
        >
          + View Location
        </a>
      </div>
    {/if}
  {/each}
  
  <!-- Fallback: Show message if no events match section_toggle -->
  {#if events.length === 0 || !events.some(event => invite.section_toggle.includes(event.event_type))}
    <div class="w-full fade-in">
      <p class="font-smallcaption uppercase opacity-80 mb-6">Event</p>
      <h2 class="font-h2 mb-2">Coming Soon</h2>
      <hr class="mb-6">
      <p class="font-h3">Event details will be updated soon.</p>
    </div>
  {/if}
</div>

<!-- End of Events -->


{#if invite.section_toggle.includes("countdown")}
<!--Countdown-->
<div class="relative z-10 flex flex-col items-center justify-center text-center min-h-[100dvh] px-8 sm:px-6 space-y-8 sm:space-y-12 md:space-y-16 ">
  <h1 class="font-h2 text-white mb-10 sm:mb-14 md:mb-22 fade-in">Until Our Celebration</h1>
  {#if images.length > 0}
    <img
      src={images[currentIndex]}
      alt="Countdown slideshow"
      class="mb-10 max-h-[35vh] sm:max-h-[40vh] md:max-h-[50vh] w-auto max-w-[80%] sm:max-w-[70%] md:max-w-[60%] object-contain mx-auto transition-opacity duration-700"
    />
  {:else}
    <p class="font-smallcaption text-white">Loading images...</p>
  {/if}
<div class="flex justify-center mb-12 fade-in">
  <div class="grid grid-cols-4 gap-6 text-center justify-center items-center">
    <!-- Days -->
    <div class="flex flex-col items-center">
      
        <div class="font-h2 countdown leading-none mb-4 sm:mb-5 md:mb-6 text-white" >{days}</div>
      
      <div class="font-smallcaption font-bold uppercase opacity-90 text-white text-xs sm:text-sm">Days</div>
    </div>

    <!-- Hours -->
    <div class="flex flex-col items-center">
      
        <div class="font-h2 countdown leading-none mb-4 sm:mb-5 md:mb-6 text-white">{hours.toString().padStart(2, '0')}</div>
      
      <div class="font-smallcaption font-bold uppercase opacity-90 text-white text-xs sm:text-sm">Hours</div>
    </div>

    <!-- Minutes -->
    <div class="flex flex-col items-center">
      
        <div class="font-h2 countdown leading-none mb-4 sm:mb-5 md:mb-6 text-white">{minutes.toString().padStart(2, '0')}</div>
      
      <div class="font-smallcaption font-bold uppercase opacity-90 text-white text-xs sm:text-sm">Mins</div>
    </div>

    <!-- Seconds -->
    <div class="flex flex-col items-center">
      
        <div class="font-h2 countdown leading-none mb-4 sm:mb-5 md:mb-6 text-white">{seconds.toString().padStart(2, '0')}</div>
      
      <div class="font-smallcaption font-bold uppercase opacity-90 text-white text-xs sm:text-sm">Secs</div>
    </div>
  </div>
</div>
  <a
    href={calendarUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="inline-block font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase"
  >
    + Save the Date
  </a>
</div>
<!--End of Countdown-->
{/if}


<!-- RSVP -->
<div class="">  


  <PersonalRsvp 
  guestSlug={$page.params.guestSlug} 
  guest={data.guest}
  invite={data.invite}
/>
   
 
</div>
<!-- End of RSVP -->



<!-- Wishes -->
 {#if invite.section_toggle.includes("wishes")}
<div class="relative w-full min-h-[100dvh] wishes-section overflow-hidden ">
  <div class="fade-in">
  <Wishes />
</div>
</div>
{/if}
<!-- End of Wishes -->



<!-- Dress Code -->
  {#if invite.section_toggle.includes("dress-code")}
<div class="relative w-full min-h-[100dvh] z-10 flex flex-col items-center justify-center text-center px-6  overflow-hidden ">
  <div class="fade-in">
 
  <!-- Content overlay -->
  <div class="  text-white ">
     <p class="font-smallcaption uppercase opacity-80 mb-6">WHAT TO WEAR</p>
    <!-- <h1 class="font-h2 mb-3">Dress Code</h1> -->

    <p class="font-h2 text-white mb-6">
      We kindly request our guests to wear these colors for our special day.
    </p>

    <!-- Swatches -->
    <div class="flex justify-center space-x-4 pt-2 mb-12">
      {#each colorSwatches as color}
        <div
          class="w-10 h-10 rounded-full shadow-lg"
          style="background-color: {color}"
        />
      {/each}
    </div>
    </div>
    </div>
    <a 
        href="https://www.instagram.com/reel/DMAlgiSTamH/?igsh=MWwya2NxMnB6bTB4dw=="
        target="_blank"
        rel="noopener noreferrer"
        class="border font-button uppercase border-white px-8 py-4 rounded text-white hover:bg-white hover:text-black transition"
      >
        View Inspiration
      </a>
  

</div>
{/if}
<!-- End of Dress Code -->

<!-- Rundown -->
<div class="relative w-full min-h-[100dvh] overflow-hidden ">
  <div class="fade-in">
    <div class="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center text-center text-white px-6 space-y-8">
      <p class="font-smallcaption uppercase opacity-80 mb-6">EVENT RUNDOWN</p>
      <h1 class="font-h2 text-white mb-12">See everything we've got planned for you.<br><br>View our full event rundown below</h1>
      
      <a 
        href="https://www.notion.so/Wedding-FAQ-152f5ed90e1447c89e5a76be413f07c7?source=copy_link"
        target="_blank"
        rel="noopener noreferrer"
        class="border font-button uppercase border-white px-8 py-4 rounded text-white hover:bg-white hover:text-black transition"
      >
        View FAQ
      </a>
    </div>
  </div>
</div>

<!-- Our Moments -->
  {#if invite.section_toggle.includes("our-moments")}
<div class="relative z-10 flex flex-col items-center justify-center text-center h-[100dvh] px-4 sm:px-6 space-y-6 sm:space-y-8 text-white ">
  <div class="fade-in">
    
  <h1 class="font-['Millionaire_Script'] text-3xl sm:text-4xl md:text-5xl mb-10 sm:mb-14 md:mb-22" style="color: #FAFAEF;">Our Moments</h1>
<div class="flex flex-col items-center justify-center w-full mx-auto my-6 sm:my-8 md:my-10 px-4 z-10">
    
      <div 
    on:touchstart={handleTouchStart} 
    on:touchend={handleTouchEnd} 
    class="relative w-full max-w-[280px] sm:max-w-xs aspect-[4/5] overflow-hidden"
  >
    {#each images as img, i}
      <img
        src={img}
        alt="carousel"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        class:opacity-100={i === currentIndex1}
        class:opacity-0={i !== currentIndex1}
      />
    {/each}
  </div>
</div>
</div>
</div>
{/if}
<!-- End of Our Moments -->




 {#if invite.section_toggle.includes("wedding-gift")}
<!-- Wedding Gift-->
  <div class="relative z-10 flex flex-col items-center justify-center text-center h-[100dvh] px-4 sm:px-6 space-y-6 sm:space-y-8 text-white  fade-in">
    <p class="font-smallcaption uppercase opacity-80 mb-6">WEDDING GIFT</p>
  <h1 class="font-h2">A Token of Love</h1>

  <h4 class="font-h3 eventtime leading-3 mb-8">For those who wish to offer us a gift of love, <br><br> please find the account details below: </h4>
    
      <button
        on:click={() => (showAccount = !showAccount)}
        class={`inline-block mt-4 px-8 py-4 uppercase text-xs sm:text-sm rounded font-button tracking-[0.15em] transition duration-300 ease-in-out 
          ${showAccount 
            ? 'bg-white border-transparent' 
            : 'bg-transparent text-white border border-white hover:bg-white hover:text-black'}`}
        style={showAccount ? 'color: #000000 !important;' : ''}
      >
        {showAccount ? "- HIDE ACCOUNT" : "+ VIEW ACCOUNT"}
      </button>

            {#if showAccount}
  <div class=" px-4 sm:px-6 py-6 text-white text-center w-full max-w-sm mx-auto">
   

     <!-- Groom Account -->
    <div class="mb-5 border-t border-white/20 pt-4 text-left space-y-1">
      <div class="flex justify-between items-center">
        <div>
          <p class="font-smallcaption !opacity-100 !text-white uppercase">{couple?.groom_bank_name|| '-'}</p>
          <p class="font-button uppercase">Bank:{couple?.groom_bank || '-'}</p>
          <p class="font-h2 tracking-wider mt-2 opacity-90">{couple?.groom_bank_number || '-'}</p>
        </div>
        <button
          on:click={() => copyAccountNumber(couple.groom_bank_number)}
          class="font-button font-bold uppercase border text-center border-white px-4 py-2 rounded-full hover:bg-white hover:text-black transition"
        > {#if copiedAccounts[couple.groom_bank_number]}
        ✓
      {:else}
        Copy
      {/if}
    </button>
      </div>
    </div>

    <!-- Bride Account -->
    <div class="border-t border-white/20 pt-4 text-left space-y-1">
      <div class="flex justify-between items-center">
        <div>
          <p class="font-smallcaption !opacity-100 !text-white uppercase">{couple?.bride_bank_name || '-'}</p>
          <p class="font-smallcaption !opacity-100 !text-white uppercase">Bank:{couple?.bride_bank || '-'}</p>
          <p class="font-h2 tracking-wider mt-2 opacity-90">{couple?.bride_bank_number || '-'}</p>
        </div>
        <button
          on:click={() => copyAccountNumber(couple.bride_bank_number)}
          class="font-button font-bold uppercase border text-center border-white px-4 py-2 rounded-full hover:bg-white hover:text-black transition"
        >
          {#if copiedAccounts[couple.bride_bank_number]}
        ✓
      {:else}
        Copy
      {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

</div>
<!--End of Wedding Gift-->
{/if}

 {#if invite.section_toggle.includes("thank-you")}
<!--Thank you-->
 <div class="relative flex flex-col items-center w-full h-[100dvh] fade-in">
  <div class="absolute inset-0 bg-black opacity-0 z-[5] transition-opacity duration-1000 ease-in"></div>
  
  <div class="absolute inset-0 flex flex-col items-center text-center text-white z-10 p-6 sm:p-8 md:p-10">
    <!-- Centered content -->
    <div class="flex-1 flex flex-col items-center justify-center space-y-3 sm:space-y-4">
      <p class="font-smallcaption uppercase opacity-80 mb-6">A Big Thank You</p>
      <h1 class="font-h2 mb-6">See You Soon!</h1>
      <h4 class="font-h3 eventtime">
        {@html (couple?.thank_you || '-').replace(/\n/g, '<br><br>')}
      </h4>
    </div>

    <!-- Bottom "With Love" -->
    <div class="absolute bottom-12 flex flex-col items-center space-y-0.5">
      <p class="font-smallcaption uppercase">Invites From</p>
      <a 
        href="https://startswithlove.com" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="with-love opacity-90 !text-white uppercase  hover:text-gray-300 transition"
      >
        STARTSWITHLOVE.COM
      </a>
    </div>
  </div>
</div>
  {/if}
</div>