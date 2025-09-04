<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import emailjs from '@emailjs/browser';
  let form;

  export let inviteId;
  export let clientSlug;

  //demo
   export let invite;
  export let isDemo = true; // Always true for demo

  let step = 1;
  let name = '';
  let email = '';
  let phone = '';

  let attending = '';
  let guestCount = 1;
  let dietary = '';

  let wishes = '';
  let submitted = false;

  let wishesWall = [
    {
      full_name: "Demo Guest",
      wishes: "Looking forward to your big day!",
      created_at: "2025-07-30T08:00:00Z"
    }
  ];
  let loading = false;
  let error = '';

  let submitting = false;
  let submissionMessage = '';
  let submissionError = '';


  function nextStep() {
    if (step === 2 && attending === 'no') {
      step = 3;
    } else {
      step++;
    }
  }

  function prevStep() {
    if (step > 1) step--;
  }

  function incrementGuest() {
    guestCount++;
  }

  function decrementGuest() {
    if (guestCount > 1) guestCount--;
  }

  async function handleFinalSubmit() {
    submitting = true;
    submissionMessage = '';
    submissionError = '';

    // Simulate async submission
    setTimeout(() => {
      submitted = true;
      wishesWall = [
        {
          full_name: name || "Demo Guest",
          wishes,
          created_at: new Date().toISOString()
        },
        ...wishesWall
      ];
      submissionMessage = '🎉 RSVP submitted successfully!';
      submitting = false;
    }, 1000);
  }

  // Validation
  $: nameIsValid = /^[A-Za-z\s&]+$/.test(name) || name.trim() === '';
  $: phoneIsValid = /^[0-9+]+$/.test(phone) || phone.trim() === '';
  $: isStep1Complete = name.trim() && email.trim() && phone.trim() && nameIsValid && phoneIsValid;

  // Fade-in animation (optional, keep if you want)
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.5
      }
    );

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));
  });
</script>

<div class="flex flex-col items-center px-8 pt-10 sm:pt-14 md:pt-16 text-white snap-start">
  <div class="max-w-xl w-full space-y-6 fade-in">
    <p class="uppercase text-xs tracking-widest font-caption opacity-80">Reserve your seat</p>
    <h2 class="text-3xl/10 sm:text-4xl/12 md:text-5xl/14 font-['Sangbleu_King'] ">Kindly Confirm Your Attendance and Share Your Blessings </h2>
    <hr class="mt-[-6px] sm:mt-[-8px] md:mt-[-10px]">
      <div class="">
        <p class="text-lg mb-10 sm:mb-8 md:mb-12 font-['Sangbleu_Light']">We invite you to confirm your presence at our celebration and to share your heartfelt wishes with us. Please RSVP by Sunday, 28 July 2026, to help us prepare for your arrival.</p>
      </div>
    <div class="flex justify-center items-center gap-3 fade-in">
      {#each [1, 2, 3] as s}
        <div class={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === s ? 'bg-white/50 text-white' : 'border-gray-500 text-gray-500'}`}>{s}</div>
        {#if s < 3}
          <div class="w-6 h-px bg-gray-600"></div>
        {/if}
      {/each}
    </div>

    {#if !submitted}
      <!-- Step 1 -->
      {#if step === 1}
        <div class="space-y-4">
          <label class="font-caption uppercase block text-white text-sm mb-2">Your Name</label>
          <input
            class="w-full border p-2 rounded focus:ring-1 focus:ring-gray-400 bg-black/30 text-white
                  border-opacity-50 focus:outline-none
                  {name && !nameIsValid ? 'border-red-500' : 'border-white'}"
            type="text"
            bind:value={name}
            placeholder=""
          />
          {#if name && !nameIsValid}
            <p class="text-red-400 text-s opacity-90 mb-6">Name must not contain numbers.</p>
          {/if}

          <label class="font-caption uppercase block text-white text-sm mb-2">Your Email</label>
          <input
            class="w-full border border-white border-opacity-50 bg-black/30 text-white p-2 rounded focus:ring-1 focus:ring-gray-400"
            type="email"
            bind:value={email}
            placeholder=""
          />

          <label class="font-caption uppercase block text-white text-sm mb-2">Your Phone</label>
            <input
              class="w-full border p-2 rounded focus:ring-1 focus:ring-gray-400 bg-black/30 text-white
                    border-opacity-50 focus:outline-none
                    {phone && !phoneIsValid ? 'border-red-500' : 'border-white'}"
              type="tel"
              bind:value={phone}
              placeholder=""
            />
            {#if phone && !phoneIsValid}
              <p class="text-red-400 text-s mb-6 opacity-90">Oops! Phone must contain only digits.</p>
            {/if}

          <button  on:click={nextStep}
              class="font-caption mt-2 py-3 px-6 rounded-sm uppercase transition w-full
                    text-white
                    {isStep1Complete ? 'bg-black hover:bg-black' : 'bg-black opacity-50 cursor-not-allowed'}"
              disabled={!isStep1Complete}
            >
              Next</button>
        </div>
      {/if}
      <!-- Step 2 -->
      {#if step === 2}
        <div class="space-y-6">
          <div>
            <p class="mb-2 font-caption uppercase">Are you attending?</p>
            <div class="flex gap-4">
              <button  class={`flex-1 font-caption uppercase border border-white px-4 py-2 rounded-md text-sm font-medium transition
          ${attending === 'yes' ? 'bg-white !text-black' : 'bg-transparent text-white'}`}
  on:click={() => attending = 'yes'}
>
  Yes. I'm Coming!</button>
              <button class={`flex-1 font-caption uppercase border border-white px-4 py-2 rounded-md text-sm font-medium transition ${attending === 'no' ? 'bg-white !text-black' : 'text-white'}`} on:click={() => attending = 'no'}>Sorry, I can't come</button>
            </div>
          </div>

          {#if attending === 'yes'}
            <div class="space-y-8">
              <p class="mb-2 font-caption uppercase">How many guests?</p>
              <div class="flex gap-4 items-center">
                <button class="bg-white text-black rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-yellow-300 transition" on:click={decrementGuest}>-</button>
                <span>{guestCount}</span>
                <button class="bg-white text-black rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-yellow-300 transition" on:click={incrementGuest}>+</button>
              </div>

              <label class="font-caption uppercase block text-white text-sm mb-2">Any allergies or special requests? (optional)</label>
              <textarea class="
              w-full border border-white border-opacity-50 bg-black/30 text-white p-2 rounded focus:ring-1 focus:outline-none resize-none focus:ring-yellow-400" bind:value={dietary} placeholder=""></textarea>
            </div>
          {/if}

          <div class="flex justify-between">
            <button on:click={prevStep} class="font-caption uppercase border border-white text-white py-2 px-6 rounded-md hover:bg-white hover:text-black transition">Back</button>
            <button on:click={nextStep} class="bg-white !text-black font-caption uppercase py-2 px-6 rounded-md font-semibold hover:bg-yellow-300 transition">Next</button>
          </div>
        </div>
      {/if}

      <!-- Step 3 -->
      {#if step === 3}
        <form bind:this={form} on:submit|preventDefault={handleFinalSubmit} class="space-y-4">
          <label class="font-caption uppercase block text-white text-sm mb-2">Your Wishes</label>
          <textarea
            class="w-full min-h-[140px] border border-white border-opacity-50 bg-black/30 text-white p-2 rounded focus:ring-1 focus:outline-none resize-none focus:ring-yellow-400"
            bind:value={wishes}
            placeholder="Say something nice..."
            name="message"
          ></textarea>

          <div class="flex justify-between">
            <button
              type="button"
              on:click={prevStep}
              class="font-caption uppercase border border-white text-white py-2 px-6 rounded-md hover:bg-white hover:text-black transition"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={submitting}
              class="font-caption uppercase bg-white !text-black py-2 px-6 rounded-md font-semibold transition
                    hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit RSVP'}
            </button>
          </div>
        </form>

        {#if submissionError}
          <p class="text-red-400 text-sm text-center mt-2">{submissionError}</p>
        {/if}
      {/if}
    {:else}
      <div class="flex flex-col items-center justify-center space-y-4 mt-10">
        <img
          src={submissionError ? "/xmark.png" : "/check.png"}
          alt={submissionError ? "Failed" : "Success"}
          class="w-20 h-20"
        />
        <p class={`text-lg font-caption uppercase !text-green ${submissionError ? 'text-red-400' : 'text-green-400'}`}>
          {submissionError ? 'RSVP failed to submit' : 'RSVP submitted successfully'}
        </p>
      </div>
    {/if}
  </div>
</div>
