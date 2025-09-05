<script>
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  
  // Props
  export let clientSlug;
  export let guest;
  
  // Text lines to cycle through
  const lines = [
    "Welcome to our celebration",
    "A journey of love begins",
    "Two hearts become one",
    "Join us for our special day",
    "Love is in the air",
    "Our story unfolds",
    "Together forever starts now",
    "Witness our union"
  ];
  
  // State variables
  let currentLineIndex = 0;
  let currentImageIndex = 0;
  let backgroundImages = [];
  let isLoading = true;
  let textInterval;
  let imageInterval;
  
  // Load background images from Supabase
  async function loadBackgroundImages() {
    try {
      const imageUrls = [];
      let imageIndex = 1;
      let hasMoreImages = true;
      
      // Try to load images sequentially (1.webp, 2.webp, etc.)
      while (hasMoreImages && imageIndex <= 20) { // Limit to prevent infinite loop
        try {
          const { data, error } = supabase
            .storage
            .from('invites-images')
            .getPublicUrl(`${clientSlug}/${imageIndex}.webp`);
          
          if (error) {
            console.warn(`Image ${imageIndex}.webp not found:`, error);
            hasMoreImages = false;
            break;
          }
          
          // Test if image actually exists by trying to load it
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = data.publicUrl;
          });
          
          imageUrls.push(data.publicUrl);
          imageIndex++;
          
        } catch (loadError) {
          console.warn(`Failed to load image ${imageIndex}.webp:`, loadError);
          hasMoreImages = false;
        }
      }
      
      if (imageUrls.length === 0) {
        // Fallback: try to list all images in the folder
        const { data: files, error: listError } = await supabase
          .storage
          .from('invites-images')
          .list(clientSlug, { limit: 100 });
          
        if (!listError && files) {
          const webpFiles = files
            .filter(file => file.name.endsWith('.webp') && /^\d+\.webp$/.test(file.name))
            .sort((a, b) => parseInt(a.name) - parseInt(b.name));
            
          for (const file of webpFiles) {
            const { data } = supabase
              .storage
              .from('invites-images')
              .getPublicUrl(`${clientSlug}/${file.name}`);
            imageUrls.push(data.publicUrl);
          }
        }
      }
      
      if (imageUrls.length > 0) {
        backgroundImages = imageUrls;
        console.log(`Loaded ${backgroundImages.length} background images`);
      } else {
        console.warn('No background images found, using fallback');
        // You can add fallback images here if needed
      }
      
    } catch (error) {
      console.error('Error loading background images:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Start text cycling
  function startTextCycling() {
    textInterval = setInterval(() => {
      currentLineIndex = (currentLineIndex + 1) % lines.length;
    }, 3000); // Change text every 3 seconds
  }
  
  // Start image cycling - changes after every 2 text changes (6 seconds)
  function startImageCycling() {
    if (backgroundImages.length === 0) return;
    
    imageInterval = setInterval(() => {
      currentImageIndex = (currentImageIndex + 1) % backgroundImages.length;
    }, 6000); // Change image every 6 seconds (after 2 text changes)
  }
  
  // Preload next image for smooth transition
  function preloadNextImage() {
    if (backgroundImages.length === 0) return;
    
    const nextIndex = (currentImageIndex + 1) % backgroundImages.length;
    const img = new Image();
    img.src = backgroundImages[nextIndex];
  }
  
  onMount(async () => {
    await loadBackgroundImages();
    
    if (!isLoading) {
      startTextCycling();
      startImageCycling();
      
      // Preload next image initially
      if (backgroundImages.length > 1) {
        preloadNextImage();
      }
    }
  });
  
  onDestroy(() => {
    if (textInterval) clearInterval(textInterval);
    if (imageInterval) clearInterval(imageInterval);
  });
  
  // Reactive statement to preload next image when current changes
  $: if (backgroundImages.length > 0) {
    preloadNextImage();
  }
</script>

<style>
  .landing-container {
    position: relative;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
  }
  
  .background-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: opacity 1s ease-in-out;
  }
  
  .content-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    z-index: 10;
    padding: 2rem;
  }
  
  .text-content {
    text-align: center;
    color: white;
  }
  
  .cycling-text {
    opacity: 0;
    transform: translateY(20px);
    animation: fadeInUp 0.8s ease-out forwards;
    min-height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .loading-state {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  /* Font classes from your existing styles */
  .font-display {
    font-family: var(--font-display);
    font-size: 3rem;
    line-height: 1.1;
  }
  
  .font-subheading {
    font-family: var(--font-subheading);
    font-size: 0.875rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
  }
  
  @media (min-width: 640px) {
    .font-display {
      font-size: 3.5rem;
    }
    
    .font-subheading {
      font-size: 1rem;
    }
  }
  
  @media (min-width: 768px) {
    .font-display {
      font-size: 4rem;
    }
  }
</style>

<div class="landing-container">
  <!-- Background Images -->
  {#if isLoading}
    <div class="absolute inset-0 loading-state"></div>
  {:else if backgroundImages.length > 0}
    {#each backgroundImages as image, index}
      <img 
        src={image} 
        alt="Background {index + 1}"
        class="background-image"
        class:opacity-100={index === currentImageIndex}
        class:opacity-0={index !== currentImageIndex}
        loading={index === 0 ? 'eager' : 'lazy'}
      />
    {/each}
  {:else}
    <!-- Fallback background -->
    <div class="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700"></div>
  {/if}
  
  <!-- Content Overlay -->
  <div class="content-overlay">
    <div class="text-content">
      <!-- Guest Name (if available) -->
      {#if guest?.guest_name}
        <p class="font-subheading mb-4 opacity-90">
          Dear {guest.guest_name}
        </p>
      {/if}
      
      <!-- Cycling Text -->
      <div class="cycling-text" key={currentLineIndex}>
        <h1 class="font-display">
          {lines[currentLineIndex]}
        </h1>
      </div>
      
      <!-- Optional: Add a scroll indicator -->
      <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div class="w-6 h-10 border-2 border-white rounded-full opacity-75">
          <div class="w-1 h-3 bg-white rounded-full mx-auto mt-2 animate-bounce"></div>
        </div>
      </div>
    </div>
  </div>
</div>