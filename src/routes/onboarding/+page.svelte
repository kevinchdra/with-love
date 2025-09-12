<script>
  import { onMount } from 'svelte';
  import Lenis from '@studio-freight/lenis';
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';

  // -------------------------------
  // THEME / PALETTE PER STEP
  // -------------------------------
  const steps = [
 { key: 'client',   bg: '#CFE0F3', text: '#2D3F6D', card: '#EDEAF3', label: '#7C7C8A' },
{ key: 'event',    bg: '#CBB7F6', text: '#FFFFFF', card: '#EDEAF3', label: '#F2ECFF' },
{ key: 'deadline', bg: '#646A0A', text: '#E6ECA8', card: '#A7B074', label: '#E6ECA8' },
{ key: 'slug',     bg: '#C4562D', text: '#FDE4D9', card: '#F2B9A8', label: '#FFE7DD' },
{ key: 'review',   bg: '#C4562D', text: '#FDE4D9', card: '#F2B9A8', label: '#FFE7DD' },
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

  // Step 3 - RSVP deadline
  let rsvp_deadline = '';

  // UX
  let errorMsg = '';
  let saving = false;
  let slugCheckNonce = 0; // prevents out-of-order results

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
  if (step === 0) return client_name.trim().length > 1;

 if (step === 1) {
  const ok = !!(event_type && event_date && location && timezone) && event_date >= todayStr;
  if (!ok) return false;
  const eventYear = getYear(event_date);
  return eventYear >= new Date().getFullYear();
}

  if (step === 2) {
    // must have a deadline, not past, and not after event date
    if (!rsvp_deadline) return false;
    if (rsvp_deadline < todayStr) return false;
    if (isAfter(rsvp_deadline, event_date)) return false;
    return true;
  }

  if (step === 3) return slugStatus === 'ok';
  if (step === 4) return true;
  return true;
}

function nextStep() {
  // inline validations that also set actionable error text starting with "please"
  errorMsg = '';

  if (step === 2) {
    if (!rsvp_deadline) {
      errorMsg = 'Please choose an RSVP deadline.';
      return;
    }
    if (rsvp_deadline < todayStr) {
      errorMsg = 'Please set the RSVP deadline to today or a future date.';
      return;
    }
    if (isAfter(rsvp_deadline, event_date)) {
      errorMsg = 'Please set the RSVP deadline on or before the event date.';
      return;
    }
  }

  if (step < totalSteps - 1) {
    step += 1;
    if (steps[step]?.key === 'slug') {
      initSlugStep();
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

 function getYear(isoDate /* YYYY-MM-DD */) {
  if (!isoDate) return null;
  return Number(isoDate.slice(0, 4));
}


 let todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for <input type="date">

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
  async function handleFinalSubmit() {
    errorMsg = '';
    saving = true;

    try {
      // 1) Make (and dedupe) slug
      const base = slugify(client_name);
      slug = await generateUniqueSlug(base);

      // 2) Insert invite
      const { data: invite, error: invErr } = await supabase
        .from('invites')
        .insert({ client_name, slug, rsvp_deadline })
        .select('id, slug')
        .single();
      if (invErr) throw invErr;

      invite_id = invite.id;

      // 3) Insert event linked to invite
      const { error: evtErr } = await supabase
        .from('events')
        .insert({
          invite_id,
          event_type,
          event_date, // YYYY-MM-DD
          location,
          timezone
        });
      if (evtErr) throw evtErr;

      // 4) Go to success step then redirect
      step = 4;
      setTimeout(() => {
        goto(`https://startswithlove.com/${slug}/dashboard`, { replaceState: true });
      }, 900);
    } catch (e) {
      errorMsg = e?.message ?? 'Failed to submit.';
    } finally {
      saving = false;
    }
  }
</script>

<!-- PROGRESS BAR -->
<div class="fixed top-0 left-0 w-full h-2 z-50">
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
  class="min-h-screen w-full flex items-center justify-center p-6 md:p-10 transition-colors"
  style="background:{steps[step].bg}; color:{steps[step].text}; font-family:'TT Commons', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Apple Color Emoji','Segoe UI Emoji';"
>
  <div class="absolute top-6 right-8 text-xs md:text-sm opacity-80 hover:opacity-100">
    {#if step < totalSteps - 1}
      <button class="tracking-wide" on:click={nextStep}>SKIP</button>
    {/if}
  </div>

  <!-- CONTENT AREA -->
  <div class="w-full max-w-5xl text-center">
    <!-- STEP 1: CLIENT NAME -->
    {#if step === 0}
      <h1 class="text-[clamp(28px,4.2vw,56px)] eading-tight mb-10" style="color:{steps[step].text}">
        What would you like your guests to call you?
      </h1>

      <div class="mx-auto w-full max-w-3xl rounded-2xl p-5 md:p-6"
           style="background:rgba(255,255,255,.35); box-shadow:0 4px 20px rgba(0,0,0,.06);">
        <div class="grid grid-cols-1 gap-4">
          <label class="text-xs" style="color:{steps[step].label}">Couple’s Full Names</label>
          <input
            class="rounded-lg px-4 py-3 bg-white/80 placeholder-black/50 outline-none focus:ring-2 focus:ring-black/40"
            placeholder="Eddy & Vania"
            bind:value={client_name}
            on:keydown={(e)=> e.key==='Enter' && canNext() && nextStep()}
          />
        </div>

        {#if errorMsg}
          <p class="text-red-700 text-sm mt-4">{errorMsg}</p>
        {/if}

        <div class="mt-6 flex items-center justify-center gap-3">
          <button class="btn" disabled={!canNext() || saving} on:click={nextStep}>
            Next
          </button>
        </div>
      </div>
    {/if}

    <!-- STEP 2: EVENT DETAILS -->
    {#if step === 1}
      <h1 class="text-[clamp(28px,4.2vw,56px)] leading-tight mb-10" style="color:{steps[step].text}">
        Hi, {client_name || 'there'}.<br/>When &amp; where is the celebration?
      </h1>

      <div class="mx-auto w-full max-w-5xl rounded-2xl p-5 md:p-6"
           style="background:rgba(255,255,255,.25); box-shadow:0 4px 20px rgba(0,0,0,.06);">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="text-xs" style="color:{steps[step].label}">Event Name</label>
            <input class="fld" placeholder="Wedding Reception" bind:value={event_type} />
          </div>
          <div>
            <label class="text-xs" style="color:{steps[step].label}">Event Date</label>
            <input
                class="fld text-gray-900"
                type="date"
                bind:value={event_date}
                min={todayStr}
                on:change={() => {
                  errorMsg = '';
                  const y = getYear(event_date);
                  if (y && y < new Date().getFullYear()) {
                    errorMsg = 'please select current or future year';
                  }
                }}
                on:blur={() => {
                  const y = getYear(event_date);
                  if (!event_date) return;
                  if (y < new Date().getFullYear()) {
                    errorMsg = 'please select current or future year';
                  } else if (event_date < todayStr) {
                    errorMsg = 'please select a date from today onwards';
                  }
                }}
              />
          </div>
          <div>
            <label class="text-xs" style="color:{steps[step].label}">Location</label>
            <input class="fld" placeholder="The Ritz-Carlton, Ballroom A" bind:value={location} />
          </div>
           <div>
    <label class="text-xs" style="color:{steps[step].label}">Timezone</label>
   <select
        class="fld text-gray-900"
        bind:value={timezone}
        on:change={() => (errorMsg = '')}
      >
        <option value="" disabled hidden>Select timezone</option>
        {#each timezones as tz}
          <option value={tz}>{tz}</option>
        {/each}
      </select>
  </div>
        </div>

        {#if errorMsg}
          <p class="text-red-700 text-sm mt-4">{errorMsg}</p>
        {/if}

        <div class="mt-6 flex items-center justify-center gap-3">
          <button class="btn-secondary" on:click={prevStep}>Back</button>
          <button class="btn" disabled={!canNext() || saving} on:click={nextStep}>
            Next
          </button>
        </div>
      </div>
    {/if}

    <!-- STEP 3: RSVP DEADLINE -->
    {#if step === 2}
      <h1 class="text-[clamp(28px,4.2vw,56px)]   leading-tight mb-10">
        When would you like guests to RSVP by?
      </h1>

      <div class="mx-auto w-full max-w-md rounded-2xl p-5 md:p-6"
           style="background:rgba(255,255,255,.18); box-shadow:0 4px 20px rgba(0,0,0,.06);">
        <label class="text-xs" style="color:{steps[step].label}">RSVP Deadline</label>
        <input class="fld" type="date" bind:value={rsvp_deadline}
       min={todayStr} max={event_date}
       on:change={() => { 
         // live guard: never allow after event date
         if (isAfter(rsvp_deadline, event_date)) {
           errorMsg = 'please set the RSVP deadline on or before the event date.';
         } else {
           errorMsg = '';
         }
       }} />

        {#if errorMsg}
          <p class="text-red-200 text-sm mt-4">{errorMsg}</p>
        {/if}

        <div class="mt-6 flex items-center justify-center gap-3">
          <button class="btn-secondary" on:click={prevStep}>Back</button>
          <button class="btn" disabled={!canNext() || saving} on:click={nextStep}>
            Next
          </button>
        </div>
      </div>
    {/if}

    {#if step === 3}
  <h1 class="text-[clamp(28px,4.2vw,46px)]   leading-tight mb-10">
    How would you like your link viewed?
  </h1>

  <div class="mx-auto w-full max-w-3xl rounded-2xl p-5 md:p-6"
       style="background:rgba(255,255,255,.18); box-shadow:0 4px 20px rgba(0,0,0,.06);">
    <label class="text-sm block mb-3 opacity-90" style="color:{steps[step].label}">
      startswithlove.com/
    </label>

    <div class="flex items-center gap-3">
      <input
        class="flex-1 rounded-lg px-4 py-3 outline-none bg-white/90 text-gray-900"
        bind:value={customSlug}
        placeholder="your-link"
        on:input={() => {
          slugStatus = 'idle';
          slugToast = '';
        }}
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

    <!-- Toast -->
    {#if slugToast}
      <div class="mt-4 text-sm px-4 py-3 rounded-lg bg-white/15 text-white/95">
        {slugToast}
      </div>
    {/if}

    <div class="mt-6 flex items-center justify-center gap-3">
      <button class="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-white/70 transition bg-transparent"
              on:click={prevStep}>
        Back
      </button>
      <button class="inline-flex items-center justify-center px-6 py-3 rounded-xl transition bg-white/90 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={slugStatus !== 'ok'}
              on:click={() => nextStep()}>
        Next
      </button>
    </div>
  </div>
{/if}


    <!-- STEP 4: REVIEW (NEW) -->
    {#if step === 4}
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
     
    {/if}

    <!-- STEP 5: DONE -->
    {#if step === 5}
      <h1 class="text-[clamp(28px,4.2vw,52px)]   leading-tight">
        You’re all set!<br/>
        Let’s see what your invite looks like.
      </h1>
      <p class="mt-6 text-base opacity-80">Redirecting to your dashboard…</p>
    {/if}
  </div>
</section>



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
