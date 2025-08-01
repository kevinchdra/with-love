<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
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
      image: '/api/placeholder/280/280',
      description: 'Personalize your invitation with custom typography'
    },
    {
      id: 'multilingual',
      name: 'Multilingual (Max 2.)',
      price: 52000,
      image: '/api/placeholder/280/280',
      description: 'Support for multiple languages in your invitation'
    },
    {
      id: 'guestbook',
      name: 'Guestbook',
      price: 250000,
      image: '/api/placeholder/280/280',
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
    <div class="flex items-center justify-between mb-12">
      <h1 class="text-4xl md:text-5xl font-['Romie_Regular'] text-gray-900">
        Add-ons
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

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Add-ons Grid -->
      <div class="lg:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {#each addons as addon}
            <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <!-- Addon Image -->
              <div class="aspect-square relative group">
                <img 
                  src={addon.image} 
                  alt={addon.name}
                  class="w-full h-full object-cover"
                />
                <!-- Overlay for selected state -->
                {#if isAddonSelected(addon.id)}
                  <div class="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                {/if}
              </div>
              
              <!-- Addon Details -->
              <div class="p-6">
                <h3 class="font-semibold text-lg mb-2">{addon.name}</h3>
                <p class="text-gray-500 text-lg mb-4">
                  Rp. {addon.price.toLocaleString()}
                </p>
                
                <button 
                  class="w-full py-3 px-4 rounded-lg font-semibold text-sm tracking-widest transition-colors {isAddonSelected(addon.id) ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-black text-white hover:bg-gray-800'}"
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
      <div class="bg-white rounded-3xl p-8 h-fit">
        <h3 class="text-gray-500 font-semibold tracking-widest text-sm mb-8">
          YOUR ORDERS
        </h3>
        
        <!-- Invite Section -->
        <div class="border-b border-gray-200 pb-6 mb-6">
          <h4 class="text-gray-500 font-semibold text-sm mb-4">INVITE</h4>
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="font-semibold text-lg">{orderData.invite.name}</p>
              <p class="text-gray-500 text-sm">{orderData.plan.name} Bundle</p>
            </div>
            <p class="font-semibold text-lg">
              Rp. {orderData.plan.price.toLocaleString()}
            </p>
          </div>
        </div>
        
        <!-- Add-ons Section -->
        {#if orderData.addons.length > 0}
          <div class="border-b border-gray-200 pb-6 mb-6">
            <h4 class="text-gray-500 font-semibold text-sm mb-4">ADD-ONS</h4>
            {#each orderData.addons as addon}
              <div class="flex justify-between items-center mb-3">
                <p class="font-semibold">{addon.name}</p>
                <p class="font-semibold">Rp. {addon.price.toLocaleString()}</p>
              </div>
            {/each}
          </div>
        {/if}
        
        <!-- Total Section -->
        <div class="border-b border-gray-200 pb-6 mb-8">
          <div class="flex justify-between items-center">
            <span class="font-semibold text-lg">TOTAL</span>
            <span class="font-bold text-xl">
              Rp. {orderData.total.toLocaleString()}
            </span>
          </div>
        </div>
        
        <button 
          class="w-full bg-black text-white py-4 rounded-lg font-semibold text-lg tracking-widest hover:bg-gray-800 transition-colors"
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