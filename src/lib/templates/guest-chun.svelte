<!--guest-chun-->

<script>
  // ─── Imports ──────────────────────────────────────────────────────────────
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import PersonalRsvp from '$lib/components/chun/personalrsvp-chun.svelte';
  import LottieClientOnly from '$lib/components/LottieClientOnly.svelte';
  import arrowDown from '$lib/lottie/arrowDown.json';
  import Wishes from '$lib/components/chun/wishes-chun.svelte';
  import { tick } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { fade } from 'svelte/transition';
  import Lenis from '@studio-freight/lenis';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import Parallax from '$lib/components/chun/Parallax.svelte'


   gsap.registerPlugin(ScrollTrigger)

  // ─── Props ────────────────────────────────────────────────────────────────
  export let data;

  if (!data || !data.guest || !data.invite) {
    throw new Error("Missing guest or invite data");
  }

  const invite = data.invite;
  const guest = data.guest;
  const events = data.events || [];
  const couple = data.couple;

  const primaryEvent = events.length > 0 ? events[0] : null;
  $: eventDateObj = primaryEvent ? 
    new Date(`${primaryEvent.event_date}T${primaryEvent.start_time || '00:00'}${getTimezoneOffset(primaryEvent.timezone || 'Asia/Makassar')}`) : 
    new Date(invite.event_date + 'T00:00:00+08:00');
    
  $: clientSlug = $page.params.clientSlug;
  $: guestSlug = $page.params.guestSlug;

  // ─── Loading State Management ─────────────────────────────────────────────
  let isLoading = true;
  let loadingProgress = 0;
  let loadingStatus = 'Initializing...';

  let showAccount = true;
  let clicked = false;

  let copiedAccounts = {}; // store which account numbers have been copied

  // ─── Google Maps Integration ──────────────────────────────────────────────
  const mapsUrl = "https://www.google.com/maps?q=Hotel+Mulia+Senayan,+Jakarta";

  // ─── Font Preloading ──────────────────────────────────────────────────────
  const FONTS_TO_PRELOAD = [
    { family: 'SangBleu Regular', urls: ['/fonts/SangBleu-Regular.woff2', '/fonts/SangBleu-Regular.woff'] },
    { family: 'Snell Roundhand', urls: ['/fonts/SnellRoundhand.woff2', '/fonts/SnellRoundhand.woff'] },
    { family: 'DM Sans', urls: ['https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'] },
    // { family: 'Millionaire_Roman', urls: ['/fonts/Millionaire-Roman.woff2', '/fonts/Millionaire-Roman.woff'] },
    // { family: 'Millionaire_Script', urls: ['/fonts/Millionaire-Script.woff2', '/fonts/Millionaire-Script.woff'] },
    // { family: 'SangBleu Light', urls: ['/fonts/SangBleu-Light.woff2', '/fonts/SangBleu-Light.woff'] }
  ];

  // ─── Static Images to Preload ─────────────────────────────────────────────
  const STATIC_IMAGES = [
    '/cross.png',
  ];

  // ─── Preloading Functions ─────────────────────────────────────────────────
  function preloadFont(fontConfig) {
    return Promise.all(
      fontConfig.urls.map(url => {
        if (url.includes('googleapis.com')) {
          // For Google Fonts, just create a link element
          return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = url;
            link.onload = () => resolve();
            link.onerror = () => resolve(); // Don't fail if Google Fonts fails
            document.head.appendChild(link);
          });
        } else {
          // For local fonts, use FontFace API
          return new Promise((resolve, reject) => {
            const font = new FontFace(fontConfig.family, `url(${url})`);
            font.load().then(() => {
              document.fonts.add(font);
              resolve();
            }).catch(() => {
              // Try next URL or resolve anyway
              resolve();
            });
          });
        }
      })
    );
  }

  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  function preloadVideo(src) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadeddata = () => resolve(src);
      video.onerror = () => reject(new Error(`Failed to load video: ${src}`));
      video.src = src;
      video.load();
    });
  }

 

  async function preloadAllAssets() {
  const totalSteps = 2; // Only fonts and video now
  let currentStep = 0;

  try {
    // Step 1: Preload Fonts
    loadingStatus = 'Celebrating Love';
    loadingProgress = (currentStep / totalSteps) * 100;
    
    await Promise.allSettled(
      FONTS_TO_PRELOAD.map(font => preloadFont(font))
    );
    
    currentStep++;
    loadingProgress = (currentStep / totalSteps) * 100;

    // Step 2: Preload Video
    loadingStatus = 'Celebrating Together';
    
    await loadSupabaseVideo();
    
    currentStep++;
    loadingProgress = 100;

    // Small delay to show completion
    await new Promise(resolve => setTimeout(resolve, 500));
    
    loadingStatus = 'Complete!';
    isLoading = false;

    // Load images in background AFTER loading screen is done (non-blocking)
    setTimeout(() => {
      loadSupabaseImages(); // No await - runs in background
    }, 100);

  } catch (error) {
    console.error('Error during preloading:', error);
    // Still proceed even if some assets fail
    isLoading = false;
    
    // Still try to load images in background even if other preloading failed
    setTimeout(() => {
      loadSupabaseImages();
    }, 100);
  }
}



  // ─── Improved Google Calendar Integration ─────────────────────────────────
  
  /**
   * Converts a Date object to Google Calendar format (YYYYMMDDTHHMMSSZ)
   */
  function toGoogleCalendarDate(date) {
    if (!date || isNaN(date.getTime())) {
      console.error('Invalid date provided to toGoogleCalendarDate:', date);
      return '';
    }
    return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  }

  //Parse Wedding Gift Note
  function parseFormatting(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
      .replace(/\*(.*?)\*/g, '<em>$1</em>');             // *italic*
  }

  $: formattedGiftNote = parseFormatting(couple.wedding_gift_note);

  /**
 * Creates a Google Calendar URL for a single event with proper timezone handling
 */
function createCalendarUrl(event) {
  try {
    if (!event?.event_date || !event?.start_time) {
      console.error('Event missing required date/time:', event);
      return null;
    }

    const eventTitle = invite.event_title;
    const location = event.location || '';
    const timezone = event.timezone || 'Asia/Makassar';
    
    // Create proper Date objects in the specified timezone
    const createDateInTimezone = (dateStr, timeStr, tz) => {
      // Parse the date and time
      const [year, month, day] = dateStr.split('-');
      const [hour, minute] = timeStr.split(':');
      
      // Create date string in ISO format for the specified timezone
      const timezoneOffset = getTimezoneOffset(tz);
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:00${timezoneOffset}`;
      
      return new Date(isoString);
    };

    const startDate = createDateInTimezone(event.event_date, event.start_time, timezone);
    
    // Handle end time
    let endDate;
    if (event.end_time) {
      endDate = createDateInTimezone(event.event_date, event.end_time, timezone);
    } else {
      // Default to 2 hours later if no end time specified
      endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    }

    // Convert to UTC and format for Google Calendar (YYYYMMDDTHHMMSSZ)
    const formatDateForCalendar = (date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '').replace('T', 'T').slice(0, -1) + 'Z';
    };

    const startDateTime = formatDateForCalendar(startDate);
    const endDateTime = formatDateForCalendar(endDate);

    // Build the Google Calendar URL without timezone parameter since we're using UTC
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams({
      text: eventTitle,
      dates: `${startDateTime}/${endDateTime}`,
      location: location,
      details: '',
      sf: 'true',
      output: 'xml'
    });

    const calendarUrl = `${baseUrl}&${params.toString()}`;
    console.log('Calendar URL generated:', calendarUrl);
    console.log('Event data:', { 
      date: event.event_date, 
      startTime: event.start_time, 
      endTime: event.end_time,
      timezone: timezone,
      startUTC: startDateTime,
      endUTC: endDateTime,
      startLocal: startDate.toISOString(),
      endLocal: endDate.toISOString()
    });
    
    return calendarUrl;

  } catch (error) {
    console.error('Error creating calendar URL for event:', event, error);
    return null;
  }
}

  /**
   * Get timezone offset string for common timezones
   */
  function getTimezoneOffset(timezone) {
    const timezoneMap = {
      'Asia/Makassar': '+08:00',    // WITA (Bali, Indonesia)
      'Asia/Jakarta': '+07:00',     // WIB (Jakarta, Indonesia)
      'Asia/Jayapura': '+09:00',    // WIT (Eastern Indonesia)
      'UTC': '+00:00',
      'America/New_York': '-05:00', // EST (winter) / -04:00 EDT (summer)
      'Europe/London': '+00:00',    // GMT (winter) / +01:00 BST (summer)
      'Asia/Kuala_Lumpur': '+08:00',
    };
    
    return timezoneMap[timezone] || '+08:00'; // Default to WITA
  }

  /**
   * Get timezone abbreviation for display
   */
  function getTimezoneAbbreviation(timezone) {
    const abbreviationMap = {
      'Asia/Makassar': 'WITA',
      'Asia/Jakarta': 'WIB',
      'Asia/Jayapura': 'WIT',
      'UTC': 'UTC',
      'America/New_York': 'EST',
      'Europe/London': 'GMT',
      'Asia/Kuala_Lumpur': 'MYT',
    };
    
    return abbreviationMap[timezone] || 'WITA'; // Default to WITA
  }

  // ─── Generate Calendar URLs for All Events ───────────────────────────────
  $: eventCalendarUrls = events.map(event => ({
    ...event,
    calendarUrl: createCalendarUrl(event)
  })).filter(event => event.calendarUrl); // Only keep events with valid URLs

  // ─── Primary Calendar URL (for main Save the Date button) ────────────────
  $: primaryCalendarUrl = eventCalendarUrls.length > 0 ? eventCalendarUrls[0].calendarUrl : null;

  let videoUrl = '';
  let posterUrl = '';

  let audio;
  let audioUrl = '';
  let audioStarted = false;

  // ─── Supabase Asset Loading ───────────────────────────────────────────────
  async function loadSupabaseVideo() {
  try {
    // Get video URL
    const { data: videoData, error: videoError } = supabase
      .storage
      .from('invites-images')
      .getPublicUrl(`${clientSlug}/video.webm`);

    if (videoError) {
      console.error('Error getting video public URL:', videoError);
    } else {
      videoUrl = videoData.publicUrl;
      console.log('Video URL:', videoUrl);
    }

    // Get poster URL  
    const { data: posterData, error: posterError } = supabase
      .storage
      .from('invites-images')
      .getPublicUrl(`${clientSlug}/video-poster.webp`);

    if (posterError) {
      console.warn('No poster image found:', posterError);
      // Poster is optional, so don't throw error
    } else {
      posterUrl = posterData.publicUrl;
      console.log('Poster URL:', posterUrl);
    }
    
    // Get audio URL
    const { data: audioData, error: audioError } = supabase
      .storage
      .from('invites-images')
      .getPublicUrl(`${clientSlug}/bgm.mp3`);

    if (audioError) {
      audioUrl = '/sailorsong-bgm.mp3';
    } else {
      audioUrl = audioData.publicUrl;
    }
    
    
    // Preload video (and poster if it exists)
    const promises = [];
    
    if (videoUrl) {
      promises.push(preloadVideo(videoUrl));
    }
    
    if (posterUrl) {
      promises.push(preloadImage(posterUrl)); // Preload poster as image
    }

    if (audioUrl && audioUrl !== '/sailorsong-bgm.mp3') {
      promises.push(preloadAudio(audioUrl));
    }
    
    
    await Promise.allSettled(promises);

     setTimeout(() => {
      if (audio && audioUrl) {
        audio.src = audioUrl;
        audio.loop = true;
        audio.muted = true; // Start muted for autoplay compliance
        audio.load();
      }
    }, 500);
    
  } catch (error) {
    console.error('Error loading video assets:', error);
    console.error('Error loading assets:', error);
    audioUrl = '/sailorsong-bgm.mp3';
    setTimeout(() => {
      if (audio && audioUrl) {
        audio.src = audioUrl;
        audio.loop = true;
        audio.muted = true;
        audio.load();
      }
    }, 500);
  }
}
  //Carousel for countdown
  let images = [];
  let currentIndex = 0;

async function loadSupabaseImages() {
  try {
    console.log('🖼️ Loading images in background...');
    
    const { data, error } = await supabase
      .storage
      .from('invites-images')
      .list(clientSlug, { limit: 100 });
      
    if (error) {
      console.error('Error listing images:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.warn(`No files found in folder: ${clientSlug}`);
      return;
    }
   
    // Only include numbered image files (1.jpg, 2.png, etc.) - exclude video-poster
    const sorted = data
      .filter(file => {
        // Must be an image file
        const isImage = /\.(jpe?g|png|webp)$/i.test(file.name);
        // Must start with a number (for carousel images)
        const startsWithNumber = /^\d+\./i.test(file.name);
        
        return isImage && startsWithNumber;
      })
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    console.log('Filtered carousel images:', sorted.map(f => f.name));

    const imageUrls = sorted.map(file => {
      const { data: publicData } = supabase
        .storage
        .from('invites-images')
        .getPublicUrl(`${clientSlug}/${file.name}`);
      return publicData.publicUrl;
    });

    console.log(`Found ${imageUrls.length} carousel images to load`);

    if (imageUrls.length === 0) return;

    // Initialize empty array
    let loadedImages = [];
    
    // Load first image quickly to start carousel
    try {
      const firstImage = await preloadImage(imageUrls[0]);
      loadedImages = [firstImage];
      images = loadedImages; // Trigger Svelte reactivity
      console.log('✅ First carousel image loaded, starting carousel');
      startCarousel();
    } catch (error) {
      console.warn('Failed to load first carousel image:', error);
    }

    // Load remaining images in background
    if (imageUrls.length > 1) {
      for (let i = 1; i < imageUrls.length; i++) {
        try {
          const loadedImage = await preloadImage(imageUrls[i]);
          loadedImages = [...loadedImages, loadedImage]; // Create new array
          images = loadedImages; // Trigger Svelte reactivity
          console.log(`✅ Loaded carousel image ${i + 1}/${imageUrls.length}`);
          
          // Small delay to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`Failed to load carousel image ${i + 1}:`, error);
        }
      }
    }

    console.log(`🎉 Finished loading ${images.length} total carousel images`);
    
  } catch (error) {
    console.error('Error loading Supabase images:', error);
  }
}

function preloadAudio(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => resolve(src);
    audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
    audio.src = src;
    audio.load();
  });
}


  function startCarousel() {
    setInterval(() => {
      currentIndex = (currentIndex + 1) % images.length;
    }, 1500); // change every 1.5s
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


function hideBrowserChrome() {
  // Scroll down by 1px to trigger browser UI hiding
  window.scrollTo(0, 1);
  
  // Alternative: Use smooth scroll
  // window.scrollTo({ top: 1, behavior: 'smooth' });
}

  onMount(async () => {
    setTimeout(hideBrowserChrome, 100)
  // Start preloading immediately
  await preloadAllAssets();
  

  updateCountdown();
  intervalTime = setInterval(updateCountdown, 1000);

  // ─── BGM Autoplay After Interaction ─────
  window.addEventListener('scroll', playAudio, { once: true });
  window.addEventListener('mousemove', playAudio, { once: true });
  window.addEventListener('click', playAudio, { once: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Intersection Observer for regular animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.5 }
  );

  // Lenis smooth scroll (keep your existing setup)
  const lenis = new Lenis({ smoothWheel: true, wheelMultiplier: 0.4,  lerp: 0.05})
  function raf(time) {
    lenis.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)

  const fadeElements = document.querySelectorAll('.fade-in');
  fadeElements.forEach(el => observer.observe(el));
});
  

  onDestroy(() => {
    clearInterval(intervalTime);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  // ─── Background Music Logic ───────────────────────────────────────────────
function fadeInAudio() {
  if (!audio) return;
  let volume = 0;
  audio.muted = false;
  audio.volume = 0;
  
  const fade = setInterval(() => {
    volume += 0.05;
    if (volume >= 1) {
      clearInterval(fade);
      volume = 1;
    }
    audio.volume = volume;
  }, 150);
}

function playAudio() {
  if (!audio || !audio.src || audioStarted) return;
  
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        fadeInAudio();
        audioStarted = true;
        // Only remove listeners after successful play
        window.removeEventListener("scroll", playAudio);
        window.removeEventListener("mousemove", playAudio);
        window.removeEventListener("click", playAudio);
      })
      .catch(() => {
        // Keep listeners active if play fails
      });
  }
}

  // ─── Pause music when tab is hidden ─────────────────────
function handleVisibilityChange() {
  if (!audio || !audioStarted) return;
  
  if (document.hidden) {
    audio.pause();
  } else {
    audio.play().catch(() => {});
  }
}

  // ─── Scroll to Devotions Section ─────────────────────────────────────────
//   function unlockScrollAndScrollDown() {
//     const targetY = window.innerHeight;
//     const startY = window.pageYOffset;
//     const distance = targetY - startY;
//     const duration = 1000; // milliseconds
//     let startTime = null;

//     function smoothScroll(currentTime) {
//       if (startTime === null) startTime = currentTime;
//       const timeElapsed = currentTime - startTime;
//       const progress = Math.min(timeElapsed / duration, 1);
      
//       // Ease-out function for smooth deceleration
//       const ease = 1 - Math.pow(1 - progress, 3);
      
//       window.scrollTo(0, startY + (distance * ease));
      
//       if (progress < 1) {
//         requestAnimationFrame(smoothScroll);
//       }
//     }
    
//     requestAnimationFrame(smoothScroll);
//   }

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
      console.error("Clipboard API failed, trying fallback:", err);
      
      // Fallback method for mobile/older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = number;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        copiedAccounts[number] = true;
        await tick();
        
        setTimeout(() => {
          copiedAccounts[number] = false;
        }, 2000);
      } catch (fallbackErr) {
        console.error("All copy methods failed:", fallbackErr);
        alert(`Copy failed. Number: ${number}`);
      }
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

  // Format time from 24-hour to 12-hour format with timezone
  function formatTime(time24, timezone = 'Asia/Makassar') {
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}.${minutes} ${ampm}`;
  }

  // Format event time range with timezone
  function formatEventTimeRange(startTime, endTime, timezone = 'Asia/Makassar') {
    const start = formatTime(startTime, timezone);
    const end = formatTime(endTime, timezone);
    const timezoneAbbr = getTimezoneAbbreviation(timezone);
    
    if (start && end) {
      return `${start} - ${end} ${timezoneAbbr}`;
    } else if (start) {
      return `${start} ${timezoneAbbr}`;
    }
    return '';
  }

  // Format date with timezone consideration
  function formatEventDate(dateString, timezone = 'Asia/Makassar') {
    if (!dateString) return '';
    
    try {
      const timezoneOffset = getTimezoneOffset(timezone);
      // Create date in specified timezone
      const date = new Date(dateString + 'T00:00:00' + timezoneOffset);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: timezone
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  }

  // ─── Calendar Click Handler (for tracking/analytics) ─────────────────────
  function handleCalendarClick(event, url) {
    console.log('Calendar clicked for event:', event.event_type, 'URL:', url);
    
    // Add any analytics tracking here if needed
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  $: inviteImageUrl = `https://your-supabase-url.supabase.co/storage/v1/object/public/invites-images/${data.clientData?.slug || 'default'}/preview.webp`;
  $: currentUrl = `https://startswithlove.com${$page.url.pathname}`;
</script>

<svelte:head>
  <meta property="og:image" content="{inviteImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="{currentUrl}" />
    <meta property="og:type" content="website" />
  <link rel="preload" as="image" href="/video-poster.webp" fetchpriority="high">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!-- Preload critical fonts -->
  {#each FONTS_TO_PRELOAD as font}
    {#each font.urls as url}
      {#if !url.includes('googleapis.com')}
        <link rel="preload" as="font" href={url} type="font/woff2" crossorigin />
      {/if}
    {/each}
  {/each}
  <!-- Preload critical images -->
  {#each STATIC_IMAGES as imageSrc}
    <link rel="preload" as="image" href={imageSrc} />
  {/each}
</svelte:head>

<style lang="postcss">
  @reference "tailwindcss";

  :global(html) {
    background-color: #000000;
    /* Define default fonts as fallback */
    --font-display: 'Outfit', sans-serif;
    --font-subheading: 'Fustat', sans-serif;
    --font-button: 'Fustat', sans-serif;
    --font-h3: 'Fustat', sans-serif;
    --font-h2: 'Fustat', sans-serif;
    --font-p: 'Fustat', sans-serif;
    --font-smallcaption: 'Fustat', sans-serif;
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
    font-family: var(--font-subheading);
    font-size: 0.75rem;
    letter-spacing: 0.25em;
  }

  .font-subheading.loading {
    font-family: var(--font-subheading);
    font-size: 0.75rem;
  }

  .font-display {
    font-family: var(--font-display);
    font-size: 4.75rem;
  }

  .font-display.dresscode{
    font-family: var(--font-display);
    font-size: 2.25rem;
  }

  .font-button {
    font-family: var(--font-button);
    font-size: 0.75rem;
    letter-spacing: 0.25em;
  }

  .font-h3 {
    font-family: var(--font-h3);
    font-size: 1.25rem;
    letter-spacing: 0.025em;
  }

  .font-h3.eventtime {
    font-family: var(--font-h3);
    font-size: 1rem;
    margin-top: 4px;
    opacity: 90%;
  }

  .font-h2 {
    font-family: var(--font-h2);
    font-size: 1.75rem;
    letter-spacing: 0.050em;
  }

  .font-h2.countdown {
    font-family: var(--font-h2);
    font-size: 2.5rem;
  }

  .font-p {
    font-family: var(--font-p);
    font-size: 1.75rem;
  }

  .font-smallcaption {
    font-family: var(--font-smallcaption);
    font-size: 0.75rem;
    font-weight: 600;
    opacity: 70%;
    letter-spacing: 0.25em;
  }

  .font-smallcaption.with-love {
    font-family: var(--font-smallcaption);
    font-size: 0.65rem;
    font-weight: 600;
    opacity: 70%;
    letter-spacing: 0.25em;
  }

  .with-love{
    font-family: var(--font-smallcaption);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.3em;
  }

  /* Calendar button enhancements */
  .calendar-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 300ms ease-in 100ms;
  }

  .calendar-button:hover {
    transform: scale(1.03);
  }

  .calendar-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }

  .font-display.desktoplanding {
    font-family: var(--font-display);
    font-size: 6.55rem;
  }

  .font-subheading.desktoplanding {
    font-family: var(--font-subheading);
    font-size: 0.85rem;
    letter-spacing: 0.25em;
  }

  @media (max-width: 376px) {
    .landing-section {
      transform: scale(1);
      transform-origin: center top;
    }

    .events-section {
      transform: scale(0.9);
      transform-origin: center top;
    }

    .wishes-section {
      transform: scale(0.9);
      transform-origin: center top;
    }

    .font-subheading {
      font-family: var(--font-subheading);
      font-size: 0.65rem;
      letter-spacing: 0.25em;
    }

    .font-display {
      font-family: var(--font-display);
      font-size: 4.55rem;
    }

    .font-display.dresscode{
      font-family: var(--font-display);
      font-size: 2.15rem;
    }

    .font-button {
      font-family: var(--font-button);
      font-size: 0.65rem;
      letter-spacing: 0.25em;
    }

    .font-h3 {
      font-family: var(--font-h3);
      font-size: 1.15rem;
      letter-spacing: 0.025em;
    }

    .font-h3.eventtime {
      font-family: var(--font-h3);
      font-size: 0.9rem;
      margin-top: 4px;
      opacity: 90%;
    }

    .font-h2 {
      font-family: var(--font-h2);
      font-size: 1.65rem;
      letter-spacing: 0.050em;
    }

    .font-h2.countdown {
      font-family: var(--font-h2);
      font-size: 2.4rem;
    }

    .font-p {
      font-family: var(--font-p);
      font-size: 1.65rem;
    }

    .font-smallcaption {
      font-family: var(--font-smallcaption);
      font-size: 0.65rem;
      font-weight: 600;
      opacity: 70%;
      letter-spacing: 0.25em;
    }
  }

  .video-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: -1;
    background-color: #000;
    object-position: 65%;
  }

  /* Mobile: Full screen video */
  @media (max-width: 1023px) {
    .video-background {
      /* Default styles work for mobile */
    }
  }

  /* Desktop: Video only on right side (40% width) */
  @media (min-width: 1024px) {
    .video-background {
      left: 60%; /* Start at 60% from left (right side) */
      width: 40%; /* Only take up 40% width */
    }
  }
</style>
<audio
  bind:this={audio}
  loop
  playsinline
  preload="auto"
  class="hidden"
  muted
   on:loadeddata={() => console.log('🎵 Audio data loaded')}
  on:canplay={() => console.log('🎵 Audio can play')}
  on:error={(e) => console.error('🎵 Audio error:', e)}
>
  {#if audioUrl}
    <source src={audioUrl} type="audio/mpeg" />
  {:else}
    <!-- Fallback to default audio if Supabase audio fails to load -->
    <source src="/sailorsong-bgm.mp3" type="audio/mp3" />
  {/if}
  Your browser does not support the audio tag.
</audio>

<!-- Loading Screen - Show while assets are loading -->
{#if isLoading}
  <div class="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
    
    <!-- Custom loading progress -->
    <div class="mt-8 flex flex-col text-center space-y-3">
      <p class="font-subheading loading text-white uppercase">{loadingStatus}</p>
     <!-- <div class="w-60 md:w-68 lg:w-88 justify-center align-center h-0.5 bg-gray-800 overflow-hidden"> 
         <div 
          class="h-full bg-gray-300 transition-all duration-300 ease-out"
          style="width: {loadingProgress}%"
        ></div>
     </div> -->
      <p class="font-subheading loading opacity-70">{Math.round(loadingProgress)}%</p>
    </div>
  </div>
{:else}

  <!-- Main Content - Only show after loading is complete -->
  <div in:fade={{ duration: 800 }}>
    <slot />

    <!-- <video
          class="video-background"
          poster={posterUrl}
          style="height: 100%; min-height: 100%; object-position: 65%;"
          autoplay
          muted
          loop
          playsinline
        >
          {#if videoUrl}
            <source src={videoUrl} type="video/webm" />
          {/if}
          Your browser does not support the video tag.
        </video> -->

    <!-- Desktop Layout Wrapper -->
    <div class="hidden lg:flex h-screen overflow-hidden">
      <!-- Left Panel - New Landing Section (Desktop Only) -->
      <div class="w-[60%] h-full relative overflow-hidden">
        <!-- Background Image Carousel -->
        {#if images.length > 0}
          <img
            src={images[Math.floor(Math.random() * images.length)]}
            alt="Background"
            class="absolute inset-0 w-full h-full object-cover"
            style="object-position: 65%;"
          />
        {:else}
          <!-- Fallback background color while images load -->
          <div class="absolute inset-0 w-full h-full bg-black"></div>
        {/if}
        
        <!-- Dark overlay -->
        <div class="absolute inset-0 bg-black/25"></div>
        
        <!-- Content Overlay -->
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 px-8">
          <div class="flex flex-col items-center justify-center">
            <h1 class="font-display desktoplanding text-white rotate-[-6deg] text-center leading-none mb-22">
              <p class="m-0">{name1}</p>
              <p class="-m-3">&</p>
              <p class="m-0">{name2}</p>
            </h1>

            <p class="font-subheading desktoplanding uppercase text-white">
              {formatEventDate(primaryEvent?.event_date || invite.event_date, primaryEvent?.timezone)}
            </p>
          </div>
        </div>
      </div>

      <!-- Right Panel - All Current Content Scrollable -->
      <div class="w-[40%] h-full overflow-y-auto overflow-x-hidden">
        <div class="w-full">
          <!--Start of Landing Page-->
          <div class="relative w-full min-h-[100dvh]">
            <!-- Background image -->
            <!-- <video
              class="fixed top-0 left-0 w-full h-full object-cover z-[-1]"
              style="height: 100%; min-height: 100%; background-color: #000; object-position: 65%;"
              autoplay
              muted
              loop
              playsinline
            >
              {#if videoUrl}
                <source src={videoUrl} type="video/webm" />
              {/if}
              Your browser does not support the video tag.
            </video> -->

            <!-- Dark overlay -->
            <div class="fixed top-0 left-0 w-full h-full bg-black/40 z-[-1]"></div>

 

            <!--Introduction-->
            <div class="landing-section relative z-10 flex flex-col items-center justify-center text-center min-h-[100dvh]">
              <p class="font-subheading  text-white uppercase pb-30">
                Dear {guest.full_name},
              </p>

              <div class="flex flex-col items-center justify-center">
                <p class="font-subheading uppercase text-white pb-10">
                  We Invite You To Celebrate
                </p>
                <h1 class="font-display text-white rotate-[-6deg] text-center leading-none pb-10">
                  <p class="m-0">{name1}</p>
                  <p class="-m-3">&</p>
                  <p class="m-0">{name2}</p>
                </h1>

                <p class="font-subheading uppercase text-white pb-20">
                  {formatEventDate(primaryEvent?.event_date || invite.event_date, primaryEvent?.timezone)}
                </p>
              </div>

              <!-- <button
                on:click={unlockScrollAndScrollDown}
                class="font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition text-xs sm:text-sm"
              >
                JOIN THE CELEBRATION
              </button> -->
            </div>
          </div>
          <!--End of Landing-->
          
          <!--Devotions-->
          {#if invite.section_toggle.includes("devotions")}
          <div id="devotions" class="relative z-10 flex flex-col items-center justify-center text-center min-h-[100dvh] px-4 sm:px-6 space-y-8 sm:space-y-12"> 
            <img src="/cross.png" alt="cross" class="w-4 h-5 sm:w-3 sm:h-4 object-fill opacity-80 fade-in">
            <h1 class="font-h2 text-white fade-in">I have found the one whom my soul loves.</h1>
            <p class="font-smallcaption font-bold text-white uppercase tracking-[1em] sm:tracking-[1.5em] md:tracking-[2em] opacity-90 text-xs sm:text-sm fade-in">SONG OF SOLOMON 3:4</p>
            <!-- <div class="absolute left-1/2 -translate-x-1/2  flex justify-center items-center"> -->
              <div class="scale-50 opacity-80">
                <LottieClientOnly {arrowDown} />
              </div>
            <!-- </div> -->
            
              
          </div>
          {/if}
          <!--End of Devotions-->

          <!--Couple-->
          {#if invite.section_toggle.includes("groom-intro")}
          <div class="relative flex flex-col items-center">
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
          <div class="relative flex flex-col items-center">
            <div class="absolute inset-0 bg-black/15 z-[5]"></div>

            <!-- Background image -->
            <img src="/bride.png" alt="Background" class="w-full h-full object-cover block">
            <img src="/snow.gif" alt="Overlay" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10">

            <!-- Overlay Content -->
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-3 px-4 fade-in">
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
          <div class="flex flex-col events-section min-h-[100dvh] items-center justify-center text-center px-8 md:px-16 lg:px-28 py-10 text-white">
            {#each events as event, index}
              <!-- Check if this event type should be shown based on section_toggle -->
              {#if invite.section_toggle.includes(event.event_type) || invite.section_toggle.includes("events")}
                <div class="mb-14 w-full fade-in" class:mb-12={index === events.length - 1}>
                  
                  <!-- Show "Event" label only for the first event -->
                  {#if index === 0}
                    <p class="font-smallcaption uppercase opacity-80 mb-6 ">Event</p>
                  {/if}
                  
                  <!-- Dynamic Event Title -->
                  <h2 class="font-h2 mb-3 capitalize">
                    {event.event_type.replace('-', ' ')}
                  </h2>
                  <hr class="mb-6 border-t-2 border-white/50">
                  
                  <!-- Dynamic Date and Time -->
                  <div class="">
                    <p class="font-h3">
                      {formatEventDate(event.event_date, event.timezone)}
                    </p>
                    <p class="font-h3 eventtime mb-6">
                      {formatEventTimeRange(event.start_time, event.end_time, event.timezone)}
                    </p>
                  </div>
                  
                  <!-- Dynamic Location -->
                  <p class="font-h3 sm:text-xl md:text-2xl mb-6">
                    {event.location}
                  </p>
                  
                  <!-- Dynamic Location Button -->
                  <div class="space-y-4">
                    <a  
                      href="https://www.google.com/maps?q={encodeURIComponent(event.location)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-block font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase mr-4"
                    >
                      + View Location
                    </a>
                    
                    <!-- Individual Calendar Button for each event -->
                    {#if event.calendarUrl}
                      <button
                        on:click={() => handleCalendarClick(event, event.calendarUrl)}
                        class="calendar-button inline-block font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase"
                      >
                        <svg 
                          class="calendar-icon" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        + Add {event.event_type.replace('-', ' ')} to Calendar
                      </button>
                    {/if}
                  </div>
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
          <div class="relative z-10 flex flex-col items-center justify-center text-center min-h-[100dvh] px-8 sm:px-6 space-y-8 sm:space-y-12 md:space-y-16">
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
                  <div class="font-h2 countdown leading-none mb-4 sm:mb-5 md:mb-6 text-white">{days}</div>
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
            
            <!-- Enhanced Save the Date Button with Calendar Integration -->
            {#if primaryCalendarUrl}
              <button
                on:click={() => handleCalendarClick(primaryEvent, primaryCalendarUrl)}
                class="calendar-button inline-block font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase"
              >
                <svg 
                  class="calendar-icon" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                </svg>
                Save the Date
              </button>
            {:else}
              <!-- Fallback if no calendar URL is available -->
              <div class="inline-block font-button text-white px-8 py-4 border border-white/50 rounded-full opacity-50 uppercase">
                Save the Date (Coming Soon)
              </div>
            {/if}
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
          <div class="relative w-full min-h-[100dvh] wishes-section overflow-hidden">
            <div class="fade-in">
                <!-- {console.log('Invite object:', invite)}
    {console.log('Invite ID:', invite.id)} -->
              <Wishes inviteId={invite.id}/>
            </div>
          </div>
          {/if}
          <!-- End of Wishes -->

          <!-- Dress Code -->
          {#if invite.section_toggle.includes("dress-code")}
          <div class="relative w-full min-h-[100dvh] z-10 flex flex-col items-center justify-center text-center px-8 md:px-16 lg:px-28 overflow-hidden">
            <div class="fade-in">
              <!-- Content overlay -->
              <div class="text-white">
                <p class="font-smallcaption uppercase opacity-80 mb-6">WHAT TO WEAR</p>
                
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
            <!-- <a 
              href="https://www.instagram.com/reel/DMAlgiSTamH/?igsh=MWwya2NxMnB6bTB4dw=="
              target="_blank"
              rel="noopener noreferrer"
              class="border font-button uppercase border-white px-8 py-4 rounded text-white hover:bg-white hover:text-black transition"
            >
              View Inspiration
            </a> -->
          </div>
          {/if}
          <!-- End of Dress Code -->

          {#if invite.section_toggle.includes("faq")}
          <!-- Rundown -->
          <div class="relative w-full min-h-[100dvh] overflow-hidden">
            <div class="fade-in">
              <div class="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center text-center text-white px-12 md:px-22 lg:px-32 space-y-8">
                <p class="font-smallcaption uppercase opacity-80 mb-6">EVENT RUNDOWN</p>
                <h1 class="font-h2 text-white mb-12">See everything we've got planned for you.</h1>
                
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
          {/if}

          <!-- Our Moments -->
          {#if invite.section_toggle.includes("our-moments")}
          <div class="relative z-10 flex flex-col items-center justify-center text-center h-[100dvh] px-4 sm:px-6 space-y-6 sm:space-y-8 text-white">
            <div class="fade-in">
              <h1 class="font-['Millionaire_Script'] text-3xl sm:text-4xl md:text-5xl mb-10 sm:mb-14 md:mb-22" style="color: #FAFAEF;">Our Moments</h1>
              <div class="flex flex-col items-center justify-center w-full mx-auto my-6 sm:my-8 md:my-10 px-4 z-10">
                <div class="relative w-full max-w-[280px] sm:max-w-xs aspect-[4/5] overflow-hidden">
                  {#each images as img, i}
                    <img
                      src={img}
                      alt="carousel"
                      class="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                      class:opacity-100={i === currentIndex}
                      class:opacity-0={i !== currentIndex}
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
          <div class="relative z-10 flex flex-col items-center justify-center text-center h-[100dvh] px-8 md:px-16 lg:px-28 space-y-6 sm:space-y-8 text-white fade-in">
            <p class="font-smallcaption uppercase opacity-80 mb-6">WEDDING GIFT</p>
            <h1 class="font-h2">A Token of Love</h1>

            <h4 class="font-h3 eventtime leading-6 mb-8">{@html formattedGiftNote}</h4>
            
            <button
              on:click={() => (showAccount = !showAccount)}
              class={`inline-block mt-4 px-8 py-4 uppercase text-xs sm:text-sm rounded font-button tracking-[0.15em] transition duration-300 ease-in-out 
                ${showAccount 
                  ? 'bg-[#C7DDD8] border-transparent' 
                  : 'bg-transparent text-white border border-white hover:bg-[#C7DDD8] hover:text-black'}`}
              style={showAccount ? 'color: #000000 !important;' : ''}
            >
              {showAccount ? "- HIDE ACCOUNT" : "+ VIEW ACCOUNT"}
            </button>

            {#if showAccount}
              <div class="px-4 sm:px-6 py-6 text-white text-center w-full max-w-sm mx-auto">
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
                    > 
                      {#if copiedAccounts[couple.groom_bank_number]}
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
                  {@html (couple?.thank_you || '-')}
                </h4>
              </div>

              <!-- Bottom "With Love" -->
              <div class="absolute bottom-12 flex flex-col items-center space-y-0.5">
                <p class="font-smallcaption uppercase">Invites From</p>
                <a 
                  href="https://startswithlove.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="with-love opacity-90 !text-white uppercase hover:text-gray-300 transition"
                >
                  STARTSWITHLOVE.COM
                </a>
              </div>
            </div>
          </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Mobile Layout -->
   <div class="lg:hidden h-[100dvh]">
    
     <Parallax guest={guest} clientSlug={clientSlug} />
      <!--End of Landing-->

   <!-- Mobile Background Image Carousel Container -->
    <div class="relative w-full">
      <!-- Background Image Carousel for Mobile -->
      {#if images.length > 0}
  <div class="fixed inset-0 w-full h-full z-[-2]">
    <img
      src={images[0]}
      alt="Background"
      class="absolute inset-0 w-full h-full object-cover"
      style="object-position: 65%;"
    />
  </div>
{:else}
  <div class="fixed inset-0 w-full h-full bg-black z-[-2]"></div>
{/if}

      <!-- Dark overlay for better text readability -->
      <div class="fixed inset-0 w-full h-full bg-black/40 z-[-1]"></div>

      <!--Devotions-->
      {#if invite.section_toggle.includes("devotions")}
      <div id="devotions" class="relative z-10 flex flex-col items-center justify-center text-center min-h-[100dvh] px-4 sm:px-6 space-y-8 sm:space-y-12"> 
        <img src="/cross.png" alt="cross" class="w-4 h-5 sm:w-3 sm:h-4 object-fill opacity-80 fade-in">
        <h1 class="font-h2 text-white fade-in">I have found the one whom my soul loves.</h1>
        <p class="font-smallcaption font-bold text-white uppercase tracking-[1em] sm:tracking-[1.5em] md:tracking-[2em] opacity-90 text-xs sm:text-sm fade-in">SONG OF SOLOMON 3:4</p>
        <div class="absolute bottom-40 left-1/2 -translate-x-1/2 w-20 h-20 flex justify-center items-center fade-in">
        </div>
      </div>
      {/if}
      <!--End of Devotions-->

      <!--Couple-->
      {#if invite.section_toggle.includes("groom-intro")}
      <div class="relative flex flex-col items-center">
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
      <div class="relative flex flex-col items-center">
        <div class="absolute inset-0 bg-black/15 z-[5]"></div>

        <!-- Background image -->
        <img src="/bride.png" alt="Background" class="w-full h-full object-cover block">
        <img src="/snow.gif" alt="Overlay" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10">

        <!-- Overlay Content -->
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-3 px-4 fade-in">
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
                  {formatEventDate(event.event_date, event.timezone)}
                </p>
                <p class="font-h3 eventtime mb-6">
                  {formatEventTimeRange(event.start_time, event.end_time, event.timezone)}
                </p>
              </div>
              
              <!-- Dynamic Location -->
              <p class="font-h3 sm:text-xl md:text-2xl mb-6">
                {event.location}
              </p>
              
              <!-- Dynamic Location Button -->
              <div class="space-y-4">
                <a  
                  href="https://www.google.com/maps?q={encodeURIComponent(event.location)}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-block font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase mr-4"
                >
                  + View Location
                </a>
                
                <!-- Individual Calendar Button for each event -->
                {#if event.calendarUrl}
                  <button
                    on:click={() => handleCalendarClick(event, event.calendarUrl)}
                    class="calendar-button inline-block font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase"
                  >
                    <svg 
                      class="calendar-icon" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    + Add {event.event_type.replace('-', ' ')} to Calendar
                  </button>
                {/if}
              </div>
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
      <div class="relative z-10 flex flex-col items-center justify-center text-center min-h-[100dvh] px-8 sm:px-6 space-y-8 sm:space-y-12 md:space-y-16">
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
              <div class="font-h2 countdown leading-none mb-4 sm:mb-5 md:mb-6 text-white">{days}</div>
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
        
        <!-- Enhanced Save the Date Button with Calendar Integration -->
        {#if primaryCalendarUrl}
          <button
            on:click={() => handleCalendarClick(primaryEvent, primaryCalendarUrl)}
            class="calendar-button inline-block font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase"
          >
            <svg 
              class="calendar-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            Save the Date
          </button>
        {:else}
          <!-- Fallback if no calendar URL is available -->
          <div class="inline-block font-button text-white px-8 py-4 border border-white/50 rounded-full opacity-50 uppercase">
            Save the Date (Coming Soon)
          </div>
        {/if}
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
      <div class="relative w-full min-h-[100dvh] wishes-section overflow-hidden">
        <div class="fade-in">
          <Wishes inviteId={invite.id}/>
        </div>
      </div>
      {/if}
      <!-- End of Wishes -->

      <!-- Dress Code -->
      {#if invite.section_toggle.includes("dress-code")}
      <div class="relative w-full min-h-[100dvh] z-10 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div class="fade-in">
          <!-- Content overlay -->
          <div class="text-white">
            <p class="font-smallcaption uppercase opacity-80 mb-6">WHAT TO WEAR</p>
            
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
        <!-- <a 
          href="https://www.instagram.com/reel/DMAlgiSTamH/?igsh=MWwya2NxMnB6bTB4dw=="
          target="_blank"
          rel="noopener noreferrer"
          class="border font-button uppercase border-white px-8 py-4 rounded text-white hover:bg-white hover:text-black transition"
        >
          View Inspiration
        </a> -->
      </div>
      {/if}
      <!-- End of Dress Code -->

      {#if invite.section_toggle.includes("faq")}
      <!-- Rundown -->
      <div class="relative w-full min-h-[100dvh] overflow-hidden">
        <div class="fade-in">
          <div class="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center text-center text-white px-6 space-y-8">
            <p class="font-smallcaption uppercase opacity-80 mb-6">EVENT RUNDOWN</p>
            <h1 class="font-h2 text-white mb-12">See everything we've got planned for you.</h1>
            
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
      {/if}

      <!-- Our Moments -->
      {#if invite.section_toggle.includes("our-moments")}
      <div class="relative z-10 flex flex-col items-center justify-center text-center h-[100dvh] px-4 sm:px-6 space-y-6 sm:space-y-8 text-white">
        <div class="fade-in">
          <h1 class="font-['Millionaire_Script'] text-3xl sm:text-4xl md:text-5xl mb-10 sm:mb-14 md:mb-22" style="color: #FAFAEF;">Our Moments</h1>
          <div class="flex flex-col items-center justify-center w-full mx-auto my-6 sm:my-8 md:my-10 px-4 z-10">
            <div class="relative w-full max-w-[280px] sm:max-w-xs aspect-[4/5] overflow-hidden">
              {#each images as img, i}
                <img
                  src={img}
                  alt="carousel"
                  class="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                  class:opacity-100={i === currentIndex}
                  class:opacity-0={i !== currentIndex}
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
      <div class="relative z-10 flex flex-col items-center justify-center text-center h-[100dvh] px-4 sm:px-6 space-y-6 sm:space-y-8 text-white fade-in">
        <p class="font-smallcaption uppercase opacity-80 mb-6">WEDDING GIFT</p>
        <h1 class="font-h2">A Token of Love</h1>

        <h4 class="font-h3 eventtime leading-6 mb-8">{@html formattedGiftNote}</h4>
        <button
          on:click={() => (showAccount = !showAccount)}
          class={`inline-block mt-4 px-8 py-4 uppercase text-xs sm:text-sm rounded font-button tracking-[0.15em] transition duration-300 ease-in-out 
            ${showAccount 
              ? 'bg-[#C7DDD8] border-transparent' 
              : 'bg-transparent text-white border border-white hover:bg-[#C7DDD8] hover:text-black'}`}
          style={showAccount ? 'color: #000000 !important;' : ''}
        >
          {showAccount ? "- HIDE ACCOUNT" : "+ VIEW ACCOUNT"}
        </button>

        {#if showAccount}
          <div class="px-4 sm:px-6 py-6 text-white text-center w-full max-w-sm mx-auto">
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
                > 
                  {#if copiedAccounts[couple.groom_bank_number]}
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
              {@html (couple?.thank_you || '-')}
            </h4>
          </div>

          <!-- Bottom "With Love" -->
          <div class="absolute bottom-12 flex flex-col items-center space-y-0.5">
            <p class="font-smallcaption with-love uppercase">Invites From</p>
            <a 
              href="https://startswithlove.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="with-love opacity-90 !text-white uppercase hover:text-gray-300 transition"
            >
              STARTSWITHLOVE.COM
            </a>
          </div>
        </div>
      </div>
      {/if}
    </div>
  </div>
  </div>
{/if}
