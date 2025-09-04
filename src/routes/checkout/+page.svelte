<!-- routes/checkout/+page.svelte -->
<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { cart, cartItemCount } from "$lib/cartStore";

  // --- Checkout Plans ---
  const plans = [
    {
      id: "essentials",
      name: "Essentials",
      price: 158000,
      description:
        "All the basics you need—custom invite, RSVP tracking, music, and 6 months live.",
      features: [
        "Custom Digital Invite",
        "RSVP Management",
        "Music Integration",
        "6 Months Active"
      ]
    },
    {
      id: "signature",
      name: "Signature",
      price: 288000,
      description:
        "Stress-free and seamless — we handle invites, reminders, and integrations, all active for 1 year.",
      features: [
        "Everything in Essentials",
        "Automated Reminders",
        "Advanced Integrations",
        "1 Year Active"
      ],
      popular: true
    }
  ];

  const addOns = [
    { id: "custom-fonts", name: "Custom Fonts", price: 30000, description: "Add personalized typography" },
    { id: "multilingual", name: "Multilingual", price: 78000, description: "Support for multiple languages" }
  ];

  // --- Invites & Accordion State ---

  let invites = [];
  let invite = { plan: null }; // optional, can track selected plan globally
  let openAccordions = new Set(); // tracks which plan accordion is open
  let orderSummaryOpen = false; // tracks mobile order summary accordion

    function toggleAccordion(planId) {
    if (openAccordions.has(planId)) {
      openAccordions.delete(planId); // close if open
    } else {
      openAccordions.add(planId); // open if closed
    }
    // trigger reactivity
    openAccordions = new Set(openAccordions);
  }

  function selectPlan(inviteIndex, planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    invites = invites.map((invite, i) =>
      i === inviteIndex ? { ...invite, plan, isComplete: true } : invite
    );
  }

  function toggleAddOn(inviteIndex, addOnId) {
    const addOn = addOns.find(a => a.id === addOnId);
    if (!addOn) return;
    invites = invites.map((invite, i) => {
      if (i !== inviteIndex) return invite;
      const exists = invite.addOns.some(a => a.id === addOnId);
      return {
        ...invite,
        addOns: exists ? invite.addOns.filter(a => a.id !== addOnId) : [...invite.addOns, addOn]
      };
    });
  }

  function removeInvite(inviteId) {
    if (invites.length > 1) {
      invites = invites.filter(invite => invite.id !== inviteId);
    }
  }

  function addNewInvite() {
    const newInvite = {
      id: `invite-${invites.length + 1}`,
      template: {
        id: "default",
        name: "Select Template",
        image: "/landingpage/product-placeholder-1.png"
      },
      plan: null,
      addOns: [],
      isComplete: false
    };
    invites = [...invites, newInvite];
  }

  // --- Billing ---
  let billingData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    discountCode: ""
  };
  let errors = {};

  function validateForm() {
    errors = {};
    if (!billingData.firstName.trim()) errors.firstName = "First name is required";
    if (!billingData.lastName.trim()) errors.lastName = "Last name is required";
    if (!billingData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingData.email)) {
      errors.email = "Invalid email address";
    }
    if (!billingData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?\d{8,15}$/.test(billingData.phone)) {
      errors.phone = "Invalid phone number";
    }
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validateForm()) return;
    console.log("Submitting checkout:", { invites, billing: billingData, total: totalAmount });
    goto("/payment-success");
  }

  function formatPrice(num) {
    return `Rp ${num.toLocaleString("id-ID")}`;
  }

  function applyDiscount() {
    console.log("Applying discount:", billingData.discountCode);
  }

  function handleShopClick() {
    goto(`/shop/`);
  }

  function handleHomeClick() {
    goto("/");
  }

  $: showBilling = invites.some(invite => invite.plan);

  // --- Derived totals ---
  $: totalAmount = invites.reduce((sum, invite) => {
    let subtotal = 0;
    if (invite.plan) subtotal += invite.plan.price;
    invite.addOns.forEach(a => (subtotal += a.price));
    return sum + subtotal;
  }, 0);

  $: totalItems = invites.reduce(
    (count, invite) => count + (invite.plan ? 1 : 0) + invite.addOns.length,
    0
  );

  // --- Initialize invites from cart ---
  onMount(() => {
    if ($cartItemCount === 0) {
      goto("/shop?message=Please add items first");
      return;
    }

    invites = $cart.map((item, idx) => ({
      id: `invite-${idx + 1}`,
      template: {
        id: item.id,
        name: item.name,
        image: item.image || "/landingpage/product-placeholder-1.png"
      },
      plan: plans.find(p => p.id === "essentials"), // default plan
      addOns: [],
      isComplete: true
    }));
  });
</script>

<svelte:head>
	<title>Checkout - With Love</title>
</svelte:head>

<!-- Header -->
<header class="main-header border-b border-gray-200">
  <nav class="header-nav max-w-[90vw] mx-auto flex items-center justify-between py-4 px-4 lg:px-8">
    <div class="nav-left">
      <a href="/">
        <img src="/landingpage/withloveheader.svg" alt="header svg" class="logo transform scale-50 lg:scale-50">
      </a>
    </div>
    <div class="nav-right flex gap-4 lg:gap-8">
      <button class="nav-link text-sm lg:text-base" on:click={handleShopClick}>Shop</button>
    
    </div>
  </nav>
</header>

<!-- Main Container -->
<div class="site-container max-w-full">
  <div class="checkout-container grid grid-cols-1 lg:grid-cols-2 min-h-screen font-['DM_Sans'] bg-[#FAFAF8]">
    
    <!-- Left Column - Checkout Content -->
    <div class="checkout-content px-8 py-8 lg:py-8 lg:pl-32  lg:pr-8  overflow-y-auto bg-[#FAFAF8] order-2 lg:order-1">
      
      {#each invites as invite, inviteIndex}
        <div class="invite-section mb-8 lg:mb-16">
          
          <!-- Invite Header (only if multiple invites) -->
          {#if invites.length > 1}
            <div class="invite-header flex justify-between items-center mb-6">
              <h2 class="text-xl lg:text-2xl font-semibold">Invite {inviteIndex + 1}</h2>
              <button
                class="remove-invite-btn p-2 hover:bg-gray-100 rounded-full"
                on:click={() => removeInvite(invite.id)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" />
                </svg>
              </button>
            </div>
          {/if}

        <!-- Step 1: Plan Selection -->

<!-- Mobile header (show on mobile only) -->
<!-- <div class="flex items-center justify-center gap-2 mb-4 lg:hidden">
  <span class="step-number flex items-center justify-center w-8 h-8 bg-black text-white rounded-full font-semibold text-base flex-shrink-0">1</span>
  <h3 class="step-title font-['Romie'] text-2xl font-medium">Choose Your Plan</h3>
</div> -->

<div class="lg:hidden mb-8">
  <!-- Row 1: Circle only -->
  <div class="flex justify-center mb-3">
    <span class="step-number flex items-center justify-center w-8 h-8 bg-black text-white rounded-full font-semibold text-base flex-shrink-0">1</span>
  </div>
  
  <!-- Row 2: Title only -->
  <div class="flex justify-center mb-4">
    <h3 class="step-title font-['Romie'] text-2xl font-medium text-center">Choose Your Plan</h3>
  </div>
</div>

<!-- Desktop layout (show on desktop only) -->
<div class="step-container hidden lg:flex lg:flex-row items-start gap-8 mb-20">
  <span class="step-number flex items-center justify-center w-10 h-10 bg-black text-white rounded-full font-semibold text-base flex-shrink-0">1</span>
  
  <div class="step-content flex-1 w-full">
    <h3 class="step-title font-['Romie'] text-4xl mb-8 font-medium">Choose Your Plan</h3>
    
    <!-- Desktop plans grid -->
    <div class="plans-grid grid grid-cols-1 gap-12 items-start">
      {#each plans as plan, planIndex}
        <div class="plan-card relative bg-[#D8DBF8] border border-[#e9e9e9] rounded-xl p-8 transition-all duration-300 ease-in-out w-full max-w-full
                    hover:border-black hover:scale-102 {invite.plan?.id === plan.id ? 'border-black scale-102' : ''}">
          
          <div class="plan-header mb-6">
            <h4 class="plan-name font-['Romie'] text-2xl font-semibold mb-2">{plan.name}</h4>
            <div class="plan-price font-['DM_Sans'] text-4xl font-semibold mb-6">{formatPrice(plan.price)}</div>
          </div>

          <p class="plan-description font-['DM_Sans'] text-base opacity-80 mb-4">{plan.description}</p>

          <!-- Accordion -->
          <div class="accordion-header flex justify-between items-center cursor-pointer mb-6" on:click={() => toggleAccordion(plan.id)}>
            <p class="accordion-label font-['DM_Sans'] text-base opacity-80">See What's Included:</p>
            <svg class="transition-transform duration-300 w-6 h-6 {openAccordions.has(plan.id) ? 'rotate-180' : ''}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill="#555" d="M10.1025513,12.7783485 L16.8106554,6.0794438 C17.0871744,5.80330401 17.5303978,5.80851813 17.8006227,6.09108986 C18.0708475,6.37366159 18.0657451,6.82658676 17.7892261,7.10272655 L10.5858152,14.2962587 C10.3114043,14.5702933 9.87226896,14.5675493 9.60115804,14.2901058 L2.2046872,6.72087106 C1.93149355,6.44129625 1.93181183,5.98834118 2.20539811,5.7091676 C2.47898439,5.42999401 2.92223711,5.43031926 3.19543076,5.70989407 L10.1025513,12.7783485 Z"/>
            </svg>
          </div>

          {#if openAccordions.has(plan.id)}
            <div class="accordion-content font-['DM_Sans'] text-base mb-16 overflow-hidden">
              <ul class="pl-1 my-2">
                {#each plan.features as feature}
                  <li class="mb-1 text-base opacity-90">{feature}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <button
            class={`select-plan-btn w-full rounded-full py-5 px-4 font-['DM_Sans'] text-base font-semibold cursor-pointer transition-all duration-300 ease-in-out hover:scale-101
              ${invite.plan?.id === plan.id
                ? ' bg-black text-white border-gray-800'
                : 'bg-transparent border-1 text-black border-black hover:bg-black hover:text-white'}`}
            on:click={() => selectPlan(0, plan.id)}
          >
            {invite.plan?.id === plan.id ? 'Selected' : 'Select'}
          </button>
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- Mobile content (full width, outside any column constraints) -->
<div class="lg:hidden mb-16">
  <div class="plans-grid grid grid-cols-1 gap-4 items-start">
    {#each plans as plan, planIndex}
      <div class="plan-card relative bg-[#D8DBF8] border border-[#e9e9e9] rounded-xl p-6 transition-all duration-300 ease-in-out w-full max-w-full
                  hover:border-black hover:scale-102 {invite.plan?.id === plan.id ? 'border-black scale-102' : ''}">
        
        <div class="plan-header mb-4">
          <h4 class="plan-name font-['Romie'] text-2xl font-semibold mb-2">{plan.name}</h4>
          <div class="plan-price font-['DM_Sans'] text-3xl font-semibold mb-6">{formatPrice(plan.price)}</div>
        </div>

        <p class="plan-description font-['DM_Sans'] text-lg opacity-80 mb-6">{plan.description}</p>

        <!-- Accordion -->
        <div class="accordion-header flex justify-between items-center cursor-pointer mb-4" on:click={() => toggleAccordion(plan.id)}>
          <p class="accordion-label font-['DM_Sans'] text-lg opacity-80">See What's Included:</p>
          <svg class="transition-transform duration-300 w-6 h-6 {openAccordions.has(plan.id) ? 'rotate-180' : ''}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill="#555" d="M10.1025513,12.7783485 L16.8106554,6.0794438 C17.0871744,5.80330401 17.5303978,5.80851813 17.8006227,6.09108986 C18.0708475,6.37366159 18.0657451,6.82658676 17.7892261,7.10272655 L10.5858152,14.2962587 C10.3114043,14.5702933 9.87226896,14.5675493 9.60115804,14.2901058 L2.2046872,6.72087106 C1.93149355,6.44129625 1.93181183,5.98834118 2.20539811,5.7091676 C2.47898439,5.42999401 2.92223711,5.43031926 3.19543076,5.70989407 L10.1025513,12.7783485 Z"/>
          </svg>
        </div>

        {#if openAccordions.has(plan.id)}
          <div class="accordion-content font-['DM_Sans'] text-lg mb-4 overflow-hidden">
            <ul class="pl-1 my-2">
              {#each plan.features as feature}
                <li class="mb-1 text-xs opacity-90">{feature}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <button
          class={`select-plan-btn w-full rounded-full py-3 px-8 font-['DM_Sans'] text-sm font-semibold cursor-pointer transition-all duration-300 ease-in-out hover:scale-101
            ${invite.plan?.id === plan.id
              ? ' bg-black text-white border-gray-800'
              : 'bg-transparent border-1 text-black border-black hover:bg-black hover:text-white'}`}
          on:click={() => selectPlan(0, plan.id)}
        >
          {invite.plan?.id === plan.id ? 'Selected' : 'Select'}
        </button>
      </div>
    {/each}
  </div>
</div>
		  
          <!-- Step 2: Add-Ons Selection -->

<!-- Mobile layout: 3 rows -->
<div class="lg:hidden mb-16">
  <!-- Row 1: Circle only -->
  <div class="flex justify-center mb-3">
    <span class="step-number flex items-center justify-center w-8 h-8 bg-black text-white rounded-full font-semibold text-base flex-shrink-0">2</span>
  </div>
  
  <!-- Row 2: Title only -->
  <div class="flex justify-center mb-4">
    <h3 class="step-title font-['Romie'] text-2xl font-medium text-center">Select Add-Ons</h3>
  </div>
  
  <!-- Row 3: Content (full width) -->
  <div class="addon-grid flex flex-col gap-4">
    {#each addOns as addOn}
      <div class="addon-card w-full border border-[#e0ddd6] rounded-xl p-4 flex flex-col gap-3
                  {invite.addOns.some(a => a.id === addOn.id) ? 'border-black' : ''}">
        
        <!-- Top row -->
        <div class="addon-top flex items-center justify-between gap-4">
          <div class="addon-icon flex-shrink-0">
            <img src={addOn.image || "landingpage/product-placeholder-1.png"} alt="addon icon"
                 class="w-16 h-16 object-cover rounded-md">
          </div>

          <div class="addon-info flex-1 ml-2">
            <h4 class="addon-title text-base font-medium m-0">{addOn.name}</h4>
            <div class="addon-pricing flex items-center gap-2">
              <span class="addon-price text-base font-light text-gray-800">{addOn.price}</span>
              {#if addOn.oldPrice}
                <span class="addon-old-price text-sm text-gray-500 line-through">{addOn.oldPrice}</span>
              {/if}
            </div>
          </div>

          <button class="addon-toggle flex items-center py-2 px-4 font-semibold text-sm border border-gray-300 rounded-lg cursor-pointer transition-colors duration-200
                         hover:bg-gray-100 {invite.addOns.some(a => a.id === addOn.id) ? 'bg-gray-800 text-white border-gray-800' : ''}"
                  on:click={() => toggleAddOn(inviteIndex, addOn.id)}>
            {invite.addOns.some(a => a.id === addOn.id) ? 'Remove' : 'Add'}
          </button>
        </div>

        <!-- Bottom row (optional dropdown/variant) -->
        {#if addOn.options}
          <div class="addon-bottom border border-[#e0ddd6] rounded-lg p-2 flex flex-col">
            <label for="option-{addOn.id}" class="addon-label text-xs text-gray-600">Options</label>
            <select id="option-{addOn.id}" class="addon-select border-none bg-transparent text-sm py-1 outline-none">
              {#each addOn.options as opt}
                <option>{opt}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<!-- Desktop layout (show on desktop only) -->
<div class="step-container hidden lg:flex lg:flex-row items-start gap-8 mb-20">
  <span class="step-number flex items-center justify-center w-10 h-10 bg-black text-white rounded-full font-semibold text-base flex-shrink-0">2</span>
  
  <div class="step-content flex-1 w-full">
    <h3 class="step-title font-['Romie'] text-4xl mb-8 font-medium">Select Add-Ons</h3>

    <div class="addon-grid flex flex-col gap-8">
      {#each addOns as addOn} 
        <div class="addon-card w-full border border-[#e0ddd6] rounded-xl p-8 flex flex-col gap-4
                    {invite.addOns.some(a => a.id === addOn.id) ? 'border-black' : ''}">
          
          <!-- Top row -->
          <div class="addon-top flex items-center justify-between gap-4">
            <div class="addon-icon flex-shrink-0">
              <img src={addOn.image || "landingpage/product-placeholder-1.png"} alt="addon icon"
                   class="w-25 h-25 object-cover rounded-md">
            </div>

            <div class="addon-info flex-1 ml-2">
              <h4 class="addon-title text-base font-medium m-0">{addOn.name}</h4>
              <div class="addon-pricing flex items-center gap-2">
                <span class="addon-price text-base font-light text-gray-800">{addOn.price}</span>
                {#if addOn.oldPrice}
                  <span class="addon-old-price text-2xl text-gray-500 line-through">{addOn.oldPrice}</span>
                {/if}
              </div>
            </div>

            <button class="addon-toggle flex items-center py-3 px-6 font-semibold text-base border border-gray-300 rounded-lg cursor-pointer transition-colors duration-200
                              hover:bg-gray-100 {invite.addOns.some(a => a.id === addOn.id) ? 'bg-gray-800 text-white border-gray-800' : ''}"
                              on:click={() => toggleAddOn(inviteIndex, addOn.id)}>
              {invite.addOns.some(a => a.id === addOn.id) ? 'Remove' : 'Add'}
            </button>
          </div>

          <!-- Bottom row (optional dropdown/variant) -->
          {#if addOn.options}
            <div class="addon-bottom border border-[#e0ddd6] rounded-lg p-3 flex flex-col">
              <label for="option-{addOn.id}" class="addon-label text-sm text-gray-600">Options</label>
              <select id="option-{addOn.id}" class="addon-select border-none bg-transparent text-base py-1 outline-none">
                {#each addOn.options as opt}
                  <option>{opt}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
</div>
  {/each}  


  
      <!-- Billing Details - Progressive Disclosure -->
      <div class="step-container flex flex-col lg:flex-row items-start gap-4 lg:gap-8">
      {#if showBilling}
  
  <!-- Mobile layout: 3 rows -->
  <div class="lg:hidden mb-16">
    <!-- Row 1: Circle only -->
    <div class="flex justify-center mb-3">
      <span class="step-number flex items-center justify-center w-8 h-8 bg-black text-white rounded-full font-semibold text-base flex-shrink-0">3</span>
    </div>
    
    <!-- Row 2: Title only -->
    <div class="flex justify-center mb-4">
      <h2 class="step-title font-['Romie'] text-2xl font-medium text-center">Payment</h2>
    </div>
    
    <!-- Row 3: Content (full width) -->
    <div class="billing-content animate-slide-in">
      <form class="billing-form rounded-xl p-2" on:submit|preventDefault={handleSubmit}>
        <div class="form-row grid grid-cols-1 gap-4 mb-6">
          <div class="form-group floating-label relative mb-6">
            <input
              type="text"
              id="firstName"
              bind:value={billingData.firstName}
              class="w-full pt-8 pb-4 px-6 border border-gray-400 rounded-md bg-[#f8f7f3] text-base transition-colors duration-200 focus:border-gray-700 focus:outline-none {errors.firstName ? 'border-red-600' : ''}"
              placeholder=" "
            />
            <label for="firstName" class="floating-label absolute left-6 top-1/2 transform -translate-y-1/2 text-base text-black opacity-80 font-light pointer-events-none transition-all duration-200">First Name</label>
            {#if errors.firstName}
              <span class="error-message text-red-600 text-xs mt-1 block">{errors.firstName}</span>
            {/if}
          </div>

          <div class="form-group floating-label relative mb-6">
            <input
              type="text"
              id="lastName"
              bind:value={billingData.lastName}
              class="w-full pt-8 pb-4 px-6 border border-gray-400 rounded-md bg-[#f8f7f3] text-base transition-colors duration-200 focus:border-gray-700 focus:outline-none {errors.lastName ? 'border-red-600' : ''}"
              placeholder=" "
            />
            <label for="lastName" class="floating-label absolute left-6 top-1/2 transform -translate-y-1/2 text-base text-black opacity-80 font-light pointer-events-none transition-all duration-200">Last Name</label>
            {#if errors.lastName}
              <span class="error-message text-red-600 text-xs mt-1 block">{errors.lastName}</span>
            {/if}
          </div>
        </div>

        <div class="form-group floating-label relative mb-6">
          <input
            type="email"
            id="email"
            bind:value={billingData.email}
            class="w-full pt-8 pb-4 px-6 border border-gray-400 rounded-md bg-[#f8f7f3] text-base transition-colors duration-200 focus:border-gray-700 focus:outline-none {errors.email ? 'border-red-600' : ''}"
            placeholder=" "
          />
          <label for="email" class="floating-label absolute left-6 top-1/2 transform -translate-y-1/2 text-base text-black opacity-80 font-light pointer-events-none transition-all duration-200">Email</label>
          {#if errors.email}
            <span class="error-message text-red-600 text-xs mt-1 block">{errors.email}</span>
          {/if}
        </div>

        <div class="form-group floating-label relative mb-6">
          <input
            type="tel"
            id="phone"
            bind:value={billingData.phone}
            class="w-full pt-8 pb-4 px-6 border border-gray-400 rounded-md bg-[#f8f7f3] text-base transition-colors duration-200 focus:border-gray-700 focus:outline-none {errors.phone ? 'border-red-600' : ''}"
            placeholder=" " 
            required
          />
          <label for="phone" class="floating-label absolute left-6 top-1/2 transform -translate-y-1/2 text-base text-black opacity-80 font-light pointer-events-none transition-all duration-200">Phone</label>
          {#if errors.phone}
            <span class="error-message text-red-600 text-xs mt-1 block">{errors.phone}</span>
          {/if}
        </div>

        <!-- Payment Button -->
        <button class="pay-btn w-full bg-gray-700 text-white border-none rounded-xl py-6 px-8 font-['DM_Sans'] text-base font-semibold tracking-wide cursor-pointer transition-transform duration-200 mt-4 mb-4
                       hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" 
                on:click={handleSubmit} disabled={totalItems === 0}>
          PAY NOW
        </button>
        
        <p class="payment-note text-xs text-gray-600 text-center leading-relaxed m-0">
          After your payment, we'll reach out on WhatsApp to get your event info and next steps.
        </p>
      </form>
    </div>
  </div>

  <!-- Desktop layout (show on desktop only) -->
  <div class="step-container hidden lg:flex lg:flex-row items-start gap-8 mb-40">
    <span class="step-number flex items-center justify-center w-10 h-10 bg-black text-white rounded-full font-semibold text-base flex-shrink-0">3</span>
    
    <div class="step-content flex-1 w-full">
      <h2 class="step-title font-['Romie'] text-4xl mb-8 font-medium">Payment</h2>

     <section class="billing-content animate-slide-in">
  <form class="billing-form rounded-xl p-2" on:submit|preventDefault={handleSubmit}>
    <div class="form-row grid grid-cols-2 gap-4 ">
      <div class="form-group floating-label relative mb-6">
        <input
          type="text"
          id="firstName-desktop"
          bind:value={billingData.firstName}
          class="w-full pt-6 pb-3 px-4 border border-gray-400 rounded-md bg-[#f8f7f3] text-base transition-colors duration-200 focus:border-gray-700 focus:outline-none {errors.firstName ? 'border-red-600' : ''}"
          placeholder=" "
        />
        <label for="firstName-desktop" class="floating-label absolute left-4 top-1/2 transform -translate-y-1/2 text-base text-black opacity-80 font-light pointer-events-none transition-all duration-200">First Name</label>
        {#if errors.firstName}
          <span class="error-message text-red-600 text-sm mt-1 block">{errors.firstName}</span>
        {/if}
      </div>

      <div class="form-group floating-label relative mb-6">
        <input
          type="text"
          id="lastName-desktop"
          bind:value={billingData.lastName}
          class="w-full pt-6 pb-3 px-4 border border-gray-400 rounded-md bg-[#f8f7f3] text-base transition-colors duration-200 focus:border-gray-700 focus:outline-none {errors.lastName ? 'border-red-600' : ''}"
          placeholder=" "
        />
        <label for="lastName-desktop" class="floating-label absolute left-4 top-1/2 transform -translate-y-1/2 text-base text-black opacity-80 font-light pointer-events-none transition-all duration-200">Last Name</label>
        {#if errors.lastName}
          <span class="error-message text-red-600 text-sm mt-1 block">{errors.lastName}</span>
        {/if}
      </div>
    </div>

    <div class="form-group floating-label relative mb-6">
      <input
        type="email"
        id="email-desktop"
        bind:value={billingData.email}
        class="w-full pt-6 pb-3 px-4 border border-gray-400 rounded-md bg-[#f8f7f3] text-base transition-colors duration-200 focus:border-gray-700 focus:outline-none {errors.email ? 'border-red-600' : ''}"
        placeholder=" "
      />
      <label for="email-desktop" class="floating-label absolute left-4 top-1/2 transform -translate-y-1/2 text-base text-black opacity-80 font-light pointer-events-none transition-all duration-200">Email</label>
      {#if errors.email}
        <span class="error-message text-red-600 text-sm mt-1 block">{errors.email}</span>
      {/if}
    </div>

    <div class="form-group floating-label relative mb-6">
      <input
        type="tel"
        id="phone-desktop"
        bind:value={billingData.phone}
        class="w-full pt-6 pb-3 px-4 border border-gray-400 rounded-md bg-[#f8f7f3] text-base transition-colors duration-200 focus:border-gray-700 focus:outline-none {errors.phone ? 'border-red-600' : ''}"
        placeholder=" " 
        required
      />
      <label for="phone-desktop" class="floating-label absolute left-4 top-1/2 transform -translate-y-1/2 text-base text-black opacity-80 font-light pointer-events-none transition-all duration-200">Phone</label>
      {#if errors.phone}
        <span class="error-message text-red-600 text-sm mt-1 block">{errors.phone}</span>
      {/if}
    </div>

    <!-- Payment Button -->
    <button class="pay-btn w-full bg-gray-700 text-white border-none rounded-xl py-4 px-8 font-['DM_Sans'] text-base font-semibold tracking-wide cursor-pointer transition-transform duration-200 mt-8 mb-8
                   hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" 
            on:click={handleSubmit} disabled={totalItems === 0}>
      PAY NOW
    </button>
    
    <p class="payment-note text-sm text-gray-600 text-center leading-relaxed m-0">
      After your payment, we'll reach out on WhatsApp to get your event info and next steps.
    </p>
  </form>
</section>
    </div>
  </div>

{/if}
      </div>
    </div>

    <!-- Mobile Order Summary Accordion -->
    <div class="lg:hidden order-1">
      <div class="mobile-order-accordion border-b border-gray-200">
        <!-- Accordion Header -->
        <button 
  class="accordion-toggle w-full flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg my-4 mx-0 hover:bg-gray-50 transition-colors duration-200"
  on:click={() => orderSummaryOpen = !orderSummaryOpen}
>
          <div class="flex items-center gap-3">
            <span class="font-['DM_Sans'] text-lg font-medium text-gray-800">Order Summary</span>
            <span class="text-sm text-gray-600">• {totalItems} Item{totalItems > 1 ? 's' : ''}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-['DM_Sans'] text-lg font-semibold">{formatPrice(totalAmount)}</span>
            <svg class="w-5 h-5 transition-transform duration-200 {orderSummaryOpen ? 'rotate-180' : ''}" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </button>

        <!-- Accordion Content -->
        {#if orderSummaryOpen}
          <div class="accordion-content px-4 pb-4 animate-slide-down">
            <!-- Cart Items -->
            <div class="cart-items mb-6">
              {#if totalItems === 0}
                <!-- Fallback: Show cart store items if invites conversion failed -->
                {#if $cartItemCount > 0}
                  {#each $cart as item (item.id)}
                    <div class="cart-item flex justify-between items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
                      <img src={item.image || "/landingpage/product-placeholder-1.png"} alt={item.name} 
                           class="w-12 h-12 rounded-md object-cover flex-shrink-0">
                      <div class="item-info flex-1 ml-3">
                        <h3 class="m-0 text-sm font-medium text-gray-900">{item.name}</h3>
                        <p class="item-plan m-0 text-xs text-gray-600">{item.planData?.name || item.plan || 'Essentials Plan'}</p>
                      </div>
                      <div class="item-price text-sm font-medium text-gray-900">{formatPrice(item.price)}</div>
                    </div>
                  {/each}
                {:else}
                  <div class="empty-cart text-center text-gray-600 py-6">
                    <p class="text-sm">No items selected</p>
                  </div>
                {/if}
              {:else}
                {#each invites as invite}
                  {#if invite.plan}
                    <!-- Plan Item -->
                    <div class="cart-item flex justify-between items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
                      <img src="/landingpage/product-placeholder-1.png" alt="" 
                           class="w-12 h-12 rounded-md object-cover flex-shrink-0">
                      <div class="item-info flex-1 ml-3">
                        <h3 class="m-0 text-sm lg:text-base font-medium text-gray-900">{invite.template?.name}</h3>
                        <p class="item-plan m-0 text-xs text-gray-600">{invite.plan.name} Plan</p>
                      </div>
                      <div class="item-price text-sm font-medium text-gray-900">{formatPrice(invite.plan.price)}</div>
                    </div>

                    <!-- Add-on Items -->
                    {#each invite.addOns as addOn}
                      <div class="cart-item flex justify-between items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
                        <div class="item-info flex-1">
                          <h3 class="m-0 text-sm font-medium text-gray-900">{addOn.name}</h3>
                          <p class="item-plan m-0 text-xs text-gray-600">Add-on</p>
                        </div>
                        <div class="item-price text-sm font-medium text-gray-900">{formatPrice(addOn.price)}</div>
                      </div>
                    {/each}
                  {/if}
                {/each}
              {/if}
            </div>

            <!-- Discount Code -->
            <div class="discount-section mb-4">
              <div class="discount-input flex gap-2">
                <input
                  type="text"
                  bind:value={billingData.discountCode}
                  placeholder="Discount Code"
                  class="flex-1 p-3 border border-gray-300 rounded-md font-['DM_Sans'] text-sm bg-white"
                />
                <button 
                  class="apply-btn bg-gray-100 border border-gray-300 rounded-md px-4 py-3 font-['DM_Sans'] text-sm font-medium text-gray-600 cursor-pointer transition-colors duration-200
                         hover:bg-gray-800 hover:text-white {billingData.discountCode ? 'bg-gray-800 text-white' : ''}" 
                  on:click={applyDiscount}>
                  Apply
                </button>
              </div>
            </div>

            <!-- Totals -->
            <div class="cart-totals border-t border-gray-200 pt-4">
              <div class="subtotal flex justify-between mb-2 font-['DM_Sans'] text-sm text-gray-600">
                <span>Subtotal • {totalItems} Item{totalItems > 1 ? 's' : ''}</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div class="total flex justify-between font-['DM_Sans'] font-semibold text-lg text-gray-900">
                <span>Total</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Desktop Order Summary - Right Column -->
    <div class="hidden lg:flex cart-summary bg-[#FAFAF8] border-l border-gray-200 lg:pr-32 lg:pl-8 sticky top-0 h-screen overflow-y-auto flex-col order-2">
      
      <div class="cart-items mb-16">
        {#if totalItems === 0}
          <!-- Fallback: Show cart store items if invites conversion failed -->
          {#if $cartItemCount > 0}
            {#each $cart as item (item.id)}
              <div class="cart-item flex justify-between items-start gap-4 py-8 border-b border-[#E0E0D9] last:border-b-0">
                <img src={item.image || "/landingpage/product-placeholder-1.png"} alt={item.name} 
                     class="w-40 h-40 rounded-lg object-cover flex-shrink-0">
                <div class="item-info flex-1 flex flex-col justify-center">
                  <h3 class="m-0 text-xl lg:text-base font-medium">{item.name}</h3>
                  <p class="item-plan m-0 text-xl lg:text-base font-light text-gray-600">{item.planData?.name || item.plan || 'Essentials Plan'}</p>
                </div>
                <div class="item-price text-xl lg:text-base font-normal">{formatPrice(item.price)}</div>
              </div>
            {/each}
          {:else}
            <div class="empty-cart text-center text-gray-600 py-8">
              <p>No items selected</p>
            </div>
          {/if}
        {:else}
          {#each invites as invite}
            {#if invite.plan}
              <!-- Plan Item -->
              <div class="cart-item flex justify-between items-start gap-4 py-8 border-b border-[#E0E0D9] last:border-b-0">
                <img src="/landingpage/product-placeholder-1.png" alt="" 
                     class="w-40 h-40 rounded-lg object-cover flex-shrink-0">
                <div class="item-info flex-1 flex flex-col justify-center ml-4">
                  <h3 class="m-0 uppercase lg:text-base font-medium">{invite.template?.name}</h3>
                  <p class="item-plan m-0 lg:text-base  font-light text-gray-600">{invite.plan.name} Plan</p>
                </div>
                <div class="item-price lg:text-base  font-normal">{formatPrice(invite.plan.price)}</div>
              </div>

              <!-- Add-on Items -->
              {#each invite.addOns as addOn}
                <div class="cart-item flex justify-between items-start gap-4 py-4 border-b border-[#E0E0D9] last:border-b-0">
                  <div class="item-info flex-1">
                    <h3 class="m-0 text-base font-medium">{addOn.name}</h3>
                    <p class="item-plan m-0  text-base font-light text-gray-600">Add-on</p>
                  </div>
                  <div class="item-price  text-base font-normal">{formatPrice(addOn.price)}</div>
                </div>
              {/each}
            {/if}
          {/each}
        {/if}
      </div>

      <!-- Discount Code -->
      <!-- <div class="discount-section mb-6">
        <div class="discount-input flex gap-2">
          <input
            type="text"
            bind:value={billingData.discountCode}
            placeholder="Discount Code or Gift Card"
            class="flex-1 p-3 border border-[#E0E0D9] rounded-lg font-['DM_Sans'] text-3xl"
          />
          <button 
            class="apply-btn bg-gray-200 border border-[#E0E0D9] rounded-lg px-8 py-6 font-['DM_Sans'] text-3xl font-semibold text-gray-400 cursor-pointer transition-all duration-300
                   hover:bg-gray-700 hover:text-white hover:border-gray-600 {billingData.discountCode ? 'bg-gray-700 text-white border-gray-600' : ''}" 
            on:click={applyDiscount}>
            Apply
          </button>
        </div>
      </div> -->

      <!-- Totals -->
      <div class="cart-totals border-t border-[#E0E0D9] pt-4 mb-6">
        <div class="subtotal flex justify-between mb-2 font-['DM_Sans'] font-normal text-base mt-8">
          <span>Subtotal • {totalItems} Item{totalItems > 1 ? 's' : ''}</span>
          <span>{formatPrice(totalAmount)}</span>
        </div>
        <div class="total flex justify-between font-['DM_Sans'] font-semibold text-xl mt-4">
          <span>Total</span>
          <span>{formatPrice(totalAmount)}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  :global(html) {
    background-color: #FAFAF8!important;
  }

  
  
  /* Floating label animations */
  .form-group input:focus + .floating-label,
  .form-group input:not(:placeholder-shown) + .floating-label,
  .form-group input.error + .floating-label {
    top: 1.5rem;
    transform: none;
    font-size: 0.875rem;
    color: #374151;
  }

  @media (min-width: 1024px) {
    .form-group input:focus + .floating-label,
    .form-group input:not(:placeholder-shown) + .floating-label,
    .form-group input.error + .floating-label {
      top: 2.15rem;
      font-size: 1.25rem;
    }
  }
  
  /* Animation for billing section */
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.5s ease-out;
  }
  
  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
  }

  /* Custom step numbers for larger screens */
  @media (min-width: 1024px) {
    /* .step-number {
      width: 4.5rem;
      height: 4.5rem;
    } */
  }
</style>