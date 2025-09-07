<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import emailjs from '@emailjs/browser';
  import { generateQrDataUrl } from '$lib/generateQrDataUrl.js';

  let form;

  export let guestSlug;
  export let guest = null;
  export let invite = null;
  export let events = [];

  let guestId;
  let name = '';
  let email = '';
  let phone = '';

  let attending = '';
  let guestCount = 1;
  let dietary = '';
  let wishes = '';

  let submitted = false;
  let step = 1;
  let submitting = false;
  let error = '';
  let submissionMessage = '';
  let submissionError = '';

  // CHANGED: Replace single mealPreference with dynamic guestDetails array
  let guestDetails = [];

  $: showMealOptions = invite?.meal_options_enabled && attending === 'yes';
  $: mealOptions = invite?.meal_options || [];

  // ADDED: Initialize guestDetails based on guestCount
  $: {
    if (guestCount > 0) {
      // Preserve existing data while adjusting array length
      const newGuestDetails = Array(guestCount).fill().map((_, i) => 
        guestDetails[i] || { name: '', meal: '', dietary: '' }
      );
      guestDetails = newGuestDetails;
    }
  }

  // Validation state - only show errors after user tries to proceed
  let showValidationErrors = false;
  let validationErrors = {
    name: '',
    email: '',
    phone: ''
  };

  onMount(async () => {
    if (guest) {
      initializeGuestData(guest);
    } else if (guestSlug) {
      await fetchGuestData();
    } else {
      submissionError = 'Invalid invitation link';
    }
    console.log('🔍 Invite object:', invite);
    console.log('🔍 meal_options_enabled:', invite?.meal_options_enabled);
    console.log('🔍 meal_options:', invite?.meal_options);
    console.log('🔍 showMealOptions will be:', invite?.meal_options_enabled && attending === 'yes');
  });

  function initializeGuestData(guestData) {
    guest = guestData;
    guestId = guestData.guest_id;
    name = guestData.full_name || '';
    email = guestData.email || '';
    phone = guestData.phone || '';
    attending = guestData.rsvp_status ? 'yes' : 'no';
    guestCount = guestData.guest_count || 1;
    dietary = guestData.dietary_restriction || '';
    wishes = guestData.wishes || '';

    // ADDED: Initialize guestDetails from existing meal_preference data
    if (guestData.meal_preference) {
      try {
        const parsedMealData = JSON.parse(guestData.meal_preference);
        if (parsedMealData.guests && Array.isArray(parsedMealData.guests)) {
          guestDetails = parsedMealData.guests;
        }
      } catch (e) {
        // If it's old format (single string), convert to new format
        guestDetails = [{ name: name, meal: guestData.meal_preference, dietary: dietary }];
      }
    }
  }

  async function fetchGuestData() {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('slug', guestSlug)
      .single();

    if (data) {
      initializeGuestData(data);
    } else {
      submissionError = `Guest not found for slug: ${guestSlug}`;
    }
  }

  function validateStep1() {
    validationErrors = {
      name: '',
      email: '',
      phone: ''
    };

    let isValid = true;

    if (!name.trim()) {
      validationErrors.name = 'Name is required';
      isValid = false;
    } else if (!/^[A-Za-z\s&]+$/.test(name)) {
      validationErrors.name = 'Name must not contain numbers';
      isValid = false;
    }

    if (!email.trim()) {
      validationErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!phone.trim()) {
      validationErrors.phone = 'Phone is required';
      isValid = false;
    } else if (!/^[0-9+]+$/.test(phone)) {
      validationErrors.phone = 'Phone must contain only digits and +';
      isValid = false;
    }

    return isValid;
  }

  // UPDATED: Validate all guests have selected meals and provided names
  function validateStep2() {
    if (showMealOptions && attending === 'yes') {
      return guestDetails.every(guest => 
        guest.meal && guest.name && guest.name.trim()
      );
    }
    return true;
  }

  function nextStep() {
    if (step === 1) {
      showValidationErrors = true;
      if (!validateStep1()) {
        return;
      }
    }
    
    if (step === 2) {
      if (attending === 'no') {
        step = 3; // Skip meal selection for non-attendees
      } else if (showMealOptions) {
        step = 2.5; // Go to meal selection step
      } else {
        step = 3; // Skip to wishes if no meal options
      }
    } else if (step === 2.5) {
      // Validate meal selection when leaving step 2.5
      if (showMealOptions && !validateStep2()) {
        showValidationErrors = true;
        return;
      }
      step = 3; // Go to wishes after meal selection
    } else {
      step++;
    }
    
    showValidationErrors = false;
  }

  function prevStep() {
    if (step > 1) {
      showValidationErrors = false;
      if (step === 2.5) {
        step = 2; // Go back to attendance question
      } else if (step === 3 && showMealOptions && attending === 'yes') {
        step = 2.5; // Go back to meal selection
      } else {
        step--;
      }
    }
  }

  // function incrementGuest() {
  //   if (guestCount < 2) { // ADDED: Limit to 2 guests max
  //     guestCount++;
  //   }
  // }

  // function decrementGuest() {
  //   if (guestCount > 1) guestCount--;
  // }

  async function handleSubmit() {
    if (!guestId) {
      submissionError = 'Guest ID not found. Please refresh and try again.';
      return;
    }

    try {
      const { data: existingGuest, error: fetchError } = await supabase
        .from('guests')
        .select('*')
        .eq('guest_id', guestId)
        .single();

      if (fetchError) {
        submissionError = `Guest not found: ${fetchError.message}`;
        return;
      }

      // UPDATED: Prepare meal preference data as JSON
      let mealPreferenceData = null;
      if (showMealOptions && attending === 'yes') {
        mealPreferenceData = JSON.stringify({ guests: guestDetails });
      }

      const updateData = {
        rsvp_status: attending === 'yes',
        guest_count: attending === 'yes' ? guestCount : 0,
        dietary_restriction: dietary,
        meal_preference: mealPreferenceData, // UPDATED: Store JSON data
        wishes,
        email,
        phone,
        submitted_at: new Date().toISOString()
      };

      if (attending === 'yes') {
        try {
          console.log('🔄 Generating QR code for guest:', existingGuest.guest_id);
          const qrDataUrl = await generateQrDataUrl(existingGuest.guest_id);
          
          if (qrDataUrl) {
            updateData.qr_code_url = qrDataUrl;
            console.log('✅ QR code data URL generated and added');
          }
        } catch (qrError) {
          console.error('❌ QR code generation failed:', qrError);
          submissionError = `RSVP saved but QR code generation failed: ${qrError.message}`;
        }
      }

      const { error: updateError } = await supabase
        .from('guests')
        .update(updateData)
        .eq('guest_id', guestId);

      if (updateError) {
        submissionError = `Update failed: ${updateError.message}`;
      } else {
        submitted = true;
        submissionMessage = '🎉 RSVP updated successfully!';
      }

    } catch (error) {
      console.error('handleSubmit error:', error);
      submissionError = `An error occurred: ${error.message}`;
    }
  }

  async function handleFinalSubmit() {
    submitting = true;
    try {
      await handleSubmit();
      await sendEmail();
    } catch (err) {
      submissionError = 'Something went wrong. Please try again.';
    } finally {
      submitting = false;
    }
  }

  function formatEventDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  async function getEventDate() {
    try {
      console.log('🔍 Fetching events for invite.id:', invite.id);
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('event_date, event_type')
        .eq('invite_id', invite.id)
        .order('event_date', { ascending: true });
      
      console.log('🔍 Events query result:', eventsData);
      
      if (error) {
        console.error('❌ Error fetching event date:', error);
        return null;
      }
      
      if (eventsData && eventsData.length > 0) {
        console.log('🔍 Found events, using first event date:', eventsData[0].event_date);
        return eventsData[0].event_date;
      }
      
      console.log('🔍 No events found for invite.id:', invite.id);
      return null;
      
    } catch (error) {
      console.error('❌ Error fetching event date:', error);
      return null;
    }
  }

  const sendEmail = async () => {
  try {
    const { data: guestData, error } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_id', guestId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch guest data for email:', error);
      return;
    }

    const eventDateString = await getEventDate();
    const eventDate = eventDateString ? 
      formatEventDate(eventDateString) : 
      'Event Date TBD';

    // Get couple name from the invite object (already available)
    const coupleName = invite?.client_name || 'the couple';

    const templateParams = {
      to_email: email,
      name: name,
      email: email,
      guest_name: name,
      couple_name: coupleName, // Add this new parameter
      event_date: eventDate,
      qr_code_url: guestData.qr_code_url,
    };

    console.log('📧 Sending email to:', email);
    console.log('📧 Template params:', templateParams);

    await emailjs.send(
      'service_17fltfd',
      'template_l8lr5fh',
      templateParams,
      'YxTaAeZpa_qVltT4A'
    );
    
    console.log('✅ Confirmation email sent successfully');
  } catch (error) {
    console.error('❌ Email send failed:', error);
  }
};

  function formatRsvpDeadline(deadline) {
    if (!deadline) return "soon";
    
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  }
</script>

<style lang="postcss">
  @reference "tailwindcss";
  
  :global(:root) {
    background-color: theme(--color-gray-100);
    --font-display: 'Recoleta R', serif;
    --font-subheading: 'Recoleta R', serif;
    --font-button: 'Recoleta R', serif;
    --font-h3: 'Mabry Light', serif;
    --font-h2: 'Mabry Light', serif;
    --font-p: 'Mabry Light', serif;
    --font-smallcaption: 'Mabry Light', serif;
  }
  
  :global(body) {
    margin: 0;
    padding: 0;
  }
  
  :global(*) {
    box-sizing: border-box;
  }

  :global(.fade-in) {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 1s ease-out, transform 1s ease-out;
  }

  :global(.fade-in.visible) {
    opacity: 1;
    transform: translateY(0);
  }

  .font-subheading {
    font-family: var(--font-subheading);
    font-size: 0.75rem;
    letter-spacing: 0.25em;
  }

  .font-display {
    font-family: var(--font-display);
    font-size: 4.75rem;
  }

  .font-display.dresscode{
    font-size:2.25rem;
  }

  .font-button {
    font-family: var(--font-button);
    font-size: 0.75rem;
    letter-spacing: 0.25em;
  }

  .font-h3 {
    font-family: var(--font-h3);
    font-size: 1.25rem;
    letter-spacing: 0.025em;
  }

  .font-h3.eventtime {
    font-family: var(--font-h3);
    font-size: 1rem;
    margin-top: 4px;
    opacity: 90%;
  }

  .font-h2 {
    font-family: 'Recoleta L', serif;
    font-size: 1.75rem;
    letter-spacing: 0.050em;
  }

  .font-h2.countdown {
    font-family: var(--font-h2);
    font-size: 2.5rem;
  }

  .font-p {
    font-family: var(--font-p);
    font-size: 1.75rem;
  }

  .font-smallcaption {
    font-family: var(--font-smallcaption);
    font-size: 0.75rem;
    font-weight: 600;
    opacity: 70%;
    letter-spacing: 0.25em;
  }

  @media (max-width: 376px) {
    .rsvp-section {
      transform: scale(0.9);
      transform-origin: center center;
      margin-top:4vh;
    }
  }
</style>

<section class="min-h-[100vh] rsvp-section flex flex-col justify-center items-center px-8 md:px-16 lg:px-28 text-white">
  <div class="max-w-xl w-full space-y-6 fade-in">
    <div class="text-center space-y-4">
      <p class="uppercase font-smallcaption mb-6">Reserve your seat</p>
      <h2 class="font-h2">Kindly Confirm Your Attendance</h2>
      <hr class="mb-6 border-white/50">
      <p class="font-h3 eventtime mb-10"> 
        Please RSVP by {formatRsvpDeadline(invite.rsvp_deadline)}. <br>
        <em> Your check-in QR code will arrive by email.</em> <br>
        We'd love to see you there!
      </p>
    </div>

    <!-- Progress indicator -->
    <div class="flex justify-center items-center gap-3 mb-10 fade-in">
      {#each [1, 2, 3] as s}
        <div class={`w-8 h-8 rounded-full flex items-center justify-center border-1 ${step === s ? 'bg-white/50 text-white' : 'border-gray-500 text-gray-500'}`}>{s}</div>
        {#if s < 3}
          <div class="w-6 h-px bg-gray-600 "></div>
        {/if}
      {/each}
    </div>

    {#if !submitted}
      <!-- Step 1 -->
      {#if step === 1}
        <div class="space-y-4">
          <!-- Name -->
          <label class="font-smallcaption uppercase block text-white text-sm mb-2">Your Name</label>
          <input
            class="w-full border p-4 rounded focus:ring-1 focus:ring-gray-400 bg-black/30 text-white
                  border-opacity-50 focus:outline-none
                  {showValidationErrors && validationErrors.name ? 'border-red-500' : 'border-white'}"
            type="text"
            bind:value={name}
            placeholder=""
            required
          />
          {#if showValidationErrors && validationErrors.name}
            <p class="text-red-400 text-sm opacity-90 font-smallcaption error">{validationErrors.name}</p>
          {/if}

          <!-- Email -->
          <label class="font-smallcaption uppercase block text-white text-sm mb-2">Your Email</label>
          <input
            class="w-full border border-opacity-50 bg-black/30 text-white p-4 rounded focus:ring-1 focus:ring-gray-400
                  {showValidationErrors && validationErrors.email ? 'border-red-500' : 'border-white'}"
            type="email"
            bind:value={email}
            placeholder=""
            required
          />
          {#if showValidationErrors && validationErrors.email}
            <p class="text-red-400 text-sm opacity-90 font-smallcaption error">{validationErrors.email}</p>
          {/if}

          <!-- Phone -->
          <label class="font-smallcaption uppercase block text-white text-sm mb-2">Your Phone</label>
          <input
            class="w-full border p-4 rounded focus:ring-1 focus:ring-gray-400 bg-black/30 text-white
                  border-opacity-50 focus:outline-none
                  {showValidationErrors && validationErrors.phone ? 'border-red-500' : 'border-white'}"
            type="tel"
            bind:value={phone}
            placeholder=""
            required
          />
          {#if showValidationErrors && validationErrors.phone}
            <p class=" font-smallcaption error text-sm opacity-90 !text-red-400">{validationErrors.phone}</p>
          {/if}

          <button
            on:click={nextStep}
            class="font-button font-bold  mt-6 py-4 px-6 uppercase transition text-black/90 w-full bg-[#C7DDD8] rounded-md hover:bg-[#b5d0c9]"
          >
            Next
          </button>
        </div>
      {/if}

      <!-- Step 2 -->
      {#if step === 2}
        <div class="space-y-6">
          <div>
            <p class="mb-2 font-smallcaption uppercase">Are you attending?</p>
            <div class="flex gap-4">
              <button
                class={`flex-1 font-button uppercase border border-white px-4 py-4 rounded-md text-sm  transition-all duration-200 ease-in
                      ${attending === 'yes' ? 'bg-[#C7DDD8] !text-black/90' : 'bg-transparent text-white'}`}
                on:click={() => attending = 'yes'}
              >
                Gladly
              </button>
              <button
                class={`flex-1 font-button uppercase border border-white px-4 py-4 rounded-md text-sm transition-all duration-200 ease-in
                      ${attending === 'no' ? 'bg-[#C7DDD8] !text-black/90' : 'text-white'}`}
                on:click={() => attending = 'no'}
              >
                Sadly
              </button>
            </div>
          </div>

          {#if attending === 'yes'}
         <div class="space-y-8">
  <p class="mb-2 font-smallcaption uppercase">Are you bringing a plus one?</p>
  <div class="flex gap-4">
    <button
      class={`flex-1 font-button uppercase border border-white px-4 py-4 rounded-md text-sm transition-all duration-200 ease-in
            ${guestCount === 2 ? 'bg-[#C7DDD8] !text-black/90' : 'bg-transparent text-white'}`}
      on:click={() => guestCount = 2}
    >
      Yes
    </button>
    <button
      class={`flex-1 font-button uppercase border border-white px-4 py-4 rounded-md text-sm transition-all duration-200 ease-in
            ${guestCount === 1 ? 'bg-[#C7DDD8] !text-black/90' : 'text-white'}`}
      on:click={() => guestCount = 1}
    >
      No
    </button>
  </div>

  <label class="font-smallcaption uppercase block text-white text-sm mb-2">Any allergies or special requests? (optional)</label>
  <textarea class="w-full border border-white border-opacity-50 bg-black/30 text-white p-2 rounded focus:ring-1 focus:outline-none resize-none focus:ring-yellow-400" bind:value={dietary} placeholder=""></textarea>
</div>
          {/if}

          <div class="flex justify-between">
            <button on:click={prevStep} class="font-smallcaption uppercase border border-white text-white py-4 px-6 rounded-md hover:bg-white hover:text-black transition">Back</button>
            <button on:click={nextStep} class="font-button uppercase rounded-md  py-4 px-6 transition text-black/90 bg-[#C7DDD8] hover:bg-[#b5d0c9]">Next</button>
          </div>
        </div>
      {/if}

      <!-- UPDATED: Dynamic Meal Selection Step 2.5 -->
      {#if step === 2.5 && showMealOptions}
        <div class="space-y-6">
          <p class="mb-4 font-smallcaption uppercase">Meal Selection for Your Party</p>
          
          {#each Array(guestCount) as _, index}
            <div class="border border-white/30 p-4 rounded-md space-y-3">
              <h4 class="font-h3 text-center">
                {index === 0 ? 'You' : `Your Plus One`}
              </h4>
              
              <!-- Name input for each guest -->
              <input 
                class="w-full border border-white/50 bg-black/30 text-white p-2 rounded focus:ring-1 focus:outline-none
                      {showValidationErrors && (!guestDetails[index]?.name || !guestDetails[index]?.name.trim()) ? 'border-red-500' : 'border-white/50'}"
                placeholder={index === 0 ? 'Please enter your full name' : 'Please enter their full name'}
                bind:value={guestDetails[index].name}
              />
              
              <!-- Meal selection buttons -->
              <div class="space-y-2">
                {#each mealOptions as option}
                  <button
                    class={`w-full text-left px-3 py-2 rounded border transition font-h3
                          ${guestDetails[index].meal === option ? 'bg-[#C7DDD8] text-black' : 'border-white/50 text-white hover:bg-white/10'}`}
                    on:click={() => {
                      guestDetails[index].meal = option;
                      guestDetails = [...guestDetails]; // Trigger reactivity
                    }}
                  >
                    {option}
                  </button>
                {/each}
              </div>
              
              <!-- Individual dietary restriction -->
              <input 
                class="w-full border border-white/50 bg-black/30 text-white p-2 rounded text-sm focus:ring-1 focus:outline-none"
                placeholder="Dietary Restrictions (optional)"
                bind:value={guestDetails[index].dietary}
              />
              
              {#if showValidationErrors && (!guestDetails[index]?.name || !guestDetails[index]?.name.trim() || !guestDetails[index]?.meal)}
                <p class="text-red-400 text-sm opacity-90 font-smallcaption">Name and meal selection required</p>
              {/if}
            </div>
          {/each}

          <div class="flex justify-between">
            <button on:click={prevStep} class="font-smallcaption uppercase border border-white text-white py-4 px-6 rounded-md hover:bg-white hover:text-black transition">
              Back
            </button>
            <button on:click={nextStep} class="font-button uppercase rounded-md py-4 px-6 transition text-black/90 bg-[#C7DDD8] hover:bg-[#b5d0c9]">
              Next
            </button>
          </div>
        </div>
      {/if}

      <!-- Step 3 -->
      {#if step === 3}
        <div class="space-y-4">
          <label class="font-smallcaption uppercase block text-white text-sm mb-2">Your Wishes</label>
          <textarea
            class="w-full min-h-[140px] border border-white border-opacity-50 bg-black/30 text-white p-2 rounded focus:ring-1 focus:outline-none resize-none focus:ring-yellow-400"
            bind:value={wishes}
            placeholder="Say something nice..."
          ></textarea>

          <div class="flex justify-between">
            <button on:click={prevStep} class="font-button uppercase border border-white text-white py-4 px-6 rounded-md hover:bg-white hover:text-black transition">
              Back
            </button>

            <button
              on:click={handleFinalSubmit}
              disabled={submitting}
              class="font-button uppercase bg-[#C7DDD8] !text-black py-2 px-6 rounded-full transition
                   disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit RSVP'}
            </button>
          </div>
        </div>

        {#if submissionError}
          <p class="text-red-400 text-sm text-center mt-2">{submissionError}</p>
        {/if}
      {/if}
    {:else}
      <!-- Success/Error state -->
      <div class="flex flex-col items-center justify-center space-y-4">
        <img
          src={submissionError ? "/xmark.png" : "/check.png"}
          alt={submissionError ? "Failed" : "Success"}
          class="w-20 h-20"
        />
        <p class="font-smallcaption font-bold uppercase text-center {submissionError ? 'text-red-400' : 'text-white'}">
          {submissionError || 'RSVP received! We sent you a confirmation email with your QR code.'}
        </p>
      </div>
    {/if}
  </div>
</section>