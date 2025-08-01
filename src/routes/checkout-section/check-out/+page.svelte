<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let orderData = {
    invite: { name: 'The Night We Met', price: 158000 },
    plan: { name: 'Essentials', price: 158000 },
    addons: [],
    total: 158000
  };
  
  // Form data
  let formData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  };
  
  // Form validation
  let errors = {};
  let isSubmitting = false;
  
  onMount(() => {
    // Load order data from previous steps
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('orderData');
      if (stored) {
        orderData = JSON.parse(stored);
      }
    }
  });
  
  function validateForm() {
    errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    return Object.keys(errors).length === 0;
  }
  
  async function handleCheckout() {
    if (!validateForm()) {
      return;
    }
    
    isSubmitting = true;
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would typically:
      // 1. Send order data to your backend
      // 2. Process payment
      // 3. Send confirmation emails
      // 4. Redirect to success page
      
      alert('Order submitted successfully! You will be contacted via WhatsApp soon.');
      
      // Clear stored data
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('orderData');
        goto('/'); // Redirect to home or success page
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
    } finally {
      isSubmitting = false;
    }
  }
  
  function goBack() {
    if (typeof window !== 'undefined') {
      goto('/checkout-section/add-on/');
    }
  }
</script>

<svelte:head>
  <title>Checkout - Step 3</title>
</svelte:head>

<div class="min-h-screen bg-[#FAFAF8] p-6 md:p-12">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-12">
      <h1 class="text-4xl md:text-5xl font-['Romie_Regular'] text-gray-900">
        One last step!
      </h1>
      
      <!-- Progress Steps -->
      <div class="flex items-center space-x-4">
        <div class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
          1
        </div>
        <div class="w-8 h-0.5 bg-gray-300"></div>
        <div class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold cursor-pointer hover:bg-gray-400"
             on:click={goBack}
             role="button"
             tabindex="0">
          2
        </div>
        <div class="w-8 h-0.5 bg-gray-300"></div>
        <div class="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-semibold">
          3
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Billing Form -->
      <div class="lg:col-span-2">
        <div class="mb-8">
          <p class="text-gray-700 text-lg leading-relaxed">
            Fill out the billing details below.<br>
            After your payment, we'll contact you through WhatsApp to<br>
            collect your event details and guide you through the next steps.
          </p>
        </div>
        
        <div class="bg-white rounded-3xl p-8">
          <h2 class="text-2xl font-semibold mb-8">Billing Details</h2>
          
          <form on:submit|preventDefault={handleCheckout} class="space-y-6">
            <!-- Name Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="firstName" class="block text-sm font-semibold text-gray-700 mb-3">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  bind:value={formData.firstName}
                  class="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors {errors.firstName ? 'border-red-500' : ''}"
                  class:border-red-500={errors.firstName}
                />
                {#if errors.firstName}
                  <p class="text-red-500 text-sm mt-1">{errors.firstName}</p>
                {/if}
              </div>
              
              <div>
                <label for="lastName" class="block text-sm font-semibold text-gray-700 mb-3">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  bind:value={formData.lastName}
                  class="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors {errors.lastName ? 'border-red-500' : ''}"
                />
                {#if errors.lastName}
                  <p class="text-red-500 text-sm mt-1">{errors.lastName}</p>
                {/if}
              </div>
            </div>
            
            <!-- Email Field -->
            <div>
              <label for="email" class="block text-sm font-semibold text-gray-700 mb-3">
                Email
              </label>
              <input
                id="email"
                type="email"
                bind:value={formData.email}
                class="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors {errors.email ? 'border-red-500' : ''}"
              />
              {#if errors.email}
                <p class="text-red-500 text-sm mt-1">{errors.email}</p>
              {/if}
            </div>
            
            <!-- Phone Field -->
            <div>
              <label for="phone" class="block text-sm font-semibold text-gray-700 mb-3">
                Phone (Whatsapp)
              </label>
              <input
                id="phone"
                type="tel"
                bind:value={formData.phone}
                placeholder="+62 812 3456 7890"
                class="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors {errors.phone ? 'border-red-500' : ''}"
              />
              {#if errors.phone}
                <p class="text-red-500 text-sm mt-1">{errors.phone}</p>
              {/if}
            </div>
          </form>
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
          type="button"
          class="w-full bg-black text-white py-4 rounded-lg font-semibold text-lg tracking-widest hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          on:click={handleCheckout}
          disabled={isSubmitting}
        >
          {#if isSubmitting}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            PROCESSING...
          {:else}
            CHECKOUT
          {/if}
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
