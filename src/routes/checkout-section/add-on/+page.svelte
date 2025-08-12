<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import MaskText from '$lib/components/masktext.svelte';
  import { fade, scale } from 'svelte/transition';
  
   const AddOnHeading = [
  "Add-Ons",
];



  let orderData = {
    invite: { name: 'The Night We Met', price: 158000 },
    plan: { name: 'Essentials', price: 158000 },
    addons: [],
    total: 158000
  };
  
  const addons = [
    {
      id: 'custom-fonts',
      name: 'Custom Fonts',
      price: 22000,
      image: '/landingpage/card-placeholder.png',
      description: 'Personalize your invitation with custom typography'
    },
    {
      id: 'multilingual',
      name: 'Multilingual (Max 2.)',
      price: 52000,
      image: '/landingpage/card-placeholder.png',
      description: 'Support for multiple languages in your invitation'
    },
    {
      id: 'guestbook',
      name: 'Guestbook',
      price: 250000,
      image: '/landingpage/card-placeholder.png',
      description: 'Interactive guestbook for your guests'
    }
  ];
  
  onMount(() => {
    // Load order data from previous step
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('orderData');
      if (stored) {
        orderData = JSON.parse(stored);
      }
    }
  });
  
  function toggleAddon(addon) {
    const existingIndex = orderData.addons.findIndex(a => a.id === addon.id);
    
    if (existingIndex >= 0) {
      // Remove addon
      orderData.addons = orderData.addons.filter(a => a.id !== addon.id);
      orderData.total -= addon.price;
    } else {
      // Add addon
      orderData.addons = [...orderData.addons, addon];
      orderData.total += addon.price;
    }
    
    // Update storage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('orderData', JSON.stringify(orderData));
    }
  }
  
  function isAddonSelected(addonId) {
    return orderData.addons.some(a => a.id === addonId);
  }
  
  function handleNext() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('orderData', JSON.stringify(orderData));
      goto('/checkout-section/check-out');
    }
  }
  
  function goBack() {
    if (typeof window !== 'undefined') {
      goto('/checkout-section/plan-selection');
    }
  }
</script>

<svelte:head>
  <title>Add-ons - Step 2</title>
</svelte:head>

<div class="min-h-screen bg-[#FAFAF8] p-6 md:p-12">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-4xl md:text-5xl font-['Romie_Regular'] text-gray-900">
        <MaskText phrases={AddOnHeading} />
      </h1>
      
      <!-- Progress Steps -->
      <div class="flex items-center space-x-4">
        <div class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold cursor-pointer hover:bg-gray-400"
             on:click={goBack}
             role="button"
             tabindex="0">
          1
        </div>
        <div class="w-8 h-0.5 bg-gray-300"></div>
        <div class="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-semibold">
          2
        </div>
        <div class="w-8 h-0.5 bg-gray-300"></div>
        <div class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
          3
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
      <!-- Add-ons Grid -->
      <div class="lg:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {#each addons as addon}
            <div class="bg-transparent rounded-lg overflow-hidden">
              <!-- Addon Image -->
              
				<div class="relative w-full aspect-square group rounded-xl">
                <img 
                  src={addon.image} 
                  alt={addon.name}
                  class="w-full h-full object-cover transition duration-300 transform group-hover:scale-105 group-hover:brightness-70"
                />
                <!-- Overlay for selected state -->
                {#if isAddonSelected(addon.id)}
                  <div class="absolute inset-0 bg-black/20 flex items-center justify-center"
                   transition:fade={{ duration: 250 }}>
                    <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center"
                    transition:scale={{ duration: 300 }}>
                      <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/> -->
                      </svg>
                    </div>
                     <!-- <div class=" flex items-center justify-center">
                        <span class="bg-transparent text-white/80 px-3 py-2 sm:px-4 sm:py-2 rounded-md font-semibold text-xs sm:text-sm shadow-md tracking-[0.66px]">
                            SELECTED
                          </span>
                     </div> -->
                  </div>
                {/if}
              </div>
              
              <!-- Addon Details -->
              <div class="mt-4 flex flex-col items-start">
                <h3 class="text-lg tracking-[0.66px]">{addon.name}</h3>
                <p class="text-sm sm:text-lg text-gray-400 text-left tracking-[0.66px] mb-4">
                  Rp. {addon.price.toLocaleString()}
                </p>
                
                <button 
                  class="transition-transform hover:scale-[1.02] w-full py-3 px-4 rounded-lg font-semibold text-sm tracking-widest {isAddonSelected(addon.id) ? 'bg-red-600 text-white hover:bg-red-600' : 'bg-black text-white'}"
                  on:click={() => toggleAddon(addon)}
                >
                  {isAddonSelected(addon.id) ? 'REMOVE FROM CART' : 'ADD TO CART'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Order Summary -->
      <div class="bg-transparent p-4 h-fit">
        <h3 class="text-gray-500 font-semibold tracking-[0.33px] text-sm mb-3">
          YOUR ORDERS
        </h3>
         <hr class="mb-4">
        <!-- Invite Section -->
        <div class="border-b border-gray-200 pb-6 mb-6">
          <h4 class="text-gray-500 font-semibold text-sm mb-4">INVITE</h4>
          <div class="flex justify-between items-start mb-12">
            <div>
              <p class="text-lg">{orderData.invite.name}</p>
              <p class="text-gray-500 tracking-[0.33px] text-sm mt-1">{orderData.plan.name} Bundle</p>
            </div>
            <p class="text-lg">
              Rp. {orderData.plan.price.toLocaleString()}
            </p>
          </div>
        </div>
        
        <!-- Add-ons Section -->
        {#if orderData.addons.length > 0}
          <div class="border-b border-gray-200 pb-6 mb-6">
            <h4 class="text-gray-500 font-semibold text-sm mb-4">ADD-ONS</h4>
            {#each orderData.addons as addon}
              <div class="flex justify-between items-center mb-1">
                <p class="text-lg">{addon.name}</p>
                <p class="font-semibold text-lg">Rp. {addon.price.toLocaleString()}</p>
              </div>
            {/each}
          </div>
        {/if}
        
        <!-- Total Section -->
        <div class="border-b border-gray-200 pb-6 mb-8">
          <div class="flex justify-between items-center">
            <span class="font-bold text-lg tracking-[0.33px]">TOTAL</span>
            <span class="font-bold text-xl tracking-[0.33px]">
              Rp. {orderData.total.toLocaleString()}
            </span>
          </div>
        </div>
        
        <button 
          class="transition-transform hover:scale-[1.02] w-full bg-black text-white py-4 rounded-lg font-semibold text-lg tracking-widest  transition-colors"
          on:click={handleNext}
        >
          NEXT
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
  :global(body) {
    font-family: 'DM Sans', sans-serif;
    background-color: #FAFAF8;
	color: #000;
  }
</style>