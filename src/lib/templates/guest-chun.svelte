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
   import { gsap } from 'gsap'
  import { ScrollTrigger } from 'gsap/ScrollTrigger'

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
  // Background image tracking
  let currentBgIndex = 0;
  let showAccount = true;
  let clicked = false;
  let carouselStarted = false;
  let section;
  let copiedAccounts = {}; // store which account numbers have been copied

  // ─── Google Maps Integration ──────────────────────────────────────────────
  const mapsUrl = "https://www.google.com/maps?q=Hotel+Mulia+Senayan,+Jakarta";

  // ─── Font Preloading ──────────────────────────────────────────────────────
  const FONTS_TO_PRELOAD = [
    { family: 'Mabry Light', urls: ['/fonts/mabry-light.ttf']},
    { family: 'Mabry Medium', urls: ['/fonts/mabry-medium.ttf']},
    { family: 'Mabry Regular', urls: ['/fonts/mabry-regular.ttf']},
    { family: 'Recoleta L', urls: ['/fonts/Recoleta-Light.otf']},
    { family: 'Recoleta R', urls: ['/fonts/Recoleta-Regular.otf']},
    { family: 'Recoleta M', urls: ['/fonts/Recoleta-Medium.otf']},
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

 

 // Modified preloadAllAssets function
async function preloadAllAssets() {
  const totalSteps = 3;
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
    loadingProgress = (currentStep / totalSteps) * 100;

    // Step 3: Preload just first image (much faster)
    loadingStatus = 'Almost Ready';
    
    await preloadFirstImage(); // Changed from preloadFirstTwoImages
    
    currentStep++;
    loadingProgress = 100;

    // Small delay to show completion
    await new Promise(resolve => setTimeout(resolve, 500));
    
    loadingStatus = 'Complete!';
    isLoading = false;

    // Load remaining images in background AFTER loading screen is done
    setTimeout(() => {
      loadRemainingImages(); // This will add more images and start carousel
    }, 100);

  } catch (error) {
    console.error('Error during preloading:', error);
    isLoading = false;
    
    setTimeout(() => {
      loadRemainingImages();
    }, 100);
  }
}

  // ─── Improved Google Calendar Integration ─────────────────────────────────
  
  /**
   * Converts a Date object to Google Calendar format (YYYYMMDDTHHMMSSZ)
   */
  // function toGoogleCalendarDate(date) {
  //   if (!date || isNaN(date.getTime())) {
  //     console.error('Invalid date provided to toGoogleCalendarDate:', date);
  //     return '';
  //   }
  //   return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  // }

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
   let backgroundImageUrl = '';
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
      } else {
        posterUrl = posterData.publicUrl;
        console.log('Poster URL:', posterUrl);
      }

      // Get background image URL - ADD THIS
      const { data: backgroundData, error: backgroundError } = supabase
        .storage
        .from('invites-images')
        .getPublicUrl(`${clientSlug}/background.webp`);

      if (backgroundError) {
        console.warn('No background image found:', backgroundError);
      } else {
        backgroundImageUrl = backgroundData.publicUrl;
        console.log('Background URL:', backgroundImageUrl);
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
      
      // Preload video, poster, background, and audio
      const promises = [];
      
      if (videoUrl) {
        promises.push(preloadVideo(videoUrl));
      }
      
      if (posterUrl) {
        promises.push(preloadImage(posterUrl));
      }

      // Preload background image - ADD THIS
      if (backgroundImageUrl) {
        promises.push(preloadImage(backgroundImageUrl));
      }

      if (audioUrl && audioUrl !== '/sailorsong-bgm.mp3') {
        promises.push(preloadAudio(audioUrl));
      }
      
      await Promise.allSettled(promises);

      setTimeout(() => {
        if (audio && audioUrl) {
          audio.src = audioUrl;
          audio.loop = true;
          audio.muted = true;
          audio.load();
        }
      }, 500);
      
    } catch (error) {
      console.error('Error loading video assets:', error);
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

async function preloadFirstImage() {
  try {
    console.log('🖼️ Preloading first image...');
    
    const { data, error } = await supabase
      .storage
      .from('invites-images')
      .list(clientSlug, { limit: 10 }); // Reduced limit for faster API response
      
    if (error) {
      console.error('Error listing images:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.warn(`No files found in folder: ${clientSlug}`);
      return;
    }
   
    // Filter and sort images (same logic as before)
    const sorted = data
      .filter(file => {
        const isImage = /\.(jpe?g|png|webp)$/i.test(file.name);
        const startsWithNumber = /^\d+\./i.test(file.name);
        return isImage && startsWithNumber;
      })
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    console.log('Filtered carousel images:', sorted.map(f => f.name));

    if (sorted.length === 0) return;

    // Get URL for ONLY the first image
    const firstFile = sorted[0]; // Just the first one
    const { data: publicData } = supabase
      .storage
      .from('invites-images')
      .getPublicUrl(`${clientSlug}/${firstFile.name}`);
    
    const firstImageUrl = publicData.publicUrl;

    console.log(`Preloading first image: ${firstImageUrl}`);

    // Preload just the first image
    try {
      const loadedImage = await preloadImage(firstImageUrl);
      
      // Set the images array with just the first image
      images = [loadedImage];
      
      console.log('✅ First image preloaded and ready');
      
      // Don't start carousel yet - just show the static image
      // startCarousel(); // Remove this line
      
    } catch (error) {
      console.warn(`Failed to preload first image: ${firstImageUrl}`, error);
    }

  } catch (error) {
    console.error('Error preloading first image:', error);
  }
}

// Modified function to load remaining images
async function loadRemainingImages() {
  try {
    console.log('🖼️ Loading remaining images in background...');
    
    const { data, error } = await supabase
      .storage
      .from('invites-images')
      .list(clientSlug, { limit: 100 });
      
    if (error) {
      console.error('Error listing remaining images:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.warn(`No files found in folder: ${clientSlug}`);
      return;
    }
   
    // Filter and sort images
    const sorted = data
      .filter(file => {
        const isImage = /\.(jpe?g|png|webp)$/i.test(file.name);
        const startsWithNumber = /^\d+\./i.test(file.name);
        return isImage && startsWithNumber;
      })
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    // Skip first image (already loaded)
    const remainingFiles = sorted.slice(1);
    
    if (remainingFiles.length === 0) {
      console.log('No remaining images to load');
      return;
    }

    const imageUrls = remainingFiles.map(file => {
      const { data: publicData } = supabase
        .storage
        .from('invites-images')
        .getPublicUrl(`${clientSlug}/${file.name}`);
      return publicData.publicUrl;
    });

    console.log(`Loading ${imageUrls.length} remaining images in background`);

    // Load remaining images one by one
    let currentImages = [...images]; // Copy current images (should have 1 image)
    
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const loadedImage = await preloadImage(imageUrls[i]);
        currentImages = [...currentImages, loadedImage];
        images = currentImages; // Trigger Svelte reactivity
        
        // Start carousel when we have 2+ images
        if (currentImages.length === 2 && !carouselStarted) {
          console.log('✅ Starting carousel with 2 images');
          startCarousel();
          carouselStarted = true; // Add this flag to prevent multiple starts
        }
        
        console.log(`✅ Loaded additional image ${i + 1}/${imageUrls.length}`);
        
        // Small delay to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to load remaining image ${i + 1}:`, error);
      }
    }

    console.log(`🎉 Finished loading ${images.length} total carousel images`);
    
  } catch (error) {
    console.error('Error loading remaining images:', error);
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

  const lines = [
    "By the time you read this,<br>当你收到这封请柬的时候",
    "our wedding day will already be drawing near.<br>我们的婚礼已经在倒计时啦",
    "We used to think a wedding was simply a formality,<br>曾经觉得，婚礼只是一个形式，一则官方通告",
    "but now we know, it is a rare and precious gathering,<br>但现在我们才明白,这是一场为数不多的相聚",
    "a journey of love from miles away,<br>是挚爱亲友们跨越距离的到来,<br>千里迢迢的奔赴",
    "a gift of presence we will forever treasure.<br>是亲人温暖的陪伴,<br>是朋友一路的欢笑,<br>是每一份不辞辛苦的<br>支持与守候。<br>这些心意,<br>都是我们此生最珍贵的礼物。",
    "In a lifetime of more than 30,000 days,<br>人生三万多个日子里，<br>有平凡，有特别",
    "what moves us most,<br>而我们的婚礼这天之所以格外难忘,",
    "is that you've chosen to spend this one day with us.<br>是因为这一天你专门为我们而来",
    "This day,",
    "our wedding day,<br>我们婚礼这天",
    "will forever be extraordinary,<br>正因为有你的见证和参与,",
    "because you have chosen to share it with us.<br>变得无比珍贵",
    "Your presence is the greatest blessing,<br>因为有你，我们才真正懂得",
    "a reminder that love is not just between two people,<br>爱不仅仅属于两个人,",
    "but carried and strengthened by the hearts around them.<br>而是被所有亲友的心意与祝福托起。",
    "Thank you for coming,<br>谢谢你愿意来,",
    "thank you for standing by us.<br>谢谢你一直都在。",
    "It's been a while but we can't wait to see you at the wedding.<br>最后想说,<br>好久不见,<br>我们婚礼见! ",
  ];
  



onMount(async () => {
  // Start preloading immediately
  await preloadAllAssets();
  
  updateCountdown();
  intervalTime = setInterval(updateCountdown, 1000);

  // ─── Enhanced BGM Autoplay with Better Mobile Support ─────
  let interactionAttempted = false;
  let playPromiseInProgress = false;
  
  // Function to attempt audio play with better mobile support
  function attemptAudioPlay() {
    if (!audio || !audio.src || audioStarted || interactionAttempted || playPromiseInProgress) return;
    
    console.log('🎵 Attempting to play audio...');
    interactionAttempted = true;
    playPromiseInProgress = true;
    
    // Ensure audio is ready
    if (audio.readyState < 2) {
      console.log('🎵 Audio not ready, waiting...');
      audio.addEventListener('canplay', attemptAudioPlay, { once: true });
      playPromiseInProgress = false;
      interactionAttempted = false;
      return;
    }
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('🎵 Audio started successfully');
          fadeInAudio();
          audioStarted = true;
          playPromiseInProgress = false;
          // Remove all listeners after successful play
          removeAudioListeners();
        })
        .catch((error) => {
          console.log('🎵 Audio autoplay failed:', error.message);
          playPromiseInProgress = false;
          interactionAttempted = false; // Reset to allow retry
          // Keep listeners active for retry
        });
    } else {
      playPromiseInProgress = false;
    }
  }
  
  // Function to remove all audio event listeners
  function removeAudioListeners() {
    window.removeEventListener("scroll", handleFirstInteraction);
    window.removeEventListener("mousemove", handleFirstInteraction);
    window.removeEventListener("click", handleFirstInteraction);
    window.removeEventListener("touchstart", handleFirstInteraction);
    window.removeEventListener("touchend", handleFirstInteraction);
    window.removeEventListener("keydown", handleFirstInteraction);
    window.removeEventListener("pointerdown", handleFirstInteraction);
    document.removeEventListener("gesturestart", handleFirstInteraction);
  }
  
  // Enhanced interaction handler
  function handleFirstInteraction(event) {
    // console.log('🎵 User interaction detected:', event.type);
    
    // Small delay to ensure the interaction is complete
    setTimeout(() => {
      attemptAudioPlay();
    }, 100);
  }
  
  // Add comprehensive interaction listeners
  const interactionEvents = [
    'click',
    'touchstart', 
    'touchend',
    'pointerdown',
    'keydown',
    'scroll'
  ];
  
  interactionEvents.forEach(eventType => {
    window.addEventListener(eventType, handleFirstInteraction, { 
      passive: true, 
      once: false 
    });
  });
  
  // iOS Safari specific gesture event
  document.addEventListener('gesturestart', handleFirstInteraction, { 
    passive: true, 
    once: false 
  });
 

  // // ─── BGM Autoplay After Interaction ─────
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
  const lenis = new Lenis()
  function raf(time) {
    lenis.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)



// GETTY EFFECT: Pin storytelling container
const storytellingContainer = document.querySelector('.storytelling-container');
if (storytellingContainer) {
  const scrollIndicator = document.querySelector('.scroll-indicator');
  const progressBar = document.querySelector('.story-progress-bar');
  const progressFill = document.querySelector('.story-progress-fill');
  
  // Track background state
  let lastProgress = 0;
  let currentBackgroundStep = 0;
  const totalBackgroundSteps = Math.floor(lines.length / 2); // One background change every 2 lines
  
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".storytelling-container",
    start: "top top",
    end: `+=${lines.length * 1200}`, 
    scrub: 1,
    pin: true,
    anticipatePin: 1,
    pinType: "fixed", // ← Add this to use position: fixed instead of transforms
    onUpdate: (self) => {
        const currentProgress = self.progress;
        const direction = currentProgress > lastProgress ? 1 : -1; // 1 = down, -1 = up
        
        // Calculate which background step we should be on based on progress
        const targetStep = Math.floor(currentProgress * totalBackgroundSteps);
        
        // Update background if step has changed and we have images
        if (targetStep !== currentBackgroundStep && images.length > 0) {
          // Clamp the target step to valid range
          const clampedStep = Math.max(0, Math.min(targetStep, images.length - 1));
          
          if (direction === 1) {
            // Scrolling down - move forward through images
            currentBgIndex = clampedStep;
          } else {
            // Scrolling up - move backward through images
            currentBgIndex = clampedStep;
          }
          
          currentBackgroundStep = targetStep;
          console.log(`GSAP: Direction: ${direction === 1 ? 'down' : 'up'}, Progress: ${currentProgress.toFixed(3)}, Step: ${targetStep}, Background Index: ${currentBgIndex}`);
          
          // Force Svelte reactivity
          currentBgIndex = currentBgIndex;
        }
        
        lastProgress = currentProgress;
        
        // Update progress bar
        if (progressFill) {
          progressFill.style.width = `${self.progress * 100}%`;
        }
        
        // Show/hide progress bar
        if (progressBar) {
          if (self.progress > 0.01) {
            progressBar.classList.add('visible');
          } else {
            progressBar.classList.remove('visible');
          }
        }
        
        // Handle scroll indicator
        if (scrollIndicator) {
          if (self.progress > 0.05) {
            scrollIndicator.classList.add('hidden');
          } else {
            scrollIndicator.classList.remove('hidden');
          }
        }
      },
      onLeave: () => {
        // Hide progress bar when leaving storytelling section
        if (progressBar) {
          progressBar.classList.remove('visible');
        }
      }
    }
  });

 // Initialize all lines
lines.forEach((_, i) => {
  // keep outer centered (no animated y/scale on <h2>)
  gsap.set(`.story-line-${i}`, { opacity: i === 0 ? 1 : 0 });

  // animate the inner wrapper instead
  gsap.set(`.story-line-${i} .line-inner`, {
    opacity: i === 0 ? 1 : 0,
    yPercent: i === 0 ? 0 : 10,
    scale: i === 0 ? 1 : 0.98
  });
});

// Timeline transitions
lines.forEach((_, i) => {
  if (i < lines.length - 1) {
    tl.to(`.story-line-${i} .line-inner`, {
      opacity: 0,
      yPercent: -5,   // small up drift on exit
      scale: 0.98,
      duration: 0.7,
      ease: "power2.out"
    }, `line${i + 1}`)
    .to(`.story-line-${i}`, {
      opacity: 0,     // fade outer to fully hide hitbox
      duration: 0.4
    }, `line${i + 1}`);

    tl.to(`.story-line-${i + 1}`, {
      opacity: 1,
      duration: 0.2
    }, `line${i + 1}+=0.15`)
    .to(`.story-line-${i + 1} .line-inner`, {
      opacity: 1,
      yPercent: 0,
      scale: 1,
      duration: 0.9,
      ease: "power2.out"
    }, `line${i + 1}+=0.15`);
  }
});

  // Hold last line briefly then fade out
  tl.to(`.story-line-${lines.length - 1}`, { 
    opacity: 0, 
    y: -20, 
    scale: 0.95, 
    duration: 1 
  }, "+=1");
}
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
 function unlockScrollAndScrollDown() {
  const storytellingContainer = document.querySelector('.storytelling-container');
  
  if (!storytellingContainer) {
    console.error('Storytelling container not found');
    return;
  }
  
  // Use native smooth scrolling to the exact element position
  storytellingContainer.scrollIntoView({
    behavior: 'smooth',
    block: 'start', // Align to the top of the element
    inline: 'nearest'
  });
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

  $: inviteImageUrl = `https://zyoklpfkrxifrykasozh.supabase.co/storage/v1/object/public/invites-images/chunkit-callyn/preview.webp`;
  $: currentUrl = `https://startswithlove.com${$page.url.pathname}`;


</script>

<svelte:head>
<!-- <title>{data.og.title}</title>
<link rel="canonical" href="{data.og.url}" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="startswithlove.com" />
<meta property="og:url" content={data.og.url} />
<meta property="og:title" content={data.og.title} />
<meta property="og:description" content={data.og.description} />

<meta property="og:image" content={data.og.image} />
<meta property="og:image:secure_url" content={data.og.image} />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" /> -->
	<title>With Love | Digital Invites</title>
<meta name="description" content="You are invited to Chunkit & Callyn's Wedding.">

<!-- Facebook Meta Tags -->
<meta property="og:url" content="https://startswithlove.com/chunkit-callyn/ann">
<meta property="og:type" content="website">
<meta property="og:title" content="With Love | Digital Invites">
<meta property="og:description" content="You are invited to Chunkit & Callyn's Wedding.">
<meta property="og:image" content="https://opengraph.b-cdn.net/production/images/9a4aca55-49fb-4aa0-ab66-e9bb7231cb12.jpg?token=_IX2F-lXkk2GvaF6oMgqpv9CghAborNT5cQv66n73SY&height=630&width=1200&expires=33294178462">

<!-- Twitter Meta Tags -->
<meta name="twitter:card" content="summary_large_image">
<meta property="twitter:domain" content="startswithlove.com">
<meta property="twitter:url" content="https://startswithlove.com/chunkit-callyn/ann">
<meta name="twitter:title" content="With Love | Digital Invites">
<meta name="twitter:description" content="You are invited to Chunkit & Callyn's Wedding.">
<meta name="twitter:image" content="https://opengraph.b-cdn.net/production/images/9a4aca55-49fb-4aa0-ab66-e9bb7231cb12.jpg?token=_IX2F-lXkk2GvaF6oMgqpv9CghAborNT5cQv66n73SY&height=630&width=1200&expires=33294178462">



    <link rel="preload" as="image" href={images[0]} fetchpriority="high">
    <link rel="preload" as="image" href={backgroundImageUrl} fetchpriority="high">
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

  :global(:root) {
  /* Font Family Variables */

  --font-display: 'Recoleta',serif;
        /* Display font */
  --font-heading: 'Mabry Medium', sans-serif;  /* Headings */
  --font-body: 'Mabry Regular', sans-serif;    /* Body text */
  --font-light: 'Mabry Light', sans-serif;     /* Light text */
  --font-dm-sans: 'DM Sans', sans-serif;       /* Buttons/UI */

  /* Font Size Variables */
  --font-size-subheading: 0.75rem;
  --font-size-display: 4.75rem;
  --font-size-display-dresscode: 2.25rem;
  --font-size-button: 0.75rem;
  --font-size-h3: 1.25rem;
  --font-size-h3-eventtime: 1rem;
  --font-size-h2: 1.75rem;
  --font-size-h2-countdown: 2.5rem;
  --font-size-p: 1.75rem;
  --font-size-smallcaption: 0.75rem;
  --font-size-with-love: 0.65rem;

  /* Letter Spacing Variables */
  --letter-spacing-subheading: 0.25em;
  --letter-spacing-h3: 0.025em;
  --letter-spacing-h2: 0.050em;
  --letter-spacing-smallcaption: 0.25em;
  --letter-spacing-with-love: 0.3em;

  /* Desktop Font Sizes */
  --font-size-display-desktop: 6.55rem;
  --font-size-subheading-desktop: 0.85rem;
}

@media (max-width: 376px) {
  :global(:root) {
    --font-size-subheading: 0.65rem;
    --font-size-display: 4.55rem;
    --font-size-display-dresscode: 2.15rem;
    --font-size-button: 0.65rem;
    --font-size-h3: 1.15rem;
    --font-size-h3-eventtime: 0.9rem;
    --font-size-h2: 1.65rem;
    --font-size-h2-countdown: 2.4rem;
    --font-size-p: 1.65rem;
    --font-size-smallcaption: 0.65rem;
  }
}

  :global(html) {
    background-color: #000;
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

  /* Progress Bar Styles */
.story-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 50;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.story-progress-bar.visible {
  opacity: 1;
}

.story-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 1));
  width: 0%;
  transition: width 0.1s ease-out;
}

  /* Getty Effect Storytelling Styles */
  .storytelling-container {
    height: 100vh;
    width: 100%;
    position: relative;
    background: transparent; /* Let video background show through */
    overflow: hidden;

  }
  
  .storytelling-content {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 2rem;
    position: relative;
  transform-origin: center center;
  }
  
 .story-line {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;                 /* kill default h2 margins */
  max-width: 90%;
  width: 100%;
  color: #fff;
  font-family: 'Recoleta L', serif;
  font-weight: 300;
  font-size: 1.75rem;
  line-height: 1.4;
  text-align: center;
  opacity: 0;                 /* initial state handled by GSAP set() too */
  z-index: 10;
  pointer-events: none;       /* avoids accidental hit-testing on hidden ones */
  will-change: opacity, transform;
}

.story-line .line-inner {
  display: inline-block;      /* isolate transforms here */
  will-change: opacity, transform;
}

  .background-images {
  position: fixed;
  inset: 0;
  z-index: -1;
  transform-origin: center center;
  will-change:auto;

     transform:scale(1) !important;
}
.bg-slide {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  background-color: black;
  transition: opacity 1s ease-in-out;
   will-change: opacity;
    backface-visibility: hidden; 
     transform: scale(1) !important;
}
.bg-slide.active {
  opacity: 1;
}
  
  /* Responsive text sizing */
  @media (max-width: 376px) {
    .story-line {
      font-size: 1.65rem;
      max-width: 95%;
      padding: 0 1rem;
    }
  }
  
  @media (min-width: 640px) {
    .story-line {
      font-size: 2rem;
      max-width: 80%;
    }
  }
  
  @media (min-width: 768px) {
    .story-line {
      font-size: 2.25rem;
      max-width: 70%;
    }
  }

    /* Scroll Down Indicator Styles */
  .scroll-indicator {
    position: absolute;
    bottom: 200px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 20;
    opacity: 1;
    transition: opacity 0.5s ease-out;
  }
  
  .scroll-text {
    font-family: var(--font-light);
    font-size: 0.75rem;
    color: white;
    opacity: 0.7;
    margin-top: -8px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  
  /* Hide scroll indicator when not on first line */
  .scroll-indicator.hidden {
    opacity: 0;
    pointer-events: none;
  }

  /* Responsive adjustments */
  @media (max-width: 376px) {
    .scroll-indicator {
      bottom: 60px;
    }
    
    .scroll-text {
      font-size: 0.65rem;
    }
  }
  
  /* Ensure video background shows through */
  .storytelling-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4); /* Subtle overlay for text readability */
    z-index: 1;
  }
  
  .story-line {
    z-index: 10; /* Above the overlay */
  }

.font-subheading {
  font-family: var(--font-body);  /* Use consistent variables */
  font-size: var(--font-size-subheading);
  letter-spacing: var(--letter-spacing-subheading);
}

.font-subheading.loading {
  font-family: var(--font-body);
  font-size: var(--font-size-subheading);
}

.font-display {
  font-family: var(--font-display);
  font-size: var(--font-size-display);
}

.font-display.dresscode {
  font-family: var(--font-display);
  font-size: var(--font-size-display-dresscode);
}

.font-display.desktoplanding {
  font-family: var(--font-display);
  font-size: var(--font-size-display-desktop);
}

.font-button {
  font-family: var(--font-dm-sans);
  font-size: var(--font-size-button);
  letter-spacing: var(--letter-spacing-subheading);
}

.font-h3 {
  font-family: var(--font-body);
  font-size: var(--font-size-h3);
  letter-spacing: var(--letter-spacing-h3);
}

.font-h3.eventtime {
  font-family: var(--font-light);
  font-size: var(--font-size-h3-eventtime);
  margin-top: 4px;
  opacity: 90%;
}

.font-h2 {
  font-family: 'Recoleta R', serif;
  font-size: var(--font-size-h2);
  letter-spacing: var(--letter-spacing-h2);
  opacity:90%;
}

.font-h2.countdown {
   font-family: 'Recoleta R', serif;
  font-size: var(--font-size-h2-countdown);
}

.font-p {
  font-family: var(--font-body);
  font-size: var(--font-size-p);
}

.font-smallcaption {
  font-family: var(--font-dm-sans);
  font-size: var(--font-size-smallcaption);
  font-weight: 600;
  opacity: 70%;
  letter-spacing: var(--letter-spacing-smallcaption);
}

.font-smallcaption.with-love {
  font-family: var(--font-dm-sans);
  font-size: var(--font-size-with-love);
  font-weight: 600;
  opacity: 70%;
  letter-spacing: var(--letter-spacing-smallcaption);
}

.with-love {
  font-family: var(--font-dm-sans);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: var(--letter-spacing-with-love);
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
    font-size: var(--font-size-display-desktop);
  }

  .font-subheading.desktoplanding {
    font-family: var(--font-body);
    font-size: var(--font-size-subheading-desktop);
    letter-spacing: var(--letter-spacing-subheading);
  }
  
  @media (max-width: 376px) {
    .landing-section {
      transform: scale(1);
      transform-origin: center top;
    }

    .events-section {
      transform: scale(1);
      transform-origin: center top;
    }

    .wishes-section {
      transform: scale(1);
      transform-origin: center top;
    }

    .font-subheading {
      font-family: var(--font-body);
      font-size: var(--font-size-subheading);
      letter-spacing: var(--letter-spacing-subheading);
    }

    .font-display {
      font-family: var(--font-display);
      font-size: var(--font-size-display);
    }

    .font-display.dresscode{
      font-family: var(--font-display);
      font-size: var(--font-size-display-dresscode);
    }

    .font-button {
      font-family: var(--font-dm-sans);
      font-size: var(--font-size-button);
      letter-spacing: var(--letter-spacing-subheading);
    }

    .font-h3 {
      font-family: var(--font-light);
      font-size: var(--font-size-h3);
      letter-spacing: var(--letter-spacing-h3);
    }

    .font-h3.eventtime {
      font-family: var(--font-light);
      font-size: var(--font-size-h3-eventtime);
      margin-top: 4px;
      opacity: 90%;
    }

    .font-h2 {
      font-family: var(--font-light);
      font-size: var(--font-size-h2);
      letter-spacing: var(--letter-spacing-h2);
    }

    .font-h2.countdown {
      font-family: var(--font-light);
      font-size: var(--font-size-h2-countdown);
    }

    .font-p {
      font-family: var(--font-light);
      font-size: var(--font-size-p);
    }

    .font-smallcaption {
      font-family: var(--font-dm-sans);
      font-size: var(--font-size-smallcaption);
      font-weight: 600;
      opacity: 70%;
      letter-spacing: var(--letter-spacing-smallcaption);
    }
  }

  /* Mobile: Full screen video */
  @media (max-width: 1023px) {
    .video-background {
      /* Default styles work for mobile */
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
      <p class="font-subheading loading opacity-70">{Math.round(loadingProgress)}%</p>
    </div>
  </div>
{:else}

  <!-- Main Content - Only show after loading is complete -->
  <div in:fade={{ duration: 800 }}>
    <slot />
<div class="story-progress-bar">
  <div class="story-progress-fill"></div>
</div>
  

    <!-- Desktop Layout Wrapper -->
    <div class="hidden lg:flex h-screen overflow-hidden">
      <!-- Left Panel - New Landing Section (Desktop Only) -->
      <div class="w-full h-full relative overflow-hidden">
        <!-- Background Image Carousel -->
        {#if images.length > 0}
          <img
            src={images[0]}
            alt="Background"
            class="absolute inset-0 w-full h-full object-cover"
            style="object-position: 65%;"
          />
        {:else}
          <!-- Fallback background color while images load -->
          <div class="absolute inset-0 w-full h-full bg-black"></div>
        {/if}
        
        <!-- Dark overlay -->
        <!-- <div class="absolute inset-0 bg-black/25"></div> -->
        
        <!-- Content Overlay -->
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 px-8">
          <div class="flex flex-col items-center justify-center">
            <h1 class="font-display desktoplanding text-white rotate-[-6deg] text-center leading-none mb-22">
              <p class="m-0">{name1}</p>
              <p class="-m-3">&</p>
              <p class="m-0">{name2}</p>
            </h1>

            <p class="font-subheading desktoplanding uppercase text-white mb-12">
              {formatEventDate(primaryEvent?.event_date || invite.event_date, primaryEvent?.timezone)}
            </p>
            <p class="font-subheading">For the best experience, please view the invite on mobile.</p>
          </div>
        </div>
      </div>
    </div>
  
           
    <!-- Mobile Layout -->
   <div class="lg:hidden">
    <section class="h-[100vh] relative flex flex-col items-center justify-center text-center text-white">
    <div class="background-images">
      {#if backgroundImageUrl}
        <img
  src={backgroundImageUrl}
  alt="bg"
  class="relative w-full h-full object-cover"
  style="object-position: 55% center !important;"
/>
      {:else if images.length > 0}
        <img 
          src={images[1]} 
          alt="bg" 
          class="relative w-full h-full object-cover"
        />
      {/if}
      <div class="absolute inset-0 bg-black/40"></div>
    </div>
    <h1 class="font-h2 text-white mb-8">
      Dearest, {guest.full_name}<br>
      Hi, 亲爱的你
    </h1>
    <button 
      on:click={unlockScrollAndScrollDown}
      class="font-button text-white px-8 py-4 border border-white rounded-full hover:bg-white hover:text-black transition uppercase"
    >
      Join the Celebration
    </button>
  </section>


  <section bind:this={section} class="storytelling-container h-[100vh]">
      <div class="background-images">
    {#each images as img, i}
      <img 
        src={img} 
        alt="bg" 
        class="bg-slide" 
        class:active={i === currentBgIndex}
      />
    {/each}
  </div>
    <div class="storytelling-content">
      {#each lines as line, i}
    <h2 class="story-line story-line-{i}">
      <span class="line-inner">{@html line}</span>
    </h2>
  {/each}
      
      <!-- Scroll Down Indicator - Only shows on first line -->
      <div class="scroll-indicator">
        <div class="scale-50 opacity-80">
          <LottieClientOnly {arrowDown} />
        </div>
        <!-- <p class="scroll-text">Scroll to continue</p> -->
      </div>
    </div>
  </section>

      <!--End of Landing-->

      <!--Devotions-->
      <!-- {#if invite.section_toggle.includes("devotions")}
      <div id="devotions" class="relative z-10 flex flex-col items-center justify-center text-center min-h-[100vh] px-4 sm:px-6 space-y-8 sm:space-y-12"> 
        <img src="/cross.png" alt="cross" class="w-4 h-5 sm:w-3 sm:h-4 object-fill opacity-80 fade-in">
        <h1 class="font-h2 text-white fade-in">I have found the one whom my soul loves.</h1>
        <p class="font-smallcaption font-bold text-white uppercase tracking-[1em] sm:tracking-[1.5em] md:tracking-[2em] opacity-90 text-xs sm:text-sm fade-in">SONG OF SOLOMON 3:4</p>
        <div class="absolute bottom-40 left-1/2 -translate-x-1/2 w-20 h-20 flex justify-center items-center fade-in">
        </div>
      </div>
      {/if} -->
      <!--End of Devotions-->

      <!--Couple-->
      <!-- {#if invite.section_toggle.includes("groom-intro")}
      <div class="relative flex flex-col items-center">
        <div class="absolute inset-0 bg-black/15 z-[5]"></div>


        <img src="/groom.png" alt="Background" class="w-full h-full object-cover block">
        <img src="/snow.gif" alt="Overlay" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10">

 
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-3 px-4 fade-in">
          <img src="/deco3.png" alt="Top Deco" class="w-8 sm:w-10 mb-12 opacity-90">

          <div class="flex items-center space-x-4 mb-4">
            <img src="/deco1.png" alt="Left Deco" class="w-10 sm:w-14">
            <h4 class="font-smallcaption uppercase text-xs sm:text-sm">THE GROOM</h4>
            <img src="/deco2.png" alt="Right Deco" class="w-10 sm:w-14">
          </div>

   
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
      {/if} -->

      <!-- {#if invite.section_toggle.includes("bride-intro")}
      <div class="relative flex flex-col items-center">
        <div class="absolute inset-0 bg-black/15 z-[5]"></div>

 
        <img src="/bride.png" alt="Background" class="w-full h-full object-cover block">
        <img src="/snow.gif" alt="Overlay" class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10">

   
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 space-y-3 px-4 fade-in">
          <img src="/deco3.png" alt="Top Deco" class="w-8 sm:w-10 mb-12 opacity-90">

          <div class="flex items-center space-x-4 mb-4">
            <img src="/deco1.png" alt="Left Deco" class="w-10 sm:w-14">
            <h4 class="font-smallcaption uppercase text-xs sm:text-sm">THE BRIDE</h4>
            <img src="/deco2.png" alt="Right Deco" class="w-10 sm:w-14">
          </div>

    
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
      {/if} -->
      <!--End of Couple-->

      <!-- Events -->
      <div class="flex flex-col events-section min-h-[100vh] items-center justify-center text-center px-8 sm:px-10 md:px-12 py-10 sm:py-12 md:py-14 text-white ">
        {#each events as event, index}
          <!-- Check if this event type should be shown based on section_toggle -->
          {#if invite.section_toggle.includes(event.event_type) || invite.section_toggle.includes("events")}
            <div class="mb-14 w-full fade-in" class:mb-12={index === events.length - 1}>
              
              <!-- Show "Event" label only for the first event -->
              {#if index === 0}
                <p class="font-smallcaption uppercase opacity-80 mb-6">Chun Kit & Callyn</p>
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
      <div class="relative z-10 flex flex-col items-center justify-center text-center min-h-[100vh] px-8 sm:px-6 space-y-8 sm:space-y-12 md:space-y-16">
        <h1 class="font-h2 text-white mb-10 sm:mb-14 md:mb-22 fade-in">Until Our Celebration</h1>
     
         <img
          src="/calendar.png"
          alt="Calendar static"
          class="mb-20 mt-10 max-h-[35vh] sm:max-h-[40vh] md:max-h-[50vh] w-auto max-w-[80%] sm:max-w-[70%] md:max-w-[60%] object-contain mx-auto border-none"
        />
      
        
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

      <!-- Dress Code -->
      {#if invite.section_toggle.includes("dress-code")}
      <div class="relative w-full min-h-[100vh] z-10 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div class="fade-in">
          <!-- Content overlay -->
          <div class="text-white">
            <p class="font-smallcaption uppercase opacity-80 mb-6">DRESS CODE</p>
            
            <p class="font-h2 font-light text-white mb-2">Gentlemen:</p>
             <h4 class="font-h3 eventtime leading-6 mb-8">Suit up, but keep it cool. (ties optional)</h4>
            <p class="font-h2 font-light text-white mb-2"> Ladies:</p>
             <h4 class="font-h3 eventtime leading-6 mb-8">A dress to twirl (cocktail, midi or maxi)-<em>just no white, please</em></h4>
             
            

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
      <div class="relative w-full min-h-[100vh] wishes-section overflow-hidden">
        <div class="fade-in">
          <Wishes inviteId={invite.id}/>
        </div>
      </div>
      {/if}
      <!-- End of Wishes -->

      

      {#if invite.section_toggle.includes("faq")}
      <!-- Rundown -->
      <div class="relative w-full min-h-[100vh] overflow-hidden">
        <div class="fade-in">
          <div class="relative z-10 min-h-[100vh] flex flex-col items-center justify-center text-center text-white px-6 space-y-8">
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
      <!-- {#if invite.section_toggle.includes("our-moments")}
      <div class="relative z-10 flex flex-col items-center justify-center text-center h-[100vh] px-4 sm:px-6 space-y-6 sm:space-y-8 text-white">
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
      {/if} -->
      <!-- End of Our Moments -->

      {#if invite.section_toggle.includes("wedding-gift")}
      <!-- Wedding Gift-->
      <div class="relative z-10 flex flex-col items-center justify-center text-center h-[100vh] px-4 sm:px-6 space-y-6 sm:space-y-8 text-white fade-in">
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
      <div class="relative flex flex-col items-center w-full h-[100vh] fade-in">
        <div class="absolute inset-0 bg-black opacity-0 z-[5] transition-opacity duration-1000 ease-in"></div>
        
        <div class="absolute inset-0 flex flex-col items-center text-center text-white z-10 p-6 sm:p-8 md:p-10">
          <!-- Centered content -->
          <div class="flex-1 flex flex-col items-center justify-center space-y-3 sm:space-y-4">
            <p class="font-smallcaption uppercase opacity-80 mb-6">A Big Thank You</p>
            <h1 class="font-h2 mb-6">See You Soon!</h1>
            <h4 class="font-h3 eventtime">
              {@html (couple?.thank_you || '-').replace(/\n/g, '')}
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
{/if}
