<script>
// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { onMount, onDestroy } from 'svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';
import { browser } from '$app/environment';

// ============================================================================
// CORE STATE VARIABLES
// ============================================================================

// Page & Client State
let clientSlug = '';
let clientData = null;
let loading = true;
let errorMessage = '';
let currentRoute = 'Dashboard';

// Data Collections
let guests = [];
let gifts = [];


// ============================================================================
// SEARCH & FILTER STATE
// ============================================================================

// Guest Search & Filters - Split for two tables
let searchTermNotSent = '';
let searchTermSent = '';
let sortField = 'full_name';
let sortDirection = 'asc';
let filterRsvp = 'all';
let filterCheckIn = 'all';

// Gift Search & Filters
let giftSearchTerm = '';
let giftViewMode = 'received'; // 'received' or 'given'

// Dropdown Menus
let showSortMenu = false;
let showFilterMenu = false;
let hoveredAction = null;
let expandedAction = null;


// UI State

let editingGuestId = null;
let editGuestDraft = null;
let isSavingGuest = false;
let guestSaveError = '';

// ============================================================================
// SELECTION STATE
// ============================================================================
let selectedGuestsNotSent = new Set();
let selectedGuestsSent = new Set();
let selectedGifts = new Set();
let selectedGiftGroups = new Set();
let showDeleteConfirmation = false;
let showDeleteSentConfirmation = false;
let showMarkNotSentConfirmation = false;
let isDeleting = false;
let isMarkingNotSent = false;

// ============================================================================
// MODAL STATE
// ============================================================================

//Guest Modals
let showAddGuestModal = false;

// Gift Modals
let showAddGiftModal = false;
let showEditGiftModal = false;
let showDeleteGiftsConfirmation = false;
let isDeletingGifts = false;
let editingGift = null;
let selectedGiftGroupForPreview = false;

// Message Modals
let showMessagePreviewModal = false;



// Settings Modal
let showSettingsModal = false;
let showMetricsSettings = false;
let isSavingMetrics = false;
let isSavingTemplates = false;
let settingsActiveTab = 'invite';

// ============================================================================
// PAGINATION STATE
// ============================================================================
let guestPage = 1;
let guestPageSent = 1;
const guestsPerPage = 10;
let giftPage = 1;
const giftPerPage = 10;

// ============================================================================
// METRICS CONFIGURATION
// ============================================================================

let selectedMetrics = {
    invitesSent: { mode: 'count' },
    invitesNotSent: { mode: 'count' },
    rsvpConfirmed: { mode: 'count' },
    rsvpNotConfirmed: { mode: 'count' },
    rsvpRejected: { mode: 'count' },
    checkIns: { mode: 'count' },
    totalGuests: { mode: 'count' },
    giftsReceived: { mode: 'count' },
    souvenirsGiven: { mode: 'count' },
    souvenirsLeft: { mode: 'count' },
    dietaryRestrictions: { mode: 'count' }
};

let availableMetrics = {
    invitesSent: { label: 'Total Invites Sent' },
    invitesNotSent: { label: 'Total Invites Not Sent' },
    rsvpConfirmed: { label: 'Confirmed RSVP' },
    rsvpNotConfirmed: { label: 'Not Confirmed RSVP' },
    rsvpRejected: { label: 'Rejected RSVP' },
    checkIns: { label: 'Total Check-Ins' },
    totalGuests: { label: 'Total Guests Attending' },
    giftsReceived: { label: 'Total Gifts Received' },
    souvenirsGiven: { label: 'Total Souvenirs Given' },
    souvenirsLeft: { label: 'Total Souvenirs Left' },
    dietaryRestrictions: { label: 'Guests with Dietary Restrictions' }
};

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================
let messageTemplates = {
    invite: `Hi {guest_name},

You are invited to {client_name} Wedding on {event_date} at {location}.

Please open your invite and confirm your RSVP before {rsvp_deadline}:
{invite_url}

We appreciate your attendance and look forward to celebrating our special moment with you!`,

    thankYou: `Hi {guest_name},

Thank you so much for the wonderful {gift_description}! Your thoughtful gift means a lot to us and will always remind us of our special day.

We're so grateful to have friends/family like you who made our wedding celebration even more meaningful.

With love and appreciation,
{client_name} ❤️`
};

let tempMessageTemplates = { ...messageTemplates };

// ============================================================================
// MESSAGE PREVIEW STATE
// ============================================================================
let previewMessage = '';
let selectedGuestForPreview = null;
let messageType = '';

// ============================================================================
// FORM STATE
// ============================================================================

// New Guest Form
let newGuest = {
    full_name: '',
    email: '',
    phone: '',
    guest_count: 1,
    dietary_restriction: ''
};

// New Gift Form
let newGift = {
    guest_id: '',
    gift_type: '',
    name: '',
    description: '',
    quantity: 1,
    value: null
};

// Gift Guest Search
let guestSearchTerm = '';
let showGuestSearchResults = false;
let selectedGuestForGift = null;
let filteredGuestsForSearch = [];

// ============================================================================
// REACTIVE STATEMENTS & COMPUTED VALUES
// ============================================================================

// Calculate metrics from data
$: metrics = calculateMetrics(guests, gifts);

// Process and filter data - Split into two tables
$: guestsNotSent = processGuests(guests.filter(g => !g.invite_sent), searchTermNotSent, sortField, sortDirection, 'all', 'all');
$: guestsSent = processGuests(guests.filter(g => g.invite_sent), searchTermSent, sortField, sortDirection, filterRsvp, filterCheckIn);
$: filteredGifts = processGiftsGroupedByGuest(gifts, giftSearchTerm, giftViewMode);

// Pagination calculations for both tables
$: totalNotSentPages = Math.ceil(guestsNotSent.length / guestsPerPage);
$: paginatedGuestsNotSent = guestsNotSent.slice(
  (guestPage - 1) * guestsPerPage,
  guestPage * guestsPerPage
);
$: if (guestPage > totalNotSentPages) {
  guestPage = Math.max(1, totalNotSentPages || 1);
}

$: totalSentPages = Math.ceil(guestsSent.length / guestsPerPage);
$: if (guestPageSent > totalSentPages) {
  guestPageSent = Math.max(1, totalSentPages || 1);
}
$: paginatedGuestsSent = guestsSent.slice(
    (guestPageSent - 1) * guestsPerPage,
    guestPageSent * guestsPerPage
);

$: totalGiftPages = Math.ceil(filteredGifts.length / giftPerPage);
$: paginatedGift = filteredGifts.slice(
    (giftPage - 1) * giftPerPage,
    giftPage * giftPerPage
);






// ============================================================================
// DATA LOADING & MANAGEMENT
// ============================================================================

async function loadDashboardData() {
    try {
        loading = true;
        // console.log('loadDashboardData started');
        // console.log('clientSlug:', clientSlug);
        
        // Get the invite first
        const { data: invite, error: inviteError } = await supabase
            .from('invites')
            .select('*')
            .eq('slug', clientSlug)
            .single()
            
        // console.log('Invite query result:', { invite, inviteError });
        
        if (inviteError || !invite) {
            errorMessage = 'Client not found';
            throw inviteError || new Error('Client not found');
        }
        
        // console.log('Invite ID for event lookup:', invite.id);
        
        // Get the related event data with detailed logging
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*') // Select all fields to see what's available
            .eq('invite_id', invite.id);
   
        
        // Try different approaches if the first one fails
        if (!event || event.length === 0) {
            // console.log('No events found with invite_id, trying alternative queries...');
            
            // Try with different field names
            const { data: eventAlt1, error: eventError1 } = await supabase
                .from('events')
                .select('*')
                .eq('id', invite.id); // Maybe it's a direct ID match
                
            // console.log('Alternative query 1 (id = invite.id):', { eventAlt1, eventError1 });
            
            // Try another common pattern
            const { data: eventAlt2, error: eventError2 } = await supabase
                .from('events')
                .select('*')
                .eq('id', invite.id);
                
            // console.log('Alternative query 2 (event_id = invite.id):', { eventAlt2, eventError2 });
            
            // Show all events to see the structure
            const { data: allEvents, error: allEventsError } = await supabase
                .from('events')
                .select('*')
                .limit(5);
                
            // console.log('Sample events (first 5):', { allEvents, allEventsError });
        }
        
        // Use the first successful result
        let finalEvent = null;
        if (event && event.length > 0) {
            finalEvent = event[0]; // Take first result if it's an array
        }
        
        // Combine the data
        clientData = {
            ...invite,
            events: finalEvent || {}
        };

        if (invite?.message_templates && typeof invite.message_templates === 'object') {
            messageTemplates = {
                invite: invite.message_templates.invite ?? messageTemplates.invite,
                thankYou: invite.message_templates.thankYou ?? messageTemplates.thankYou,
            };
            tempMessageTemplates = { ...messageTemplates };
            }
        
        console.log('Final clientData structure:', {
            invite_id: clientData.id,
            invite_slug: clientData.slug,
            rsvp_deadline: clientData.rsvp_deadline,
            client_name: clientData.client_name,
            events_data: clientData.events,
            events_keys: Object.keys(clientData.events || {}),
            event_date: clientData.events?.event_date,
            location: clientData.events?.location
        });
        
        // Load saved metrics preferences
        if (invite.dashboard_metrics) {
            if (Array.isArray(invite.dashboard_metrics)) {
                selectedMetrics = invite.dashboard_metrics.reduce((acc, key) => {
                    acc[key] = { mode: 'count' };
                    return acc;
                }, {});
            } else if (typeof invite.dashboard_metrics === 'object') {
                selectedMetrics = invite.dashboard_metrics;
            }
        }
        
        // Fetch guests
        const { data: guestData, error: guestError } = await supabase
            .from('guests')
            .select('*')
            .eq('invite_id', invite.id)
            .order('full_name')
            
            
        if (guestError) {
            errorMessage = 'Failed to load guest data';
            console.error(guestError);
            throw guestError;
        }
        guests = guestData || [];
        
        // Fetch gifts with guest relationships
        const { data: giftData, error: giftError } = await supabase
            .from('gifts')
            .select(`
                *,
                guests!gifts_guest_id_fkey (
                    guest_id,
                    full_name,
                    phone
                )
            `)
            .eq('invite_id', invite.id)
            .order('created_at', { ascending: false });

        if (giftError) {
            console.error('Error loading gifts:', giftError);
        } else {
            gifts = giftData || [];
        }
        
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        errorMessage = 'Failed to load dashboard data';
    } finally {
        loading = false;
    }
}

/**
 * Refresh dashboard data
 */
async function refreshData() {
    await loadDashboardData();
}

// ============================================================================
// METRICS CALCULATIONS
// ============================================================================

/**
 * Calculate dashboard metrics from guest and gift data
 */
function calculateMetrics(guests, gifts) {
    const invitesSent = guests.filter(g => g.invite_sent === true).length;
    const invitesNotSent = guests.filter(g => g.invite_sent !== true).length;
    const rsvpConfirmed = guests.filter(g => g.rsvp_status === true).length;
    const rsvpNotConfirmed = guests.filter(g => g.rsvp_status === null || g.rsvp_status === undefined).length;
    const rsvpRejected = guests.filter(g => g.rsvp_status === false).length;
    const checkIns = guests.filter(g => g.checked_in === true).length;
    const totalGuests = guests.reduce((sum, g) => sum + (g.rsvp_status === true ? (g.guest_count || 1) : 0), 0);
    const giftsReceived = gifts.filter(g => g.type === 'received').length;
    const souvenirsGiven = gifts
        .filter(g => g.type === 'given')
        .reduce((sum, g) => sum + (g.quantity || 1), 0);
    const souvenirsLeft = Math.max(0, totalGuests - souvenirsGiven);
    const dietaryRestrictions = guests.filter(g => g.dietary_restriction && g.dietary_restriction.trim()).length;

    return {
        invitesSent,
        invitesNotSent,
        rsvpConfirmed,
        rsvpNotConfirmed,
        rsvpRejected,
        checkIns,
        totalGuests,
        giftsReceived,
        souvenirsGiven,
        souvenirsLeft,
        dietaryRestrictions
    };
}

/**
 * Calculate percentage for a metric
 */
function calculatePercent(key) {
    let base = 1;

    switch (key) {
        case 'rsvpConfirmed':
        case 'rsvpNotConfirmed':
        case 'rsvpRejected':
            base = metrics.invitesSent || 1;
            break;
        case 'checkIns':
            base = metrics.rsvpConfirmed || 1;
            break;
        case 'souvenirsGiven':
        case 'souvenirsLeft':
            base = metrics.totalGuests || 1;
            break;
        default:
            base = metrics.invitesSent || 1;
    }

    return ((metrics[key] / base) * 100).toFixed(1);
}



//Handle Buttons

function handleUploadGuests() {
    goto(`/${clientSlug}/dashboard/upload-guests`);
  }

// ============================================================================
// DATA PROCESSING & FILTERING
// ============================================================================

/**
 * Process and filter guest list (updated to remove invite_sent filter since we split the data)
 */
function processGuests(guests, search, sortField, sortDirection, rsvpFilter, checkInFilter) {
    let result = [...guests];
    
    // Apply search filter
if (search && search.trim() !== "") {
  const tokens = queryTokens(search);

  result = result.filter((guest) => {
    const name = guest.full_name || "";
    const phone = guest.phone || "";
    const email = guest.email || "";

    // Numeric query: match phone digits forgivingly
    const numericQuery = search.replace(/\D/g, "");
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneMatches = numericQuery.length >= 3
      ? phoneDigits.includes(numericQuery)
      : false;

    // Token AND across name/phone/email (normalized)
    const textMatches =
      tokensMatch(name, tokens) ||
      tokensMatch(phone, tokens) ||
      tokensMatch(email, tokens);

    return textMatches || phoneMatches;
  });
}
    // Apply RSVP filter
    if (rsvpFilter !== 'all') {
        result = result.filter(guest => {
            switch (rsvpFilter) {
                case 'confirmed': return guest.rsvp_status === true;
                case 'declined': return guest.rsvp_status === false;
                case 'pending': return guest.rsvp_status === null || guest.rsvp_status === undefined;
                default: return true;
            }
        });
    }
    
    // Apply check-in filter
    if (checkInFilter !== 'all') {
        result = result.filter(guest => {
            return checkInFilter === 'checked-in' ? guest.checked_in === true : guest.checked_in !== true;
        });
    }
    
    // Apply sorting
    result.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortField) {
            case 'full_name':
                aVal = (a.full_name || '').toLowerCase();
                bVal = (b.full_name || '').toLowerCase();
                break;
            case 'phone':
                aVal = (a.phone || '').toLowerCase();
                bVal = (b.phone || '').toLowerCase();
                break;
            case 'email':
                aVal = (a.email || '').toLowerCase();
                bVal = (b.email || '').toLowerCase();
                break;
            case 'rsvp_status':
                aVal = a.rsvp_status === true ? 0 : (a.rsvp_status === false ? 2 : 1);
                bVal = b.rsvp_status === true ? 0 : (b.rsvp_status === false ? 2 : 1);
                break;
            case 'checked_in':
                aVal = a.checked_in === true ? 0 : 1;
                bVal = b.checked_in === true ? 0 : 1;
                break;
            case 'invite_sent':
                aVal = a.invite_sent === true ? 0 : 1;
                bVal = b.invite_sent === true ? 0 : 1;
                break;
            case 'dietary_restriction':
                aVal = (a.dietary_restriction || '').toLowerCase();
                bVal = (b.dietary_restriction || '').toLowerCase();
                break;
            case 'guest_count':
                aVal = a.guest_count || 0;
                bVal = b.guest_count || 0;
                break;
            default:
                aVal = String(a[sortField] || '').toLowerCase();
                bVal = String(b[sortField] || '').toLowerCase();
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    return result;
}

/**
 * Process and group gifts by guest
 */
function processGiftsGroupedByGuest(gifts, search, viewMode) {
    let result = gifts.filter(g => g.type === viewMode);
    
    if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(gift => {
            const name = (gift.name || '').toLowerCase();
            const description = (gift.description || '').toLowerCase();
            return name.includes(searchLower) || description.includes(searchLower);
        });
    }
    
    // Group by guest_id
    const groupedByGuest = result.reduce((acc, gift) => {
        const guestId = gift.guest_id || 'anonymous';
        if (!acc[guestId]) {
            acc[guestId] = {
                guest: gift.guests,
                gifts: []
            };
        }
        acc[guestId].gifts.push(gift);
        return acc;
    }, {});
    
    return Object.values(groupedByGuest);
}

$: baseNotSent = guests.filter((g) => !g.invite_sent);
$: baseSent    = guests.filter((g) =>  g.invite_sent);

// After processGuests computed values
$: noMatchesNotSent = (searchTermNotSent && searchTermNotSent.trim() !== "" && baseNotSent.length > 0 && guestsNotSent.length === 0);
$: noMatchesSent    = (searchTermSent    && searchTermSent.trim()    !== "" && baseSent.length    > 0 && guestsSent.length    === 0);

// Also useful to know when there is simply no data yet (regardless of search)
$: emptyNotSentData = baseNotSent.length === 0;
$: emptySentData    = baseSent.length === 0;



// ============================================================================
// GUEST MANAGEMENT
// ============================================================================

/**
 * Add a new guest
 */
async function addGuest() {
    if (!newGuest.full_name.trim() || !newGuest.phone.trim()) {
        alert('Name and phone are required');
        return;
    }

    try {
        const slug = newGuest.full_name.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();

        const { error } = await supabase
            .from('guests')
            .insert([{
                invite_id: clientData.id,
                full_name: newGuest.full_name,
                slug: slug,
                email: newGuest.email || null,
                phone: newGuest.phone || null,
                guest_count: newGuest.guest_count,
                dietary_restriction: newGuest.dietary_restriction || null
            }]);

        if (error) throw error;

        await loadDashboardData();
        showAddGuestModal = false;
        newGuest = { full_name: '', email: '', phone: '', guest_count: 1, dietary_restriction: '' };
        
    } catch (err) {
        console.error('Error adding guest:', err);
        alert('Failed to add guest');
    }
}

/**
 * Delete selected guests from Not Sent table
 */
async function deleteSelectedNotSentGuests() {
    if (selectedGuestsNotSent.size === 0) return;

    try {
        isDeleting = true;
        const guestIds = Array.from(selectedGuestsNotSent);

        // Step 1: Delete all gifts associated with these guests
        const { error: giftDeleteError } = await supabase
            .from('gifts')
            .delete()
            .in('guest_id', guestIds);

        if (giftDeleteError) {
            console.error('Error deleting gifts:', giftDeleteError);
            alert(`Failed to delete associated gifts: ${giftDeleteError.message}`);
            return;
        }

        // Step 2: Now delete the guests
        const { error: guestDeleteError, count } = await supabase
            .from('guests')
            .delete({ count: 'exact' })
            .in('guest_id', guestIds);

        if (guestDeleteError) {
            console.error('Error deleting guests:', guestDeleteError);
            alert(`Failed to delete guests: ${guestDeleteError.message}`);
            return;
        }

        if (count === 0) {
            alert('No guests were deleted. They may have already been removed.');
        } else {
            console.log(`Successfully deleted ${count} guest(s) and their gifts`);
        }

        // Refresh data and reset state
        await loadDashboardData();
        selectedGuestsNotSent.clear();
        selectedGuestsNotSent = selectedGuestsNotSent;
        showDeleteConfirmation = false;

    } catch (err) {
        console.error('Unexpected error during deletion:', err);
        alert(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
    } finally {
        isDeleting = false;
    }
}

/**
 * Delete selected guests from Sent table
 */
async function deleteSelectedSentGuests() {
    if (selectedGuestsSent.size === 0) return;

    try {
        isDeleting = true;
        const guestIds = Array.from(selectedGuestsSent);

        // Step 1: Delete all gifts associated with these guests
        const { error: giftDeleteError } = await supabase
            .from('gifts')
            .delete()
            .in('guest_id', guestIds);

        if (giftDeleteError) {
            console.error('Error deleting gifts:', giftDeleteError);
            alert(`Failed to delete associated gifts: ${giftDeleteError.message}`);
            return;
        }

        // Step 2: Now delete the guests
        const { error: guestDeleteError, count } = await supabase
            .from('guests')
            .delete({ count: 'exact' })
            .in('guest_id', guestIds);

        if (guestDeleteError) {
            console.error('Error deleting guests:', guestDeleteError);
            alert(`Failed to delete guests: ${guestDeleteError.message}`);
            return;
        }

        if (count === 0) {
            alert('No guests were deleted. They may have already been removed.');
        } else {
            console.log(`Successfully deleted ${count} guest(s) and their gifts`);
        }

        // Refresh data and reset state
        await loadDashboardData();
        selectedGuestsSent.clear();
        selectedGuestsSent = selectedGuestsSent;
        showDeleteSentConfirmation = false;

    } catch (err) {
        console.error('Unexpected error during deletion:', err);
        alert(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
    } finally {
        isDeleting = false;
    }
}

/**
 * Mark selected sent guests as not sent
 */
async function markSelectedAsNotSent() {
    if (selectedGuestsSent.size === 0) return;

    try {
        isMarkingNotSent = true;
        const guestIds = Array.from(selectedGuestsSent);

        const { error } = await supabase
            .from('guests')
            .update({ 
                invite_sent: false,
                invite_sent_at: null
            })
            .in('guest_id', guestIds);

        if (error) throw error;

        await loadDashboardData();
        selectedGuestsSent.clear();
        selectedGuestsSent = selectedGuestsSent;
        showMarkNotSentConfirmation = false;

    } catch (err) {
        console.error('Error marking guests as not sent:', err);
        alert('Failed to mark guests as not sent');
    } finally {
        isMarkingNotSent = false;
    }
}

/**
 * Toggle guest selection for Not Sent table
 */
function toggleNotSentGuestSelection(guestId) {
    if (selectedGuestsNotSent.has(guestId)) {
        selectedGuestsNotSent.delete(guestId);
    } else {
        selectedGuestsNotSent.add(guestId);
    }
    selectedGuestsNotSent = selectedGuestsNotSent;
}

/**
 * Toggle guest selection for Sent table
 */
function toggleSentGuestSelection(guestId) {
    if (selectedGuestsSent.has(guestId)) {
        selectedGuestsSent.delete(guestId);
    } else {
        selectedGuestsSent.add(guestId);
    }
    selectedGuestsSent = selectedGuestsSent;
}

/**
 * Select/deselect all guests in Not Sent table
 */
function selectAllNotSentGuests() {
    if (selectedGuestsNotSent.size === guestsNotSent.length) {
        selectedGuestsNotSent.clear();
    } else {
        selectedGuestsNotSent = new Set(guestsNotSent.map(g => g.guest_id));
    }
    selectedGuestsNotSent = selectedGuestsNotSent;
}

/**
 * Select/deselect all guests in Sent table
 */
function selectAllSentGuests() {
    if (selectedGuestsSent.size === guestsSent.length) {
        selectedGuestsSent.clear();
    } else {
        selectedGuestsSent = new Set(guestsSent.map(g => g.guest_id));
    }
    selectedGuestsSent = selectedGuestsSent;
}

// function extractMeals(mealPref) {
//   try {
//     if (!mealPref) return [];
//     // Supabase often gives JSONB as an object already; but be safe
//     const obj = typeof mealPref === 'string' ? JSON.parse(mealPref) : mealPref;
//     const meals = (obj?.guests ?? [])
//       .map(g => g?.meal)
//       .filter(Boolean);
//     // de-dupe (optional)
//     return [...new Set(meals)];
//   } catch {
//     return [];
//   }
// }

function extractMeals(mealPref, fallbackCount = 0) {
  try {
    const obj = typeof mealPref === 'string' ? JSON.parse(mealPref) : mealPref;
    const arr = Array.isArray(obj?.guests) ? obj.guests : [];

    const meals = [];
    for (const entry of arr) {
      const meal = entry?.meal;
      const qty  = Number(entry?.qty ?? 1);
      if (meal) {
        for (let i = 0; i < Math.max(1, qty); i++) meals.push(meal);
      }
    }

    // If no structured meals but we know guest count, fallback
    if (meals.length === 0 && fallbackCount > 0) {
      for (let i = 0; i < fallbackCount; i++) meals.push('Unspecified');
    }
    return meals;
  } catch {
    return Array.from({ length: Math.max(0, fallbackCount) }, () => 'Unspecified');
  }
}

//Edit guests on table//
function startEditGuest(guest) {
  editingGuestId = guest.guest_id;
  editGuestDraft = {
    full_name: guest.full_name || '',
    email: guest.email || '',
    phone: guest.phone || '',
    guest_count: guest.guest_count ?? 1,
    dietary_restriction: guest.dietary_restriction || '',
    // ✅ treat as booleans
    rsvp_status: !!guest.rsvp_status,
    checked_in: !!guest.checked_in
  };
  guestSaveError = '';
}

function cancelEditGuest() {
  editingGuestId = null;
  editGuestDraft = null;
  guestSaveError = '';
}

async function saveGuestEdits() {
  if (!editingGuestId || !editGuestDraft?.full_name?.trim()) {
    guestSaveError = 'Name is required.';
    return;
  }

  try {
    isSavingGuest = true;
    const payload = {
      full_name: editGuestDraft.full_name.trim(),
      email: editGuestDraft.email?.trim() || null,
      phone: editGuestDraft.phone?.trim() || null,
      guest_count: Number(editGuestDraft.guest_count) || 1,
      dietary_restriction: editGuestDraft.dietary_restriction?.trim() || null,
      // ✅ include booleans in update
      rsvp_status: Boolean(editGuestDraft.rsvp_status),
      checked_in: Boolean(editGuestDraft.checked_in)
    };

    const { error } = await supabase
      .from('guests')
      .update(payload)
      .eq('guest_id', editingGuestId);

    if (error) throw error;

    await loadDashboardData();
    cancelEditGuest();
  } catch (e) {
    console.error('Failed to save guest edits:', e);
    guestSaveError ='Failed to save changes.';
  } finally {
    isSavingGuest = false;
  }
}



// ============================================================================
// GIFT MANAGEMENT
// ============================================================================

/**
 * Add a new gift
 */
async function addGift() {
    if (giftViewMode === 'received' && !newGift.gift_type) {
        alert('Gift type is required for received gifts');
        return;
    }

    try {
        const giftData = {
            invite_id: clientData.id,
            guest_id: newGift.guest_id || null,
            type: giftViewMode,
            quantity: newGift.quantity || 1
        };

        if (giftViewMode === 'received') {
            giftData.gift_type = newGift.gift_type;
            giftData.name = newGift.gift_type;
            giftData.description = newGift.description || null;
            giftData.value = newGift.value || null;
        } else {
            giftData.name = newGift.name || 'Souvenir';
            giftData.description = null;
            giftData.value = null;
            giftData.gift_type = null;
        }

        const { error } = await supabase
            .from('gifts')
            .insert([giftData]);

        if (error) throw error;

        await loadDashboardData();
        closeAddGiftModal();
        
    } catch (err) {
        console.error('Error adding gift:', err);
        alert('Failed to add gift');
    }
}

/**
 * Update an existing gift
 */
async function updateGift() {
    if (!editingGift) return;
    
    try {
        const { error } = await supabase
            .from('gifts')
            .update({
                guest_id: editingGift.guest_id || null,
                gift_type: editingGift.gift_type || null,
                name: editingGift.name || editingGift.gift_type,
                description: editingGift.description || null,
                quantity: editingGift.quantity || 1,
                value: editingGift.value || null
            })
            .eq('id', editingGift.id);

        if (error) throw error;

        await loadDashboardData();
        showEditGiftModal = false;
        editingGift = null;
        
    } catch (err) {
        console.error('Error updating gift:', err);
        alert('Failed to update gift');
    }
}

/**
 * Delete gifts from a guest group
 */
async function deleteGuestGifts(guestGiftGroup) {
    const giftIds = guestGiftGroup.gifts.map(gift => gift.id);
    const guestName = guestGiftGroup.guest?.full_name || 'this guest';
    
    if (!confirm(`Are you sure you want to delete all ${giftIds.length} gift(s) from ${guestName}?`)) return;
    
    try {
        const { error } = await supabase
            .from('gifts')
            .delete()
            .in('id', giftIds);

        if (error) throw error;

        await loadDashboardData();
    } catch (err) {
        console.error('Error deleting gifts:', err);
        alert('Failed to delete gifts');
    }
}

/**
 * Delete selected gift groups
 */
async function deleteSelectedGiftGroups() {
    if (selectedGiftGroups.size === 0) return;

    try {
        isDeletingGifts = true;
        
        const giftIdsToDelete = [];
        filteredGifts.forEach(guestGiftGroup => {
            const guestId = guestGiftGroup.guest?.guest_id || 'anonymous';
            if (selectedGiftGroups.has(guestId)) {
                guestGiftGroup.gifts.forEach(gift => {
                    giftIdsToDelete.push(gift.id);
                });
            }
        });
        
        if (giftIdsToDelete.length === 0) {
            alert('No gifts found to delete');
            return;
        }
        
        const { error } = await supabase
            .from('gifts')
            .delete()
            .in('id', giftIdsToDelete);

        if (error) throw error;

        await loadDashboardData();
        selectedGiftGroups.clear();
        selectedGiftGroups = selectedGiftGroups;
        showDeleteGiftsConfirmation = false;
        
    } catch (err) {
        console.error('Error deleting gifts:', err);
        alert('Failed to delete gifts');
    } finally {
        isDeletingGifts = false;
    }
}

/**
 * Toggle gift group selection
 */
function toggleGiftGroupSelection(guestId) {
    if (selectedGiftGroups.has(guestId)) {
        selectedGiftGroups.delete(guestId);
    } else {
        selectedGiftGroups.add(guestId);
    }
    selectedGiftGroups = selectedGiftGroups;
}

/**
 * Select/deselect all gift groups
 */
function selectAllGiftGroups() {
    if (selectedGiftGroups.size === filteredGifts.length) {
        selectedGiftGroups.clear();
    } else {
        selectedGiftGroups = new Set(filteredGifts.map(g => g.guest?.guest_id || 'anonymous'));
    }
    selectedGiftGroups = selectedGiftGroups;
}

/**
 * Edit a single gift
 */
function editGift(gift) {
    editingGift = { ...gift };
    showEditGiftModal = true;
}

/**
 * Edit gift from a group (handles single or multiple)
 */
function editGiftFromGroup(guestGiftGroup) {
    if (guestGiftGroup.gifts.length === 1) {
        editGift(guestGiftGroup.gifts[0]);
    } else {
        // For multiple gifts, edit the first one
        // You could extend this to show a selection modal
        editGift(guestGiftGroup.gifts[0]);
    }
}

// ============================================================================
// GIFT MODAL MANAGEMENT
// ============================================================================

/**
 * Open add gift modal
 */
// function openAddGiftModal() {
//     showAddGiftModal = true;
//     selectedGuestForGift = null;
//     guestSearchTerm = '';
//     showGuestSearchResults = false;
//     filteredGuestsForSearch = [];
// }

// /**
//  * Close add gift modal
//  */
// function closeAddGiftModal() {
//     showAddGiftModal = false;
//     newGift = { 
//         guest_id: '', 
//         gift_type: '', 
//         name: '', 
//         description: '', 
//         quantity: 1, 
//         value: null 
//     };
//     selectedGuestForGift = null;
//     guestSearchTerm = '';
//     showGuestSearchResults = false;
//     filteredGuestsForSearch = [];
// }

// // ============================================================================
// // GUEST SEARCH (FOR GIFTS)
// // ============================================================================

// /**
//  * Handle guest search for gift assignment
//  */
// function handleGuestSearch() {
//     if (guestSearchTerm.length === 0) {
//         filteredGuestsForSearch = [];
//         showGuestSearchResults = false;
//         return;
//     }
    
//     const searchLower = guestSearchTerm.toLowerCase();
//     filteredGuestsForSearch = guests.filter(guest => {
//         const name = (guest.full_name || '').toLowerCase();
//         const phone = (guest.phone || '').toLowerCase();
//         const email = (guest.email || '').toLowerCase();
        
//         return name.includes(searchLower) || 
//                phone.includes(searchLower) || 
//                email.includes(searchLower);
//     }).slice(0, 10);
    
//     showGuestSearchResults = true;
// }

// /**
//  * Select a guest for gift assignment
//  */
// function selectGuestForGift(guest) {
//     selectedGuestForGift = guest;
//     newGift.guest_id = guest.guest_id;
//     guestSearchTerm = '';
//     showGuestSearchResults = false;
//     filteredGuestsForSearch = [];
// }

// /**
//  * Clear guest selection
//  */
// function clearGuestSelection() {
//     selectedGuestForGift = null;
//     newGift.guest_id = '';
//     guestSearchTerm = '';
//     showGuestSearchResults = false;
//     filteredGuestsForSearch = [];
// }

function normalize(text = "") {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")               // split accents
    .replace(/\p{Diacritic}+/gu, "") // drop accents
    .replace(/[^\p{L}\p{N}@.+\s]/gu, " ") // keep letters/numbers/@/dot/plus; replace others with space
    .replace(/\s+/g, " ")
    .trim();
}

// True if every token exists as a substring of the haystack (AND match)
function tokensMatch(haystack, tokens) {
  const base = normalize(haystack);
  return tokens.every((t) => base.includes(t));
}

// Build tokens from user query
function queryTokens(q) {
  return normalize(q)
    .split(" ")
    .filter(Boolean);
}

// ============================================================================
// MESSAGE SENDING
// ============================================================================

/**
 * Fill message template with actual values
 */
function fillTemplate(template, guest, giftGroup = null) {
    // Access event data from events_data nested object
    const eventDate = clientData?.events?.event_date ? 
        new Date(clientData.events.event_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric', 
            month: 'long',
            day: 'numeric'
        }) : 'TBD';

    // Location is in events_data
    const location = clientData?.events?.location || 'TBD';

    // RSVP deadline from invites table
    const rsvpDeadline = clientData?.rsvp_deadline ? 
        new Date(clientData.rsvp_deadline).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        }) : 'TBD';

    const inviteUrl = `http://startswithlove.com/${clientSlug}/${guest.slug}`;
    
    let giftDescription = '';
    if (giftGroup) {
        giftDescription = giftGroup.gifts.map(gift => 
            gift.description || gift.gift_type || gift.name
        ).join(', ');
    }

    // Debug log to verify the values
    // console.log('Template replacement values:', {
    //     guest_name: guest.full_name,
    //     client_name: clientData?.client_name,
    //     event_date: eventDate,
    //     location: location,
    //     rsvp_deadline: rsvpDeadline,
    //     raw_event_date: clientData?.event_date,
    //     raw_location: clientData?.location,
    //     raw_rsvp_deadline: clientData?.rsvp_deadline
    // });

    return template
        .replace(/{guest_name}/g, guest.full_name)
        .replace(/{client_name}/g, clientData?.client_name || 'Our')
        .replace(/{event_date}/g, eventDate)
        .replace(/{location}/g, location)
        .replace(/{rsvp_deadline}/g, rsvpDeadline)
        .replace(/{invite_url}/g, inviteUrl)
        .replace(/{gift_description}/g, giftDescription);
}
/**
 * Send WhatsApp invite
 */
async function sendWhatsAppInvite(guest) {
    openInvitePreview(guest);
}

/**
 * Send thank you message
 */
async function sendThankYouMessage(guestGiftGroup) {
    openThankYouPreview(guestGiftGroup);
}

/**
 * Open invite preview modal
 */
function openInvitePreview(guest) {
    if (!guest.phone) {
        alert('Guest phone number is required to send WhatsApp invite');
        return;
    }

    selectedGuestForPreview = guest;
    messageType = 'invite';
    selectedGiftGroupForPreview = null;
    previewMessage = fillTemplate(messageTemplates.invite, guest);
    showMessagePreviewModal = true;
}

/**
 * Open thank you preview modal
 */
function openThankYouPreview(guestGiftGroup) {
    if (!guestGiftGroup.guest?.phone) {
        alert('Guest phone number is required to send thank you message');
        return;
    }

    selectedGuestForPreview = guestGiftGroup.guest;
    selectedGiftGroupForPreview = guestGiftGroup;
    messageType = 'thankYou';
    previewMessage = fillTemplate(messageTemplates.thankYou, guestGiftGroup.guest, guestGiftGroup);
    showMessagePreviewModal = true;
}

/**
 * Send the previewed message via WhatsApp
 */
async function sendPreviewedMessage() {
    if (!previewMessage.trim()) {
        alert('Please enter a message');
        return;
    }

    if (!selectedGuestForPreview?.phone) {
        alert('Guest phone number is required');
        return;
    }

    // Format phone number for WhatsApp
    let phoneNumber = selectedGuestForPreview.phone.replace(/\D/g, '');
    // if (!phoneNumber.startsWith('62') && phoneNumber.startsWith('0')) {
    //     phoneNumber = '62' + phoneNumber.substring(1);
    // } else if (!phoneNumber.startsWith('62')) {
    //     phoneNumber = '62' + phoneNumber;
    // }

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(previewMessage)}`;
    window.open(whatsappUrl, '_blank');

    if (messageType === 'invite') {
        await markInviteAsSent(selectedGuestForPreview.guest_id);
    }

    closeMessagePreviewModal();
}

/**
 * Close message preview modal
 */
function closeMessagePreviewModal() {
    showMessagePreviewModal = false;
    previewMessage = '';
    selectedGuestForPreview = null;
    selectedGiftGroupForPreview = null;
    messageType = '';
}


/**
 * Mark invite as sent
 */
async function markInviteAsSent(guestId) {
    try {
        const { error } = await supabase
            .from('guests')
            .update({ 
                invite_sent: true,
                invite_sent_at: new Date().toISOString()
            })
            .eq('guest_id', guestId);

        if (error) throw error;

        await loadDashboardData();
    } catch (err) {
        console.error('Error updating invite status:', err);
        alert('Failed to update invite status');
    }
}

// ============================================================================
// SETTINGS & PREFERENCES
// ============================================================================

/**
 * Toggle metric visibility
 */
function toggleMetric(metricKey) {
    if (metricKey in selectedMetrics) {
        const { [metricKey]: _, ...rest } = selectedMetrics;
        selectedMetrics = rest;
    } else {
        selectedMetrics = {
            ...selectedMetrics,
            [metricKey]: { mode: 'count' }
        };
    }
}

/**
 * Save metrics preferences
 */
async function saveMetricsPreferences() {
    try {
        isSavingMetrics = true;
        const { error } = await supabase
            .from('invites')
            .update({ dashboard_metrics: selectedMetrics })
            .eq('id', clientData.id);

        if (error) throw error;

        showMetricsSettings = false;
    } catch (err) {
        console.error('Error saving metrics preferences:', err);
        alert('Failed to save preferences');
    } finally {
        isSavingMetrics = false;
    }
}

/**
 * Save message templates
 */
async function saveMessageTemplates() {
    try {
        isSavingTemplates = true;
        
        messageTemplates = { ...tempMessageTemplates };
        
        const { error } = await supabase
            .from('invites')
            .update({ message_templates: messageTemplates })
            .eq('id', clientData.id);

        if (error) throw error;

        showSettingsModal = false;
        
    } catch (err) {
        console.error('Error saving message templates:', err);
        alert('Failed to save message templates');
    } finally {
        isSavingTemplates = false;
    }
}

/**
 * Open settings modal
 */
function openSettingsModal() {
    tempMessageTemplates = { ...messageTemplates };
    showSettingsModal = true;
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
    showSettingsModal = false;
    settingsActiveTab = 'invite';
    tempMessageTemplates = { ...messageTemplates };
}

/**
 * Reset template to default
 */
function resetToDefault() {
    if (confirm('Are you sure you want to reset this template to default? This will overwrite your current changes.')) {
        if (settingsActiveTab === 'invite') {
            tempMessageTemplates.invite = `Hi {guest_name},

You are invited to {client_name} Wedding on *{event_date} at {location}*.

Please open your invite and confirm your RSVP before *{rsvp_deadline}*:
{invite_url}

We appreciate your attendance and look forward to celebrating our special moment with you!`;
        } else {
            tempMessageTemplates.thankYou = `Hi {guest_name},

Thank you so much for the wonderful {gift_description}! Your thoughtful gift means a lot to us and will always remind us of our special day.

We're so grateful to have friends/family like you who made our wedding celebration even more meaningful.

With love and appreciation,
{client_name} ❤️`;
        }
        tempMessageTemplates = { ...tempMessageTemplates };
    }
}

/**
 * Insert variable into template at cursor position
 */
function insertVariable(variable) {
    const currentTemplate = settingsActiveTab === 'invite' ? 'invite' : 'thankYou';
    const textarea = document.querySelector(`#template-${currentTemplate}`);
    
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = tempMessageTemplates[currentTemplate];
        
        const newValue = currentValue.slice(0, start) + variable + currentValue.slice(end);
        tempMessageTemplates[currentTemplate] = newValue;
        tempMessageTemplates = { ...tempMessageTemplates };
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
    }
}

// ============================================================================
// UI INTERACTIONS
// ============================================================================

/**
 * Handle guest row click for navigation
 */
// function handleGuestRowClick(guest, event) {
//     if (event.target.type === 'checkbox' || 
//         event.target.closest('button') || 
//         event.target.closest('input[type="checkbox"]')) {
//         return;
//     }
    
//     goto(`/${clientSlug}/dashboard/details/${guest.guest_id}`);
// }

/**
 * Handle gift row click
 */
function handleGiftRowClick(guestGiftGroup, event) {
    if (event.target.closest('button')) {
        return;
    }
    
    console.log('Guest gift group clicked:', guestGiftGroup);
}

/**
 * Set sort field and direction
 */
function setSortField(field) {
    if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortDirection = 'asc';
    }
    showSortMenu = false;
    expandedAction = null;
}

/**
 * Reset filters (only affects sent table now)
 */
function resetFilters() {
    filterRsvp = 'all';
    filterCheckIn = 'all';
    showFilterMenu = false;
    expandedAction = null;
}

/**
 * Toggle sort menu
 */
function toggleSortMenu() {
    showSortMenu = !showSortMenu;
    if (showSortMenu) {
        expandedAction = 'sort';
        showFilterMenu = false;
    } else {
        expandedAction = null;
    }
}

/**
 * Toggle filter menu
 */
function toggleFilterMenu() {
    showFilterMenu = !showFilterMenu;
    if (showFilterMenu) {
        expandedAction = 'filter';
        showSortMenu = false;
    } else {
        expandedAction = null;
    }
}

/**
 * Handle click outside dropdowns
 */
function handleClickOutside(event) {
    const sortContainer = event.target.closest('.sort-dropdown');
    const filterContainer = event.target.closest('.filter-dropdown');

    if (!sortContainer && !filterContainer) {
        showSortMenu = false;
        showFilterMenu = false;
        expandedAction = null;
    }
}

/**
 * Handle click outside guest search
 */
function handleClickOutsideGuestSearch(event) {
    if (!event.target.closest('.guest-search-container')) {
        showGuestSearchResults = false;
    }
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Navigate to guest page for Not Sent table
 */
function goToNotSentGuestPage(page) {
    if (page >= 1 && page <= totalNotSentPages) guestPage = page;
}

/**
 * Navigate to guest page for Sent table
 */
function goToSentGuestPage(page) {
    if (page >= 1 && page <= totalSentPages) guestPageSent = page;
}

/**
 * Navigate to gift page
 */
function goToGiftPage(page) {
    if (page >= 1 && page <= totalGiftPages) giftPage = page;
}

// ============================================================================
// BADGE HELPERS
// ============================================================================

/**
 * Get RSVP status badge configuration
 */
function getRsvpStatusBadge(status) {
    if (status === true) return { text: 'Confirmed', class: 'badge-success' };
    if (status === false) return { text: 'Declined', class: 'badge-danger' };
    return { text: 'Pending', class: 'badge-warning' };
}

/**
 * Get check-in status badge configuration
 */
function getCheckInStatusBadge(status) {
    return status === true 
        ? { text: 'Checked In', class: 'badge-info' }
        : { text: 'Not Checked In', class: 'badge-secondary' };
}

/**
 * Get invite status badge configuration
 */
function getInviteStatusBadge(inviteSent) {
    return inviteSent === true 
        ? { text: 'Sent', class: 'badge-success' }
        : { text: 'Not Sent', class: 'badge-secondary' };
}


//Meal Counter

// Normalize meal options (invites.meal_options may be jsonb[] or a stringified array)
$: mealOptions = Array.isArray(clientData?.meal_options)
  ? clientData.meal_options
  : (() => { try { return JSON.parse(clientData?.meal_options || "[]"); } catch { return []; } })();

// Count meals across all guest rows using your helper
// function countMeals(guestsArr, options = []) {
//   const counts = Object.fromEntries((options || []).map(o => [o, 0]));
//   for (const g of guestsArr) {
//     const meals = extractMeals(g.meal_preference); // <- you already have this
//     for (const m of meals) {
//       if (m in counts) counts[m] += 1;           // only count configured options
//     }
//   }
//   return counts;
// }

function countMeals(guestsArr, options = []) {
  const counts = Object.fromEntries((options || []).map(o => [o, 0]));
  if (!counts['Unspecified']) counts['Unspecified'] = 0;

  for (const g of guestsArr) {
    if (g.rsvp_status !== true) continue; // align to totalGuests
    const perPersonMeals = extractMeals(g.meal_preference, Number(g.guest_count || 1));

    for (const m of perPersonMeals) {
      if (m in counts) counts[m] += 1;
      else counts['Unspecified'] += 1;
    }
  }
  return counts;
}

function parseMealPref(mealPrefText) {
  try {
    const data = JSON.parse(mealPrefText);
    return data.guests || [];
  } catch {
    return [];
  }
}   

$: mealCounts = countMeals(guests, mealOptions);
// Sent table: reset to page 1 when query/sort/filter changes
$: {
  searchTermSent; sortField; sortDirection; filterRsvp; filterCheckIn;
  guestPageSent = 1;
}

// Not Sent table: reset page on its search
$: {
  searchTermNotSent;
  guestPage = 1;
}


// ============================================================================
// LIFECYCLE
// ============================================================================

onMount(() => {
  clientSlug = $page.params.clientSlug;

  (async () => {
    await loadDashboardData();
  })();

  document.addEventListener('click', handleClickOutside);
  document.addEventListener('click', handleClickOutsideGuestSearch);

  // return sync cleanup
return () => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('click', handleClickOutsideGuestSearch);

  // Only reset if this component actually locked it
  if (browser && document.body.style.overflow === 'hidden') {
    document.body.style.overflow = '';
  }
}
}); 


</script>

<svelte:head>
     <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"rel="stylesheet">
</svelte:head>

<style lang="postcss"> 
@reference "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Inter:wght@100..900&display=swap');


/* ============================================================================
   FONTS & ANIMATIONS
   ============================================================================ */


@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ============================================================================
   GLOBAL STYLES
   ============================================================================ */


:global(body) {
    margin: 0;
    padding: 0;
}

/* ============================================================================
   LAYOUT
   ============================================================================ */
.dashboard-container {@apply min-h-screen;
    display: flex;
 
   
}

.main-content {
   
    flex: 1;
    display: flex;
    flex-direction: column;
    
}

.dashboard-content {@apply min-h-screen px-8 py-6;

   
}


/*Empty Dashboard State*/

.empty-dashboard {@apply my-28 lg:my-32;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-content {
  max-width: 25vw;
}

.empty-title {
    font-family: 'Inter', sans-serif;
    font-size: 2.75em; 
    line-height: 1.25em;
    font-weight: 400;
    letter-spacing:0.025em;
    color: #111;
    margin: 2rem 0 0 0;
}

.empty-actions {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}


/* ============================================================================
   SIDEBAR
   ============================================================================ */
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;        /* use dynamic vh to avoid iOS/Chrome UI jumps */
  overflow-y:auto;        /* sidebar owns its scroll */
  width: 15vw;
  display: flex;
  flex-direction: column;
  border-right: 0.75px solid #ABABAB;
}

.sidebar-header {@apply p-4 lg:p-6;
    
    display: flex;
    align-items: left;
    
}



.client-info {
    overflow: hidden;
    transition: opacity 300ms ease-in;
}


.client-name {
    font-size: 18px;
    font-weight: 800;
    color: #000;
}


/* Navigation */
.nav-menu {@apply mt-6;
    flex: 1;

}

.nav-item {@apply px-6 py-3;
    display: flex;
    align-items: center;
    color: #000000;
    cursor: pointer;
    position: relative;
    font-family:'Inter',sans-serif;
    opacity:0.6
}

.nav-item:hover {
    text-decoration:underline;
    color: #000;
    opacity:0.8
}

.nav-item.active {@apply text-base font-bold;
    font-family:'Inter',sans-serif;
    color: #000;
    text-decoration:underline;
    opacity:1;
}


.nav-icon {
    width: 30px;
    height: 30px;
    margin-right: 12px;
    flex-shrink: 0;
}


.nav-label {@apply text-xs;
    font-family:'Inter',sans-serif;
    font-weight:400;
    white-space: nowrap;
    overflow: hidden;
    transition: opacity 300ms ease-in;
}


.nav-footer {
    padding-top: 10px;
    margin-top: 52vh;
}

/* Client Profile */
.client-profile {
    display: flex;
    align-items: center;
    transition: all 300ms ease-in 100ms;
}


.client-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #8b6b5e;
    color: white;
    font-size: 16px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    flex-shrink: 0;
    transition: all 300ms ease-in 100ms;
}

.client-details {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    transition: all 300ms ease-in 100ms;
    overflow: hidden;
}

.client-sub {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
    transition: all 300ms ease-in 100ms;
    overflow: hidden;
}


/* ============================================================================
   SECTIONS & HEADERS
   ============================================================================ */
.metrics-section {@apply mb-8 lg:mb-8;

    
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

}

.section-title { @apply text-xs lg:text-sm font-medium; 
    font-family: 'Inter', sans-serif;
    color: black;
}

.section-description { @apply text-xs lg:text-xs text-zinc-500;
    font-family: 'Inter', sans-serif;
    opacity: 0.8;
}


/* .uploadguests-btn{
       padding:24px 48px;
    border-radius: 999px;
   border:1px solid #ababab;
   font-family:'Inter', sans-serif;
   font-size:1.5em;

    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 300ms ease-in 100ms;
} */

.uploadguests-icon{
    margin-right:1rem;
}

.section-text-block {
    display: flex;
    flex-direction: column;
}

/* ============================================================================
   METRICS
   ============================================================================ */

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.metric-card {@apply max-w-sm pt-3 px-4 pb-4 bg-white border border-gray-300 ;
    /* background: linear-gradient(2200deg, #ABB1EF 0%, #E9EBFF 100%);*/
    text-align:left;
}



.metric-label { @apply text-sm mb-2 lg:text-base; 
    font-family:'Inter',sans-serif;
    color: #000;
    opacity:80%;
    display:flex;
    align-items:flex-start;
}

.metric-value {@apply text-2xl lg:text-4xl font-bold;
    color: #000;
}

.metric-subtitle {
    font-size: 12px;
    color: #a3a3a3;
    margin-top: 8px;
}

.metrics-toggle-btn {
    width: auto;
    height: 40px;
    padding: 0 14px;
    border-radius: 12px;
    border: 0.5px solid #d4d4d4;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 300ms ease-in 100ms;
}

.metrics-toggle-btn:hover {
    background: #f5f5f5;
    transform: scale(1.03);
}


.metric-setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
}

.metric-setting-row label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #525252;
}

.metric-setting-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
}

.metric-setting-row select {
    padding: 4px 8px;
    border: 1px solid #d4d4d4;
    border-radius: 4px;
    font-size: 12px;
}

/* ============================================================================
   TABLES
   ============================================================================ */

.section-header.table {
    display: flex;
    justify-content: space-between;
    align-items: center;
 
}



.table-container {@apply mb-8 relative overflow-x-auto sm:rounded-lg;
    border-radius: 6px;
    padding: 2rem;
  
    border: 1px solid #d6d6d6;
}

.table-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.data-table {@apply w-full ;
    border-collapse: collapse;
}

.data-table th {@apply uppercase font-medium text-left text-gray-900 bg-white;
    border-bottom: 0.5px solid #d4d4d4;
    font-family:'Inter',sans-serif;
    font-size:0.65em;
}

.data-table td {
    /* padding: 16px 12px; */
    border-bottom: 0.25px solid #e5e5e5;
    color: #262626;
     font-size:0.65em;
}

.data-table th,
.data-table td {
  vertical-align: middle; /* or top, but be consistent */
  line-height: 1.2;
}

.data-table tr:hover td {
    background: #fafafa;
}

.name-cell {@apply text-xs;
    font-family:'Inter',sans-serif;
    font-weight:300;
    
    cursor: pointer;
    transition: color 200ms ease-in-out;
}

.name-cell-notsent {@apply text-xs py-4;
    font-family:'Inter',sans-serif;
    font-weight:300;
    
    cursor: pointer;
    transition: color 200ms ease-in-out;
}


/* ============================================================================
   ACTION BUTTONS
   ============================================================================ */




.action-btn-db {@apply text-xs font-semibold py-4 px-2;
    font-family: 'Inter', sans-serif;
    display: flex;
    align-items: center;
    cursor: pointer;
    color:#3b82f6;
}

.action-btn-db:hover {@apply underline;
}



.action-btn {@apply pr-4;
    height: 36px;
    border-radius: 6px;
    background: white;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: background-color 300ms ease-in, transform 300ms ease-in;
    position: relative;
    overflow: hidden;
 
}



.action-btn.primary {
    background: #000;
    color: white;
    border-color: #000;
}

.action-btn.primary:hover {
    background: #262626;
    transform: scale(1.03);
}

.action-btn-delete {
    height: 36px;
    padding: 0 12px;
    border-radius: 12px;
    background: red;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: max-width 300ms ease-in 100ms, margin-left 300ms ease-in 100ms;
    position: relative;
    overflow: hidden;
}

.action-label-delete {
    font-size: 14px;
    white-space: nowrap;
    max-width: 0;
    overflow: hidden;
    transition: max-width 300ms ease-in 100ms, margin-left 300ms ease-in 100ms;
    color: white;
}

.action-label-delete.visible {
    max-width: 120px;
    margin-left: 8px;
}

.action-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.action-label {@apply text-xs;
    font-weight: 500;
    white-space: nowrap;
    max-width: 0;
    overflow: hidden;
    transition: max-width 300ms ease-in 100ms, margin-left 300ms ease-in 100ms;
}

.action-btn:hover .action-label {
    max-width: 100px;
    margin-left: 6px;
    transition: 200ms ease-in;
}

.whatsapp-btn{
    padding: 0.75rem 1.25rem;
    border-radius:6px;
    background: #00782e; 
    color: white; 
    border: none;
    font-size: 0.75em;
    font-weight: 600;
    letter-spacing: 0.03em;
      display: flex;
    align-items: center;
    cursor: pointer;
    transition: all 300ms ease-in;
    position: relative;
 
}

.whatsapp-btn-label{
   margin-left:10px;
}

.whatsapp-btn:hover{
    transform:scale(1.02);
}

.sent-btn {
    opacity: 0.8;
    cursor: not-allowed;
}

.no-phone-btn {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ============================================================================
   SEARCH
   ============================================================================ */
.search-container {
    position: relative;
    width: 400px;
    flex-shrink:0
}

.search-input {@apply text-xs;
    width: 100%;
    display:flex;
   
    height:36px;
    padding: 0 40px 0 12px;
    border: 0.5px solid #d4d4d4;
    border-radius: 12px;
    font-family: 'Inter', sans-serif;
    transition: all 300ms ease-in 100ms;
}



.search-input:focus {
    outline: none;
    border-color: #888888;

}

.search-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: #a3a3a3;
}

/* Guest Search */
.guest-search-container {
    position: relative;
}

.guest-search-input {@apply max-w-full;
   
    padding: 12px;
    border: 0.5px solid #d4d4d4;
    border-radius: 12px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    transition: all 300ms ease-in 100ms;
}

.guest-search-input:focus {
    outline: none;
    border-color: #000;
}

.guest-search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 0.5px solid #d4d4d4;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
    margin-top: 4px;
}

.guest-search-result {
    width: 100%;
    padding: 12px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 200ms ease-in;
    border-bottom: 0.5px solid #f0f0f0;
}

.guest-search-result:hover {
    background: #f8f9fa;
}

.guest-search-result:last-child {
    border-bottom: none;
}

.guest-result-name {
    font-weight: 500;
    color: #262626;
    margin-bottom: 4px;
}

.guest-result-details {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #737373;
}

.guest-result-phone,
.guest-result-email {
    background: #f0f9ff;
    padding: 2px 6px;
    border-radius: 4px;
    color: #0369a1;
}

.no-results {
    padding: 12px;
    text-align: center;
    color: #737373;
    font-size: 14px;
}

.selected-guest-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: #f8f9fa;
    border: 0.5px solid #d4d4d4;
    border-radius: 8px;
}

.selected-guest-info {
    flex: 1;
}

.selected-guest-name {
    font-weight: 500;
    color: #262626;
    margin-bottom: 4px;
}

.selected-guest-details {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #737373;
}

.clear-selection-btn {
    padding: 4px;
    background: #ef4444;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: background 200ms ease-in;
}

.clear-selection-btn:hover {
    background: #dc2626;
}

/* ============================================================================
   BADGES
   ============================================================================ */
.badge {@apply font-bold px-3 py-2 uppercase;
    display: inline-block;
    border-radius: 4px;
    font-size:0.75em;

}

.badge-success {
    background: #10b98120;
    color: #10b981;
}

.badge-warning {
    background: #f59e0b20;
    color: #f19b07;
}

.badge-danger {
    background: #ef444420;
    color: #ef4444;
}

.badge-info {
    background: #3b82f620;
    color: #3b82f6;
}

.badge-secondary {
    background: #fa916e;
    color: #4E2517;
}

.badge-meal {
  background: #e5e7ff;   /* soft indigo-ish */
  color: #1e1b4b;        /* deep indigo text */
  margin-right: 4px;
  display: inline-block;
}

/* ============================================================================
   TABS
   ============================================================================ */
.tabs-container {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 12px;
    margin-bottom: 20px;
    width: fit-content;
}

.tab-btn {
    padding: 8px 20px;
    border: none;
    background: transparent;
    color: #737373;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    border-bottom: #000 2px;
}

.tab-btn:hover {
    color: #525252;
}

.tab-btn.active {
    background: white;
    color: #000;
    border-bottom: #000 2px solid;
}

/* ============================================================================
   DROPDOWNS
   ============================================================================ */
.dropdown-container {
    position: relative;
    display: inline-block;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 0.5px solid #d4d4d4;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 100;
    min-width: 180px;
    padding: 8px 0;
    margin-top: 4px;
}

.dropdown-item {
    width: 100%;
    padding: 8px 16px;
    background: none;
    border: none;
    text-align: left;
    font-size: 14px;
    color: #525252;
    cursor: pointer;
    transition: background 200ms ease-in;
}

.dropdown-item:hover {
    background: #f5f5f5;
}

.dropdown-item.active {
    background: #f0f9ff;
    color: #0369a1;
    font-weight: 500;
}

.dropdown-arrow {
    transition: transform 200ms ease-in;
}

.filter-menu {
    min-width: 220px;
    padding: 16px;
}

.filter-section {
    margin-bottom: 16px;
}

.filter-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #525252;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.filter-select {
    width: 100%;
    padding: 6px 8px;
    border: 0.5px solid #d4d4d4;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
}

.filter-select:focus {
    outline: none;
    border-color: #000;
}

.filter-actions {
    padding-top: 8px;
    border-top: 0.5px solid #e5e5e5;
}

.filter-reset-btn {
    width: 100%;
    padding: 6px 12px;
    background: #f5f5f5;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #525252;
    cursor: pointer;
    transition: background 200ms ease-in;
}

.filter-reset-btn:hover {
    background: #e5e5e5;
}

/* ============================================================================
   PAGINATION
   ============================================================================ */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
    gap: 8px;
}

.pagination-label{
    font-family: 'Inter', sans-serif;
    font-size:0.75em;
    text-transform:uppercase;
    opacity:0.6;
}





/* ============================================================================
   MODALS
   ============================================================================ */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background:white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    
}

.modal-title {
    font-size: 24px;
    font-weight: 600;
    color: #000;
}

.modal-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 8px;
    transition: background 300ms ease-in;
}

.modal-close:hover {
    background: #f5f5f5;
}

/* Settings Modal */
.settings-modal-content {
    background: white;
    border-radius: 12px;
    padding: 0;
    max-width: 1000px;
    width: 95%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.settings-modal-content .modal-header {
    padding: 24px;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 0;
}

.settings-tabs {
    display: flex;
    border-bottom: 1px solid #e5e5e5;
    background: #fafafa;
}

.settings-tab-btn {
    flex: 1;
    padding: 16px 24px;
    border: none;
    background: transparent;
    color: #737373;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 200ms ease-in;
    border-bottom: 3px solid transparent;
}

.settings-tab-btn:hover {
    color: #525252;
    background: #f0f0f0;
}

.settings-tab-btn.active {
    background: white;
    color: #000;
    border-bottom-color: #000;
}

.settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

.template-editor-container {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 24px;
    height: 500px;
}

.variables-section {
    background: #fafafa;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e5e5e5;
}

.variables-title {
    font-size: 16px;
    font-weight: 600;
    color: #000;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.variables-title::before {
    content: "🔧";
    font-size: 18px;
}

.variables-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.variable-btn {
    background: white;
    border: 1px solid #d4d4d4;
    border-radius: 8px;
    padding: 12px;
    text-align: left;
    cursor: pointer;
    transition: all 200ms ease-in;
    font-family: 'Inter', sans-serif;
}

.variable-btn:hover {
    border-color: #000;
    background: #f8f9fa;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.variable-name {
    display: block;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    color: #0369a1;
    background: #f0f9ff;
    padding: 2px 6px;
    border-radius: 4px;
    margin-bottom: 4px;
    width: fit-content;
}

.variable-desc {
    display: block;
    font-size: 11px;
    color: #737373;
    line-height: 1.3;
}

.template-editor {
    display: flex;
    flex-direction: column;
    background: white;
    border: 1px solid #d4d4d4;
    border-radius: 12px;
    overflow: hidden;
}

.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #fafafa;
    border-bottom: 1px solid #e5e5e5;
}

.editor-title {
    font-size: 14px;
    font-weight: 600;
    color: #000;
    margin: 0;
}

.reset-btn {
    padding: 6px 12px;
    background: transparent;
    border: 1px solid #d4d4d4;
    border-radius: 6px;
    color: #737373;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 200ms ease-in;
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: 'Inter', sans-serif;
}

.reset-btn:hover {
    background: #f5f5f5;
    border-color: #000;
    color: #000;
}

.template-textarea {
    flex: 1;
    padding: 20px;
    border: none;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    resize: none;
    background: white;
    color: #262626;
}

.template-textarea:focus {
    outline: none;
}

.template-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: #fafafa;
    border-top: 1px solid #e5e5e5;
}

.character-count {
    font-size: 1em;
    color: #737373;
    font-weight: 500;
}

.change-globaltemp {
    font-size: 1em;
    color: black;
    font-weight: 500;
    text-decoration:underline;
    text-decoration-color:#ababab;
    text-underline-offset:4px;
    opacity:50%;
}

.template-tip {
    font-size: 11px;
    color: #0369a1;
    background: #f0f9ff;
    padding: 4px 8px;
    border-radius: 4px;
}

/* Message Preview Modal */
.recipient-info {
    border:1px solid #d4d4d4;
    background:white;
    padding:1rem;
    border-radius: 8px;
   
    margin-bottom: 20px;
   
}

.recipient-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    color: #6c757d;
    font-size: 1em;
    font-weight: 500;
}

.recipient-label {
     font-family:'Inter',sans-serif;
   
}

.recipient-details {
    
}

.recipient-name {
    font-size: 1.5em;
    font-weight: 600;
     color: #000000;
    margin-bottom: 4px;
}

.recipient-phone {
    
    font-size: 1.5em;
    color: #000000;
    opacity:80%;
    font-family: monospace;
    background: #C1C7EB;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 4px;
}


.recipient-email {
    font-size: 13px;
    color: #6c757d;
}

.message-textarea {
   width: 100%; 
   min-height: 280px;
    resize: vertical; 
    font-family: 'Inter', sans-serif; 
    font-size: 1em; 
    line-height: 1.5; 
    padding: 16px; 
    border: 1px solid #d4d4d4; 
    border-radius: 8px; 
    background: white;
}

.message-textarea:focus {
    outline: none;
    border-color: #25D366 !important;
    box-shadow: 0 0 0 2px rgba(37, 211, 102, 0.1);
}

.message-editor-footer {
    display:flex;
    justify-content:space-between;
}

/* ============================================================================
   FORMS
   ============================================================================ */
.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    font-size: 1em;
    font-weight: 500;
    color: #525252;
    margin-bottom: 8px;
}

.form-input {
    width: 100%;
    padding: 12px;
    border: 0.5px solid #d4d4d4;
    border-radius: 12px;
    font-size: 1em;
    font-family: 'Inter', sans-serif;
    transition: all 300ms ease-in 100ms;
}

.form-input:focus {
    outline: none;
    border-color: #000;
}

.form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

/* ============================================================================
   BUTTONS CSS
   ============================================================================ */


.uploadguest-btn{@apply lg:px-4 lg:py-3;
  border-radius: 4px;
  border: 1px solid #696969;
  display: inline-flex; 
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 300ms ease-in 100ms;
}

.uploadguest-label{@apply ml-3 text-xs lg:text-xs;
    font-family:'Inter',sans-serif;
    font-weight:500;
    color:black;
    opacity:0.8;
    transition: color 300ms ease-in 100ms;
}

.uploadguest-btn:hover {
  transform:scale(1.01);
  background:#f0f0f0;
}


/* .settings-btn {@apply w-10 h-10 lg:w-12 lg:h-12; 
 
    border-radius: 4px;
   border:1px solid #696969;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 300ms ease-in 100ms;
}

.settings-btn:hover {
  transform:scale(1.01);
  background:#f0f0f0;
} */


.btn {
    flex: 1;
    padding: 12px 24px;
    border-radius: 999px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 300ms ease-in 100ms;
    border: none;
    font-family: 'Inter', sans-serif;
}

.btn-primary {
    background: #000;
    color: white;
}

.btn-primary:hover {
    background: #262626;
    transform: scale(1.03);
}

.btn-secondary {
    background: transparent;
    color: #525252;
    border: 0.5px solid #d4d4d4;
}

.btn-secondary:hover {
    background: #f5f5f5;
}

.btn-label {
    @apply text-xs font-semibold tracking-[0.33px];
    font-family:'Inter',sans-serif;
}

/* Custom utility classes */
.mx-3 { margin-left: 0.75rem; margin-right: 0.75rem; }
.my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; }
.ml-2 { margin-left: 0.5rem; }
.hover\:scale-101:hover { transform: scale(1.01); }
.font-semibold { font-weight: 600; }
.tracking-\[0\.33px\] { letter-spacing: 0.33px; }
.visible { visibility: visible; }
.\!bg-red-600 { background-color: rgb(220 38 38) !important; }
.scale-80 { transform: scale(0.8); }

</style>

{#if loading}
    <div class="dashboard-container">
        <div style="margin: auto; text-align: center;">
            <div style="width: 48px; height: 48px; border: 3px solid #f5f5f5; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <p style="color: #737373;">Loading dashboard...</p>
        </div>
    </div>
{:else if errorMessage}
    <div class="dashboard-container">
        <div style="margin: auto; text-align: center;">
            <p style="color: #ef4444; margin-bottom: 16px;">{errorMessage}</p>
            <button class="btn btn-primary" on:click={refreshData}>Retry</button>
        </div>
    </div>

{:else}
    <div class="dashboard-container">
        <!-- Sidebar -->
        <aside class="sidebar">

            <nav class="nav-menu">
                <a href="/{clientSlug}/dashboard" class="nav-item active" >
                    <span class="nav-label">Dashboard</span>
                </a>
                <a href="/{clientSlug}/dashboard/checkin" class="nav-item">
                    <span class="nav-label">Check-In Scan</span>
                </a>
                <a href="/{clientSlug}/dashboard/upload-guests" class="nav-item" >                  
                    <span class="nav-label">Upload Guest List</span>
                </a>
                  <button class="nav-item" on:click={openSettingsModal}>                     
                        <span class="nav-label">Edit Message Template</span>
                    </button>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
     
            <!-- Dashboard Content -->
            <div class="dashboard-content">
                <!-- Key Metrics -->
                <section class="metrics-section">
                    <div class="section-header mb-4">
                         <div class="section-text-block">
                        <h1 class="section-title">Dashboard</h1>
                        <h3 class="section-description">See your wedding metrics, send and manage your invites here</h3>
            
                     
                    </div>
                    <div class="flex row gap-2 lg:gap-4">
                     <button class="uploadguest-btn" on:click={handleUploadGuests}>
                        <svg fill="currentColor" width="16px" height="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.71,7.71,11,5.41V15a1,1,0,0,0,2,0V5.41l2.29,2.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42l-4-4a1,1,0,0,0-.33-.21,1,1,0,0,0-.76,0,1,1,0,0,0-.33.21l-4,4A1,1,0,1,0,8.71,7.71ZM21,12a1,1,0,0,0-1,1v6a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V13a1,1,0,0,0-2,0v6a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V13A1,1,0,0,0,21,12Z"/></svg>
                        <span class="uploadguest-label">Import Guests</span>
                    </button>
                    <button class="uploadguest-btn" on:click={() => showMetricsSettings = !showMetricsSettings}>
                      <svg 
                            xmlns="http://www.w3.org/2000/svg"
                            width="16px"
                            height="16px"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#000000"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            >
                            <line x1="18" y1="2" x2="22" y2="6" />
                            <path d="M7.5 20.5L19 9l-4-4L3.5 16.5 2 22z" />

                                 <span class="uploadguest-label">Edit Metrics</span>
                            </svg>
                     </button>
                    </div>     
                    </div>
                    <div class="metrics-grid">
                        {#each Object.keys(selectedMetrics) as metricKey}
                            <div class="metric-card">
                                <div class="metric-label">{availableMetrics[metricKey].label}</div>
                                <div class="metric-value">
                                    {#if selectedMetrics[metricKey]?.mode === 'percent'}
                                        {calculatePercent(metricKey)}%
                                    {:else}
                                        {metrics[metricKey]}
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </section>
            {#if clientData?.meal_options_enabled}
                <section class="metrics-section">
                <div class="section-header mb-4">
                    <div class="section-text-block">
                    <h2 class="section-title">Total Dish Count</h2>
                    <p class="section-description">RSVP counts by dish</p>
                    </div>
                </div>

                <div class="metrics-grid">
                    {#each mealOptions as dish}
                    <div class="metric-card">
                        <div class="metric-label">{dish}</div>
                        <div class="metric-value">{mealCounts[dish] ?? 0}</div>
                    </div>
                    {/each}
                </div>
                </section>
{/if}
             
            

<!--Empty dashboard state-->
{#if guestsNotSent.length === 0 && guestsSent.length === 0}
  <section class="empty-dashboard">
  <div class="empty-content">
    <p class="section-title">Your dashboard is currently empty.</p>
    <p class="section-description">Let’s get started by importing your guests.</p>
    <div class="empty-actions">
      <button class="uploadguest-btn" on:click={handleUploadGuests}>
        <svg fill="currentColor" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.71,7.71,11,5.41V15a1,1,0,0,0,2,0V5.41l2.29,2.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42l-4-4a1,1,0,0,0-.33-.21,1,1,0,0,0-.76,0,1,1,0,0,0-.33.21l-4,4A1,1,0,1,0,8.71,7.71ZM21,12a1,1,0,0,0-1,1v6a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V13a1,1,0,0,0-2,0v6a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V13A1,1,0,0,0,21,12Z"/></svg>
        <span class="uploadguest-label">Import Guests</span>
      </button>
    </div>
  </div>
</section>
{/if}

{#if emptySentData === false}
                 <!-- Invites Sent Table -->
                <section class="table-container">
                    
                    <h2 class="section-title">Invites Sent</h2>
                    <h4 class="section-description mb-6">Track RSVP & Check-in status on invites you've sent.</h4>
                    <div class="section-header mb-8">
                        <div class="search-container">
                            <input type="text" class="search-input" placeholder="Search guests..." bind:value={searchTermSent}>
                            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </div>
                        
                        <div class="table-actions" on:click={handleClickOutside}>
                            <!-- Sort Dropdown -->
                            <div class="dropdown-container sort-dropdown">
                                <button 
                                    class="action-btn" 
                                    on:click|stopPropagation={toggleSortMenu}
                                    on:mouseenter={() => hoveredAction = 'sort'} 
                                    on:mouseleave={() => hoveredAction = null}>
                                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
                                    </svg>
                                    <span class="action-label" class:expanded={hoveredAction === 'sort' || expandedAction === 'sort'}>Sort</span>
                                    <svg class="dropdown-arrow" class:rotated={showSortMenu} fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 12px; height: 12px; margin-left: 4px;">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                                
                                {#if showSortMenu}
                                    <div class="dropdown-menu" on:click|stopPropagation>
                                        <button class="dropdown-item" class:active={sortField === 'full_name'} on:click={() => setSortField('full_name')}>
                                            Name {sortField === 'full_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                        </button>
                                        <button class="dropdown-item" class:active={sortField === 'phone'} on:click={() => setSortField('phone')}>
                                            Phone {sortField === 'phone' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                        </button>
                                        <button class="dropdown-item" class:active={sortField === 'rsvp_status'} on:click={() => setSortField('rsvp_status')}>
                                            RSVP{sortField === 'rsvp_status' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                        </button>
                                        <button class="dropdown-item" class:active={sortField === 'checked_in'} on:click={() => setSortField('checked_in')}>
                                            Check-in {sortField === 'checked_in' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                        </button>
                                    </div>
                                {/if}
                            </div>

                            <!-- Filter Dropdown -->
                            <div class="dropdown-container filter-dropdown">
                                <button 
                                    class="action-btn" 
                                    on:click|stopPropagation={toggleFilterMenu}
                                    on:mouseenter={() => hoveredAction = 'filter'} 
                                    on:mouseleave={() => hoveredAction = null}>
                                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                                    </svg>
                                    <span class="action-label" class:expanded={hoveredAction === 'filter' || expandedAction === 'filter'}>Filter</span>
                                    <svg class="dropdown-arrow" class:rotated={showFilterMenu} fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 12px; height: 12px; margin-left: 4px;">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                                
                                {#if showFilterMenu}
                                    <div class="dropdown-menu filter-menu" on:click|stopPropagation>
                                        <div class="filter-section">
                                            <label class="filter-label">RSVP Status:</label>
                                            <select bind:value={filterRsvp} class="filter-select">
                                                <option value="all">All</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="declined">Declined</option>
                                                <option value="pending">Pending</option>
                                            </select>
                                        </div>
                                        
                                        <div class="filter-section">
                                            <label class="filter-label">Check-in Status:</label>
                                            <select bind:value={filterCheckIn} class="filter-select">
                                                <option value="all">All</option>
                                                <option value="checked-in">Checked In</option>
                                                <option value="not-checked-in">Not Checked In</option>
                                            </select>
                                        </div>
                                        
                                        <div class="filter-actions">
                                            <button class="filter-reset-btn" on:click={resetFilters}>Reset</button>
                                        </div>
                                    </div>
                                {/if}
                            </div>

                            <button class="action-btn" on:click={refreshData} on:mouseenter={() => hoveredAction = 'refresh'} on:mouseleave={() => hoveredAction = null}>
                                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                <span class="action-label" class:expanded={hoveredAction === 'refresh'}>Refresh</span>
                            </button>

                            {#if selectedGuestsSent.size > 0}
                                <button class="action-btn-delete" on:click={() => showMarkNotSentConfirmation = true} style="background: #f59e0b; color: white;" on:mouseenter={() => hoveredAction = 'markNotSent'} on:mouseleave={() => hoveredAction = null}>
                                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                                    </svg>
                                     <span class="action-label-delete font-semibold text-xs visible">Mark Not Sent ({selectedGuestsSent.size})</span>
                                </button>

                                <button class="action-btn-delete" on:click={() => showDeleteSentConfirmation = true} on:mouseenter={() => hoveredAction = 'delete'} on:mouseleave={() => hoveredAction = null}>
                                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    <span class="action-label-delete font-semibold text-xs visible">Delete ({selectedGuestsSent.size})</span>
                                </button>
                            {/if}
                        </div>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr class="">
                                <th style="width: 40px;">
                                    <input type="checkbox" 
                                        checked={selectedGuestsSent.size === guestsSent.length && guestsSent.length > 0}
                                        on:change={selectAllSentGuests}
                                        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 ">
                                </th>
                                 <th scope="col" class="py-2">Name</th>
                                  <th scope="col">Phone</th>
                                  <th scope="col">RSVP</th>
                                  <th scope="col">Guests</th>
                                  <th scope="col">Check-in</th>
                                     {#if clientData?.meal_options_enabled}
                                        <th scope="col">Meal Preference</th>
                                        {/if}
                                    <th scope="col"></th>
                               
                            </tr>
                        </thead>
                        <tbody>
                            {#if noMatchesSent}
                            <tr class="clickable-row">
                            <td colspan="8" class="py-10 text-center text-sm text-gray-500">
                            No guests found for "{searchTermSent}".
                            </td>
                            </tr>
                            {:else if emptySentData}
                            <tr>
                             <td colspan="8" class="py-10 text-center text-sm text-gray-500">
                            You have no guests in the <strong>Not Sent</strong> list yet.
                            </td>
                            </tr>
                            {:else}
                           {#each paginatedGuestsSent as guest}
                                {@const rsvpStatus = getRsvpStatusBadge(guest.rsvp_status)}
                                {@const checkInStatus = getCheckInStatusBadge(guest.checked_in)}
                                <tr class="clickable-row"
                                    on:keydown={(e) => {
                                        if (editingGuestId === guest.guest_id) {
                                        if (e.key === 'Enter') saveGuestEdits();
                                        if (e.key === 'Escape') cancelEditGuest();
                                        }
                                    }}>
                                    <!-- Select -->
                                    <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedGuestsSent.has(guest.guest_id)}
                                        on:change={() => toggleSentGuestSelection(guest.guest_id)}
                                        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 "
                                    />
                                    </td>

                                    <!-- Name + Email -->
                                    <td style="min-width:150px;">
                                    {#if editingGuestId === guest.guest_id}
                                        <input
                                        class="guest-search-input"
                                        placeholder="Full name"
                                        bind:value={editGuestDraft.full_name}
                                        />
                                        <div style="margin-top:6px;">
                                        <input
                                            class="guest-search-input"
                                            placeholder="Email"
                                            bind:value={editGuestDraft.email}
                                        />
                                        </div>
                                    {:else}
                                        <div class="name-cell" style="font-weight: 500;">
                                        {guest.full_name || 'N/A'}
                                        </div>
                                        {#if guest.email}
                                        <div style="font-size: 12px; color: #737373;">{guest.email}</div>
                                        {/if}
                                    {/if}
                                    </td>

                                    <!-- Phone -->
                                    <td style="min-width:100px; opacity:0.6;">
                                    {#if editingGuestId === guest.guest_id}
                                        <input
                                        class="guest-search-input"
                                        placeholder="Phone"
                                        bind:value={editGuestDraft.phone}
                                        />
                                    {:else}
                                        {guest.phone || '-'}
                                    {/if}
                                    </td>

                                    <!-- RSVP (now editable as boolean) -->
                                    <td style="min-width:50px;"> 
                                    {#if editingGuestId === guest.guest_id}
                                        <select class="guest-search-input" bind:value={editGuestDraft.rsvp_status}>
                                <option value="">Pending</option>
                                <option value="true">Confirmed</option>
                                <option value="false">Declined</option>
                                </select>
                                    {:else}
                                        <span class="badge {rsvpStatus.class}">{rsvpStatus.text}</span>
                                    {/if}
                                    </td>

                                    <!-- Guest Count -->
                                    <td style="min-width:50px; opacity:0.6;">
                                    {#if editingGuestId === guest.guest_id}
                                        <input
                                        class="guest-search-input"
                                        type="number"
                                        min="1"
                                        bind:value={editGuestDraft.guest_count}
                                        style="max-width:90px;"
                                        />
                                    {:else}
                                        {guest.guest_count || 1}
                                    {/if}
                                    </td>

                                    <!-- Check-In (now editable as boolean) -->
                                    <td>
                                    {#if editingGuestId === guest.guest_id}
                                        <label style="display:flex; align-items:center; gap:8px;">
                                        <input type="checkbox" bind:checked={editGuestDraft.checked_in} />
                                        <span style="font-size: 0.9rem;">
                                            {editGuestDraft.checked_in ? 'Checked In' : 'Not Checked In'}
                                        </span>
                                        </label>
                                    {:else}
                                        <span class="badge {checkInStatus.class}">{checkInStatus.text}</span>
                                    {/if}
                                    </td>

                                    <!-- Meal Preference badges (unchanged) -->
                                  
                               {#if clientData?.meal_options_enabled}
  <td style="min-width:200px;">
    {#each parseMealPref(guest.meal_preference) as pref}
      <div class="relative group inline-block mr-1 mb-1">
        <!-- Badge -->
      <span
  class={`badge badge-meal !inline-flex items-center gap-1 cursor-pointer
          ${pref.dietary ? '!bg-red-100 !text-red-700 ring-1 ring-red-300' : ''}`}
  aria-label={pref.dietary ? `Dietary caution: ${pref.dietary}` : undefined}
>
  {#if pref.dietary}
    <!-- Caution icon -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      class="h-2 w-2 shrink-0 text-red-700"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <circle cx="12" cy="16" r="0.8" />
    </svg>
  {/if}
  {pref.meal}
</span>


        <!-- Tooltip -->
        <div
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                 hidden group-hover:block
                 px-2 py-1 text-xs text-white bg-black rounded shadow-lg whitespace-nowrap z-10"
        >
          {pref.name}{#if pref.dietary}&nbsp;– {pref.dietary}{/if}
        </div>
      </div>
    {/each}

    {#if parseMealPref(guest.meal_preference).length === 0}
      <span class="text-zinc-400 text-sm">—</span>
    {/if}
  </td>
{/if}
                                                                  
                                    <!-- Actions: Save/Cancel always visible in edit mode -->
                                    <td style="white-space:nowrap;">
                                    
                                        <div class="flex items-center gap-2">
                                    {#if editingGuestId === guest.guest_id}
                                        <button
                                        class="action-btn primary"
                                        style="height:28px;"
                                        on:click|stopPropagation={saveGuestEdits}
                                        disabled={isSavingGuest}
                                        title="Save changes"
                                        >
                                        <!-- no collapsing label: keep always visible -->
                                        <span class="btn-label">
                                            {isSavingGuest ? 'Saving…' : 'SAVE'}
                                        </span>
                                        </button>

                                        <button
                                        class="action-btn"
                                        style="height:28px;"
                                        on:click|stopPropagation={cancelEditGuest}
                                        title="Cancel"
                                        >
                                        <span style="btn-label">Cancel</span>
                                        </button>
                                    {:else}
                                    <span
                                        class="action-btn-db"
                                        on:click|stopPropagation={() => goto(`/${clientSlug}/dashboard/details/${guest.guest_id}`)}
                                        title="See Guest Details"
                                        >
                                        VIEW
                                    </span>

                                        <span
                                        class="action-btn-db"
                                        on:click|stopPropagation={() => startEditGuest(guest)}
                                        title="See Guest Details"
                                        >
                                        EDIT
                                </span>
                                {/if}
                                        </div>
                                    </td>
                                </tr>
                                {/each}



                           {#if paginatedGuestsSent.length === 0}
                                <tr>
                                <td colspan="999" class="py-8 text-center text-sm text-gray-500">
                                No rows on this page. Try going back a page.
                                </td>
                                </tr>
                            {/if}
                            {/if}
                        </tbody>
                    </table>
                    
                    <div class="pagination">
                        <button on:click={() => goToSentGuestPage(guestPageSent - 1)} disabled={guestPageSent === 1} class="pagination-label">Prev</button>
                        {#each Array(totalSentPages) as _, index}
                            <button class="pagination-label !opacity-100"
                                class:active={guestPageSent === index + 1}
                                on:click={() => goToSentGuestPage(index + 1)}>
                                {index + 1}
                                
                            </button>
                        {/each}
                        <button on:click={() => goToSentGuestPage(guestPageSent + 1)} disabled={guestPageSent === totalSentPages} class="pagination-label">Next</button>
                    </div>
                </section>
{/if}

{#if guestsNotSent.length > 0}
                <!-- Invites Not Sent Table -->
                <section class="table-container">
                    <h2 class="section-title">Invites Not Sent</h2>
                     <h3 class="section-description mb-6">Find all your newly imported guests here.</h3>

                    <div class="section-header table mb-8">
                        <div class="search-container">
                           <input
                                type="text"
                                class="search-input"
                                placeholder="Search guests..."
                                bind:value={searchTermNotSent}
                            />
                            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </div>
                        
                        <div class="table-actions" on:click={handleClickOutside}>
                            <button class="action-btn" on:click={refreshData} on:mouseenter={() => hoveredAction = 'refresh'} on:mouseleave={() => hoveredAction = null}>
                                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                <span class="action-label" class:expanded={hoveredAction === 'refresh'}>Refresh</span>
                            </button>

                            {#if selectedGuestsNotSent.size > 0}
                                <button class="action-btn-delete" on:click={() => showDeleteConfirmation = true} on:mouseenter={() => hoveredAction = 'delete'} on:mouseleave={() => hoveredAction = null}>
                                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    <span class="action-label-delete font-semibold tracking-[0.33px] visible">Delete ({selectedGuestsNotSent.size})</span>
                                </button>
                            {/if}
                            
                            <button class="px-4 py-2 bg-black text-white text-xs rounded-xl" on:click={() => showAddGuestModal = true} on:mouseenter={() => hoveredAction = 'add'} on:mouseleave={() => hoveredAction = null}>
                                <span class="action-label-db tracking-[0.33px] font-semibold">Add a Guest</span>
                            </button>
                        </div>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" 
                                        checked={selectedGuestsNotSent.size === guestsNotSent.length && guestsNotSent.length > 0}
                                        on:change={selectAllNotSentGuests}
                                        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 ">
                                </th>
                                <th scope="col" class="py-2">Name</th>
                                <th scope="col">Phone</th>
                                 <th scope="col">Invite Sent</th>
                                <th scope="col"></th>
                            </tr>
                        </thead>
                        
                      <tbody>
  {#if noMatchesNotSent}
    <tr class="clickable-row">
      <td colspan="8" class="py-10 text-center text-sm text-gray-500">
        No guests found for "{searchTermNotSent}".
      </td>
    </tr>

  {:else if emptyNotSentData}
    <tr>
      <td colspan="8" class="py-10 text-center text-sm text-gray-500">
        You have no guests in the <strong>Not Sent</strong> list yet.
      </td>
    </tr>

  {:else if paginatedGuestsNotSent.length === 0}
    <!-- Handles out-of-range pages after filtering; shows a friendly hint -->
    <tr>
      <td colspan="8" class="py-10 text-center text-sm text-gray-500">
        No results on this page. Try page 1 or adjust your search.
      </td>
    </tr>

  {:else}
    {#each paginatedGuestsNotSent as guest}
      <tr>
        <td>
          <input
            type="checkbox"
            checked={selectedGuestsNotSent.has(guest.guest_id)}
            on:change={() => toggleNotSentGuestSelection(guest.guest_id)}
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 "
          >
        </td>

        <td style="min-width:150px;">
          <div class="name-cell-notsent" style="font-weight: 500;">
            {guest.full_name || 'N/A'}
          </div>
          {#if guest.email}
            <div style="font-size: 12px; color: #737373;">{guest.email}</div>
          {/if}
        </td>

        <td style="min-width:125px;">{guest.phone || '-'}</td>
        <td style="min-width:50px;"><span class="badge badge-secondary">Not Sent</span></td>

        <td>
          {#if guest.phone}
            <span
              class="action-btn-db"
              on:click|stopPropagation={() => sendWhatsAppInvite(guest)}
              title="Send WhatsApp Invite"
            >
              SEND
            </span>
          {:else}
            <button
              class="badge badge-secondary"
              disabled
              title="No Phone Number"
            >
              <span>No Phone</span>
            </button>
          {/if}
        </td>
      </tr>
    {/each}
  {/if}
</tbody>

                    </table>
                    
                    <div class="pagination">
                        <button on:click={() => goToNotSentGuestPage(guestPage - 1)} disabled={guestPage === 1} class="pagination-label">Prev</button>
                        {#each Array(totalNotSentPages) as _, index}
                            <button 
                           class="pagination-label !opacity-100"
                                class:active={guestPage === index + 1}
                                on:click={() => goToNotSentGuestPage(index + 1)}>
                                {index + 1}
                            </button>
                        {/each}
                        <button on:click={() => goToNotSentGuestPage(guestPage + 1)} disabled={guestPage === totalNotSentPages} class="pagination-label">Next</button>
                    </div>
                </section>
{/if}
               
                <!-- Add Guest Modal -->
                {#if showAddGuestModal}
                    <div class="modal-overlay" on:click={() => showAddGuestModal = false}>
                        <div class="modal-content" on:click|stopPropagation>
                            <div class="modal-header">
                                <h3 class="modal-title">Add New Guest</h3>
                                <button class="modal-close" on:click={() => showAddGuestModal = false}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <form on:submit|preventDefault={addGuest}>
                                <div class="form-group">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" class="form-input" bind:value={newGuest.full_name} required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Phone Number *</label>
                                    <input type="tel" class="form-input" bind:value={newGuest.phone} required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-input" bind:value={newGuest.email}>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Number of Guests</label>
                                    <input type="number" class="form-input" bind:value={newGuest.guest_count} min="1">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Dietary Restrictions</label>
                                    <input type="text" class="form-input" bind:value={newGuest.dietary_restriction}>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="button" class="btn btn-secondary" on:click={() => showAddGuestModal = false}>
                                        Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        Add Guest
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                {/if}

                <!-- Delete Not Sent Guests Confirmation Modal -->
                {#if showDeleteConfirmation}
                    <div class="modal-overlay" on:click={() => showDeleteConfirmation = false}>
                        <div class="modal-content" on:click|stopPropagation>
                            <div class="modal-header">
                                <h3 class="modal-title">Confirm Deletion</h3>
                                <button class="modal-close" on:click={() => showDeleteConfirmation = false}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <p style="margin-bottom: 24px; color: #525252;">
                                Are you sure you want to delete {selectedGuestsNotSent.size} guest{selectedGuestsNotSent.size > 1 ? 's' : ''} from the "Invites Not Sent" list? This action cannot be undone.
                            </p>
                            
                            <div class="form-actions">
                                <button class="btn btn-secondary" on:click={() => showDeleteConfirmation = false} disabled={isDeleting}>
                                    Cancel
                                </button>
                                <button class="btn btn-primary !bg-red-600" on:click={deleteSelectedNotSentGuests} disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Delete Sent Guests Confirmation Modal -->
                {#if showDeleteSentConfirmation}
                    <div class="modal-overlay" on:click={() => showDeleteSentConfirmation = false}>
                        <div class="modal-content" on:click|stopPropagation>
                            <div class="modal-header">
                                <h3 class="modal-title">Confirm Deletion</h3>
                                <button class="modal-close" on:click={() => showDeleteSentConfirmation = false}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <p style="margin-bottom: 24px; color: #525252;">
                                Are you sure you want to delete {selectedGuestsSent.size} guest{selectedGuestsSent.size > 1 ? 's' : ''} from the "Invites Sent" list? This action cannot be undone.
                            </p>
                            
                            <div class="form-actions">
                                <button class="btn btn-secondary" on:click={() => showDeleteSentConfirmation = false} disabled={isDeleting}>
                                    Cancel
                                </button>
                                <button class="btn btn-primary !bg-red-600" on:click={deleteSelectedSentGuests} disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Mark as Not Sent Confirmation Modal -->
                {#if showMarkNotSentConfirmation}
                    <div class="modal-overlay" on:click={() => showMarkNotSentConfirmation = false}>
                        <div class="modal-content" on:click|stopPropagation>
                            <div class="modal-header">
                                <h3 class="modal-title">Mark as Not Sent</h3>
                                <button class="modal-close" on:click={() => showMarkNotSentConfirmation = false}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <p style="margin-bottom: 24px; color: #525252;">
                                Are you sure you want to mark {selectedGuestsSent.size} guest{selectedGuestsSent.size > 1 ? 's' : ''} as not sent? They will be moved back to the "Invites Not Sent" table.
                            </p>
                            
                            <div class="form-actions">
                                <button class="btn btn-secondary" on:click={() => showMarkNotSentConfirmation = false} disabled={isMarkingNotSent}>
                                    Cancel
                                </button>
                                <button class="btn btn-primary" style="background: #f59e0b;" on:click={markSelectedAsNotSent} disabled={isMarkingNotSent}>
                                    {isMarkingNotSent ? 'Updating...' : 'Mark as Not Sent'}
                                </button>
                            </div>
                        </div>
                    </div>
                {/if}

                {#if showSettingsModal}
    <div class="modal-overlay" on:click={closeSettingsModal}>
        <div class="settings-modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <h3 class="modal-title">Message Templates</h3>
                <button class="modal-close" on:click={closeSettingsModal}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <!-- Template Tabs -->
            <div class="settings-tabs">
                <button 
                    class="settings-tab-btn" 
                    class:active={settingsActiveTab === 'invite'}
                    on:click={() => settingsActiveTab = 'invite'}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Invite Message
                </button>
                <button 
                    class="settings-tab-btn" 
                    class:active={settingsActiveTab === 'thankYou'}
                    on:click={() => settingsActiveTab = 'thankYou'}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                    Thank You Message
                </button>
            </div>
            
            <!-- Template Content -->
            <div class="settings-content">
                <div class="template-editor-container">
                    <!-- Variables Sidebar -->
                    <div class="variables-section">
                        <h4 class="variables-title">Available Variables</h4>
                        <p style="font-size: 11px; color: #737373; margin-bottom: 12px;">
                            Click to insert into template
                        </p>
                        <div class="variables-grid">
                            <button class="variable-btn" on:click={() => insertVariable('{guest_name}')}>
                                <span class="variable-name">{'{guest_name}'}</span>
                                <span class="variable-desc">Guest's full name</span>
                            </button>
                            <button class="variable-btn" on:click={() => insertVariable('{client_name}')}>
                                <span class="variable-name">{'{client_name}'}</span>
                                <span class="variable-desc">Your wedding name</span>
                            </button>
                            <button class="variable-btn" on:click={() => insertVariable('{event_date}')}>
                                <span class="variable-name">{'{event_date}'}</span>
                                <span class="variable-desc">Wedding date</span>
                            </button>
                            <button class="variable-btn" on:click={() => insertVariable('{location}')}>
                                <span class="variable-name">{'{location}'}</span>
                                <span class="variable-desc">Wedding venue</span>
                            </button>
                            <button class="variable-btn" on:click={() => insertVariable('{rsvp_deadline}')}>
                                <span class="variable-name">{'{rsvp_deadline}'}</span>
                                <span class="variable-desc">RSVP deadline</span>
                            </button>
                            <button class="variable-btn" on:click={() => insertVariable('{invite_url}')}>
                                <span class="variable-name">{'{invite_url}'}</span>
                                <span class="variable-desc">Personal invite link</span>
                            </button>
                            {#if settingsActiveTab === 'thankYou'}
                                <button class="variable-btn" on:click={() => insertVariable('{gift_description}')}>
                                    <span class="variable-name">{'{gift_description}'}</span>
                                    <span class="variable-desc">Gift details</span>
                                </button>
                            {/if}
                        </div>
                    </div>
                    
                    <!-- Template Editor -->
                    <div class="template-editor">
                        <div class="editor-header">
                            <h4 class="editor-title">
                                {settingsActiveTab === 'invite' ? 'Invite' : 'Thank You'} Template
                            </h4>
                            <button class="reset-btn" on:click={resetToDefault}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                Reset to Default
                            </button>
                        </div>
                        <textarea 
                            id="template-{settingsActiveTab}"
                            class="template-textarea"
                            bind:value={tempMessageTemplates[settingsActiveTab === 'invite' ? 'invite' : 'thankYou']}
                            placeholder="Enter your message template..."
                        />
                        <div class="template-info">
                            <span class="character-count">
                                {tempMessageTemplates[settingsActiveTab === 'invite' ? 'invite' : 'thankYou'].length} characters
                            </span>
                            <span class="template-tip">
                                💡 Variables will be auto-filled when sending
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="form-actions" style="padding: 0 24px 24px;">
                <button class="btn btn-secondary" on:click={closeSettingsModal}>
                    Cancel
                </button>
                <button class="btn btn-primary" on:click={saveMessageTemplates} disabled={isSavingTemplates}>
                    {isSavingTemplates ? 'Saving...' : 'Save Templates'}
                </button>
            </div>
        </div>
    </div>
{/if}



                <!-- Message Preview Modal -->
                {#if showMessagePreviewModal}
                    <div class="modal-overlay" on:click={closeMessagePreviewModal}>
                        <div class="modal-content" on:click|stopPropagation style="max-width: 650px;">
                            <div class="modal-header">
                                <h3 class="modal-title">
                                    Preview & Edit {messageType === 'invite' ? 'Invite' : 'Thank You'} Message
                                </h3>
                                <button class="modal-close" on:click={closeMessagePreviewModal}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- Recipient Info -->
                            <div class="recipient-info">
                                <div class="recipient-header">
                                    <!-- <svg width="28px" height="28px" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M16 4h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2m4-2a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2V4a2 2 0 00-2-2h-4z"/>
                                    </svg> -->
                                    <span class="recipient-label">Sending to:</span>
                                </div>
                                <div class="recipient-details">
                                    <div class="recipient-name">{selectedGuestForPreview?.full_name}</div>
                                    <div class="recipient-phone">{selectedGuestForPreview?.phone}</div>
                                    {#if selectedGuestForPreview?.email}
                                        <div class="recipient-email">{selectedGuestForPreview.email}</div>
                                    {/if}
                                </div>
                            </div>
                            
                            <!-- Message Editor -->
                            <div class="form-group">
                                <label class="form-label">
                                   
                                    Your Message:
                                </label>
                                <div class="message-editor">
                                    <textarea 
                                        class="message-textarea" 
                                        bind:value={previewMessage}
                                        rows="12"
                                        placeholder="Type your message here..."
                                        >
                                    </textarea>
                                </div>
                                <div class="message-editor-footer">
                                <div class="character-count">
                                    {previewMessage.length} characters
                                </div>
                                <!-- <div class="change-globaltemp">
                                    <a href="">Click to change your global template here</a>
                                </div> -->
                            </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="form-actions">
                                <button class="btn btn-secondary" on:click={closeMessagePreviewModal}>
                                    Cancel
                                </button>
                                <button class="btn btn-primary" on:click={sendPreviewedMessage} style="background: #25D366; border-color: #25D366;">
                                    <!-- <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="margin-right: 8px;">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                                    </svg> -->
                                    Send via WhatsApp
                                </button>   
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Metrics Settings Modal -->
                {#if showMetricsSettings}
                    <div class="modal-overlay" on:click={() => showMetricsSettings = false}>
                        <div class="modal-content" on:click|stopPropagation>
                            <div class="modal-header">
                                <h3 class="modal-title">Customize Metrics</h3>
                                <button class="modal-close" on:click={() => showMetricsSettings = false}>
                                    <svg width="24px" height="24px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <p style="margin-bottom: 20px; color: #525252; font-size: 14px;">
                                Select which metrics to display on your dashboard
                            </p>
                            
                            <div style="display: grid; gap: 12px;">
                                {#each Object.keys(availableMetrics) as metricKey}
                                    <div class="metric-setting-row">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={metricKey in selectedMetrics}
                                                on:change={() => toggleMetric(metricKey)}
                                            />
                                            {availableMetrics[metricKey].label}
                                        </label>

                                        {#if metricKey in selectedMetrics}
                                            <select
                                                bind:value={selectedMetrics[metricKey].mode}
                                            >
                                                <option value="count">Count</option>
                                                <option value="percent">Percent</option>
                                            </select>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                            
                            <div class="form-actions" style="margin-top: 24px;">
                                <button class="btn btn-secondary" on:click={() => showMetricsSettings = false}>
                                    Cancel
                                </button>
                                <button class="btn btn-primary" on:click={saveMetricsPreferences} disabled={isSavingMetrics}>
                                    {isSavingMetrics ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </main>
    </div>
{/if}