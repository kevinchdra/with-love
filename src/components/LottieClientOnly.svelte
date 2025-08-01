<script>
  import { onMount } from 'svelte';
  import lottie from 'lottie-web';
  import animationData from '$lib/lottie/arrowDown.json';

  let container;

  onMount(() => {
    lottie.loadAnimation({
      container: container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
    });
  });
</script>

<div bind:this={container} class="w-16 h-16"></div>