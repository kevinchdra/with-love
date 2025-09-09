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
        
        // Fetch updated guest data
       const { data: guest, error } = await supabase.from('guests').select('*').eq('guest_id', guestId).single();
            
        if (error || !guest) {
            errorMessage = 'Guest not found';
            return;
        }
        
        guestData = guest;
    } catch (err) {
        console.error('Error loading data:', err);
        errorMessage = 'Failed to load data';
    } finally {
        loading = false;
    }
});

function goBackToDashboard() {
    goto(`/${clientSlug}/dashboard`);
}

function editForm() {
    goto(`/${clientSlug}/dashboard/form/${guestData.guest_id}`);
}

function printLabel() {
    if (!guestData) return;
    
    // Open the dedicated print page in a new window
    const printUrl = `/${clientSlug}/dashboard/print/${guestData.guest_id}`;
    window.open(printUrl, '_blank', 'width=600,height=400');
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
</script>

<style lang="postcss">
@reference tailwindcss;
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
            <p class="text-sm sm:text-base">Loading guest details...</p>
        </div>
    </div>
{:else if errorMessage}
    <div class="flex h-screen items-center justify-center px-4">
        <div class="text-center">
            <p class="text-red-600 mb-4 text-sm sm:text-base">{errorMessage}</p>
            <button
                class="bg-blue-500 text-white px-4 py-2 rounded text-sm sm:text-base"
                on:click={goBackToDashboard}
            >
                Back to Dashboard
            </button>
        </div>
    </div>
{:else if guestData}
    <div class="min-h-screen bg-gray-50 mx-4 sm:mx-6 md:mx-8 lg:mx-10 my-6 sm:my-8 md:my-10">
        <!-- Header -->
        <div class="px-2 sm:px-4 md:px-6 py-4">
            <button
                class="flex items-center text-xs sm:text-sm font-semibold text-gray-500 transition duration-300 hover:text-gray-800 hover:scale-101"
                on:click={goBackToDashboard}
            >
                <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                
    VIEW DASHBOARD
                   
            </button>
        </div>

        <div class="px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
            <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 lg:gap-8 mb-6 sm:mb-8">
                <!-- Guest Name -->
                <div class="flex-1">
                    <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-gray-800 font-['Romie_Regular'] break-words">
                        {guestData.full_name}
                    </h1>
                </div>

                <!-- Form Details Card -->
                <div class="bg-white rounded-lg shadow-sm p-4 sm:p-6 w-full lg:w-auto lg:min-w-[320px] xl:min-w-[380px]">
                    <h2 class="text-xs sm:text-sm font-semibold text-gray-500 mb-4 sm:mb-6">
                        FORM DETAILS
                    </h2>
                    
                    <div class="space-y-3 sm:space-y-4">
                        <!-- Checked-In Status -->
                        <div class="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
                            <span class="text-sm sm:text-base lg:text-lg text-black">Checked-In?</span>
                            <span class="text-green-500 font-medium text-sm sm:text-base">
                                {guestData.checked_in ? 'Yes' : 'No'}
                            </span>
                        </div>

                        <!-- Number of guests -->
                        <div class="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
                            <span class="text-sm sm:text-base lg:text-lg text-black">Number of guests</span>
                            <span class="font-['Romie_Regular'] text-sm sm:text-base lg:text-lg text-black">
                                {guestData.actual_guest_count || guestData.guest_count || 1}
                            </span>
                        </div>

                        <!-- Seated On -->
                        <div class="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
                            <span class="text-sm sm:text-base lg:text-lg text-black">Seated On</span>
                            <span class="font-['Romie_Regular'] text-sm sm:text-base lg:text-lg text-black">
                                {guestData.table_assignment || 'Not assigned'}
                            </span>
                        </div>

                        <!-- Gift Type -->
                        <div class="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
                            <span class="text-sm sm:text-base lg:text-lg text-black">Gift Type</span>
                            <span class="font-['Romie_Regular'] text-sm sm:text-base lg:text-lg text-black">
                                {guestData.gift_type || 'Not specified'}
                            </span>
                        </div>

                        <!-- Label -->
                        <div class="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
                            <span class="text-sm sm:text-base lg:text-lg text-black">Label</span>
                            <span class="font-['Romie_Regular'] text-sm sm:text-base lg:text-lg text-black">
                                {guestData.print_label ? 'Printed' : 'Not printed'}
                            </span>
                        </div>

                        <!-- Souvenir Given -->
                        <div class="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
                            <span class="text-sm sm:text-base lg:text-lg text-black">Souvenir Given</span>
                            <span class="font-['Romie_Regular'] text-sm sm:text-base lg:text-lg text-black">
                                {guestData.souvenir_count || 0}
                            </span>
                        </div>

                        <!-- Time of Check-in -->
                        <div class="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
                            <span class="text-sm sm:text-base lg:text-lg text-black">Time of Check-in</span>
                            <span class="font-['Romie_Regular'] text-sm sm:text-base lg:text-lg text-black">
                                {formatTime(guestData.checked_in_at)}
                            </span>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 sm:mt-8">
                        <button
                            class="flex-1 transition-all duration-300 hover:scale-101 bg-[#F5A3B3] hover:bg-[#FF9CAF] text-white py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base"
                            on:click={editForm}
                        >
                            EDIT FORM
                        </button>
                        <button
                            class="flex-1 transition-all duration-300 hover:scale-101 bg-[#F5A3B3] hover:bg-[#FF9CAF] text-white py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base flex items-center justify-center gap-2"
                            on:click={printLabel}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                            </svg>
                            PRINT LABEL
                        </button>
                    </div>
                </div>
            </div>

            {#if errorMessage}
                <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-6">
                    <p class="text-sm sm:text-base">{errorMessage}</p>
                </div>
            {/if}
        </div>
    </div>
{/if}