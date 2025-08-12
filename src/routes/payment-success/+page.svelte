<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // Clear stored order data
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('orderData');
    }
  });
</script>

<div class="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
  <div class="bg-white rounded-3xl p-8 max-w-md w-full text-center">
    <h1 class="text-3xl font-['Romie_Regular'] mb-4">Payment Successful!</h1>
    <p class="text-gray-600 mb-8">
      Thank you for your order. We'll contact you via WhatsApp shortly to collect your event details.
    </p>
    <button 
      class="bg-black text-white px-8 py-3 rounded-lg"
      on:click={() => goto('/')}
    >
      Return Home
    </button>
  </div>
</div>