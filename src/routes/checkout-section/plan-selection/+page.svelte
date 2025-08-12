<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import MaskText from '$lib/components/masktext.svelte';
  
  const PlanHeading = [
  "Select Your Plan",
];



  


  // Store data for passing to next steps
  let selectedPlan = 'essentials'; // Auto-selected
  let selectedInvite = {
    name: 'The Night We Met',
    price: 158000
  };
  
  const plans = {
    essentials: {
      name: 'Essentials',
      price: 158000,
      description: 'Everything you need from an invite.',
      features: [
        'RSVP & Guest Tracking',
        'Digital Dashboard (Track Gifts & Attendance)',
        'Google Map & Calendar Integration',
        'WeChat & WhatsApp Ready',
        'Send Invites with One Click',
        'Countdown Timers',
        'Personalised links',
        'Wish Wall',
        'Custom Background Music',
        '6-months period'
      ]
    },
    signature: {
      name: 'Signature',
      price: 348000,
      description: 'Most return on value bundle for your special day.',
      features: [
        'All Essentials Feature',
        'Guestbook with QR Code',
        'Audio Wishes',
        '1 Day Delivery',
        '1 year period'
      ]
    }
  };
  
  const TemplateName = [
    selectedInvite.name,
  ];

  function selectPlan(planKey) {
    selectedPlan = planKey;
  }
  
  function handleNext() {
    // Store selection in sessionStorage for next page
    const orderData = {
      invite: selectedInvite,
      plan: {
        key: selectedPlan,
        ...plans[selectedPlan]
      },
      addons: [],
      total: plans[selectedPlan].price
    };
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('orderData', JSON.stringify(orderData));
      goto('/checkout-section/add-on');
    }
  }
</script>

<svelte:head>
  <title>Select Your Plan - Step 1</title>
</svelte:head>

<div class="min-h-screen bg-[#FAFAF8] p-6 md:p-12">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-4xl md:text-5xl font-['Romie_Regular'] text-gray-900">
        <MaskText phrases={PlanHeading} />
      </h1>
      
      <!-- Progress Steps -->
      <div class="flex items-center space-x-4">
        <div class="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-semibold">
          1
        </div>
        <div class="w-8 h-0.5 bg-gray-300"></div>
        <div class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
          2
        </div>
        <div class="w-8 h-0.5 bg-gray-300"></div>
        <div class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
          3
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Plans Section -->
      <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 ">
        <!-- Essentials Plan -->
        <div 
          class="transition-transform duration-300 ease-in-out transform hover:scale-102 border-2 rounded-2xl p-8 cursor-pointer transition-all duration-300 {selectedPlan === 'essentials' ? 'border-black/10 bg-[#F5A3B3]' : 'border-gray-200 bg-transparent hover:border-gray-300'}"
          on:click={() => selectPlan('essentials')}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && selectPlan('essentials')}
        >
          <div class="mb-4">
            <span class="text-sm font-semibold tracking-widest text-gray-600">BASIC</span>
          </div>
          
          <h2 class="text-4xl font-bold mb-4 tracking-[0.66px] transition-colors duration-300 {selectedPlan === 'essentials' ? 'text-white' : 'text-gray-900'}">
            Essentials
          </h2>
          
          <p class="text-gray-700 mb-8 transition-colors duration-300 {selectedPlan === 'essentials' ? 'text-white/90' : ''}">
            {plans.essentials.description}
          </p>
          
          <div class="text-4xl font-bold mb-8 transition-colors duration-300 {selectedPlan === 'essentials' ? 'text-white' : 'text-gray-900'}">
            Rp. {plans.essentials.price.toLocaleString()}
          </div>
          
          <div class="space-y-4">
            <p class="font-semibold mb-4 transition-colors duration-300 {selectedPlan === 'essentials' ? 'text-white' : 'text-gray-900'}">
              Includes:
            </p>
            {#each plans.essentials.features as feature}
              <div class="flex items-start space-x-3">
                <div class=" rounded-full flex items-center justify-center mt-0.5 ">
      
                  <svg class="w-3 h-3 transition-colors duration-300" class:text-white={selectedPlan === 'essentials'}  class:text-black={selectedPlan !== 'essentials'} fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <span class="text-sm transition-colors duration-300 {selectedPlan === 'essentials' ? 'text-white' : 'text-gray-700'}">
                  {feature}
                </span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Signature Plan -->
        <div 
          class="transition-transform duration-300 ease-in-out transform hover:scale-102 border-2 rounded-2xl p-8 cursor-pointer transition-all duration-300 {selectedPlan === 'signature' ? 'border-black/10 bg-[#F5A3B3]' : 'border-gray-200 bg-transparent hover:border-gray-300'}"
          on:click={() => selectPlan('signature')}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && selectPlan('signature')}
        >
          <div class="mb-4">
            <span class="text-sm font-semibold tracking-widest text-gray-600">VALUE PURCHASE | SAVE 60K</span>
          </div>
          
          <h2 class="text-4xl font-bold mb-4 tracking-[0.66px] {selectedPlan === 'signature' ? 'text-white' : 'text-gray-900'}">
            Signature
          </h2>
          
          <p class="text-gray-700 mb-8 {selectedPlan === 'signature' ? 'text-white/90' : ''}">
            {plans.signature.description}
          </p>
          
          <div class="text-4xl font-bold mb-8 {selectedPlan === 'signature' ? 'text-white' : 'text-gray-900'}">
            Rp. {plans.signature.price.toLocaleString()}
          </div>
          
          <div class="space-y-4">
            <p class="font-semibold mb-4 {selectedPlan === 'signature' ? 'text-white' : 'text-gray-900'}">
              Includes:
            </p>
            {#each plans.signature.features as feature}
              <div class="flex items-start space-x-3">
                <div class="w-5 h-5 rounded-full bg-black flex items-center justify-center mt-0.5">
                  <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <span class="text-sm {selectedPlan === 'signature' ? 'text-white' : 'text-gray-700'}">
                  {feature}
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="bg-transparent p-4 h-fit">
        <h3 class="text-gray-500 font-semibold tracking-[0.33px] text-sm mb-3">
          YOUR ORDERS
        </h3>
        <hr class="mb-4">
        <div class="border-b border-gray-200 pb-6 mb-6">
          <h4 class="text-gray-500 font-semibold text-sm mb-4">INVITE</h4>
          <div class="flex justify-between items-start mb-12">
            <div>
              <p class=" text-lg"> {selectedInvite.name}</p>
              <p class="text-gray-500 tracking-[0.33px] text-sm mt-1">{plans[selectedPlan].name} Bundle</p>
            </div>
            <p class="tracking-[0.33px] text-lg">
              Rp. {plans[selectedPlan].price.toLocaleString()}
            </p>
          </div>
        </div>
        
        <div class="border-b border-gray-200 pb-6 mb-8">
          <div class="flex justify-between items-center">
            <span class="font-bold text-lg tracking-[0.33px]">TOTAL</span>
            <span class="font-bold text-xl tracking-[0.33px]">
              Rp. {plans[selectedPlan].price.toLocaleString()}
            </span>
          </div>
        </div>
        
        <button 
          class="transition-transform duration-300 ease-in-out transform hover:scale-101 w-full bg-black text-white py-4 rounded-lg font-semibold text-lg tracking-widest transition-colors"
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