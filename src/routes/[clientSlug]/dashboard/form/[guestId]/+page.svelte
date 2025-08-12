<script>
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';

let guestData = null;
let clientData = null;
let loading = true;
let errorMessage = '';
let clientSlug = '';

// Form data - will be prefilled from database
let numberOfGuests = 1;
let seating = '';
let giftTypes = [];
let giftDetails = {}; // Object to store individual details for each gift type
let printLabel = null;
let souvenirGiven = 0;
let checkedIn = null;
let actualGuestCount = null;
let tableAssignment = '';
let printLabelStatus = null;
let souvenirCount = 0;
let giftTypeError = false;

const availableGiftTypes = ['Angpao', 'Bank Transfer', 'Goods']; // Define available options

onMount(async () => {
    const guestId = $page.params.guestId;
    clientSlug = $page.params.clientSlug;
    
    try {
        // Fetch client data
        const { data: invite, error: inviteError } = await supabase
            .from('invites')
            .select('*')
            .eq('slug', clientSlug)
            .single();
            
        if (inviteError || !invite) {
            errorMessage = 'Client not found';
            return;
        }
        clientData = invite;
        
        // Fetch guest data
        const { data: guest, error } = await supabase
            .from('guests')
            .select('*')
            .eq('guest_id', guestId)
            .single();
            
        if (error || !guest) {
            errorMessage = 'Guest not found';
            return;
        }
        
        guestData = guest;
        
        // Prefill form with existing data from database
        numberOfGuests = guest.guest_count || 1;
        actualGuestCount = guest.actual_guest_count || guest.guest_count || 1;
        tableAssignment = guest.table_assignment || '';
        seating = guest.table_assignment || '';
        
        // Handle existing gift type data - convert string to array if needed
        if (guest.gift_type) {
            if (typeof guest.gift_type === 'string') {
                // If it's a comma-separated string, split it
                giftTypes = guest.gift_type.includes(',') 
                    ? guest.gift_type.split(',').map(t => t.trim())
                    : [guest.gift_type];
            } else if (Array.isArray(guest.gift_type)) {
                giftTypes = guest.gift_type;
            }
            
            // Initialize giftDetails for existing gift types
            giftTypes.forEach(type => {
                giftDetails[type] = {
                    description: guest.gift_description || '',
                    value: guest.gift_value || null
                };
            });
        } else {
            giftTypes = [];
        }
        
        printLabelStatus = guest.print_label;
        printLabel = guest.print_label;
        souvenirCount = guest.souvenir_count || 0;
        souvenirGiven = guest.souvenir_count || 0;
        checkedIn = guest.checked_in;
    } catch (err) {
        console.error('Error loading data:', err);
        errorMessage = 'Failed to load data';
    } finally {
        loading = false;
    }
});

function toggleGiftType(type) {
    const index = giftTypes.indexOf(type);
    if (index > -1) {
        // Remove if already selected
        giftTypes = giftTypes.filter(t => t !== type);
        delete giftDetails[type]; // Remove details for this type
    } else {
        // Add if not selected
        giftTypes = [...giftTypes, type];
        giftDetails[type] = { description: '', value: null }; // Initialize details
    }
    giftTypeError = false;
    giftDetails = giftDetails; // Trigger reactivity
}

function isGiftTypeSelected(type) {
    return giftTypes.includes(type);
}

async function createGiftEntries() {
    const giftEntries = [];
    
    // Create gift received entries for each selected gift type
    giftTypes.forEach(type => {
        const details = giftDetails[type] || {};
        giftEntries.push({
            invite_id: clientData.id,
            guest_id: guestData.guest_id,
            type: 'received',
            name: type,
            description: details.description || null,
            quantity: 1,
            value: details.value || null,
            gift_type: type
        });
    });
    
    // Create souvenir given entries if souvenirs were given
    if (souvenirGiven > 0) {
        giftEntries.push({
            invite_id: clientData.id,
            guest_id: guestData.guest_id,
            type: 'given',
            name: 'Souvenir',
            description: null,
            quantity: souvenirGiven,
            value: null,
            gift_type: null
        });
    }
    
    // Insert gift entries if any exist
    if (giftEntries.length > 0) {
        const { error: giftError } = await supabase
            .from('gifts')
            .insert(giftEntries);
            
        if (giftError) {
            console.error('Error creating gift entries:', giftError);
            throw new Error(`Failed to record gifts: ${giftError.message}`);
        }
    }
}

async function handleSubmit() {
    if (!guestData || checkedIn === null) return;
    
    try {
        loading = true;
        errorMessage = ''; // Clear any previous errors
        
        if (checkedIn) {
            // Validate required fields
            if (giftTypes.length === 0) {
                giftTypeError = true;
                errorMessage = 'Please select at least one gift type before checking in';
                loading = false;
                return;
            }
            
            // Create combined description and value for backward compatibility
            const combinedDescription = giftTypes.map(type => 
                giftDetails[type]?.description || type
            ).join(', ');
            
            const combinedValue = giftTypes.reduce((total, type) => 
                total + (giftDetails[type]?.value || 0), 0
            );
            
            // Update guest record with check-in data
            const { data: updatedGuest, error } = await supabase
                .from('guests')
                .update({
                    checked_in: true,
                    checked_in_at: new Date().toISOString(),
                    guest_count: numberOfGuests,
                    actual_guest_count: numberOfGuests,
                    table_assignment: seating,
                    gift_type: giftTypes.join(', '), // Store as comma-separated string
                    gift_description: combinedDescription,
                    gift_value: combinedValue,
                    print_label: printLabel,
                    souvenir_count: souvenirGiven
                })
                .eq('guest_id', guestData.guest_id)
                .select()
                .single();
                
            if (error) {
                console.error('Database update error:', error);
                errorMessage = `Failed to check in guest: ${error.message}`;
                loading = false;
                return;
            }
            
            // Verify the update was successful
            if (!updatedGuest) {
                errorMessage = 'Check-in failed: No guest data returned';
                loading = false;
                return;
            }
            
            // Double-check that the guest is actually checked in
            if (!updatedGuest.checked_in) {
                errorMessage = 'Check-in failed: Guest status not updated';
                loading = false;
                return;
            }
            
            // Create gift entries in the gifts table
            try {
                await createGiftEntries();
            } catch (giftError) {
                // Gift creation failed, but guest is already checked in
                // Log the error but don't fail the check-in
                console.error('Gift entry creation failed:', giftError);
                errorMessage = `Guest checked in successfully, but there was an issue recording gifts: ${giftError.message}`;
            }
            
            // Success - show confirmation before redirecting
            showSuccessMessage();
            
            // Add a small delay to show the success message
            setTimeout(() => {
               goto(`/${clientSlug}/dashboard/details/${guestData.guest_id}`);
            }, 1500);
        } else {
            // Go back to scanner without updating
            goto(`/${clientSlug}/dashboard/checkin`);
        }
    } catch (err) {
        console.error('Error updating guest:', err);
        errorMessage = `Unexpected error: ${err.message}`;
        loading = false;
    }
}

let showSuccess = false;
let successMessage = '';

function showSuccessMessage() {
    showSuccess = true;
    successMessage = `${guestData.full_name} has been successfully checked in!`;
    
    // Hide success message after 3 seconds
    setTimeout(() => {
        showSuccess = false;
    }, 3000);
}

function handleCheckIn() {
    // Clear any previous errors
    errorMessage = '';
    
    if (giftTypes.length === 0) {
        giftTypeError = true;
        errorMessage = 'Please select at least one gift type before checking in';
        return;
    }
    
    // Additional validation
    if (numberOfGuests < 1) {
        errorMessage = 'Number of guests must be at least 1';
        return;
    }
    
    if (souvenirGiven < 0) {
        errorMessage = 'Souvenir count cannot be negative';
        return;
    }
    
    // Validate individual gift values
    for (const type of giftTypes) {
        const value = giftDetails[type]?.value;
        if (value && value < 0) {
            errorMessage = `Gift value for ${type} cannot be negative`;
            return;
        }
    }
    
    giftTypeError = false;
    checkedIn = true;
    handleSubmit();
}

function goBack() {
    goto(`/checkin/${clientSlug}`);
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

:global(html) {
    font-family: 'DM Sans', sans-serif;
    background-color: #FAFAF8;
    color: #000;
}
</style>

{#if loading}
    <div class="flex h-screen items-center justify-center px-4">
        <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p class="text-sm sm:text-base">Loading guest information...</p>
        </div>
    </div>
{:else if errorMessage}
    <div class="flex h-screen items-center justify-center px-4">
        <div class="text-center">
            <p class="text-red-600 mb-4 text-sm sm:text-base">{errorMessage}</p>
            <button
                class="bg-blue-500 text-white px-4 py-2 rounded text-sm sm:text-base"
                on:click={goBack}
            >
                Back to Scanner
            </button>
        </div>
    </div>
{:else if guestData}
    <div class="min-h-screen bg-gray-50">
        <div class="px-4 sm:px-6 md:px-10 lg:px-20 py-6 sm:py-8 md:py-10">
            <!-- Guest Name -->
            <h1 class="text-xl sm:text-2xl md:text-3xl lg:text-2xl font-['Romie_Regular'] text-gray-800 mb-4 sm:mb-6">
                {guestData.full_name}
            </h1>
            <hr class="mb-4 sm:mb-6">
            
            <div class="space-y-6 sm:space-y-8 w-full">
                <!-- Number of guests -->
                <div class="border-b border-gray-400 pb-4 sm:pb-6 w-full">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
                        <h2 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-800 text-left tracking-wide sm:tracking-[1.88px]">
                            Number of guests
                        </h2>
                        <div class="flex items-center space-x-4 justify-end sm:justify-start">
                            <button
                                class="w-8 h-8 sm:w-10 sm:h-10 border border-gray-400 rounded flex items-center justify-center transition duration-300 hover:border-2 hover:bg-gray-100"
                                on:click={() => numberOfGuests = Math.max(1, numberOfGuests - 1)}
                            >
                                -
                            </button>
                            <span class="text-lg sm:text-xl w-8 text-center">{numberOfGuests}</span>
                            <button
                                class="w-8 h-8 sm:w-10 sm:h-10 border border-gray-400 rounded flex items-center justify-center transition duration-300 hover:border-2 hover:bg-gray-100"
                                on:click={() => numberOfGuests++}
                            >
                                +
                            </button>
                        </div>
                    </div>
                    {#if guestData.guest_count && numberOfGuests !== guestData.guest_count}
                        <p class="text-xs sm:text-sm text-gray-500 mt-2">
                            Original RSVP count: {guestData.guest_count}
                        </p>
                    {/if}
                </div>

                <!-- Seating -->
                <div class="border-b border-gray-400 pb-4 sm:pb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h2 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-800 text-left tracking-wide sm:tracking-[1.88px]">
                            Seating
                        </h2>
                        <input
                            type="text"
                            bind:value={seating}
                            placeholder="Table A, S08-9"
                            class="px-3 py-2 border border-gray-400 rounded-md text-left sm:text-right bg-gray-50 w-full sm:w-auto sm:min-w-[150px] transition duration-300 hover:border-2 hover:bg-gray-100"
                        />
                    </div>
                </div>

                <!-- Gift Types (Multi-select) -->
                <div class="border-b border-gray-400 pb-4 sm:pb-6">
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h2 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-800 text-left tracking-wide sm:tracking-[1.88px]">
                                Gift Types
                            </h2>
                            {#if giftTypeError}
                                <p class="text-red-500 text-xs sm:text-sm">
                                    Please select at least one gift type.
                                </p>
                            {/if}
                        </div>
                        <div class="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:justify-end">
                            {#each availableGiftTypes as type}
                                <button
                                    class="px-3 sm:px-4 py-2 rounded-full border transition-colors duration-300 hover:scale-102 hover:border-2 text-sm sm:text-base
                                    {isGiftTypeSelected(type) ? 'bg-black text-white border-black' : giftTypeError ? 'border-red-500' : 'border-gray-400'}"
                                    on:click={() => toggleGiftType(type)}
                                >
                                    {type}
                                    {#if isGiftTypeSelected(type)}
                                        <span class="ml-1">✓</span>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                        {#if giftTypes.length > 0}
                            <p class="text-xs sm:text-sm text-gray-600 text-right">
                                Selected: {giftTypes.join(', ')}
                            </p>
                        {/if}
                    </div>
                </div>

                <!-- Individual Gift Details for each selected type -->
                {#if giftTypes.length > 0}
                    <div class="border-b border-gray-400 pb-4 sm:pb-6">
                        <h2 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-800 text-left tracking-wide sm:tracking-[1.88px] mb-4">
                            Gift Details
                        </h2>
                        
                        {#each giftTypes as giftType}
                            <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h3 class="text-lg font-semibold mb-3 text-gray-700 flex items-center">
                                    <span class="bg-black text-white px-2 py-1 rounded-full text-sm mr-3">{giftType}</span>
                                    Details
                                </h3>
                                
                                <div class="space-y-3">
                                    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <label class="text-sm font-medium text-gray-600 sm:w-1/3">Description:</label>
                                        <input
                                            type="text"
                                            bind:value={giftDetails[giftType].description}
                                            placeholder={giftType === 'Angpao' ? 'e.g., Cash' : giftType === 'Bank Transfer' ? 'e.g., Transfer' : 'e.g., Dyson Hairdryer'}
                                            class="px-3 py-2 border border-gray-300 rounded-md bg-white w-full sm:w-2/3 transition duration-300 hover:border-gray-500 focus:border-black focus:outline-none"
                                        />
                                    </div>
                                    
                                    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <label class="text-sm font-medium text-gray-600 sm:w-1/3">Value:</label>
                                        <input
                                            type="number"
                                            bind:value={giftDetails[giftType].value}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            class="px-3 py-2 border border-gray-300 rounded-md bg-white w-full sm:w-2/3 transition duration-300 hover:border-gray-500 focus:border-black focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        {/each}
                        
                        <p class="text-xs sm:text-sm text-gray-500 mt-2">
                            Each gift type can have its own description and value. You can edit these later from the dashboard.
                        </p>
                    </div>
                {/if}

                <!-- Souvenir Given -->
                <div class="border-b border-gray-400 pb-4 sm:pb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
                        <h2 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-800 text-left tracking-wide sm:tracking-[1.88px]">
                            Souvenir Given
                        </h2>
                        <div class="flex items-center space-x-4 justify-end sm:justify-start">
                            <button
                                class="w-8 h-8 sm:w-10 sm:h-10 border border-gray-400 rounded flex items-center justify-center transition duration-300 hover:border-2 hover:bg-gray-100"
                                on:click={() => souvenirGiven = Math.max(0, souvenirGiven - 1)}
                            >
                                -
                            </button>
                            <span class="text-lg sm:text-xl w-8 text-center">{souvenirGiven}</span>
                            <button
                                class="w-8 h-8 sm:w-10 sm:h-10 border border-gray-400 rounded flex items-center justify-center transition duration-300 hover:border-2 hover:bg-gray-100"
                                on:click={() => souvenirGiven++}
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Print Label Status -->
                <div class="border-b border-gray-400 pb-4 sm:pb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
                        <h2 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-800 text-left tracking-wide sm:tracking-[1.88px]">
                            Print Label?
                        </h2>
                        <div class="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:justify-end">
                            <button
                                class="px-3 sm:px-4 py-2 rounded-full border transition-colors duration-300 hover:scale-102 hover:border-2 text-sm sm:text-base
                                {printLabel === true ? 'bg-black text-white border-black' : 'border-gray-400'}"
                                on:click={() => printLabel = true}
                            >
                                Yes
                            </button>
                            <button
                                class="px-3 sm:px-4 py-2 rounded-full border transition-colors duration-300 hover:scale-102 hover:border-2 text-sm sm:text-base
                                {printLabel === false ? 'bg-black text-white border-black' : 'border-gray-400'}"
                                on:click={() => printLabel = false}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex space-x-4 pt-4">
                    <button
                        class="flex-1 bg-black text-white py-3 sm:py-4 rounded-lg font-medium disabled:opacity-50 transition duration-300 hover:scale-101 text-sm sm:text-base"
                        on:click={handleCheckIn}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'CHECK-IN'}
                    </button>
                </div>

                <!-- Success Message -->
                {#if showSuccess}
                    <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg transition-all duration-300">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            <p class="text-sm sm:text-base font-medium">{successMessage}</p>
                        </div>
                        <p class="text-xs sm:text-sm mt-1 text-green-600">Redirecting to details page...</p>
                    </div>
                {/if}

                <!-- Error Message -->
                {#if errorMessage}
                    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                            <p class="text-sm sm:text-base font-medium">{errorMessage}</p>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}