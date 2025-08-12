<script>
import { onMount } from 'svelte';
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { supabase } from '$lib/supabaseClient';

let errorMessage = '';
let loading = false;
let html5QrCode = null;
let clientData = null;
let clientSlug = '';

async function onScanSuccess(decodedText) {
	if (loading) return;
	console.log("QR Code detected:", decodedText);
	loading = true;

	// Stop the scanner immediately after successful scan
	if (html5QrCode) {
		try {
			await html5QrCode.stop();
		} catch (err) {
			console.error('Error stopping scanner:', err);
		}
	}

	try {
		const guestId = decodedText.trim();
		console.log("Looking up guest with ID:", guestId);

		// Look up guest information from database
		const { data: guest, error } = await supabase
			.from('guests')
			.select(`
				*,
				invites (
					client_name,
					event_title,
					event_date,
					location
				)
			`)
			.eq('guest_id', guestId)
			.single();

		if (error) {
			console.error('Database error:', error);
			errorMessage = `Guest not found: ${error.message}`;
			loading = false;
			startScanner();
			return;
		}

		if (!guest) {
			errorMessage = 'Invalid QR code - guest not found';
			loading = false;
			startScanner();
			return;
		}

		// Check if guest actually RSVP'd yes
		if (!guest.rsvp_status) {
			errorMessage = `${guest.full_name} has not confirmed attendance`;
			loading = false;
			startScanner();
			return;
		}

		// Navigate to form page with guest data
		goto(`/${clientSlug}/dashboard/form/${guest.guest_id}`);
	} catch (err) {
		console.error('Error looking up guest:', err);
		errorMessage = `Error: ${err.message}`;
		loading = false;
		startScanner();
	}
}

function onScanFailure(error) {
	// Optional: console.warn(`QR scan failed: ${error}`);
}

async function startScanner() {
	const qrRegionId = "reader";
	if (!html5QrCode) {
		html5QrCode = new Html5Qrcode(qrRegionId);
	}

	try {
		const state = html5QrCode.getState();
		if (state === 2) return; // Already scanning
	} catch (err) {
		// Scanner not running
	}

	try {
		const cameras = await Html5Qrcode.getCameras();
		if (cameras && cameras.length) {
			await html5QrCode.start(
				{ facingMode: "environment" },
				{
					fps: 10,
					qrbox: { width: 250, height: 250 },
					aspectRatio: 1.0,
					supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
				},
				onScanSuccess,
				onScanFailure
			);
		} else {
			errorMessage = "No camera found";
		}
	} catch (err) {
		errorMessage = "Camera access error: " + err;
		console.error('Scanner start error:', err);
	}
}

async function stopScanner() {
	if (html5QrCode) {
		try {
			const state = html5QrCode.getState();
			if (state === 2) {
				await html5QrCode.stop();
			}
		} catch (err) {
			try {
				await html5QrCode.stop();
			} catch (stopErr) {
				console.error('Error stopping scanner:', stopErr);
			}
		}
	}
}

onMount(async () => {
	// Get client slug from URL parameters
	clientSlug = $page.params.clientSlug;
	
	// Fetch client data from invites table
	try {
		const { data: invite, error } = await supabase
			.from('invites')
			.select('*')
			.eq('slug', clientSlug)
			.single();

		if (error || !invite) {
			errorMessage = 'Client not found';
			return;
		}

		clientData = invite;
	} catch (err) {
		console.error('Error loading client:', err);
		errorMessage = 'Failed to load client data';
		return;
	}

	startScanner();
	return () => {
		stopScanner();
	};
});
</script>

<style>
.pink-bg {
	background: linear-gradient(to bottom, #f9c2cf, #dd748a);
}

#reader {
	position: relative;
	overflow: hidden;
}

#reader video {
	object-fit: cover !important;
	width: 100% !important;
	height: 100% !important;
	position: absolute !important;
	top: 0 !important;
	left: 0 !important;
}

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

:global(html) {
	font-family: 'DM Sans', sans-serif;
	background-color: #FAFAF8;
	color: #000;
}

#reader canvas {
	position: absolute !important;
	top: 0 !important;
	left: 0 !important;
	width: 100% !important;
	height: 100% !important;
}

#reader > div {
	width: 100% !important;
	height: 100% !important;
}

/* Responsive adjustments for smaller screens */
@media (max-width: 768px) {
	#reader {
		width: 100% !important;
		height: 100% !important;
	}
}
</style>

{#if loading}
	<div class="flex h-screen items-center justify-center px-4">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
			<p class="text-sm sm:text-base">Looking up guest...</p>
		</div>
	</div>
{:else}
	<div class="flex flex-col md:flex-row h-screen bg-black">
		<!-- Left side - Title -->
		<div class="w-full md:w-1/2 pink-bg flex items-center justify-center py-8 md:py-0">
			<h1 class="text-white text-2xl sm:text-3xl md:text-4xl font-light text-center">
				{clientData ? clientData.client_name : 'Loading...'}
			</h1>
		</div>
		
		<!-- Right side - QR Scanner -->
		<div class="w-full md:w-1/2 flex flex-col items-center justify-center space-y-4 p-4 md:p-8">
			<p class="text-xs sm:text-sm text-white uppercase tracking-wider">SCAN QR</p>
			
			{#if errorMessage}
				<div class="text-center max-w-sm mx-auto">
					<p class="text-red-500 mb-4 text-sm sm:text-base px-2">{errorMessage}</p>
					<button
						class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors text-sm sm:text-base"
						on:click={() => {
							errorMessage = '';
							startScanner();
						}}
					>
						Try Again
					</button>
				</div>
			{:else}
				<!-- QR Code Scanner -->
				<div class="relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto">
					<div 
						id="reader" 
						class="w-full aspect-square max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[500px] xl:max-w-[600px] mx-auto rounded-lg overflow-hidden"
					></div>
				</div>
				
				<!-- Instructions for mobile users -->
				<div class="text-center text-gray-300 text-xs sm:text-sm max-w-sm mx-auto px-4 md:hidden">
					<p>Position the QR code within the square frame</p>
				</div>
			{/if}
		</div>
	</div>
{/if}