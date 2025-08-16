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
				{ 
					facingMode: "environment",
					// Request higher resolution from camera
					width: { ideal: 1920, min: 1280 },
					height: { ideal: 1080, min: 720 }
				},
				{
					fps: 10,
					qrbox: function(viewfinderWidth, viewfinderHeight) {
						// Large detection area for better scanning
						const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
						return { width: size, height: size };
					},
					aspectRatio: 1.7778
				},
				onScanSuccess,
				onScanFailure
			);

			// Force resize after initialization but preserve detection
			setTimeout(() => {
				forceVideoFullscreen();
			}, 100);
			
		} else {
			errorMessage = "No camera found";
		}
	} catch (err) {
		errorMessage = "Camera access error: " + err;
		console.error('Scanner start error:', err);
	}
}

// Function to gently force fullscreen without breaking detection
function forceVideoFullscreen() {
	const videos = document.querySelectorAll('#reader video');
	const containers = document.querySelectorAll('#reader > div');
	
	videos.forEach(video => {
		if (video) {
			video.style.setProperty('width', '100vw', 'important');
			video.style.setProperty('height', '100vh', 'important');
			video.style.setProperty('object-fit', 'cover', 'important');
			video.style.setProperty('position', 'fixed', 'important');
			video.style.setProperty('top', '0', 'important');
			video.style.setProperty('left', '0', 'important');
		}
	});
	
	containers.forEach(container => {
		if (container) {
			container.style.setProperty('width', '100vw', 'important');
			container.style.setProperty('height', '100vh', 'important');
			container.style.setProperty('position', 'fixed', 'important');
			container.style.setProperty('top', '0', 'important');
			container.style.setProperty('left', '0', 'important');
		}
	});
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
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

:global(html, body) {
	font-family: 'DM Sans', sans-serif;
	margin: 0;
	padding: 0;
	height: 100%;
	overflow: hidden;
}

/* Targeted fullscreen camera fix for html5-qrcode */
#reader, 
#reader video {
	position: fixed !important;
	top: 0 !important;
	left: 0 !important;
	width: 100vw !important;
	height: 100vh !important;
	object-fit: cover !important;
	background: black !important;
}

/* Kill the library's inner containers */
#reader > div,
#reader > div > div {
	position: fixed !important;
	top: 0 !important;
	left: 0 !important;
	width: 100vw !important;
	height: 100vh !important;
	max-width: none !important;
	max-height: none !important;
	overflow: hidden !important;
}

/* Hide scanning region overlays */
#reader__scan_region,
#reader__dashboard_section {
	display: none !important;
}

/* Text overlay styles */
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	z-index: 10;
	pointer-events: none;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.client-name {
	font-family: 'DM Sans', sans-serif;
	font-size: clamp(1.5rem, 5vw, 2.5rem);
	font-weight: 500;
	letter-spacing: 0.2em;
	color: white;
	text-align: center;
	text-transform: uppercase;
	margin-bottom: 0.5rem;
	text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

.event-title {
	font-family: 'DM Sans', sans-serif;
	font-size: clamp(0.8rem, 2.5vw, 1rem);
	font-weight: 400;
	letter-spacing: 0.3em;
	color: white;
	text-align: center;
	text-transform: uppercase;
	text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

/* Loading and error states */
.loading-screen {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: black;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 20;
}

.error-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.9);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	z-index: 15;
	padding: 2rem;
}

.error-message {
	color: #ef4444;
	text-align: center;
	margin-bottom: 2rem;
	font-size: clamp(0.875rem, 3vw, 1.125rem);
	max-width: 400px;
}

.retry-button {
	background: white;
	color: black;
	border: none;
	padding: 1rem 2rem;
	font-family: 'DM Sans', sans-serif;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.1em;
	cursor: pointer;
	transition: all 0.2s ease;
	pointer-events: auto;
}

.retry-button:hover {
	background: #f3f4f6;
	transform: translateY(-1px);
}

/* Remove QR borders as requested */
</style>

{#if loading}
	<div class="loading-screen">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
			<p class="text-white text-sm sm:text-base font-medium">Looking up guest...</p>
		</div>
	</div>
{:else}
	<!-- Fullscreen camera view -->
	<div id="reader"></div>
	
	<!-- Text overlay -->
	{#if clientData && !errorMessage}
		<div class="overlay">
			<h1 class="client-name">
				{clientData.client_name}
			</h1>
			<p class="event-title">
				{clientData.event_title || 'Wedding Ceremony'}
			</p>
		</div>
	{/if}

	<!-- Error overlay -->
	{#if errorMessage}
		<div class="error-overlay">
			<div class="error-message">
				<p>{errorMessage}</p>
			</div>
			<button
				class="retry-button"
				on:click={() => {
					errorMessage = '';
					startScanner();
				}}
			>
				Try Again
			</button>
		</div>
	{/if}
{/if}