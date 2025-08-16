<script>
// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';

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

// UI State
let sidebarCollapsed = false;

// ============================================================================
// SEARCH & FILTER STATE
// ============================================================================

// Guest Search & Filters
let searchTerm = '';
let sortField = 'full_name';
let sortDirection = 'asc';
let filterRsvp = 'all';
let filterCheckIn = 'all';
let filterInviteSent = 'all';

// Gift Search & Filters
let giftSearchTerm = '';
let giftViewMode = 'received'; // 'received' or 'given'

// Dropdown Menus
let showSortMenu = false;
let showFilterMenu = false;
let hoveredAction = null;
let expandedAction = null;

// ============================================================================
// SELECTION STATE
// ============================================================================
let selectedGuests = new Set();
let selectedGifts = new Set();
let selectedGiftGroups = new Set();

// ============================================================================
// MODAL STATE
// ============================================================================


// Gift Modals
let showAddGiftModal = false;
let showEditGiftModal = false;
let showDeleteGiftsConfirmation = false;
let isDeletingGifts = false;
let editingGift = null;

// Message Modals
let showMessagePreviewModal = false;

let showSettingsModal = false;

// Settings Modal
let showMetricsSettings = false;
let isSavingMetrics = false;
let isSavingTemplates = false;
let settingsActiveTab = 'invite';

// ============================================================================
// PAGINATION STATE
// ============================================================================
let guestPage = 1;
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

// Process and filter data
$: filteredGuests = processGuests(guests, searchTerm, sortField, sortDirection, filterRsvp, filterCheckIn, filterInviteSent);
$: filteredGifts = processGiftsGroupedByGuest(gifts, giftSearchTerm, giftViewMode);

// Pagination calculations
$: totalGuestPages = Math.ceil(filteredGuests.length / guestsPerPage);
$: paginatedGuests = filteredGuests.slice(
    (guestPage - 1) * guestsPerPage,
    guestPage * guestsPerPage
);

$: totalGiftPages = Math.ceil(filteredGifts.length / giftPerPage);
$: paginatedGift = filteredGifts.slice(
    (giftPage - 1) * giftPerPage,
    giftPage * giftPerPage
);

// ============================================================================
// DATA LOADING & MANAGEMENT
// ============================================================================

/**
 * Load all dashboard data from Supabase
 */
async function loadDashboardData() {
    try {
        loading = true;
        
        // Fetch client data
        const { data: invite, error: inviteError } = await supabase
            .from('invites')
            .select('*')
            .eq('slug', clientSlug)
            .single()
            
            
        if (inviteError || !invite) {
            errorMessage = 'Client not found';
            return;
        }
        clientData = invite;
        
        // Load saved metrics preferences
        if (invite.dashboard_metrics) {
            if (Array.isArray(invite.dashboard_metrics)) {
                // OLD format: array of keys → convert to object with default mode 'count'
                selectedMetrics = invite.dashboard_metrics.reduce((acc, key) => {
                    acc[key] = { mode: 'count' };
                    return acc;
                }, {});
            } else if (typeof invite.dashboard_metrics === 'object') {
                // NEW format: already key/mode object
                selectedMetrics = invite.dashboard_metrics;
            }
        }
        
        // Fetch guests
        const { data: guestData, error: guestError } = await supabase
            .from('guests')
            .select('*')
            .eq('invite_id', invite.id)
            .order('full_name')
            .range(0, 49);
            
        if (guestError) {
            errorMessage = 'Failed to load guest data';
            console.error(guestError);
            return;
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

// ============================================================================
// DATA PROCESSING & FILTERING
// ============================================================================

/**
 * Process and filter guest list
 */
function processGuests(guests, search, sortField, sortDirection, rsvpFilter, checkInFilter, inviteSentFilter) {
    let result = [...guests];
    
    // Apply search filter
    if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(guest => {
            const name = (guest.full_name || '').toLowerCase();
            const phone = (guest.phone || '').toLowerCase();
            const email = (guest.email || '').toLowerCase();
            return name.includes(searchLower) || phone.includes(searchLower) || email.includes(searchLower);
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
    
    // Apply invite sent filter
    if (inviteSentFilter !== 'all') {
        result = result.filter(guest => {
            return inviteSentFilter === 'sent' ? guest.invite_sent === true : guest.invite_sent !== true;
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
 * Delete selected guests
 */
async function deleteSelectedGuests() {
    if (selectedGuests.size === 0) return;

    try {
        isDeleting = true;
        const guestIds = Array.from(selectedGuests);
        
        const { error, count } = await supabase
            .from('guests')
            .delete({ count: 'exact' })
            .in('guest_id', guestIds);

        if (error) {
            console.error('Supabase delete error:', error);
            alert(`Failed to delete guests: ${error.message}`);
            return;
        }

        if (count === 0) {
            alert('No guests were deleted. This may be due to permission restrictions.');
            await loadDashboardData();
            return;
        }

        console.log(`Successfully deleted ${count} guest(s)`);
        
        await loadDashboardData();
        selectedGuests.clear();
        selectedGuests = selectedGuests;
        showDeleteConfirmation = false;
        
    } catch (err) {
        console.error('Error deleting guests:', err);
        alert(`Failed to delete guests: ${err.message || 'Unknown error'}`);
    } finally {
        isDeleting = false;
    }
}

/**
 * Toggle guest selection
 */
function toggleGuestSelection(guestId) {
    if (selectedGuests.has(guestId)) {
        selectedGuests.delete(guestId);
    } else {
        selectedGuests.add(guestId);
    }
    selectedGuests = selectedGuests;
}

/**
 * Select/deselect all guests
 */
function selectAllGuests() {
    if (selectedGuests.size === filteredGuests.length) {
        selectedGuests.clear();
    } else {
        selectedGuests = new Set(filteredGuests.map(g => g.guest_id));
    }
    selectedGuests = selectedGuests;
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
function openAddGiftModal() {
    showAddGiftModal = true;
    selectedGuestForGift = null;
    guestSearchTerm = '';
    showGuestSearchResults = false;
    filteredGuestsForSearch = [];
}

/**
 * Close add gift modal
 */
function closeAddGiftModal() {
    showAddGiftModal = false;
    newGift = { 
        guest_id: '', 
        gift_type: '', 
        name: '', 
        description: '', 
        quantity: 1, 
        value: null 
    };
    selectedGuestForGift = null;
    guestSearchTerm = '';
    showGuestSearchResults = false;
    filteredGuestsForSearch = [];
}

// ============================================================================
// GUEST SEARCH (FOR GIFTS)
// ============================================================================

/**
 * Handle guest search for gift assignment
 */
function handleGuestSearch() {
    if (guestSearchTerm.length === 0) {
        filteredGuestsForSearch = [];
        showGuestSearchResults = false;
        return;
    }
    
    const searchLower = guestSearchTerm.toLowerCase();
    filteredGuestsForSearch = guests.filter(guest => {
        const name = (guest.full_name || '').toLowerCase();
        const phone = (guest.phone || '').toLowerCase();
        const email = (guest.email || '').toLowerCase();
        
        return name.includes(searchLower) || 
               phone.includes(searchLower) || 
               email.includes(searchLower);
    }).slice(0, 10);
    
    showGuestSearchResults = true;
}

/**
 * Select a guest for gift assignment
 */
function selectGuestForGift(guest) {
    selectedGuestForGift = guest;
    newGift.guest_id = guest.guest_id;
    guestSearchTerm = '';
    showGuestSearchResults = false;
    filteredGuestsForSearch = [];
}

/**
 * Clear guest selection
 */
function clearGuestSelection() {
    selectedGuestForGift = null;
    newGift.guest_id = '';
    guestSearchTerm = '';
    showGuestSearchResults = false;
    filteredGuestsForSearch = [];
}

// ============================================================================
// MESSAGE SENDING
// ============================================================================

/**
 * Fill message template with actual values
 */
function fillTemplate(template, guest, giftGroup = null) {
    const eventDate = clientData?.event_date ? 
        new Date(clientData.event_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric', 
            month: 'long',
            day: 'numeric'
        }) : 'TBD';

    const rsvpDeadline = clientData?.event_date ? 
        new Date(new Date(clientData.event_date).getTime() - (14 * 24 * 60 * 60 * 1000))
            .toLocaleDateString('en-US', {
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

    return template
        .replace(/{guest_name}/g, guest.full_name)
        .replace(/{client_name}/g, clientData?.client_name || 'Our')
        .replace(/{event_date}/g, eventDate)
        .replace(/{location}/g, clientData?.location || 'Jakarta, Indonesia')
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
    if (!phoneNumber.startsWith('62') && phoneNumber.startsWith('0')) {
        phoneNumber = '62' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('62')) {
        phoneNumber = '62' + phoneNumber;
    }

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

You are invited to {client_name} Wedding on {event_date} at {location}.

Please open your invite and confirm your RSVP before {rsvp_deadline}:
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
function handleGuestRowClick(guest, event) {
    if (event.target.type === 'checkbox' || 
        event.target.closest('button') || 
        event.target.closest('input[type="checkbox"]')) {
        return;
    }
    
    goto(`/${clientSlug}/dashboard/details/${guest.guest_id}`);
}

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
 * Reset all filters
 */
function resetFilters() {
    filterRsvp = 'all';
    filterCheckIn = 'all';
    filterInviteSent = 'all';
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
 * Navigate to guest page
 */
function goToGuestPage(page) {
    if (page >= 1 && page <= totalGuestPages) guestPage = page;
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

// ============================================================================
// LIFECYCLE
// ============================================================================

onMount(async () => {
    clientSlug = $page.params.clientSlug;
    await loadDashboardData();
    
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('click', handleClickOutsideGuestSearch);
    
    return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('click', handleClickOutsideGuestSearch);
    };
});
</script>

<style>
/* ============================================================================
   FONTS & ANIMATIONS
   ============================================================================ */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ============================================================================
   GLOBAL STYLES
   ============================================================================ */
:global(html) {
    font-family: 'DM Sans', sans-serif;
}

:global(body) {
    margin: 0;
    padding: 0;
    background: #ffffff;
}

/* ============================================================================
   LAYOUT
   ============================================================================ */
.dashboard-container {
    display: flex;
    min-height: 100vh;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.dashboard-content {
    padding: 20px 60px;
}

.breadcrumb {
    background: white;
    padding: 16px 24px;
    position: sticky;
    top: 0;
    z-index: 10;
}

.breadcrumb-path {
    font-size: 14px;
    color: #737373;
}

/* ============================================================================
   SIDEBAR
   ============================================================================ */
.sidebar {
    width: 280px;
    background: #FAF8F8;
    border-right: 0.25px solid #d4d4d4;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    transition: width 300ms ease-in 100ms;
}

.sidebar.collapsed {
    width: 74px;
}

.sidebar-header {
    margin: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.sidebar-toggle {
    padding: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}

.sidebar-toggle:hover {
    background: #e8e8e8;
    border-radius: 4px;
    color: #000;
    transition: background-color 300ms ease-in 100ms;
}

.client-info {
    overflow: hidden;
    transition: opacity 300ms ease-in;
}

.sidebar.collapsed .client-info {
    opacity: 0;
    width: 0px;
}

.client-name {
    font-size: 18px;
    font-weight: 800;
    color: #000;
}

.sidebar.collapsed .client-name {
    width: 0;
    opacity: 0;
    transition: opacity 600ms ease-in;
}

/* Navigation */
.nav-menu {
    flex: 1;
    padding: 12px 0;
}

.nav-item {
    display: flex;
    align-items: center;
    padding: 14px 14px;
    margin: 10px;
    color: #525252;
    text-decoration: none;
    transition: all 300ms ease-in 100ms;
    cursor: pointer;
    position: relative;
}

.nav-item:hover {
    background: #e8e8e8;
    padding: 14px 16px;
    border-radius: 10px;
    margin: 10px;
    color: #000;
}

.nav-item.active {
    background: #e8e8e8;
    margin: 10px;
    border-radius: 10px;
    color: #000;
    font-weight: 500;
}

.sidebar.collapsed .nav-item {
    justify-content: center;
    padding: 12px;
    border-radius: 8px;
}

.sidebar.collapsed .nav-item:hover {
    background-color: #e8e8e8;
    border-radius: 8px;
}

.nav-icon {
    width: 30px;
    height: 30px;
    margin-right: 12px;
    flex-shrink: 0;
}

.sidebar.collapsed .nav-icon {
    margin-right: 0px;
}

.nav-label {
    white-space: nowrap;
    overflow: hidden;
    transition: opacity 300ms ease-in;
}

.sidebar.collapsed .nav-label {
    opacity: 0;
    width: 0;
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

.sidebar.collapsed .client-profile {
    margin: 16px;
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

.sidebar.collapsed .client-sub {
    width: 0;
    opacity: 0;
    transition: opacity 600ms ease-in;
}

/* ============================================================================
   SECTIONS & HEADERS
   ============================================================================ */
.metrics-section {
    margin-bottom: 32px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.section-title {
    font-family: 'Romie Regular', serif;
    font-size: 40px;
    line-height: 52px;
    letter-spacing: 0.03em;
    font-weight: 400;
    color: #000;
}

/* ============================================================================
   METRICS
   ============================================================================ */
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
}

.metric-card {
    background: black;
    border-radius: 12px;
    padding: 24px;
    border: none;
    transition: all 300ms ease-in 100ms;
}

.metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.metric-label {
    font-size: 18px;
    line-height: 20px;
    color: #FAF8F8;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.metric-value {
    font-size: 140px;
    font-weight: 700;
    color: #FFFFFF;
    line-height: 1;
    text-align: right;
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

.settings-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 0.5px solid #d4d4d4;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 300ms ease-in 100ms;
}

.settings-btn:hover {
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
.table-container {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border: 0.5px solid #d4d4d4;
}

.table-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
}

.data-table th {
    text-align: left;
    padding: 12px;
    border-bottom: 0.5px solid #d4d4d4;
    font-weight: 600;
    color: #525252;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.data-table td {
    padding: 16px 12px;
    border-bottom: 0.25px solid #e5e5e5;
    color: #262626;
    font-size: 14px;
}

.data-table tr:hover td {
    background: #fafafa;
}

.data-table tr.clickable-row {
    cursor: pointer;
    transition: background-color 200ms ease-in-out;
    position: relative;
}

.data-table tr.clickable-row:hover td {
    background: #f0f9ff;
}

.data-table tr.clickable-row:active td {
    background: #e0f2fe;
}

.name-cell {
    cursor: pointer;
    transition: color 200ms ease-in-out;
}

.name-cell:hover {
    color: #0369a1;
}

/* ============================================================================
   ACTION BUTTONS
   ============================================================================ */
.action-btn-db {
    height: 36px;
    padding: 0 18px;
    border-radius: 12px;
    background: black;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: background-color 300ms ease-in, transform 300ms ease-in;
    position: relative;
    overflow: hidden;
}

.action-label-db {
    color: white;
    font-size: 14px;
    font-kerning: 0.1rem;
}

.action-btn {
    height: 36px;
    padding: 0 12px;
    border-radius: 12px;
    background: white;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: background-color 300ms ease-in, transform 300ms ease-in;
    position: relative;
    overflow: hidden;
}

.action-btn:hover {
    background: #f5f5f5;
    border: 0.5px solid #d4d4d4;
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
}

.action-label-delete.visible {
    max-width: 120px;
    margin-left: 8px;
}

.action-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.action-label {
    font-size: 14px;
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

.send-btn:hover {
    background: #1ea855 !important;
    transform: scale(1.05);
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
    margin: 16px 0;
}

.search-input {
    width: 100%;
    height: 40px;
    padding: 0 40px 0 12px;
    border: 0.5px solid #d4d4d4;
    border-radius: 12px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    transition: all 300ms ease-in 100ms;
}

.search-input:focus {
    outline: none;
    border-color: #000;
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

.guest-search-input {
    width: 100%;
    padding: 12px;
    border: 0.5px solid #d4d4d4;
    border-radius: 12px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
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
.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.03em;
}

.badge-success {
    background: #10b98120;
    color: #10b981;
}

.badge-warning {
    background: #f59e0b20;
    color: #f59e0b;
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
    background: #f5f5f5;
    color: #737373;
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
    font-family: 'DM Sans', sans-serif;
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

.page-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #d4d4d4;
    cursor: pointer;
    transition: all 300ms ease-in 100ms;
}

.page-dot.active {
    background: #000;
    transform: scale(1.3);
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
    background: white;
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
    font-family: 'DM Sans', sans-serif;
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
    font-family: 'DM Sans', sans-serif;
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
    font-family: 'DM Sans', sans-serif;
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
    font-family: 'DM Sans', sans-serif;
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
    font-size: 12px;
    color: #737373;
    font-weight: 500;
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
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
}

.recipient-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    color: #6c757d;
    font-size: 14px;
    font-weight: 500;
}

.recipient-label {
    margin-left: 6px;
}

.recipient-details {
    margin-left: 26px;
}

.recipient-name {
    font-size: 16px;
    font-weight: 600;
    color: #212529;
    margin-bottom: 4px;
}

.recipient-phone {
    font-size: 14px;
    color: #495057;
    font-family: monospace;
    background: #e9ecef;
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
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    transition: border-color 200ms ease-in;
}

.message-textarea:focus {
    outline: none;
    border-color: #25D366 !important;
    box-shadow: 0 0 0 2px rgba(37, 211, 102, 0.1);
}

/* ============================================================================
   FORMS
   ============================================================================ */
.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #525252;
    margin-bottom: 8px;
}

.form-input {
    width: 100%;
    padding: 12px;
    border: 0.5px solid #d4d4d4;
    border-radius: 12px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
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
   BUTTONS
   ============================================================================ */
.btn {
    flex: 1;
    padding: 12px 24px;
    border-radius: 999px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 300ms ease-in 100ms;
    border: none;
    font-family: 'DM Sans', sans-serif;
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

/* ============================================================================
   RESPONSIVE
   ============================================================================ */
@media (max-width: 1024px) {
    .metrics-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    
    .search-container {
        width: 100%;
    }
}

@media (max-width: 768px) {
    .dashboard-container {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        height: auto;
        position: relative;
    }
    
    .sidebar-header {
        padding: 16px;
    }
    
    .nav-menu {
        display: flex;
        overflow-x: auto;
        padding: 12px;
    }
    
    .nav-item {
        padding: 8px 16px;
        white-space: nowrap;
    }
    
    .breadcrumb {
        position: relative;
    }
    
    .section-title {
        font-size: 28px;
        line-height: 36px;
    }
    
    .table-actions {
        flex-wrap: wrap;
    }
    
    .data-table {
        font-size: 12px;
    }
    
    .data-table th,
    .data-table td {
        padding: 8px;
    }
}
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
        <aside class="sidebar" class:collapsed={sidebarCollapsed}>
            <div class="sidebar-header">
                <button class="sidebar-toggle" on:click={() => sidebarCollapsed = !sidebarCollapsed}>
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {#if sidebarCollapsed}
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        {:else}
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        {/if}
                    </svg>
                </button>
                <div class="client-info">
                    <div class="client-name">WITH LOVE</div>
                </div>
            </div>
            
            <nav class="nav-menu">
                <a href="/{clientSlug}/dashboard" class="nav-item active">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    <span class="nav-label">Dashboard</span>
                </a>
                <a href="/{clientSlug}/dashboard/checkin" class="nav-item">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                    </svg>
                    <span class="nav-label">Check-In Scan</span>
                </a>
                <a href="/{clientSlug}/dashboard/upload-guests" class="nav-item">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <span class="nav-label">Upload Guest List</span>
                </a>
                
                <div class="nav-footer">
                    <a href="#" class="nav-item">
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                        </svg>
                        <span class="nav-label">Support</span>
                    </a>
                    <a href="#" class="nav-item" on:click|preventDefault={handleSettingsClick}>
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span class="nav-label">Settings</span>
                    </a>
                    <div class="client-profile mx-6 my-6 ">
                        <div class="client-avatar">
                            {#if clientData?.client_name}
                                {clientData.client_name.charAt(0).toUpperCase()}
                            {:else}
                                W
                            {/if}
                        </div>
                        <div class="client-details">
                            <div class="client-name">{clientData?.client_name || 'Wedding'}</div>
                            <div class="client-sub">
                                {#if clientData?.event_date}
                                    {new Date(clientData.event_date).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
             <!-- Cursor-following tooltip -->
                <!-- <div
                class="cursor-tooltip"
                class:visible={showTooltip}
                style="top: {tooltipY}px; left: {tooltipX}px;"
                >
                Click to see details
                </div> -->
            <!-- Breadcrumb -->
            <div class="breadcrumb">
                <div class="breadcrumb-path">{currentRoute}</div>
            </div>

            <!-- Dashboard Content -->
            <div class="dashboard-content">
                <!-- Key Metrics -->
                <section class="metrics-section">
                    <div class="section-header">
                        <h1 class="section-title mx-3 my-3">Key Metrics</h1>
                      
                        <button class="settings-btn" on:click={() => showMetricsSettings = !showMetricsSettings}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                            </svg>
                        </button>
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

                <!-- Guest List -->
                <section class="table-container">
                    <h2 class="section-title mx-3 my-3">Guest List</h2>

                    <div class="section-header">
                        <div class="search-container">
                            <input type="text" class="search-input" placeholder="Search guests..." bind:value={searchTerm}>
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
                                            RSVP Status {sortField === 'rsvp_status' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                        </button>
                                        <button class="dropdown-item" class:active={sortField === 'checked_in'} on:click={() => setSortField('checked_in')}>
                                            Check-in {sortField === 'checked_in' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                        </button>
                                        <button class="dropdown-item" class:active={sortField === 'invite_sent'} on:click={() => setSortField('invite_sent')}>
                                            Invite Sent {sortField === 'invite_sent' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                        </button>
                                        <button class="dropdown-item" class:active={sortField === 'guest_count'} on:click={() => setSortField('guest_count')}>
                                            Guest Count {sortField === 'guest_count' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
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
                                        
                                        <div class="filter-section">
                                            <label class="filter-label">Invite Status:</label>
                                            <select bind:value={filterInviteSent} class="filter-select">
                                                <option value="all">All</option>
                                                <option value="sent">Sent</option>
                                                <option value="not-sent">Not Sent</option>
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
                            {#if selectedGuests.size > 0}
                                <button class="action-btn-delete" on:click={() => showDeleteConfirmation = true} on:mouseenter={() => hoveredAction = 'delete'} on:mouseleave={() => hoveredAction = null}>
                                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    <span class="action-label-delete font-semibold tracking-[0.33px] visible">Delete ({selectedGuests.size})</span>
                                </button>
                            {/if}
                            <button class="action-btn-db ml-2 hover:scale-101" on:click={() => showAddGuestModal = true} on:mouseenter={() => hoveredAction = 'add'} on:mouseleave={() => hoveredAction = null}>
                                <span class="action-label-db tracking-[0.33px] font-semibold">Add Guest</span>
                            </button>
                        </div>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" 
                                        checked={selectedGuests.size === filteredGuests.length && filteredGuests.length > 0}
                                        on:change={selectAllGuests}
                                        style="width:22px; height:22px;">
                                </th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>RSVP Status</th>
                                <th>Check-in Status</th>
                                <th>Invite Sent</th>
                                <th>Dietary Restrictions</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each paginatedGuests as guest}
                                {@const rsvpStatus = getRsvpStatusBadge(guest.rsvp_status)}
                                {@const checkInStatus = getCheckInStatusBadge(guest.checked_in)}
                                {@const inviteStatus = getInviteStatusBadge(guest.invite_sent)}
                               <tr
                                    class="clickable-row"
                                    on:click={(e) => handleGuestRowClick(guest, e)}
                                  
                                    >
                                    <td>
                                        <input type="checkbox"
                                            checked={selectedGuests.has(guest.guest_id)}
                                            on:change={() => toggleGuestSelection(guest.guest_id)}
                                            style="width:22px; height:22px">
                                    </td>
                                    <td>
                                        <div 
                                            class="name-cell" 
                                            style="font-weight: 500;">
                                            <!--on:mouseenter={handleRowMouseEnter}
                                    on:mousemove={handleRowMouseMove}
                                    on:mouseleave={handleRowMouseLeave}-->
                                            {guest.full_name || 'N/A'}
                                        </div>
                                        {#if guest.email}
                                            <div style="font-size: 12px; color: #737373;">{guest.email}</div>
                                        {/if}
                                    </td>
                                    <td>{guest.phone || '-'}</td>
                                    <td><span class="badge {rsvpStatus.class}">{rsvpStatus.text}</span></td>
                                    <td><span class="badge {checkInStatus.class}">{checkInStatus.text}</span></td>
                                    <td><span class="badge {inviteStatus.class}">{inviteStatus.text}</span></td>
                                    <td>{guest.dietary_restriction || '-'}</td>

                                   <td>
                                        {#if !guest.invite_sent && guest.phone}
                                            <button 
                                                class="action-btn send-btn" 
                                                style="height: 28px; background: #25D366; color: white; border: none;"
                                                on:click|stopPropagation={() => sendWhatsAppInvite(guest)}
                                                title="Send WhatsApp Invite">
                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                                                </svg>
                                                <span style="margin-left: 4px; font-size: 12px;">Send Invite</span>
                                            </button>
                                        {:else if guest.invite_sent}
                                            <button 
                                                class="action-btn sent-btn" 
                                                style="height: 28px; background: #10b981; color: white; border: none;" 
                                                disabled
                                                title="Invite Already Sent">
                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                </svg>
                                                <span style="margin-left: 4px; font-size: 12px;">Sent</span>
                                            </button>
                                        {:else}
                                            <button 
                                                class="action-btn no-phone-btn" 
                                                style="height: 28px; background: #ef4444; color: white; border: none;" 
                                                disabled
                                                title="No Phone Number">
                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                </svg>
                                                <span style="margin-left: 4px; font-size: 12px;">No Phone</span>
                                            </button>
                                        {/if}
                                    </td>

                                </tr>
                            {/each}

                            {#if filteredGuests.length === 0}
                                <tr>
                                    <td colspan="8" style="text-align: center; padding: 48px; color: #737373;">
                                        {searchTerm ? 'No guests found matching your search.' : 'No guests found.'}
                                    </td>
                                </tr>
                            {/if}
                        </tbody>
                    </table>
                    
                    <div class="pagination">
                        <button on:click={() => goToGuestPage(guestPage - 1)} disabled={guestPage === 1}>Prev</button>
                        {#each Array(totalGuestPages) as _, index}
                            <button 
                                class:active={guestPage === index + 1}
                                on:click={() => goToGuestPage(index + 1)}>
                                {index + 1}
                            </button>
                        {/each}
                        <button on:click={() => goToGuestPage(guestPage + 1)} disabled={guestPage === totalGuestPages}>Next</button>
                    </div>
                </section>

<!-- Gift Management Section for Dashboard -->
<section class="table-container">
    <h2 class="section-title mx-3 my-3">Manage Your Gifts</h2>
    <div class="section-header">
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search gifts..." bind:value={giftSearchTerm}>
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
        </div>
        
        <div class="table-actions">
            <button class="action-btn" on:mouseenter={() => hoveredAction = 'sortGifts'} on:mouseleave={() => hoveredAction = null}>
                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
                </svg>
                <span class="action-label">Sort</span>
            </button>
            <button class="action-btn" on:click={refreshData} on:mouseenter={() => hoveredAction = 'refreshGifts'} on:mouseleave={() => hoveredAction = null}>
                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span class="action-label">Refresh</span>
            </button>
            
            <!-- SIMPLE DELETE BUTTON - shows when gift groups are selected -->
            {#if selectedGiftGroups.size > 0}
                <button class="action-btn-delete" on:click={() => showDeleteGiftsConfirmation = true} on:mouseenter={() => hoveredAction = 'deleteGifts'} on:mouseleave={() => hoveredAction = null}>
                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    <span class="action-label-delete font-semibold tracking-[0.33px] visible">Delete ({selectedGiftGroups.size})</span>
                </button>
            {/if}
            
            <button class="action-btn-db ml-2" on:click={openAddGiftModal}>
    <span class="action-label-db tracking-[0.33px] font-semibold">Add Gift</span>
</button>
        </div>
    </div>

    <div class="tabs-container">
        <button class="tab-btn" class:active={giftViewMode === 'received'} on:click={() => giftViewMode = 'received'}>
            Gifts Received
        </button>
        <button class="tab-btn" class:active={giftViewMode === 'given'} on:click={() => giftViewMode = 'given'}>
            Souvenirs Given
        </button>
    </div>

    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 40px;">
                    <input type="checkbox" 
                        checked={selectedGiftGroups.size === filteredGifts.length && filteredGifts.length > 0}
                        on:change={selectAllGiftGroups}
                        style="width:22px; height:22px;">
                </th>
                <th>Name</th>
                {#if giftViewMode === 'received'}
                    <th>Type of Gift</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Value</th>
                    <th>Action</th>
                {:else}
                    <th>Quantity</th>
                    <th>Action</th>
                {/if}
            </tr>
        </thead>
        <tbody>
            {#each paginatedGift as guestGiftGroup}
                <tr class="clickable-row" on:click={(e) => handleGiftRowClick(guestGiftGroup, e)}>
                    <td>
                        <input type="checkbox"
                            checked={selectedGiftGroups.has(guestGiftGroup.guest?.guest_id || 'anonymous')}
                            on:change={() => toggleGiftGroupSelection(guestGiftGroup.guest?.guest_id || 'anonymous')}
                            on:click|stopPropagation
                            style="width:22px; height:22px;">
                    </td>
                    
                    <td style="font-weight: 500;">{guestGiftGroup.guest?.full_name || 'Anonymous'}</td>
                    
                    {#if giftViewMode === 'received'}
                        <td>
                            {#each guestGiftGroup.gifts as gift, index}
                                <span class="badge badge-info">{gift.gift_type || gift.name}</span>
                                {#if index < guestGiftGroup.gifts.length - 1}<br/>{/if}
                            {/each}
                        </td>
                        <td>
                            {#each guestGiftGroup.gifts as gift, index}
                                {gift.description || '-'}
                                {#if index < guestGiftGroup.gifts.length - 1}<br/>{/if}
                            {/each}
                        </td>
                        <td>{guestGiftGroup.gifts.reduce((sum, g) => sum + (g.quantity || 1), 0)}</td>
                        <td>
                            {#if guestGiftGroup.gifts.some(g => g.value)}
                                ${guestGiftGroup.gifts.reduce((sum, g) => sum + (g.value || 0), 0)}
                            {:else}
                                -
                            {/if}
                        </td>

                        <td>
    {#if guestGiftGroup.guest?.phone}
        <button 
            class="action-btn send-btn" 
            style="height: 28px; background: #25D366; color: white; border: none; margin-right: 8px;"
            on:click|stopPropagation={() => sendThankYouMessage(guestGiftGroup)}
            title="Send WhatsApp Thank You">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            <span style="margin-left: 4px; font-size: 12px;">Thank You</span>
        </button>
    {/if}
    
    {#if guestGiftGroup.gifts.length === 1}
        <button class="action-btn" style="height: 28px;" on:click|stopPropagation={() => editGift(guestGiftGroup.gifts[0])}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
        </button>
    {:else}
        <button class="action-btn" style="height: 28px;" on:click|stopPropagation={() => editGiftFromGroup(guestGiftGroup)} title="Edit gifts (multiple)">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <span style="font-size: 10px; margin-left: 2px;">({guestGiftGroup.gifts.length})</span>
        </button>
    {/if}
</td>
               
      
                    {:else}
                        <td>{guestGiftGroup.gifts.reduce((sum, g) => sum + (g.quantity || 1), 0)}</td>
                        <td>
                            {#if guestGiftGroup.gifts.length === 1}
                                <button class="action-btn" style="height: 28px;" on:click|stopPropagation={() => editGift(guestGiftGroup.gifts[0])}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                            {:else}
                                <button class="action-btn" style="height: 28px;" on:click|stopPropagation={() => editGiftFromGroup(guestGiftGroup)} title="Edit souvenirs (multiple)">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    <span style="font-size: 10px; margin-left: 2px;">({guestGiftGroup.gifts.length})</span>
                                </button>
                            {/if}
                            
                            <button class="action-btn" style="height: 28px;" on:click|stopPropagation={() => deleteGuestGifts(guestGiftGroup)}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                            </button>
                        </td>
                    {/if}
                </tr>
            {/each}
            
            {#if filteredGifts.length === 0}
                <tr>
                    <td colspan="{giftViewMode === 'received' ? 7 : 4}" style="text-align: center; padding: 48px; color: #737373;">
                        No {giftViewMode === 'received' ? 'gifts received' : 'souvenirs given'} yet.
                    </td>
                </tr>
            {/if}
        </tbody>
    </table>
    



    <div class="pagination">
        <button on:click={() => goToGiftPage(giftPage - 1)} disabled={giftPage === 1}>Prev</button>
        {#each Array(totalGiftPages) as _, index}
            <button 
                class:active={giftPage === index + 1}
                on:click={() => goToGiftPage(index + 1)}>
                {index + 1}
            </button>
        {/each}
        <button on:click={() => goToGiftPage(giftPage + 1)} disabled={giftPage === totalGiftPages}>Next</button>
    </div>
</section>


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
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 4h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2m4-2a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2V4a2 2 0 00-2-2h-4z"/>
                    </svg>
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
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 6px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    Your Message:
                </label>
                <div class="message-editor">
                    <textarea 
                        class="message-textarea" 
                        bind:value={previewMessage}
                        rows="12"
                        placeholder="Type your message here..."
                        style="width: 100%; min-height: 280px; resize: vertical; font-family: 'DM Sans', sans-serif; font-size: 14px; line-height: 1.5; padding: 16px; border: 1px solid #d4d4d4; border-radius: 8px; background: white;">
                    </textarea>
                </div>
                <div class="character-count">
                    {previewMessage.length} characters
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="form-actions">
                <button class="btn btn-secondary" on:click={closeMessagePreviewModal}>
                    Cancel
                </button>
                <button class="btn btn-primary" on:click={sendPreviewedMessage} style="background: #25D366; border-color: #25D366;">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="margin-right: 8px;">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                    Send via WhatsApp
                </button>   
            </div>
        </div>
    </div>
{/if}

<!-- Updated Add Gift Modal -->
{#if showAddGiftModal}
    <div class="modal-overlay" on:click={() => showAddGiftModal = false}>
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <h3 class="modal-title">Add {giftViewMode === 'received' ? 'Gift Received' : 'Souvenir Given'}</h3>
                <button class="modal-close" on:click={() => showAddGiftModal = false}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <form on:submit|preventDefault={addGift}>
                <div class="form-group">
                    <label class="form-label">Search Guest</label>
                    
                    <!-- Selected Guest Display -->
                    {#if selectedGuestForGift}
                        <div class="selected-guest-display">
                            <div class="selected-guest-info">
                                <div class="selected-guest-name">{selectedGuestForGift.full_name}</div>
                                <div class="selected-guest-details">
                                    {#if selectedGuestForGift.phone}
                                        <span>{selectedGuestForGift.phone}</span>
                                    {/if}
                                    {#if selectedGuestForGift.email}
                                        <span>{selectedGuestForGift.email}</span>
                                    {/if}
                                </div>
                            </div>
                            <button type="button" class="clear-selection-btn" on:click={clearGuestSelection}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    {:else}
                        <!-- Guest Search Input -->
                        <div class="guest-search-container">
                            <input 
                                type="text" 
                                class="form-input guest-search-input" 
                                bind:value={guestSearchTerm}
                                on:input={handleGuestSearch}
                                on:focus={() => showGuestSearchResults = true}
                                placeholder="Search by name, phone, or email..."
                                autocomplete="off">
                            
                            <!-- Search Results Dropdown -->
                            {#if showGuestSearchResults && guestSearchTerm.length > 0}
                                <div class="guest-search-results">
                                    {#each filteredGuestsForSearch as guest}
                                        <button 
                                            type="button" 
                                            class="guest-search-result" 
                                            on:click={() => selectGuestForGift(guest)}>
                                            <div class="guest-result-name">{guest.full_name}</div>
                                            <div class="guest-result-details">
                                                {#if guest.phone}
                                                    <span class="guest-result-phone">{guest.phone}</span>
                                                {/if}
                                                {#if guest.email}
                                                    <span class="guest-result-email">{guest.email}</span>
                                                {/if}
                                            </div>
                                        </button>
                                    {/each}
                                    
                                    {#if filteredGuestsForSearch.length === 0}
                                        <div class="no-results">No guests found</div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
                
                {#if giftViewMode === 'received'}
                    <div class="form-group">
                        <label class="form-label">Gift Type *</label>
                        <select class="form-input" bind:value={newGift.gift_type} required>
                            <option value="">Select type...</option>
                            <option value="Goods">Goods</option>
                            <option value="Angpao">Angpao</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <input type="text" class="form-input" bind:value={newGift.description} placeholder="e.g., Dyson Hairdryer, Cash, etc.">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Value (Optional)</label>
                        <input type="number" class="form-input" bind:value={newGift.value} min="0" step="0.01" placeholder="">
                    </div>
                {:else}
                    <div class="form-group">
                        <label class="form-label">Souvenir Name</label>
                        <input type="text" class="form-input" bind:value={newGift.name} placeholder="Souvenir">
                    </div>
                {/if}
                
                <div class="form-group">
                    <label class="form-label">Quantity</label>
                    <input type="number" class="form-input" bind:value={newGift.quantity} min="1">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" on:click={() => showAddGiftModal = false}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Add {giftViewMode === 'received' ? 'Gift' : 'Souvenir'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Edit Gift Modal -->
{#if showEditGiftModal}
    <div class="modal-overlay" on:click={() => showEditGiftModal = false}>
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <h3 class="modal-title">Edit {editingGift?.type === 'received' ? 'Gift' : 'Souvenir'}</h3>
                <button class="modal-close" on:click={() => showEditGiftModal = false}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <form on:submit|preventDefault={updateGift}>
                <div class="form-group">
                    <label class="form-label">Guest</label>
                    <select class="form-input" bind:value={editingGift.guest_id}>
                        <option value="">Select a guest...</option>
                        {#each guests as guest}
                            <option value={guest.guest_id}>{guest.full_name}</option>
                        {/each}
                    </select>
                </div>
                
                {#if editingGift?.type === 'received'}
                    <div class="form-group">
                        <label class="form-label">Gift Type *</label>
                        <select class="form-input" bind:value={editingGift.gift_type} required>
                            <option value="Goods">Goods</option>
                            <option value="Angpao">Angpao</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <input type="text" class="form-input" bind:value={editingGift.description}>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Value</label>
                        <input type="number" class="form-input" bind:value={editingGift.value} min="0" step="0.01">
                    </div>
                {:else}
                    <div class="form-group">
                        <label class="form-label">Souvenir Name</label>
                        <input type="text" class="form-input" bind:value={editingGift.name}>
                    </div>
                {/if}
                
                <div class="form-group">
                    <label class="form-label">Quantity</label>
                    <input type="number" class="form-input" bind:value={editingGift.quantity} min="1">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" on:click={() => showEditGiftModal = false}>
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Update {editingGift?.type === 'received' ? 'Gift' : 'Souvenir'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}


<!--Delete Gifts Confirmation Modal-->
{#if showDeleteGiftsConfirmation}
    <div class="modal-overlay" on:click={() => showDeleteGiftsConfirmation = false}>
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <h3 class="modal-title">Delete Selected Gift Groups</h3>
                <button class="modal-close" on:click={() => showDeleteGiftsConfirmation = false}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <p style="margin-bottom: 24px; color: #525252;">
                Are you sure you want to delete gifts from {selectedGiftGroups.size} selected guest group(s)? This action cannot be undone.
            </p>
            
            <div class="form-actions">
                <button class="btn btn-secondary" on:click={() => showDeleteGiftsConfirmation = false} disabled={isDeletingGifts}>
                    Cancel
                </button>
                <button class="btn btn-primary" style="background: #ef4444;" on:click={deleteSelectedGiftGroups} disabled={isDeletingGifts}>
                    {isDeletingGifts ? 'Deleting...' : 'Delete Gift Groups'}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Message Template Settings Modal -->
{#if showSettingsModal}
    <div class="modal-overlay" on:click={closeSettingsModal}>
        <div class="settings-modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <h3 class="modal-title">Message Template Settings</h3>
                <button class="modal-close" on:click={closeSettingsModal}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <!-- Tab Navigation -->
            <div class="settings-tabs">
                <button 
                    class="settings-tab-btn" 
                    class:active={settingsActiveTab === 'invite'}
                    on:click={() => settingsActiveTab = 'invite'}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Invite Template
                </button>
                <button 
                    class="settings-tab-btn" 
                    class:active={settingsActiveTab === 'thankYou'}
                    on:click={() => settingsActiveTab = 'thankYou'}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                    Thank You Template
                </button>
            </div>
            
            <!-- Template Editor -->
            <div class="settings-content">
                <div class="template-editor-container">
                    <!-- Variables Helper -->
                    <div class="variables-section">
                        <h4 class="variables-title">Available Variables</h4>
                        <div class="variables-grid">
                            <button class="variable-btn" on:click={() => insertVariable('{guest_name}')}>
                                <span class="variable-name">{guest_name}</span>
                                <span class="variable-desc">Guest's full name</span>
                            </button>
                            <button class="variable-btn" on:click={() => insertVariable('{client_name}')}>
                                <span class="variable-name">{client_name}</span>
                                <span class="variable-desc">Your name/couple name</span>
                            </button>
                            <button class="variable-btn" on:click={() => insertVariable('{event_date}')}>
                                <span class="variable-name">{event_date}</span>
                                <span class="variable-desc">Wedding date</span>
                            </button>
                            <button class="variable-btn" on:click={() => insertVariable('{location}')}>
                                <span class="variable-name">{location}</span>
                                <span class="variable-desc">Wedding location</span>
                            </button>
                            {#if settingsActiveTab === 'invite'}
                                <button class="variable-btn" on:click={() => insertVariable('{rsvp_deadline}')}>
                                    <span class="variable-name">{rsvp_deadline}</span>
                                    <span class="variable-desc">RSVP deadline</span>
                                </button>
                                <button class="variable-btn" on:click={() => insertVariable('{invite_url}')}>
                                    <span class="variable-name">{invite_url}</span>
                                    <span class="variable-desc">Personal invite link</span>
                                </button>
                            {:else}
                                <button class="variable-btn" on:click={() => insertVariable('{gift_description}')}>
                                    <span class="variable-name">{gift_description}</span>
                                    <span class="variable-desc">Gift details</span>
                                </button>
                            {/if}
                        </div>
                    </div>
                    
                    <!-- Template Editor -->
                    <div class="template-editor">
                        <div class="editor-header">
                            <h4 class="editor-title">
                                {settingsActiveTab === 'invite' ? 'Invite Message Template' : 'Thank You Message Template'}
                            </h4>
                            <button class="reset-btn" on:click={resetToDefault}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                Reset to Default
                            </button>
                        </div>
                        
                        {#if settingsActiveTab === 'invite'}
                            <textarea 
                                id="template-invite"
                                class="template-textarea" 
                                bind:value={tempMessageTemplates.invite}
                                rows="15"
                                placeholder="Enter your invite message template here...">
                            </textarea>
                        {:else}
                            <textarea 
                                id="template-thankYou"
                                class="template-textarea" 
                                bind:value={tempMessageTemplates.thankYou}
                                rows="15"
                                placeholder="Enter your thank you message template here...">
                            </textarea>
                        {/if}
                        
                        <div class="template-info">
                            <div class="character-count">
                                {settingsActiveTab === 'invite' ? tempMessageTemplates.invite.length : tempMessageTemplates.thankYou.length} characters
                            </div>
                            <div class="template-tip">
                                💡 Click on variables above to insert them at your cursor position
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="settings-actions">
                <button class="btn btn-secondary" on:click={closeSettingsModal} disabled={isSavingTemplates}>
                    Cancel
                </button>
                <button class="btn btn-primary" on:click={saveMessageTemplates} disabled={isSavingTemplates}>
                    {isSavingTemplates ? 'Saving...' : 'Save Templates'}
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
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
