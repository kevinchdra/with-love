<script>
  // ─── Imports ──────────────────────────────────────────────────────────────
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import RsvpDemo from '../../../components/rsvp-demo.svelte'; // <-- NEW
  import LottieClientOnly from '../../../components/LottieClientOnly.svelte';
  import arrowDown from '$lib/lottie/arrowDown.json';
  import LoadingScreen from '../../../components/LoadingScreen.svelte';
  import WishesDemo from '../../../components/wishes-demo.svelte'; // <-- NEW
  import { tick } from 'svelte';

  // ─── Props ────────────────────────────────────────────────────────────────
  export let data;
  export let eventDate = '2025-12-31T23:59:59'; // Format: YYYY-MM-DDTHH:MM:SS
 

  // ─── State Variables ──────────────────────────────────────────────────────

  let showAccount = false;
  let clicked = false;

  let audio;

   let copiedAccounts = {}; // store which account numbers have been copied

  // ─── Google Maps Integration ──────────────────────────────────────────────
  const mapsUrl = "https://www.google.com/maps?q=Hotel+Mulia+Senayan,+Jakarta";

  // ─── Google Calendar Integration ─────────────────────────────────────────
  const eventTitle = "Eddy & VaneonMssa's Sangjit Ceremony";
  const location = "Jakarta, Indonesia";
  const startDateTime = new Date("2025-08-18T11:30:00+07:00");
  const endDateTime = new Date("2025-08-18T15:00:00+07:00");

  function toGoogleCalendarDate(date) {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  }

  const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${toGoogleCalendarDate(startDateTime)}/${toGoogleCalendarDate(endDateTime)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;

  // ─── Carousel with Swipe + Pause ─────────────────────────────────────────
  let images = ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg", "/7.jpg", "/8.jpg", "/9.jpg"];
  let currentIndex1 = 0;
  let currentIndex2 = 1;

  let interval1;
  let interval2;
  let resumeTimeout;
  let startX = 0;

  function startAutoSlide() {
    clearInterval(interval1);
    interval1 = setInterval(() => {
      currentIndex1 = (currentIndex1 + 1) % images.length;
    }, 2427);
  }

  function startSecondSlide() {
    clearInterval(interval2);
    interval2 = setInterval(() => {
      currentIndex2 = (currentIndex2 + 1) % images.length;
    }, 3000);
  }

  function handleTouchStart(event) {
    startX = event.touches[0].clientX;
  }

  function handleTouchEnd(event) {
    const endX = event.changedTouches[0].clientX;
    const deltaX = endX - startX;

    if (Math.abs(deltaX) > 50) {
      clearInterval(interval1);
      clearTimeout(resumeTimeout);

      if (deltaX > 0) {
        currentIndex1 = (currentIndex1 - 1 + images.length) % images.length;
      } else {
        currentIndex1 = (currentIndex1 + 1) % images.length;
      }

      resumeTimeout = setTimeout(() => {
        startAutoSlide();
      }, 4000); // Resume after 4 seconds
    }
  }

  onMount(() => {
    startAutoSlide();
    startSecondSlide();
  });

  onDestroy(() => {
    clearInterval(interval1);
    clearInterval(interval2);
    clearTimeout(resumeTimeout);
  });

  // ─── Countdown Timer ──────────────────────────────────────────────────────
  let days = 0;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let intervalTime;

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
  });

  onDestroy(() => {
    clearInterval(intervalTime);
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
  const colorSwatches = [
    '#945C4E', // muted maroon
    '#A5B8B1', // sage blue
    '#F7EBD3', // cream
    '#D8C5A2', // beige
    '#666E5B', // deep olive
  ];

  const demoTemplateData = {
  couple: {
    groomName: "Eddie Cheng",
    brideName: "Vania Halim",
    groomParents: "Gary Cheng & Gracia Lee",
    brideParents: "Ken Halim & Jenna Chung"
  },
  event: {
    date: "2026-08-08",
    time: "11:00:00",
    venue: "The Grand Ballroom",
    location: "Hotel Mulia Senayan, Jakarta",
    timezone: "+07:00"
  },
  theme: {
    primaryColor: "#FAFAEF",
    secondaryColor: "#945C4E",
    fontFamily: {
      primary: "Millionaire_Script",
      secondary: "Snell_Roundhand"
    }
  }
};

const demoInvite = {
  id: 'demo-id',
  slug: 'demo-slug',
  name: 'Dear Guest',
  eventDate: '2026-08-08T11:00:00+07:00',
  templateData: demoTemplateData
};
  

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

<LoadingScreen />
<slot />


<div class="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth  ">
<!--Landing Page-->
<div class="relative w-full min-h-screen overflow-hidden snap-start pb-[env(safe-area-inset-bottom)]
">
  <!-- Background image -->
   
 <video
    class="fixed top-0 left-0 w-full h-full object-cover z-[-1]"
    style="object-position: 65%;"
    autoplay
    muted
    loop
    playsinline
  > <source src="/prewed.webm" type="video/webm" />
    Your browser does not support the video tag.
  </video>

  <!-- Dark overlay -->
  <div class="fixed top-0 left-0 w-full h-full bg-black/50 z-[-1]"></div>

  <!--Introduction-->
  <div class="relative z-10 flex flex-col items-center justify-center text-center min-h-screen px-4 sm:px-6 gap-20 snap-start fade-in">


    <p class="font-['Millionaire_Script'] text-base sm:text-lg md:text-xl tracking-[2px] sm:tracking-[4px] text-white ">
      Dear<br/>Guest,
    </p>

    <div class="flex flex-col items-center justify-center gap-6 sm:gap-8 md:gap-10" >
      <p class="font-['Jaquel_Regular'] uppercase tracking-[0.35em] sm:tracking-[0.30em] md:tracking-[0.25em] opacity-90 text-white text-[10px] sm:text-[12px]">We Invite You To Celebrate</p>
        <h1 class="font-['Snell_Roundhand'] text-6xl sm:text-7xl md:text-8xl leading-none text-white">
        Eddie <span class="font-['Snell_Roundhand']">& </span>Vania
        </h1>

      <p class="font-['Jaquel_Regular'] uppercase tracking-[0.35em] sm:tracking-[0.30em] md:tracking-[0.25em] opacity-90 text-white text-[10px] sm:text-[12px]">Sunday, 08 August 2026</p>
    </div>

    <button
       on:click={unlockScrollAndScrollDown}
      class="font-caption tracking-[0.15em] sm:tracking-[0.22em] px-4 sm:px-6 py-2 border border-white rounded-full hover:bg-white hover:text-black transition text-xs sm:text-sm"    >
      JOIN THE CELEBRATION
    </button>
  </div>
</div>
<!--End of Introduction-->

<!--Devotions-->
<div id="devotions" class="relative z-10 flex flex-col items-center justify-center text-center min-h-screen px-4 sm:px-6 space-y-8 sm:space-y-12 snap-start"> 
      <img src="/cross.png" alt="cross" class="w-4 h-5 sm:w-3 sm:h-4 object-fill opacity-80 fade-in ">
      <h1 class="font-['Millionaire_Roman'] text-2xl sm:text-3xl md:text-4xl mt-0 mb-4 sm:mb-6 md:mb-8 px-4 fade-in " style="color: #FAFAEF;">I have found the one whom my soul loves.</h1>
      <p class="font-caption font-bold uppercase tracking-[1em] sm:tracking-[1.5em] md:tracking-[2em] opacity-90 text-xs sm:text-sm fade-in " style="color: #FAFAEF;">SONG OF SOLOMON 3:4</p>
    <div class="absolute bottom-40 left-1/2 -translate-x-1/2 w-20 h-20 flex justify-center items-center fade-in ">
      <div class="scale-50 opacity-80">
        <LottieClientOnly {arrowDown} />
      </div>
    </div>
  
</div>
<!--End of Devotions-->

<!--Couple-->
<div class="relative flex flex-col items-center snap-start">
  <div class="absolute inset-0 bg-black/15 z-[5]"></div>

  <!-- Background image -->
  <img src="/groom.png" alt="Background" class="w-full h-full object-cover block">
  <img src="/snow.gif" alt="Overlay" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10">

  <!-- Overlay Content -->
  <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-3 px-4 fade-in">
    
    <img src="/deco3.png" alt="Top Deco" class="w-8 sm:w-10 mb-12 opacity-90">

    <div class="flex items-center space-x-4 mb-4">
      <img src="/deco1.png" alt="Left Deco" class="w-10 sm:w-14">
      <h4 class="font-caption uppercase text-xs sm:text-sm">THE GROOM</h4>
      <img src="/deco2.png" alt="Right Deco" class="w-10 sm:w-14">
    </div>

    <!-- Name -->
    <h2 class="font-['Millionaire_Roman'] text-6xl sm:text-7xl md:text-8xl leading-none mt-0 mb-8">
      Eddie Cheng
    </h2>

    <div class="flex flex-col items-center space-y-">
      <h4 class="font-caption uppercase text-xs sm:text-sm">
        SON OF GARY CHENG & GRACIA LEE
      </h4>
      <img src="/deco4.png" alt="Bottom Deco" class="w-8 sm:w-6 mt-12">
    </div>
  </div>
</div>


<div class="relative flex flex-col items-center snap-start">
  <div class="absolute inset-0 bg-black/15 z-[5]"></div>

  <!-- Background image -->
  <img src="/bride.png" alt="Background" class="w-full h-full object-cover block">
  <img src="/snow.gif" alt="Overlay" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10">

  <!-- Overlay Content -->
  <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-3 px-4  fade-in">
    
    <img src="/deco3.png" alt="Top Deco" class="w-8 sm:w-10 mb-12 opacity-90">

    <div class="flex items-center space-x-4 mb-4">
      <img src="/deco1.png" alt="Left Deco" class="w-10 sm:w-14">
      <h4 class="font-caption uppercase text-xs sm:text-sm">THE BRIDE</h4>
      <img src="/deco2.png" alt="Right Deco" class="w-10 sm:w-14">
    </div>

    <!-- Name -->
    <h2 class="font-['Millionaire_Roman'] text-6xl sm:text-7xl md:text-8xl leading-none mt-0 mb-8">
      Vania Halim
    </h2>

    <div class="flex flex-col items-center space-y-">
      <h4 class="font-caption uppercase text-xs sm:text-sm">
        DAUGHTER OF KEN HALIM & JENNA CHUNG
      </h4>
      <img src="/deco4.png" alt="Bottom Deco" class="w-8 sm:w-6 mt-12">
    </div>
  </div>
</div>
<!--End of Couple-->

<!-- Events -->
<div class="flex flex-col items-start justify-center text-left px-8 sm:px-10 md:px-12 py-10 sm:py-12 md:py-14 space-y-6 sm:space-y-8 md:space-y-10 bg-transparent text-white snap-start">
  <!-- Holy Matrimony -->
  <div class="space-y-4 sm:space-y-6 md:space-y-8 w-full fade-in">
    <p class="uppercase text-xs sm:text-[8px] mb-8 font-caption opacity-80">Event</p>
    <h2 class="text-3xl sm:text-4xl md:text-5xl font-['Sangbleu_King']">Holy Matrimony</h2>
    <hr class="mt-[-6px] sm:mt-[-8px] md:mt-[-10px]">
      <div class="">
        <p class="text-lg sm:text-xl md:text-2xl font-['Sangbleu_Regular']">Sunday, 8 August 2026</p>
        <p class="text-lg sm:text-xl md:text-2xl font-['Sangbleu_Light']">11.00 AM - 13.00 PM</p>
      </div>
    <p class="text-lg sm:text-xl md:text-2xl font-['Sangbleu_Regular']">
      The Grand Ballroom<br />
      Hotel Mulia Senayan, Jakarta
    </p>

    <!-- Location Button -->
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-block mt-4 mb-12 px-6 sm:px-8 py-3 uppercase border border-white text-white text-xs sm:text-sm  font-caption tracking-[0.15em] sm:tracking-[0.2em] hover:bg-white hover:text-black transition"
    >
      + View Location
    </a>
  </div>

  <!-- Wedding Reception -->
  <div class="space-y-4 sm:space-y-6 md:space-y-8 w-full fade-in">
    <h2 class="text-3xl sm:text-4xl md:text-5xl font-['Sangbleu_King']">Wedding Reception</h2>
    <hr class="mt-[-6px] sm:mt-[-8px] md:mt-[-10px]">
    <div class="">
      <p class="text-lg sm:text-xl md:text-2xl font-['Sangbleu_Regular']">Sunday, 8 August 2026</p>
      <p class="text-lg sm:text-xl md:text-2xl font-['Sangbleu_Light']">11.00 AM - 13.00 PM</p>
    </div>
    <p class="text-lg sm:text-xl md:text-2xl font-['Sangbleu_Regular']">
      The Grand Ballroom<br />
      Hotel Mulia Senayan, Jakarta
    </p>

    <!-- Location Button -->
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-block mt-4 mb-12 px-6 sm:px-8 py-3 uppercase border border-white text-white text-xs sm:text-sm  font-caption tracking-[0.15em] sm:tracking-[0.2em] hover:bg-white hover:text-black transition"
    >
      + View Location
    </a>
  </div>
</div>
<!-- End of Events -->

<!--Countdown-->
<div class="relative z-10 flex flex-col items-center justify-center text-center min-h-screen px-8 sm:px-6 space-y-8 sm:space-y-12 md:space-y-16 snap-start">
  
  <img src="/1.jpg" alt="First image1" class="max-h-[35vh] sm:max-h-[40vh] md:max-h-[50vh] w-auto max-w-[80%] sm:max-w-[70%] md:max-w-[60%] object-contain mx-auto">
  <h1 class="font-['Millionaire_Script'] text-3xl sm:text-4xl md:text-5xl mb-10 sm:mb-14 md:mb-22 fade-in" style="color: #FAFAEF;">Until Our Celebration</h1>
<div class="flex justify-center fade-in">
  <div class="grid grid-cols-4 gap-6 sm:gap-7 md:gap-8 text-center justify-center items-center">
    <!-- Days -->
    <div class="flex flex-col items-center">
      
        <div class="font-['Millionaire_Roman'] text-3xl sm:text-4xl md:text-5xl leading-none mb-4 sm:mb-5 md:mb-6 text-white" >{days}</div>
      
      <div class="font-caption font-bold uppercase tracking-[0.4em] sm:tracking-[0.6em] md:tracking-[0.8em] opacity-90 text-white text-xs sm:text-sm">Days</div>
    </div>

    <!-- Hours -->
    <div class="flex flex-col items-center">
      
        <div class="font-['Millionaire_Roman'] text-3xl sm:text-4xl md:text-5xl leading-none mb-4 sm:mb-5 md:mb-6 text-white">{hours.toString().padStart(2, '0')}</div>
      
      <div class="font-caption font-bold uppercase tracking-[0.4em] sm:tracking-[0.6em] md:tracking-[0.8em] opacity-90 text-white text-xs sm:text-sm">Hours</div>
    </div>

    <!-- Minutes -->
    <div class="flex flex-col items-center">
      
        <div class="font-['Millionaire_Roman'] text-3xl sm:text-4xl md:text-5xl leading-none mb-4 sm:mb-5 md:mb-6 text-white">{minutes.toString().padStart(2, '0')}</div>
      
      <div class="font-caption font-bold uppercase tracking-[0.4em] sm:tracking-[0.6em] md:tracking-[0.8em] opacity-90 text-white text-xs sm:text-sm">Mins</div>
    </div>

    <!-- Seconds -->
    <div class="flex flex-col items-center">
      
        <div class="font-['Millionaire_Roman'] text-3xl sm:text-4xl md:text-5xl leading-none mb-4 sm:mb-5 md:mb-6 text-white">{seconds.toString().padStart(2, '0')}</div>
      
      <div class="font-caption font-bold uppercase tracking-[0.4em] sm:tracking-[0.6em] md:tracking-[0.8em] opacity-90 text-white text-xs sm:text-sm">Secs</div>
    </div>
  </div>
</div>
  <a
    href={calendarUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="inline-block mt-4 px-4 sm:px-6 py-2 uppercase border border-white text-white text-xs sm:text-sm rounded-full font-caption tracking-[0.15em] sm:tracking-[0.2em] hover:bg-white hover:text-black transition"
  >
    + Save the Date
  </a>
</div>
<!--End of Countdown-->



<!-- RSVP -->
<div class="relative w-full min-h-screen snap-start">  

      <div class="relative w-full min-h-screen snap-start">  
  <RsvpDemo 
    invite={demoInvite}
    isDemo={true}
  />
</div>

   
</div>
<!-- End of RSVP -->



<!-- Wishes -->
<div class="relative w-full min-h-screen overflow-hidden snap-start">
  <div class="fade-in">
    <WishesDemo
      invite={demoInvite}
      isDemo={true}
    />
  </div>
</div>
<!-- End of Wishes -->



<!-- Dress Code -->
<div class="relative w-full min-h-screen overflow-hidden snap-start">
  <div class="fade-in">
  
  <!-- Content overlay -->
  <div class="relative z-10 min-h-screen flex flex-col items-center justify-center text-center text-white px-6 space-y-8">
    <h1 class="font-['Millionaire_Script'] text-3xl sm:text-4xl md:text-5xl mb-10 sm:mb-14 md:mb-22" style="color: #FAFAEF;">Dress Code</h1>
    <p class="font-caption uppercase text-xs sm:text-sm leading-relaxed">
      We kindly request our guests <br> to wear these colors for <br> our special day, in the theme of "Garden Party Formal"
    </p>

    <!-- Swatches -->
    <div class="flex justify-center space-x-4 pt-2">
      {#each colorSwatches as color}
        <div
          class="w-10 h-10 rounded-full shadow-lg"
          style="background-color: {color}"
        />
      {/each}
    </div>
  </div>
</div>
</div>
<!-- End of Dress Code -->



<!-- Our Moments -->
<div class="relative z-10 flex flex-col items-center justify-center text-center h-screen px-4 sm:px-6 space-y-6 sm:space-y-8 snap-start">
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
<!-- End of Our Moments -->





<!-- Wedding Gift-->
  <div class="relative z-10 flex flex-col items-center justify-center text-center h-screen px-4 sm:px-6 space-y-6 sm:space-y-8 snap-start  fade-in">
  <h1 class="font-['Millionaire_Script'] text-3xl sm:text-4xl md:text-5xl mb-10 sm:mb-14 md:mb-22" style="color: #FAFAEF;">A Token of Love</h1>
  <h4 class="font-caption uppercase text-xs sm:text-sm px-2">FOR GUESTS WHO WOULD LIKE TO OFFER A GIFT OF LOVE TO THE COUPLE, <br><br> PLEASE FIND THE ACCOUNT BELOW: </h4>
    
      <button
        on:click={() => (showAccount = !showAccount)}
        class={`inline-block mt-4 px-4 sm:px-6 py-2 uppercase text-xs sm:text-sm rounded-full font-caption tracking-[0.15em] sm:tracking-[0.2em] transition duration-300 ease-in-out 
          ${showAccount 
            ? 'bg-white border-transparent' 
            : 'bg-transparent text-white border border-white hover:bg-white hover:text-black'}`}
        style={showAccount ? 'color: #000000 !important;' : ''}
      >
        {showAccount ? "- HIDE ACCOUNT" : "+ VIEW ACCOUNT"}
      </button>

            {#if showAccount}
  <div class="mt-6 px-4 sm:px-6 py-6 text-white text-center w-full max-w-sm mx-auto">
   

     <!-- Eddie -->
    <div class="mb-5 border-t border-white/20 pt-4 text-left space-y-1">
      <div class="flex justify-between items-center">
        <div>
          <p class="text-1xl font-caption font-bold uppercase tracking-wide">Eddie Cheng</p>
          <p class="font-caption uppercase">Bank: BCA</p>
          <p class="text-4xl font-['Sangbleu-King'] tracking-wider mt-2 opacity-90">0898812888</p>
        </div>
        <button
          on:click={() => copyAccountNumber('0898812888')}
          class="font-caption font-bold uppercase border text-center border-white px-4 py-2 hover:bg-white hover:text-black transition"
        > {#if copiedAccounts["0898812888"]}
        ✓
      {:else}
        Copy
      {/if}
    </button>
      </div>
    </div>

    <!-- Vania -->
    <div class="border-t border-white/20 pt-4 text-left space-y-1">
      <div class="flex justify-between items-center">
        <div>
          <p class="text-1xl font-caption font-bold uppercase tracking-wide">Vania Halim</p>
          <p class="font-caption uppercase">Bank: BCA</p>
          <p class="text-4xl font-['Sangbleu-King'] tracking-wider mt-2 opacity-90">0891288899</p>
        </div>
        <button
          on:click={() => copyAccountNumber('0891288899')}
          class="font-caption font-bold uppercase border text-center border-white px-4 py-2 hover:bg-white hover:text-black transition"
        >
          {#if copiedAccounts["0891288899"]}
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

<!--Thank you-->
  <div class="relative flex flex-col items-center snap-start w-full h-screen  fade-in">
      <div class="absolute inset-0 bg-black/50 z-[5]"></div>
      <img src="/thankyou.gif" alt="First image1" class="w-full h-full object-cover">
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-2 sm:space-y-3 p-6 sm:p-8 md:p-10">
        <h1 class="font-['Millionaire_Script'] text-3xl sm:text-4xl md:text-5xl mb-10 sm:mb-14 md:mb-22" style="color: #FAFAEF;">Thank You</h1>
        <h4 class="font-caption uppercase text-xs sm:text-sm leading-relaxed">WE ARE DEEPLY HONORED AND GRATEFUL FOR YOUR SUPPORT AND PRESENCE. <br><br> YOUR SUPPORT AND KIND WISHES MEAN THE WORLD TO US. WE CAN'T WAIT TO SEE YOU AND CELEBRATE LOVE, TOGETHER. <br><br>LOVE, ED & VAN</h4>
      </div>
  </div>
</div>