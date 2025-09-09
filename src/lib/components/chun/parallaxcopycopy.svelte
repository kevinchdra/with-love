<!-- Parallax.svelte -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  
  export let guest = { full_name: 'Guest' };
  export let clientSlug = ''; // Pass the client slug to get their specific images
  
  let gsap, ScrollTrigger;
  let mounted = false;
  let fontsLoaded = false;
  let imageUrls = [];
  
  const lines = [
    `Dearest, ${guest.full_name}`,
    "By the time you read this,",
    "our wedding day will already be drawing near.",
    "We used to think a wedding was simply a formality,",
    "but now we know, it is a rare and precious gathering,",
    "a journey of love from miles away,",
    "a gift of presence we will forever treasure.",
    "In a lifetime of more than 30,000 days,",
    "what moves us most,",
    "is that you've chosen to spend this one day with us.",
    "This day,",
    "our wedding day,",
    "will forever be extraordinary,",
    "because you have chosen to share it with us.",
    "Your presence is the greatest blessing,",
    "a reminder that love is not just between two people,",
    "but carried and strengthened by the hearts around them.",
    "Thank you for coming,",
    " thank you for standing by us.",
    "It's been a while but we can't wait to see you at the wedding.",
    ""
  ];
  
  // Load images from Supabase bucket
  async function loadImagesFromSupabase() {
    try {
      // Generate image URLs directly since we know the naming pattern
      const maxImages = 20; // Adjust based on how many images you typically have
      const urls = [];
      
      // Try to load images 1.webp, 2.webp, etc.
      for (let i = 1; i <= maxImages; i++) {
        const fileName = `${i}.webp`;
        const { data } = supabase.storage
          .from('invites-images')
          .getPublicUrl(`${clientSlug}/${fileName}`);
        
        // Check if the image actually exists by attempting to fetch it
        try {
          const response = await fetch(data.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            urls.push(data.publicUrl);
          } else {
            // Stop trying once we hit a missing image
            break;
          }
        } catch {
          // Stop trying once we hit a missing image
          break;
        }
      }
      
      imageUrls = urls.length > 0 ? urls : [
        // Fallback images if no images found for this client
        '/1.jpg', '/2.jpg', '/4.jpg', '/5.jpg', 
        '/6.jpg', '/7.jpg', '/8.jpg'
      ];
      
    } catch (error) {
      console.error('Error in loadImagesFromSupabase:', error);
      // Fallback to default images
      imageUrls = [
        '/1.jpg', '/2.jpg', '/4.jpg', '/5.jpg', 
        '/6.jpg', '/7.jpg', '/8.jpg'
      ];
    }
  }
  
  // Helper function to get image URL by index with cycling
  function getImageUrl(index) {
    if (imageUrls.length === 0) return '/placeholder.jpg';
    return imageUrls[index % imageUrls.length];
  }
  
  // Wait for fonts to load
  async function waitForFonts() {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
        fontsLoaded = true;
      } else {
        // Fallback for browsers without FontFaceSet API
        setTimeout(() => {
          fontsLoaded = true;
        }, 1000);
      }
    } catch (error) {
      console.warn('Font loading detection failed, proceeding anyway:', error);
      fontsLoaded = true;
    }
  }
  
  onMount(async () => {
    const baseSection = document.querySelector('.section.base');
    if (baseSection) {
      baseSection.style.backgroundColor = '#FBF9EF';
    }
    
    try {
      // Load images first
      await loadImagesFromSupabase();
      
      // Import GSAP modules (no SplitText needed)
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      
      gsap = gsapModule.gsap;
      ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      
      // Register plugins
      gsap.registerPlugin(ScrollTrigger);
      
      mounted = true;
      
      // Wait for DOM to be ready and fonts to load
      await tick(); // Ensure DOM is updated
      await waitForFonts();
      
      // Add small delay to ensure everything is rendered
      setTimeout(initAnimations, 100);
      
    } catch (error) {
      console.error('Error loading GSAP modules:', error);
    }
  });
  
  onDestroy(() => {
    // Clean up ScrollTrigger instances
    if (ScrollTrigger) {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    }
  });
  
  function initAnimations() {
    if (!mounted || !gsap || !fontsLoaded) {
      console.warn('Skipping animations - not ready yet');
      return;
    }
    
    // Get all scroll wrappers and text elements with null checks
    const scrollWrappers = document.querySelectorAll('.scroll-wrapper-single');
    if (!scrollWrappers.length) {
      console.warn('No scroll wrappers found');
      return;
    }
    
    // Set initial states for all wrappers and text elements
    scrollWrappers.forEach((wrapper, index) => {
      if (!wrapper) return;
      
      const textElement = wrapper.querySelector('.text-h2');
      
      if (index === 0) {
        // First element visible
        gsap.set(wrapper, { opacity: 1 });
        if (textElement) {
          gsap.set(textElement, { opacity: 1, scale: 1 });
        }
      } else {
        // All others hidden and scaled down
        gsap.set(wrapper, { opacity: 0 });
        if (textElement) {
          gsap.set(textElement, { opacity: 0, scale: 0.9 });
        }
      }
    });
    
    // Create main scroll timeline
    const masterScroll = document.querySelector('.master-scroll');
    if (!masterScroll) {
      console.warn('Master scroll element not found');
      return;
    }
    
    scrollWrappers.forEach((wrapper, index) => {
      if (!wrapper) return;
      
      const textElement = wrapper.querySelector('.text-h2');
      
      ScrollTrigger.create({
        trigger: masterScroll,
        start: `${(index / scrollWrappers.length) * 100}% center`,
        end: `${((index + 1) / scrollWrappers.length) * 100}% center`,
        toggleActions: "play reverse play reverse",
        
        onEnter: () => {
          // Kill any existing animations
          gsap.killTweensOf(wrapper);
          if (textElement) gsap.killTweensOf(textElement);
          
          // Animate current wrapper in
          gsap.to(wrapper, { 
            opacity: 1, 
            duration: 0.6, 
            ease: "power2.out",
            overwrite: "auto"
          });
          
          // Animate text scale and fade in
          if (textElement) {
            gsap.to(textElement, {
              opacity: 1,
              scale: 1,
              duration: 2,
              ease: "back.out(0.5)",
              delay: 0.2,
              overwrite: "auto"
            });
          }
          
          // Hide previous wrapper
          if (index > 0) {
            const prevWrapper = scrollWrappers[index - 1];
            const prevTextElement = prevWrapper?.querySelector('.text-h2');
            
            if (prevWrapper) {
              gsap.killTweensOf(prevWrapper);
              gsap.to(prevWrapper, { 
                opacity: 0, 
                duration: 0.4, 
                ease: "power2.out",
                overwrite: "auto"
              });
            }
            
            if (prevTextElement) {
              gsap.killTweensOf(prevTextElement);
              gsap.to(prevTextElement, {
                opacity: 0,
                scale: 0.9,
                duration: 0.4,
                ease: "power2.out",
                overwrite: "auto"
              });
            }
          }
        },
        
        onLeave: () => {
          // Kill animations and hide
          gsap.killTweensOf(wrapper);
          if (textElement) gsap.killTweensOf(textElement);
          
          gsap.to(wrapper, { 
            opacity: 0, 
            duration: 0.4, 
            ease: "power2.out",
            overwrite: "auto"
          });
          
          if (textElement) {
            gsap.to(textElement, {
              opacity: 0,
              scale: 0.9,
              duration: 0.4,
              ease: "power2.out",
              overwrite: "auto"
            });
          }
        },
        
        onEnterBack: () => {
          // Kill animations
          gsap.killTweensOf(wrapper);
          if (textElement) gsap.killTweensOf(textElement);
          
          // Show current wrapper
          gsap.to(wrapper, { 
            opacity: 1, 
            duration: 0.6, 
            ease: "power2.out",
            overwrite: "auto"
          });
          
          if (textElement) {
            gsap.to(textElement, {
              opacity: 1,
              scale: 1,
              duration: 0.8,
              ease: "back.out(1.2)",
              delay: 0.2,
              overwrite: "auto"
            });
          }
          
          // Hide next wrapper
          if (index < scrollWrappers.length - 1) {
            const nextWrapper = scrollWrappers[index + 1];
            const nextTextElement = nextWrapper?.querySelector('.text-h2');
            
            if (nextWrapper) {
              gsap.killTweensOf(nextWrapper);
              gsap.to(nextWrapper, { 
                opacity: 0, 
                duration: 0.4, 
                ease: "power2.out",
                overwrite: "auto"
              });
            }
            
            if (nextTextElement) {
              gsap.killTweensOf(nextTextElement);
              gsap.to(nextTextElement, {
                opacity: 0,
                scale: 1.1,
                duration: 0.4,
                ease: "power2.out",
                overwrite: "auto"
              });
            }
          }
        },
        
        onLeaveBack: () => {
          // Kill animations and hide
          gsap.killTweensOf(wrapper);
          if (textElement) gsap.killTweensOf(textElement);
          
          gsap.to(wrapper, { 
            opacity: 0, 
            duration: 0.4, 
            ease: "power2.out",
            overwrite: "auto"
          });
          
          if (textElement) {
            gsap.to(textElement, {
              opacity: 0,
              scale: 1.1,
              duration: 0.4,
              ease: "power2.out",
              overwrite: "auto"
            });
          }
        }
      });
    });
    
    // Parallax effects for images
    const scrollImages = document.querySelectorAll('.scroll-image-large, .scroll-image-small, .scroll-image-vertical, .scroll-image-horizontall');
    scrollImages.forEach(image => {
      if (!image) return;
      
      ScrollTrigger.create({
        trigger: image,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const yPos = (progress - 0.5) * 100;
          gsap.to(image, {
            y: yPos,
            duration: 0.4,
            ease: "back.out(1.2)",
            overwrite: "auto"
          });
        }
      });
    });
    
    // SVG icon animations (only for sections that have SVGs)
    const svgIcons = [
      { selector: ".wave-svg", rotation: 360 },
      { selector: ".eye-svg", scale: [0.8, 1.2] },
      { selector: ".gsap-svg", rotation: -180 },
      { selector: ".smiley-svg", rotation: 720 }
    ];
    
    svgIcons.forEach(({ selector, rotation, scale }) => {
      const element = document.querySelector(selector);
      if (element) {
        const wrapper = element.closest('.scroll-wrapper-single');
        if (wrapper) {
          ScrollTrigger.create({
            trigger: wrapper,
            start: "top center",
            end: "bottom center",
            scrub: 2,
            onUpdate: (self) => {
              if (rotation) {
                gsap.set(element, {
                  rotation: rotation * self.progress
                });
              }
              if (scale) {
                const scaleValue = scale[0] + (scale[1] - scale[0]) * self.progress;
                gsap.set(element, {
                  scale: scaleValue
                });
              }
            }
          });
        }
      }
    });
    
    // Background color changes per section
    const backgroundSection = document.querySelector('.section.base');
    if (backgroundSection) {
      const sectionColors = [
        '#DEE5EB','#DCE2E7','#D9DFE3','#D7DCDF','#D4D9DB',
        '#D2D6D7','#CFD3D3','#CDD0CF','#CACDCB','#C8CAC7',
        '#C5C7C3','#C3C4BF','#C0C1BB','#D3CBAE'
];
      // One timeline that spans the entire masterScroll
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: document.querySelector('.master-scroll'),
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      // Evenly distribute the color steps across the timeline
      const steps = sectionColors.length - 1;
      gsap.set(backgroundSection, { backgroundColor: sectionColors[0] });
      sectionColors.forEach((color, i) => {
        if (i === 0) return;
        tl.to(backgroundSection, { backgroundColor: color }, i / steps);
      });
    }
    
    // Refresh ScrollTrigger after DOM updates
    ScrollTrigger.refresh();
  }
</script>

<section id="base" class="section base">
  <div class="main-container">
    <div class="scroll-section-top-tile">
    </div>
    <div class="master-scroll">
      <div class="text-master-scroll-center">
        {#each lines as line, index}
          <div class="scroll-wrapper-single _{index + 1}">
            <div class="text-wrap-scroll">
              <div class="text-h2 scroll-{index + 1}">{line}</div>
            </div>
            
            <!-- Add SVG icons to specific sections -->
            {#if index === 2}
              <!-- <img src="/images/wavy-line.svg" loading="lazy" alt="" class="wave-svg"> -->
            {/if}
            {#if index === 5}
              <!-- <img src="/images/eye.svg" loading="lazy" alt="" class="eye-svg"> -->
            {/if}
            {#if index === 8}
              <!-- <img src="/images/gsap.svg" loading="lazy" alt="" class="gsap-svg"> -->
            {/if}
            {#if index === 11}
              <!-- <img src="/images/smiley.svg" loading="lazy" alt="" class="smiley-svg"> -->
            {/if}
          </div>
        {/each}
      </div>
      <div class="images-scroll-block">
        <div class="master-scroll-images">
          <!-- Images start appearing from the second text line (index 1) -->
          <div class="scroll-image-large _1" style="margin-top: 100vh;">
            {#if imageUrls.length > 0}
              <img src={getImageUrl(0)} loading="lazy" alt="" class="image-cover">
            {:else}
              <div class="w-full h-full bg-[#F5F1E8]"></div>
            {/if}
          </div>
          <div class="scroll-image-large _3" style="margin-top: 60vh;">
            {#if imageUrls.length > 0}
              <img src={getImageUrl(1)} loading="lazy" alt="" class="image-cover">
            {:else}
              <div class="w-full h-full "></div>
            {/if}
          </div>
          <div class="scroll-image-large _4" style="margin-top: 60vh;">
            {#if imageUrls.length > 0}
              <img src={getImageUrl(2)} loading="lazy" alt="" class="image-cover">
            {:else}
              <div class="w-full h-full "></div>
            {/if}
          </div>
          <div class="scroll-image-large _2" style="margin-top: 60vh;">
            {#if imageUrls.length > 0}
              <img src={getImageUrl(3)} loading="lazy" alt="" class="image-cover">
            {:else}
              <div class="w-full h-full "></div>
            {/if}
          </div>
          <div class="scroll-image-large _4" style="margin-top: 60vh;">
            {#if imageUrls.length > 0}
              <img src={getImageUrl(4)} loading="lazy" alt="" class="image-cover">
            {:else}
              <div class="w-full h-full "></div>
            {/if}
          </div>
            <div class="scroll-image-large _2" style="margin-top: 60vh;">
            {#if imageUrls.length > 0}
              <img src={getImageUrl(5)} loading="lazy" alt="" class="image-cover">
            {:else}
              <div class="w-full h-full"></div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
@import url('https://fonts.googleapis.com/css2?family=Cabin:ital,wght@0,400..700;1,400..700&family=Martel+Sans:wght@200;300;400;600;700;800;900&family=Outfit:wght@100..900&display=swap');

  /* CSS Variables */
  :global(:root) {
    --font-heading-sans: "Fustat", sans-serif;
    --font-heading-serif: "Cabin", sans-serif;
    --font-ui: "Fustat", sans-serif;
    --font-weight-medium: 500;
    --font-weight-normal: 400;
    --spacing-site-padding-main: 24px;
    --spacing-0: 0px;
    --spacing-8: 8px;
    --spacing-16: 16px;
    --spacing-24: 24px;
    --spacing-32: 32px;
    --spacing-48: 48px;
    --spacing-80: 80px;
    --spacing-160: 160px;
    --radius-3: 8px;
  }

  /* Base section styles */
  .section {
    z-index: 2;
    padding-top: var(--spacing-80);
    padding-bottom: var(--spacing-80);
    position: relative;
  }

  .section.base {
    padding-top: var(--spacing-48);
    border-top-left-radius: var(--radius-3);
    border-top-right-radius: var(--radius-3);
    padding-bottom: 200px;
    overflow: clip;
  }

  .main-container {
    z-index: 2;
    padding-right: var(--spacing-site-padding-main);
    padding-left: var(--spacing-site-padding-main);
    width: 100%;
    max-width: none;
    margin-left: auto;
    margin-right: auto;
  }

  /* Scroll section styles */
  .scroll-section-top-tile {
    grid-column-gap: var(--spacing-16);
    grid-row-gap: var(--spacing-16);
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    margin-bottom: 26.042vw;
    display: flex;
  }

  /* Master scroll styles */
  .master-scroll {
    position: relative;
    height: 700vh;
  }

  .text-master-scroll-center {
    grid-column-gap: 16px;
    grid-row-gap: 16px;
    flex-flow: column;
    justify-content: center;
    align-items: center;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    position: sticky;
    top: 50%;
    z-index: 10;
  }

  .scroll-wrapper-single {
    grid-column-gap: var(--spacing-16);
    grid-row-gap: var(--spacing-16);
    opacity: 0;
    text-align: center;
    flex-flow: column;
    justify-content: center;
    align-items: center;
    display: flex;
    position: absolute;
    will-change: opacity;
    max-width: 800px;
    padding: 0 20px;
  }

  .scroll-wrapper-single._1 {
    opacity: 1;
  }

  .text-wrap-scroll {
    text-align: center;
  }

  .text-h2 {
    font-family: var(--font-heading-serif);
    font-size: 2em;
    line-height: 110%;
    font-weight: var(--font-weight-normal);
    letter-spacing: -4px;
    will-change: transform, opacity;
    transform-origin: center center;
  }

  /* SVG Icons */
  .wave-svg {
    z-index: -1;
    width: 288px;
    position: absolute;
    will-change: transform;
    transform-origin: center center;
  }

  .eye-svg {
    z-index: -1;
    width: 280px;
    position: absolute;
    top: -18.5938px;
    left: -33.156px;
    will-change: transform;
    transform-origin: center center;
  }

  .gsap-svg {
    z-index: -1;
    width: 453px;
    max-width: none;
    position: absolute;
    will-change: transform;
    transform-origin: center center;
  }

  .smiley-svg {
    z-index: -1;
    width: 216px;
    max-width: none;
    display: block;
    position: absolute;
    top: 19.5px;
    right: -93.227px;
    will-change: transform;
    transform-origin: center center;
  }

  /* Images scroll block */
  .images-scroll-block {
    z-index: 1;
  }

  .master-scroll-images {
    flex-flow: column;
    margin-bottom: 20px;
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .image-cover {
    object-fit: cover;
    width: 100%;
    height: 100%;
  }

  /* Scroll images - All centered */
  .scroll-image-large {
    border-radius: var(--radius-3);
    width: 432px;
    height: 393px;
    margin: 0 auto;
    position: relative;
    opacity: 0.9;
  }

  .scroll-image-large._1 {
    margin-top: 20vh;
  }

  .scroll-image-large._2 {
    margin-top: 60vh;
  }

  .scroll-image-large._3 {
    margin-top: 60vh;
    rotate: -2deg;
  }

  .scroll-image-large._4 {
    margin-top: 60vh;
    rotate: 2deg;
  }

  .scroll-image-large.heading-404 {
    margin-top: -80px;
  }

  .scroll-image-small {
    border-radius: var(--radius-3);
    width: 12.986vw;
    height: 12.986vw;
    position: relative;
    overflow: hidden;
    will-change: transform;
  }

  .scroll-image-small._1 {
    margin-left: 30%;
  }

  .scroll-image-small._2 {
    margin-top: 95px;
    margin-left: auto;
    margin-right: 15%;
  }

  .scroll-image-small._5 {
    margin-top: 95px;
    margin-left: 5%;
  }

  .scroll-image-small._6 {
    margin-top: 227px;
    margin-left: 10%;
  }

  .scroll-image-vertical {
    border-radius: var(--radius-3);
    width: 269px;
    height: 323px;
    overflow: hidden;
    will-change: transform;
  }

  .scroll-image-vertical._1 {
    margin-left: auto;
    margin-right: 3%;
  }

  .scroll-image-horizontall {
    border-radius: var(--radius-3);
    width: 306px;
    height: 187px;
    overflow: hidden;
    will-change: transform;
  }

  .scroll-image-horizontall._1 {
    margin-right: 20%;
  }

  .scroll-row._1 {
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 535px;
    display: flex;
  }

  .scroll-row._2 {
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 70px;
    display: flex;
  }

  /* Responsive Design */
  @media screen and (min-width: 1440px) {
    :global(:root) {
      --spacing-site-padding-main: 1.667vw;
      --spacing-48: 3.333vw;
      --spacing-80: 5.556vw;
      --spacing-160: 11.111vw;
      --radius-3: 0.556vw;
    }

    .section.base {
      padding-bottom: 10.417vw;
    }

    .wave-svg, .eye-svg {
      width: 20vw;
    }

    .gsap-svg {
      width: 31.458vw;
    }

    .smiley-svg {
      width: 15vw;
    }

    .text-h2 {
      font-size: 4.444vw;
      letter-spacing: -0.278vw;
    }

    .scroll-image-small {
      width: 12.986vw;
      height: 12.986vw;
    }

    .scroll-image-large {
      width: 24.722vw;
      height: 24.722vw;
    }

    .scroll-image-vertical {
      width: 18.681vw;
      height: 22.431vw;
    }

    .scroll-image-horizontall {
      width: 21.25vw;
      height: 12.986vw;
    }
  }

  @media screen and (max-width: 991px) {
    .section.base {
      padding-bottom: 120px;
    }

    .scroll-section-top-tile {
      flex-flow: column;
      justify-content: space-between;
      align-items: flex-end;
    }

    .text-h2 {
      font-size: 48px;
      letter-spacing: -2px;
    }

    .scroll-image-small {
      width: 120px;
      height: 120px;
    }

    .scroll-image-large {
      width: 232px;
      height: 293px;
      margin: 0 auto;
      position: relative;
      opacity: 0.9;
    }

    .scroll-image-large._3 {
      margin-top: 60vh;
    }

    .scroll-image-vertical {
      width: 220px;
      height: 280px;
    }

    .scroll-row._1 {
      margin-top: 400px;
    }

    .scroll-image-horizontall {
      width: 250px;
      height: 140px;
    }
  }

  @media screen and (max-width: 767px) {
    :global(:root) {
      --spacing-site-padding-main: 16px;
      --spacing-48: 32px;
      --spacing-80: 64px;
      --spacing-160: 120px;
      --radius-3: 4px;
    }

    .section.base {
      padding-bottom: 80px;
    }

    .master-scroll {
      padding-top: 100px;
    }

    .wave-svg, .eye-svg {
      width: 200px;
    }

    .gsap-svg {
      width: 320px;
    }

    .smiley-svg {
      width: 140px;
      right: -70.227px;
    }

    .text-h2 {
      font-size: 2em;
      letter-spacing: -1px;
      line-height: 110%;
    }

    .scroll-wrapper-single {
      max-width: 90%;
    }

    .scroll-image-small {
      width: 90px;
      height: 90px;
    }

    .scroll-image-small._1 {
      margin-top: 60px;
      margin-left: 10%;
    }

    .scroll-image-large {
      width: 232px;
      height: 293px;
      margin: 0 auto;
      position: relative;
      opacity: 0.9;
    }

    .scroll-image-vertical {
      width: 132px;
      height: 159px;
    }

    .scroll-image-horizontall {
      width: 200px;
      height: 100px;
    }

    .scroll-row._1 {
      flex-flow: column;
      justify-content: center;
      align-items: stretch;
      margin-top: 250px;
    }

    .scroll-row._2 {
      flex-flow: column;
    }
  }
</style>