<script>
  import { onMount } from 'svelte';
  import Lenis from '@studio-freight/lenis';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';

  // -------------------------------
  // THEME / PALETTE PER STEP
  // -------------------------------
  const steps = [
 { key: 'client',   bg: '#C8B1FF', text: '#FFFFFF', card: '#E0D4FF', label: '#F1EAFF' },
{ key: 'event',     bg: '#C8B1FF', text: '#FFFFFF', card: '#E0D4FF', label: '#F1EAFF' },
{ key: 'location',  bg: '#C8B1FF', text: '#FFFFFF', card: '#E0D4FF', label: '#F1EAFF' },
{ key: 'deadline', bg: '#C8B1FF', text: '#FFFFFF', card: '#E0D4FF', label: '#F1EAFF' },
{ key: 'slug',    bg: '#C8B1FF', text: '#FFFFFF', card: '#E0D4FF', label: '#F1EAFF' },
{ key: 'done',     bg: '#F0F637', text: '#1B7B30' }
];

  // -------------------------------
  // STATE
  // -------------------------------
  let step = 0;
  const totalSteps = steps.length;

  // Step 1 - Client
  let client_name = '';
  let slug = '';
  let invite_id = null;
  let customSlug = '';              
  let slugStatus = 'idle';
  let slugToast = ''; 

  // Step 2 - Event details
  let event_type = '';
  let event_date = '';
  let location = '';
  let event_time='';

  // Step 3 - RSVP deadline
  let rsvp_deadline = '';

  // UX
  let errorMsg = '';
  let saving = false;
  let slugCheckNonce = 0; // prevents out-of-order results
  let slugDebounce;
  let slugInitialized = false;
//   let finalSlug = slug;

//   if (!finalSlug) {
//   const candidate = (customSlug || '').trim();
//   finalSlug = candidate ? await generateUniqueSlug(slugify(candidate)) 
//                         : await generateUniqueSlug(slugify(client_name));
// }





  // -------------------------------
  // HELPERS
  // -------------------------------
  function slugify(name) {
    return name
      .toLowerCase()
      .replace(/&/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .trim();
  }

function parseEventTime(event_time) {
  if (!event_time || !event_time.trim()) {
    return { start_time: null, end_time: null };
  }
  const parts = event_time.split(/\s*-\s*/);
  if (parts.length !== 2) throw new Error('Please use time like "01:00 PM - 02:00 PM".');
  const [startRaw, endRaw] = parts;
  return { start_time: toSqlTime(startRaw), end_time: toSqlTime(endRaw) };
}

function toSqlTime(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) throw new Error('Please use time like "01:00 PM - 02:00 PM".');
  let [, h, min, ap] = m;
  let hh = parseInt(h, 10) % 12;
  if (ap.toUpperCase() === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${min}:00`;
}

function queueValidate() {
  clearTimeout(slugDebounce);
  slugDebounce = setTimeout(() => validateSlug('debounce'), 300);
}

async function maybeInitSlugStep() {
  if (slugInitialized || customSlug?.trim()) return; // don't overwrite user input
  await initSlugStep();
  slugInitialized = true;
}



// function parseTime(time) {
//   const [hour, minute] = time.slice(0, 5).split(':');
//   const period = time.slice(6).toUpperCase();
//   let hours24 = parseInt(hour, 10);

//   if (period === 'PM' && hours24 < 12) hours24 += 12;
//   if (period === 'AM' && hours24 === 12) hours24 = 0;

//   return `${String(hours24).padStart(2, '0')}:${minute}:00`;
// }



function parseDDMMYYYYToISO(s) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return null;
  const [dd, mm, yyyy] = s.split('/').map(Number);
  if (mm < 1 || mm > 12) return null;

  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) return null;

  // Construct ISO (local) and verify round-trip
  const d = new Date(yyyy, mm - 1, dd);
  const iso = d.toLocaleDateString('en-CA'); // YYYY-MM-DD (local)
  // Guard against JS auto-correction (e.g., 31/02)
  const [Y,M,D] = iso.split('-').map(Number);
  if (Y !== yyyy || M !== mm || D !== dd) return null;

  return iso;
}

function isOnOrAfterToday(isoYmd) {
  if (!isoYmd) return false;
  const todayStr = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
  return isoYmd >= todayStr; // safe lexicographic compare in ISO
}

  // Deduplicate slug: base, base-1, base-2, ...
  async function generateUniqueSlug(base) {
    let candidate = base;
    let n = 1;
    // maybeSingle() returns null data when not found (no throw)
    while (true) {
      const { data, error } = await supabase
        .from('invites')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();
      if (error) throw error;        // bubble unexpected errors
      if (!data) return candidate;   // unique
      candidate = `${base}-${n++}`;
    }
  }

 async function isSlugTaken(candidate) {
  const { count, error } = await supabase
    .from('invites')
    .select('id', { count: 'exact', head: true }) // HEAD request, no rows
    .eq('slug', candidate);

  if (error) throw error;
  return (count ?? 0) > 0;
}

  // Initialize the slug step: prefill with base slug, auto-append -1, -2, ...
  async function initSlugStep() {
    const base = slugify(client_name || '');
    if (!base) {
      customSlug = '';
      slugStatus = 'idle';
      slugToast = '';
      return;
    }
    const unique = await generateUniqueSlug(base);
    customSlug = unique;
    slug = unique;
    slugStatus = 'ok';
    slugToast = unique !== base
      ? `${base} is taken.  ${unique} is available— you can customize it anytime.`
      : '';
  }

function canNext() {
  if (step === 0) {
    return client_name.trim().length > 1;
  }

  if (step === 1) { // Event name + When (date/time)
    if (!event_type?.trim()) return false;

    const isoDate = parseDDMMYYYYToISO(event_date);
    if (!isoDate) return false;             // invalid format/date
    if (!isOnOrAfterToday(isoDate)) return false;

    // (Optional) validate time range "hh:mm AM/PM - hh:mm AM/PM"
    // return /^\d{2}:\d{2}\s?(AM|PM)\s*-\s*\d{2}:\d{2}\s?(AM|PM)$/i.test(event_time || '');
    return true;
  }

  if (step === 2) { // Where (moved to its own page)
    return !!location?.trim();
  }

if (step === 3) { // RSVP deadline
  // must be present & valid
  const isoRsvp = parseDDMMYYYYToISO(rsvp_deadline);   // <-- PARSE
  if (!isoRsvp) return false;

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  if (isoRsvp < todayStr) return false;

  const isoEvent = parseDDMMYYYYToISO(event_date);         // event_date is DD/MM/YYYY in UI
  if (isoEvent && isAfter(isoRsvp, isoEvent)) return false;

  return true;
}
if (step === 4) {
  return slugStatus === 'ok';
}
}

async function nextStep() {
  errorMsg = '';
  
  if (step === 1) {
    if (!event_type?.trim()) {
      errorMsg = 'Please enter the event name.';
      return;
    }

    const isoDate = parseDDMMYYYYToISO(event_date);
    if (!isoDate) {
      errorMsg = 'Please enter a valid date (DD/MM/YYYY).';
      return;
    }
    if (!isOnOrAfterToday(isoDate)) {
      errorMsg = 'Please select today or a future date.';
      return;
    }
  }

if (step === 3) {
  const isoRsvp = parseDDMMYYYYToISO(rsvp_deadline);
  const isoEvent = parseDDMMYYYYToISO(event_date);
  const todayStr = new Date().toLocaleDateString('en-CA');

  if (!isoRsvp) {
    errorMsg = 'Please enter a valid date (DD/MM/YYYY).';
    return;
  }
  if (isoRsvp < todayStr) {
    errorMsg = 'Please set the RSVP deadline to today or a future date.';
    return;
  }
  if (isoEvent && isAfter(isoRsvp, isoEvent)) {
    errorMsg = 'Please set the RSVP deadline on or before the event date.';
    return;
  }
}

 if (steps[step]?.key === 'slug') {
    // If user hasn't validated or it's still checking, validate now
    if (slugStatus !== 'ok') {
      await validateSlug('manual');  // runs async check and sets slugStatus
    }
    if (slugStatus !== 'ok') {
      // keep a friendly toast/message if still not ok
      slugToast = slugToast || 'Please choose an available link.';
      return;
    }
  }

  if (step < totalSteps - 1) {
    step += 1;
    if (steps[step]?.key === 'slug') {
       await maybeInitSlugStep();
    }
  }
}


function prevStep() {
    if (step > 0) step -= 1;
  }

async function validateSlug(trigger = 'manual') {
   const candidate = (customSlug || '').trim();
   if (!candidate) {
     slugStatus = 'idle';
     slugToast = '';
     return;
   }
   slugStatus = 'checking';
   const nonce = ++slugCheckNonce;
   const taken = await isSlugTaken(candidate);
   if (nonce !== slugCheckNonce) return; // stale result; ignore

   if (taken) {
     slugStatus = 'taken';
     const suggestion = await generateUniqueSlug(candidate);
     if (nonce !== slugCheckNonce) return;
     slugToast = `${candidate} is taken. We set your link to ${suggestion} — you can customize it anytime.`;
     // keep Next disabled; user must confirm an available value
   } else {
     slugStatus = 'ok';
     slug = candidate;
     slugToast = (trigger === 'enter' || trigger === 'blur')
       ? 'Great, this link is available.'
       : '';
   }
 }

// function getYear(isoDate /* YYYY-MM-DD */) {
//   if (!isoDate) return null;
//   return Number(isoDate.slice(0, 4));
// }

// let todayStr = new Date().toLocaleDateString('en-CA'); //

let timezone = '';
let timezones = [];
function loadTimezones() {
  try {
    // Modern browsers
    timezones = Intl.supportedValuesOf?.('timeZone') || [];
  } catch (_e) {
    // Fallback shortlist (extend if you like)
    timezones = [
      'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
      'Europe/London','Europe/Paris','Europe/Berlin','Asia/Jakarta','Asia/Singapore','Asia/Tokyo','Australia/Sydney'
    ];
  }
}

function isAfter(a /* YYYY-MM-DD */, b /* YYYY-MM-DD */) {
  // ISO date strings compare lexicographically by chronology
  if (!a || !b) return false;
  return a > b;
}

// Call once
loadTimezones();

  // -------------------------------
  // LENIS (smooth scroll)
  // -------------------------------
  onMount(async () => {
    // tiny warm-up to reduce first-check latency
    await supabase.from('invites').select('id', { head: true, count: 'estimated' }).limit(1);
    const lenis = new Lenis({ duration: 0.9, smoothWheel: true });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  });

  // -------------------------------
  // FINAL SUBMIT (single DB write flow)
  // -------------------------------
// async function handleFinalSubmit() {
//   errorMsg = '';
//   saving = true;
  
//   try {
//     // 1) Make (and dedupe) slug
//     const base = slugify(client_name);
//     slug = await generateUniqueSlug(base);

//     // 2) Validate + convert RSVP to ISO (YYYY-MM-DD)
//     const isoRsvp = parseDDMMYYYYToISO(rsvp_deadline);
//     if (!isoRsvp) throw new Error('RSVP date is invalid. Please use DD/MM/YYYY.');

//     // 3) Insert invite
//     const { data: invite, error: invErr } = await supabase
//       .from('invites')
//       .insert({ client_name, slug, rsvp_deadline: isoRsvp })
//       .select('id, slug')
//       .single();
//     if (invErr) throw invErr;

//     const invite_id = invite.id;

//     // 4) Parse optional event time (no fallback)
//     let start_time = null, end_time = null;
//     try {
//       ({ start_time, end_time } = parseEventTime(event_time)); // returns nulls if empty
//     } catch (e) {
//       // Friendly validation instead of Postgres 400
//       errorMsg = e.message; 
//       saving = false;
//       return;
//     }

//     // 5) Insert event (omit time keys if null)
//     const isoEventDate = parseDDMMYYYYToISO(event_date);
//     const eventPayload = {
//       invite_id,
//       event_type,
//       event_date: isoEventDate,
//       location,
//       timezone,
//       ...(start_time ? { start_time } : {}),
//       ...(end_time ? { end_time } : {}),
//     };

//     const { error: evtErr } = await supabase.from('events').insert(eventPayload);
//     if (evtErr) throw evtErr;

//     // 6) Success → done step + redirect
//     step = 5;
//     setTimeout(() => {
//      goto(`/${slug}/dashboard`, { replaceState: true });
//     }, 900);

//   } catch (e) {
//     console.error(e);
//     errorMsg = e?.message ?? 'Failed to submit.';
//   } finally {
//     saving = false;
//   }
// }

async function handleFinalSubmit() {
  errorMsg = '';
  saving = true;

  try {
    // --- 1) Decide finalSlug, respecting prior validation ---
    let finalSlug = slug; // set earlier when validateSlug(...) succeeded
    if (!finalSlug) {
      const candidate = (customSlug || '').trim();
      if (candidate) {
        // Try user entry first (still pass through deduper for safety)
        finalSlug = await generateUniqueSlug(slugify(candidate));
      } else {
        // Fall back to name-based
        finalSlug = await generateUniqueSlug(slugify(client_name));
      }
    }

    // --- 2) Validate RSVP (DD/MM/YYYY -> ISO) ---
    const isoRsvp = parseDDMMYYYYToISO(rsvp_deadline);
    if (!isoRsvp) throw new Error('RSVP date is invalid. Please use DD/MM/YYYY.');

    // --- 3) Insert invite with unique-violation retry (TOCTOU safe) ---
    let invite, invErr;
    ({ data: invite, error: invErr } = await supabase
      .from('invites')
      .insert({ client_name, slug: finalSlug, rsvp_deadline: isoRsvp })
      .select('id, slug')
      .single());

    if (invErr?.code === '23505') {
      // Someone snagged it; retry once with a new unique
      const retrySlug = await generateUniqueSlug(finalSlug);
      ({ data: invite, error: invErr } = await supabase
        .from('invites')
        .insert({ client_name, slug: retrySlug, rsvp_deadline: isoRsvp })
        .select('id, slug')
        .single());
      if (!invErr) {
        slugToast = `That link was just taken. We set your link to ${retrySlug}.`;
      }
    }
    if (invErr) throw invErr;

    const invite_id = invite.id;
    // Ensure we use the authoritative slug returned by DB (may be retrySlug)
    const finalPersistedSlug = invite.slug;

    // --- 4) Parse optional event time; show friendly error if bad ---
    let start_time = null, end_time = null;
    try {
      // Your helper should return { start_time, end_time } or nulls if empty
      ({ start_time, end_time } = parseEventTime(event_time));
    } catch (e) {
      errorMsg = e.message;
      saving = false;
      return;
    }

    // --- 5) Validate event date & timezone before inserting event ---
    const isoEventDate = parseDDMMYYYYToISO(event_date);
    if (!isoEventDate) throw new Error('Event date is invalid. Please use DD/MM/YYYY.');
    // if (!timezone) throw new Error('Please select a timezone.');

    // Build payload (omit null time fields)
    const eventPayload = {
      invite_id,
      event_type,
      event_date: isoEventDate,
      location,
      timezone,
      ...(start_time ? { start_time } : {}),
      ...(end_time ? { end_time } : {}),
    };

    const { error: evtErr } = await supabase.from('events').insert(eventPayload);
    if (evtErr) throw evtErr;

    // --- 6) Success → show done step & redirect ---
    step = 5; // final visible "done" step
    setTimeout(() => {
      goto(`/${finalPersistedSlug}/dashboard`, { replaceState: true });
    }, 900);

  } catch (e) {
    console.error(e);
    errorMsg = e?.message ?? 'Failed to submit.';
  } finally {
    saving = false;
  }
}


</script>

<!-- PROGRESS BAR -->
<div class="fixed top-0 left-0 w-full h-1 z-50">
  <div
    class="h-full transition-all"
    style="
      width: {Math.round((step / (totalSteps - 1)) * 100)}%;
      background: linear-gradient(90deg, rgba(255,255,255,.6), rgba(255,255,255,.9));
    "
  />
</div>

<!-- STEP CONTAINER -->
<section
  class="min-h-screen w-full flex p-14 md:p-16 lg:p-18 transition-colors"
  style="background:{steps[step].bg}; color:{steps[step].text};"
>
  <div class="absolute top-6 right-8 text-xs md:text-sm opacity-80 hover:opacity-100">
    <!-- {#if step < totalSteps - 1}
      <button class="tracking-wide" on:click={nextStep}>SKIP</button>
    {/if} -->
  </div>

  <!-- CONTENT AREA -->
  <div class="w-full">
    <!-- STEP 1: CLIENT NAME -->
    {#if step === 0}
      <h1 class="questions mb-8" style="color:{steps[step].text}">
        How should your names appear on the invitation?
      </h1>

      <div class="mx-auto w-full">
              <input
                id="client_name"
                type="text"
                bind:value={client_name}
                placeholder="Type your name here"
                on:keydown={(e)=> e.key==='Enter' && canNext() && nextStep()}
                class="answers"
              />
    {#if errorMsg}
          <p class="text-red-700 text-sm mt-4">{errorMsg}</p>
        {/if}  
      </div>
       <div class="mt-12 flex gap-3">
         <button
          class="btn-primary"
          disabled={!canNext() || saving}
          on:click={nextStep}
        >
          Continue
        </button>
        </div>
    {/if}

    <!-- STEP 2: EVENT DETAILS -->
    {#if step === 1}
  <!-- Event Name -->
     <h1 class="questions mb-2" style="color:{steps[step].text}">
    Hi, {client_name || 'there'}!
  </h1>

  <h2 class="questions mb-8">What’s the big celebration?</h2>
  <input
    class="answers"
    placeholder="Type your event name"
    bind:value={event_type}
    on:input={() => (errorMsg = '')}
  />

  <!-- Event Date -->
  <h2 class="questions mb-8 mt-16">When are we celebrating?</h2>
  <div class="inline-flex max-w-xl items-center mb-8">
    <!-- Date input -->
  <div class="relative inline-block">
  <input
    type="text"
    bind:value={event_date}
    placeholder="DD/MM/YYYY"
    class="font-ttcommonsreg bg-transparent border-none outline-none
           text-white placeholder:text-white/50
           text-3xl md:text-4xl lg:text-5xl
           w-[14ch] 
"
    on:input={() => {
      errorMsg = '';
      // Optionally live-validate format here
    }}
   on:blur={() => {
  const iso = parseDDMMYYYYToISO(event_date);
  const todayISO = new Date(Date.UTC(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  )).toISOString().slice(0,10);

  errorMsg = !iso
    ? 'Please enter a valid date (DD/MM/YYYY).'
    : (iso < todayISO ? 'Please select current or future year.' : '');
}}
  />
</div>
    <!-- Event Time -->
    <input
      type="text"
      bind:value={event_time}
      class="answers flex-none w-[25ch]"
      placeholder="00:00 AM/PM - 00:00 AM/PM"
      on:input={() => (errorMsg = '')}
    />
  </div>

  <!-- Location -->
  <!-- <h2 class="text-3xl md:text-4xl lg:text-5xl mb-8">Where?</h2>
  <input
    class="w-full bg-transparent border-none outline-none text-white placeholder:text-white/50 text-3xl md:text-4xl lg:text-5xl"
    placeholder="Type in the full address here"
    bind:value={location}
    on:input={() => (errorMsg = '')}
  /> -->

  {#if errorMsg}
    <p class="text-white/90 text-sm mt-2">{errorMsg}</p>
  {/if}

     <div class="mt-12 flex gap-3">
      <button  class="btn-primary" on:click={prevStep}>Back</button>
         <button
            class="btn-primary"
          disabled={!canNext() || saving}
          on:click={nextStep}
        >
          Continue
        </button>
        </div>
{/if}

{#if step === 2}
  <h1 class="questions mb-8">Where is it taking place?</h1>
  <input
    class="answers"
    placeholder="Type in the full address here"
    bind:value={location}
    on:input={() => (errorMsg = '')}
  />

  {#if errorMsg}
    <p class="text-white/90 text-sm mt-2">{errorMsg}</p>
  {/if}

  <div class="mt-12 flex gap-3">
      <button    class="btn-primary" on:click={prevStep}>Back</button>
         <button
           class="btn-primary"
          disabled={!canNext() || saving}
          on:click={nextStep}
        >
          Continue
        </button>
        </div>
{/if}


    <!-- STEP 3: RSVP DEADLINE -->
    {#if step === 3}
      <h1 class="questions mb-8">
        When would you like guests to RSVP by?
      </h1>
      <div class="mx-auto w-full">
        <input
  type="text"
  bind:value={rsvp_deadline}
  placeholder="DD/MM/YYYY"
  class="answers w-[14ch]"
  on:input={() => {
    errorMsg = '';  // Clear error on input change
  }}
  on:blur={() => {
    // Validate the input format "DD/MM/YYYY"
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(rsvp_deadline)) {
      errorMsg = 'Please enter a valid date (DD/MM/YYYY)';
    } else {
      // Check if RSVP deadline is before event date
      const parsedRsvpDate = parseDDMMYYYYToISO(rsvp_deadline);
      const parsedEventDate = parseDDMMYYYYToISO(event_date);
      if (parsedRsvpDate && parsedEventDate && isAfter(parsedRsvpDate, parsedEventDate)) {
        errorMsg = 'Please set the RSVP deadline on or before the event date.';
      }
    }
  }}
/>
{#if errorMsg}
  <p class="text-white/90 text-sm mt-2">{errorMsg}</p>
{/if}
       

        <div class="mt-12 flex gap-3">
      <button    class="btn-primary" on:click={prevStep}>Back</button>
         <button
            class="btn-primary"
          disabled={!canNext() || saving}
          on:click={nextStep}
        >
          Continue
        </button>
        </div>
      </div>
    {/if}

    {#if step === 4}
  <h1 class="questions mb-8">
    Finally, how would you like your link viewed?
  </h1>

  <div class="mx-auto w-full">
    <div class="inline-flex justify-between gap-4 items-center">
    <label class="answers opacity-90" style="color:{steps[step].label}">
      startswithlove.com/
    </label>

    <div class="flex items-center gap-3">
      <input
        class="flex-1 rounded-lg px-4 py-3 outline-none bg-white/90 text-gray-900"
        bind:value={customSlug}
        placeholder="your-link"
       on:input={() => { slugStatus='idle'; slugToast=''; queueValidate(); }}
       on:keydown={(e) => e.key === 'Enter' && validateSlug('enter')}
   on:blur={() => validateSlug('blur')}
      />

      <!-- Status icon -->
      {#if slugStatus === 'ok'}
        <svg class="h-6 w-6 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5 13l4 4L19 7" />
        </svg>
      {:else if slugStatus === 'checking'}
        <div class="h-6 w-6 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
      {:else if slugStatus === 'taken'}
        <svg class="h-6 w-6 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M6 18L18 6M6 6l12 12" />
        </svg>
      {/if}
    </div>
    </div>

    <!-- Toast -->
    {#if slugToast}
      <div class="mt-4 text-sm px-4 py-3 rounded-lg bg-white/15 text-white/95">
        {slugToast}
      </div>
    {/if}

<div class="mt-12 flex gap-3">
      <button class="btn-primary" on:click={prevStep}>Back</button>
       <button 
  class="btn-primary" 
  disabled={saving || slugStatus !== 'ok'} 
  on:click={handleFinalSubmit}
>
  {saving ? 'Submitting…' : 'Submit'}
</button>
        </div>
  </div>
{/if}

    <!-- {#if step === 5}
      <h1 class="text-[clamp(28px,4.2vw,46px)]   leading-tight mb-8">
        Review your details
      </h1>

      <div class="mx-auto w-full max-w-3xl rounded-2xl p-5 md:p-6 text-left"
           style="background:rgba(255,255,255,.18); box-shadow:0 4px 20px rgba(0,0,0,.06);">
        <div class="grid gap-4">
          <div>
            <div class="text-xs opacity-80" style="color:{steps[step].label}">Couple’s Name</div>
            <div class="text-lg">{client_name || '—'}</div>
          </div>
          <div class="grid md:grid-cols-4 gap-4">
  <div>
    <div class="text-xs opacity-80" style="color:{steps[step].label}">Event Name</div>
    <div class="text-lg">{event_type || '—'}</div>
  </div>
  <div>
    <div class="text-xs opacity-80" style="color:{steps[step].label}">Event Date</div>
    <div class="text-lg">{event_date || '—'}</div>
  </div>
  <div>
    <div class="text-xs opacity-80" style="color:{steps[step].label}">Location</div>
    <div class="text-lg">{location || '—'}</div>
  </div>
  <div>
    <div class="text-xs opacity-80" style="color:{steps[step].label}">Timezone</div>
    <div class="text-lg">{timezone || '—'}</div>
  </div>
</div>
          </div>
          <div>
            <div class="text-xs opacity-80" style="color:{steps[step].label}">RSVP Deadline</div>
            <div class="text-lg">{rsvp_deadline || '—'}</div>
          </div>
        </div>

        {#if errorMsg}
          <p class="text-red-100 text-sm mt-4">{errorMsg}</p>
        {/if}

        <div class="mt-6 flex items-center justify-center gap-3">
          <button class="btn-secondary" on:click={prevStep}>Back</button>
          <button class="btn" disabled={saving} on:click={handleFinalSubmit}>
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
     
    {/if} -->

  
    {#if step === 5}
      <h1 class="questions">
        You’re all set!<br/>
        Let’s see what your invite looks like.
      </h1>
      <p class="mt-6 text-base opacity-80">Redirecting to your dashboard…</p>
    {/if}
  </div>
</section>

<style lang="postcss">
  @reference "tailwindcss";

  input[type="date"]::-webkit-calendar-picker-indicator {
  display: none;
  -webkit-appearance: none;
  appearance: none;
}

.questions{
  @apply text-3xl md:text-4xl lg:text-5xl;
  font-family:'TT Commons Medium', 'sans-serif';
}

.answers{
  @apply 
    w-full bg-transparent border-none outline-none
     placeholder:text-white/50 text-3xl md:text-4xl lg:text-5xl opacity-80;
    font-family:'TT Commons Regular', 'sans-serif';
}



.btn-primary{@apply inline-flex items-center justify-center tracking-wide px-12 py-4 rounded-full text-xs leading-none  bg-white text-gray-900 
                transition hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed;
            font-family:'TT Commons Medium', 'sans-serif';

}

</style>

<!-- <style lang="postcss">
  @reference tailwindcss;

  .btn {
    @apply inline-flex items-center justify-center px-6 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed;
    background: rgba(255,255,255,.9);
    color: #111827;
  }
  .btn:hover { filter: brightness(0.98); }
  .btn-secondary {
    @apply inline-flex items-center justify-center px-5 py-3 rounded-xl border transition;
    border-color: rgba(255,255,255,.7);
    background: transparent;
  }
  .btn-secondary:hover { background: rgba(255,255,255,.12); }

  .fld {
    @apply w-full rounded-lg px-4 py-3 outline-none;
    background: rgba(255,255,255,.92);
  }

  /* Make inputs large and airy for the Typeform feel */
  input::placeholder { opacity: .55; }

  /* Ensure smooth height changes on step transitions */
  section { transition: background-color .35s ease, color .35s ease; }
</style> -->


