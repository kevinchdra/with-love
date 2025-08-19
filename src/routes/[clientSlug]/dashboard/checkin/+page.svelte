<script>
import { onMount, onDestroy } from 'svelte';
import QrScanner from 'qr-scanner';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { supabase } from '$lib/supabaseClient';

let errorMessage = '';
let loading = false;
let qrScanner = null;
let videoElement = null;
let clientData = null;
let clientSlug = '';
let isProcessing = false;

async function onScanSuccess(result) {
	if (loading || isProcessing) return;
	
	console.log("QR Code detected:", result.data);
	isProcessing = true;
	loading = true;

	// Stop the scanner temporarily
	if (qrScanner) {
		qrScanner.stop();
	}

	try {
		const guestId = result.data.trim();
		console.log("Looking up guest with ID:", guestId);

		// Look up guest information from database
		const { data: guest, error } = await supabase
			.from('guests')
			.select(`
				*,
				invites (
					client_name,
					event_title
				)
			`)
			.eq('guest_id', guestId)
			.single();

		if (error) {
			console.error('Database error:', error);
			showErrorAndRestart(`Guest not found: ${error.message}`);
			return;
		}

		if (!guest) {
			showErrorAndRestart('Invalid QR code - guest not found');
			return;
		}

		// Check if guest actually RSVP'd yes
		if (!guest.rsvp_status) {
			showErrorAndRestart(`${guest.full_name} has not confirmed attendance`);
			return;
		}

		// Navigate to form page with guest data
		goto(`/${clientSlug}/dashboard/form/${guest.guest_id}`);
	} catch (err) {
		console.error('Error looking up guest:', err);
		showErrorAndRestart(`Error: ${err.message}`);
	}
}

function showErrorAndRestart(message) {
	errorMessage = message;
	loading = false;
	isProcessing = false;
	
	// Auto-restart after 3 seconds
	setTimeout(() => {
		errorMessage = '';
		startScanner();
	}, 3000);
}

async function startScanner() {
	if (!videoElement || qrScanner) return;

	try {
		qrScanner = new QrScanner(
			videoElement,
			onScanSuccess,
			{
				returnDetailedScanResult: true,
				highlightScanRegion: false,
				highlightCodeOutline: false,
				preferredCamera: 'environment',
				maxScansPerSecond: 5,
			}
		);

		await qrScanner.start();
		isProcessing = false;
		
	} catch (err) {
		console.error('Failed to start QR scanner:', err);
		
		if (err.name === 'NotAllowedError') {
			errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.';
		} else if (err.name === 'NotFoundError') {
			errorMessage = 'No camera found on this device.';
		} else if (err.name === 'NotSupportedError') {
			errorMessage = 'Camera not supported on this device.';
		} else {
			errorMessage = `Camera error: ${err.message || 'Unknown error'}`;
		}
	}
}

async function stopScanner() {
	if (qrScanner) {
		qrScanner.destroy();
		qrScanner = null;
	}
}

async function retryScanner() {
	errorMessage = '';
	await stopScanner();
	// Small delay before restarting
	setTimeout(() => {
		startScanner();
	}, 500);
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
		
		// Start scanner after a short delay to ensure video element is ready
		setTimeout(() => {
			startScanner();
		}, 100);
		
	} catch (err) {
		console.error('Error loading client:', err);
		errorMessage = 'Failed to load client data';
	}
});

onDestroy(() => {
	stopScanner();
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

.scanner-container {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: black;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1;
}

.video-element {
	width: 100vw;
	height: 100vh;
	object-fit: cover;
	background: black;
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
	justify-content: top;
	align-items: center;
	margin-top:4vh;
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
	line-height: 1.5;
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
	border-radius: 4px;
}

.retry-button:hover {
	background: #f3f4f6;
	transform: translateY(-1px);
}

.loading-spinner {
	width: 3rem;
	height: 3rem;
	border: 3px solid rgba(255, 255, 255, 0.3);
	border-top: 3px solid white;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}
</style>

{#if loading}
	<div class="loading-screen">
		<div class="text-center">
			<div class="loading-spinner"></div>
			<p class="text-white text-sm sm:text-base font-medium mt-4">Looking up guest...</p>
		</div>
	</div>
{:else}
	<!-- Camera view -->
	<div class="scanner-container">
		<video 
			bind:this={videoElement}
			class="video-element"
			autoplay
			muted
			playsinline
		></video>
	</div>
	
	<!-- Text overlay -->
	{#if clientData && !errorMessage}
		<div class="overlay">
			<p class="event-title">
				{clientData.event_title || 'Wedding Ceremony'}
				QR CODE CHECK-IN
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
				on:click={retryScanner}
			>
				Try Again
			</button>
		</div>
	{/if}
{/if}