<script>
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { supabase } from '$lib/supabaseClient';

let guestData = null;
let clientData = null;
let loading = true;
let errorMessage = '';

onMount(async () => {
    const guestId = $page.params.guestId;
    const clientSlug = $page.params.clientSlug;
    
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
        
        // Update print status
        await updatePrintStatus(guestId);
        
        // Auto-print after data loads with custom settings
        setTimeout(() => {
            // Try to set print settings (works in some browsers)
            if (window.print) {
                // Add a message for user guidance
                console.log('Printing label - please select "More settings" and choose appropriate paper size if needed');
                window.print();
            }
        }, 1000);
        
    } catch (err) {
        console.error('Error loading data:', err);
        errorMessage = 'Failed to load data';
    } finally {
        loading = false;
    }
});

async function updatePrintStatus(guestId) {
    try {
        await supabase
            .from('guests')
            .update({ print_label: true })
            .eq('guest_id', guestId);
    } catch (err) {
        console.error('Error updating print status:', err);
    }
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

function generateQRCodeURL(guestId) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(guestId)}`;
}

// Auto-close after printing
if (typeof window !== 'undefined') {
    window.addEventListener('afterprint', () => {
        setTimeout(() => {
            window.close();
        }, 1000);
    });
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

:global(html) {
    font-family: 'DM Sans', sans-serif;
    background-color: white;
    color: #000;
    margin: 0;
    padding: 0;
}

:global(body) {
    font-family: 'DM Sans', sans-serif;
    background: white;
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    margin: 0;
}

/* Romie Regular font face */
@font-face {
    font-family: 'Romie Regular';
    src: url('/fonts/Romie-Regular.woff2') format('woff2'),
         url('/fonts/Romie-Regular.woff') format('woff');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}

.label {
    width: 300px;
    min-height: auto;
    background: white;
    padding: 20px 30px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    text-align: center;
    border: none;
    box-shadow: none;
}

.gift-header {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 20px;
}

.guest-name {
    font-family: 'Romie Regular', serif;
    font-size: 32px;
    font-weight: normal;
    color: #000;
    line-height: 1.1;
    margin-bottom: 18px;
    text-align: center;
}

.qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 15px;
}

.qr-code {
    width: 200px;
    height: 200px;
    margin-bottom: 12px;
    border: none;
}

.gift-type {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: #000;
    letter-spacing: 1px;
    margin-bottom: 20px;
}

.footer-text {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #666;
}

.loading-message {
    text-align: center;
    padding: 40px;
    font-size: 16px;
    color: #666;
    font-family: 'DM Sans', sans-serif;
}

.error-message {
    text-align: center;
    padding: 40px;
    font-size: 16px;
    color: #dc2626;
    font-family: 'DM Sans', sans-serif;
}

@media print {
    @page {
        size: 4in 6in; /* Custom page size for label */
        margin: 0.2in; /* Minimal margins */
    }
    
    :global(html) {
        margin: 0;
        padding: 0;
        height: 100%;
    }
    
    :global(body) {
        padding: 0;
        margin: 0;
        background: white;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .label {
        box-shadow: none;
        border: none;
        page-break-inside: avoid;
        width: 100%;
        max-width: none;
        height: 100%;
        margin: 0;
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    
    .loading-message,
    .error-message {
        display: none;
    }
    
    /* Ensure fonts print correctly */
    .guest-name {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
    }
    
    /* Force smaller page in browser print dialog */
    .label {
        transform-origin: top left;
    }
}
</style>

{#if loading}
    <div class="loading-message">
        Loading guest label...
    </div>
{:else if errorMessage}
    <div class="error-message">
        {errorMessage}
    </div>
{:else if guestData && clientData}
    <div class="label">
        <div class="gift-header">
            Gift QR Code
        </div>
        
        <div class="guest-name">
            {guestData.full_name}
        </div>
        
        <div class="qr-section">
            <img 
                src={guestData.qr_code_url || generateQRCodeURL(guestData.guest_id)} 
                alt="QR Code" 
                class="qr-code" 
            />
        </div>
        
        <div class="gift-type">
            Type of Gift: {guestData.gift_type || 'Not Specified'}
        </div>
        
        <div class="footer-text">
            With Love
        </div>
    </div>
{/if}