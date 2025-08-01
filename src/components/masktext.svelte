<script>
import { onMount } from 'svelte';

// Props
export let phrases = [
  "It is a long established fact",
  "that a reader will be distracted", 
  "by the readable content of a page",
  "when looking at its layout."
];

export let once = false; // Changed to false for repeat animations

// Variables
let containerRef;
let textElements = [];
let isInView = false;

onMount(() => {
  if (!containerRef) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
        isInView = true;
        animateIn();
        if (once) {
          observer.unobserve(containerRef);
        }
      } else if (!once) {
        // Reset animation when out of view (for repeat animations)
        isInView = false;
        resetAnimation();
      }
    },
    {
      threshold: [0.2],
      rootMargin: "0px 0px -50px 0px"
    }
  );

  observer.observe(containerRef);

  return () => observer.disconnect();
});


function resetAnimation() {
  textElements.forEach((element) => {
    if (element) {
      element.style.transition = 'transform 0.3s ease-out';
      element.style.transform = 'translateY(100%)';
    }})};

function animateIn() {
  textElements.forEach((element, index) => {
    if (element) {
      // Reset position
      element.style.transform = 'translateY(100%)';
      
      // Animate with delay
      setTimeout(() => {
        element.style.transition = 'transform 0.8s cubic-bezier(0.33, 1, 0.68, 1)';
        element.style.transform = 'translateY(0%)';
      }, index * 75);
    }
  });
}



</script>

<div bind:this={containerRef} class="mask-text-container">
  {#each phrases as phrase, index}
    <div class="line-mask">
      <p bind:this={textElements[index]} class="mask-text-line">
        {phrase}
      </p>
    </div>
  {/each}
</div>

<style>
.mask-text-container {
  /* font-size: clamp(1.5rem, 5vw, 4rem); */
  line-height: 1.5;
}

.line-mask {
  overflow: hidden;
}

.mask-text-line {
  margin: 0;
  transform: translateY(100%);
  will-change: transform;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .mask-text-container {
    /* font-size: clamp(1.2rem, 4vw, 2.5rem); */
  }
}
</style>