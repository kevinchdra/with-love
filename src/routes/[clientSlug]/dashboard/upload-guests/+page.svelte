<!-- routes/[clientSlug]/dashboard/upload-guests/+page.svelte -->
<script>
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';
import { importGuestsToSupabase, getImportStatistics } from '$lib/guestImporter.js';
import { parseGuestFile, generatePreviewData } from '$lib/guestListParser.js';
import { generateExcelTemplate, generateCSVTemplate, downloadTemplate } from '$lib/guestListTemplateGenerator.js';

// State variables
let clientSlug = '';
let clientData = null;
let currentStep = 'upload'; // 'upload', 'preview'
let isProcessing = false;
let importResult = null;

// Sidebar state
let sidebarCollapsed = false;

// Modal states
let showSuccessModal = false;

// Parsed data from file
let parsedData = null;
let previewData = null;
let selectedFile = null;

// State for collapsible sections
let showErrors = false;
let showWarnings = false;

// FAQ state
let activeFAQ = null;

// FAQ data
const faqs = [
    {
        id: 'formatting',
        question: 'Formatting Issues',
        answer: 'Make sure your spreadsheet follows the correct format: The first row should contain column headers (Name, Phone Number, Expected Guest Numbers). Remove any empty rows or additional headers. Use plain text without special formatting or formulas.'
    },
    {
        id: 'missing-data',
        question: 'Missing or Incorrect Data',
        answer: 'Ensure all required fields are filled: Name is mandatory. Phone numbers should be in international format (+1234567890). Guest count should be a number (minimum 1).'
    },
    {
        id: 'duplicates',
        question: 'Duplicate Entries',
        answer: 'The system automatically detects duplicates based on phone number. Duplicate entries will be marked as warnings and skipped during import. To update existing guests, use the edit function in the guest list instead.'
    },
    {
        id: 'file-size',
        question: 'File Size or Upload Errors',
        answer: 'Maximum file size is 10MB. Supported formats are CSV (.csv) and Excel (.xlsx, .xls). If your file is too large, split it into multiple smaller files. Ensure you have a stable internet connection during upload.'
    }
];

// Download template functions using the proper generators
function downloadCSVTemplate() {
    const blob = generateCSVTemplate();
    downloadTemplate(blob, `${clientData?.event_title || 'Guest'}_List_Template.csv`);
}

function downloadXLSXTemplate() {
    const blob = generateExcelTemplate(clientData?.event_title);
    downloadTemplate(blob, `${clientData?.event_title || 'Guest'}_List_Template.xlsx`);
}

// Trigger file upload and parse directly
function triggerFileUpload() {
    console.log('Triggering file upload...');
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = '.csv,.xlsx,.xls';
    tempInput.style.display = 'none';
    
    tempInput.onchange = async (e) => {
        console.log('File selected:', e.target.files);
        const file = e.target.files[0];
        if (file) {
            console.log('File details:', file.name, file.type, file.size);
            selectedFile = file;
            await processUploadedFile(file);
        } else {
            console.log('No file selected');
        }
        document.body.removeChild(tempInput);
    };
    
    document.body.appendChild(tempInput);
    tempInput.click();
    console.log('File picker opened');
}

// Process the uploaded file directly
async function processUploadedFile(file) {
    console.log('Processing file:', file.name, file.type, file.size);
    isProcessing = true;
    
    try {
        // Parse the file using your parsing logic
        console.log('Starting file parsing...');
        parsedData = await parseGuestFile(file);
        console.log('Parsed data:', parsedData);
        
        if (parsedData && parsedData.guests) {
            previewData = generatePreviewData(parsedData.guests);
            console.log('Preview data:', previewData);
            
            // Force a re-render by waiting a tick
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Show preview immediately
            currentStep = 'preview';
            console.log('Moving to preview step, currentStep is now:', currentStep);
        } else {
            console.error('No guest data found in parsed file');
            currentStep = 'error';
        }
        
    } catch (error) {
        console.error('Error parsing file:', error);
        currentStep = 'error';
    } finally {
        isProcessing = false;
        console.log('Processing complete, isProcessing:', isProcessing);
    }
}

// Process the actual upload to database
async function confirmAndUploadGuests() {
    if (!clientData?.id || !parsedData?.guests || parsedData.guests.length === 0) {
        return;
    }
    
    // Check for errors - if any errors exist, don't allow import
    if (parsedData?.errors && parsedData.errors.length > 0) {
        alert('Please fix all errors before importing guests.');
        return;
    }
    
    isProcessing = true;
    
    try {
        // Use the import function
        const result = await importGuestsToSupabase(
            parsedData.guests, 
            clientData.id, 
            (progress) => {
                console.log(`Import progress: ${progress}%`);
            }
        );

        importResult = result;

        if (result.success) {
            showSuccessModal = true;
        } else {
            console.error('Import failed:', result.errors);
            alert('Import failed: ' + (result.errors?.join(', ') || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Import failed: ' + error.message);
    } finally {
        isProcessing = false;
    }
}

function resetUpload() {
    currentStep = 'upload';
    selectedFile = null;
    parsedData = null;
    previewData = null;
    importResult = null;
    showSuccessModal = false;
}

function closeSuccessModal() {
    showSuccessModal = false;
}

function confirmSuccess() {
    closeSuccessModal();
    goto(`/${clientSlug}/dashboard`);
}

async function loadClientData() {
    try {
        const { data: invite, error } = await supabase
            .from('invites')
            .select('*')
            .eq('slug', clientSlug)
            .single();
            
        if (!error && invite) {
            clientData = invite;
        }
    } catch (err) {
        console.error('Error loading client data:', err);
    }
}

onMount(async () => {
    clientSlug = $page.params.clientSlug;
    await loadClientData();
});
</script>

<style>
/* Import DM Sans font */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Global styles */
:global(html) {
    font-family: 'DM Sans', sans-serif;
}

:global(body) {
    margin: 0;
    padding: 0;
    background: #ffffff;
}

/* Layout */
.dashboard-container {
    display: flex;
    min-height: 100vh;
}

/* Sidebar */
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

.sidebar.collapsed .sidebar-header {
    margin: 8px;
}

.client-info {
    overflow: hidden;
    transition: opacity 300ms ease-in;
}

.sidebar.collapsed .client-info {
    opacity: 0;
    width: 0px;
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

.client-name {
    font-size: 18px;
    font-weight: 800;
    color: #000;
}

.event-date {
    font-size: 12px;
    color: #737373;
}

.nav-menu {
    flex: 1;
    padding: 12px 0;
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

/* Client Avatar */
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

.sidebar.collapsed .client-name {
    width: 0;
    opacity: 0;
    transition: opacity 600ms ease-in;
}

.sidebar.collapsed .client-sub {
    width: 0;
    opacity: 0;
    transition: opacity 600ms ease-in;
}

.sidebar.collapsed .client-profile {
    margin: 16px;
}

/* Main content */
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

/* Breadcrumb */
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

/* Content */
.content {
    padding: 40px 60px;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
}

.page-title {
    font-family: 'Romie Regular', serif;
    font-size: 40px;
    line-height: 52px;
    letter-spacing: 0.03em;
    font-weight: 400;
    color: #000;
    margin-bottom: 40px;
}

/* Upload Section */
.upload-section {
    background: white;
    border-radius: 12px;
    padding: 32px;
    margin-bottom: 40px;
    border: 0.5px solid #d4d4d4;
}

.step-container {
    margin-bottom: 40px;
}

.step {
    display: flex;
    align-items: flex-start;
    margin-bottom: 32px;
}

.step-number {
    width: 32px;
    height: 32px;
    background: #000;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    margin-right: 20px;
    flex-shrink: 0;
}

.step-content {
    flex: 1;
}

.step-title {
    font-size: 18px;
    font-weight: 600;
    color: #000;
    margin-bottom: 8px;
}

.step-description {
    font-size: 14px;
    color: #737373;
    margin-bottom: 16px;
}

.button-group {
    display: flex;
    gap: 12px;
}

.btn {
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 300ms ease-in 100ms;
    border: 0.5px solid #d4d4d4;
    background: white;
    color: #000;
    font-family: 'DM Sans', sans-serif;
}

.btn:hover {
    background: #f5f5f5;
    transform: scale(1.03);
}

.btn-primary {
    background: #000;
    color: white;
    border-color: #000;
    border-radius: 999px;
}

.btn-primary:hover {
    background: #262626;
}

.upload-area {
    border: 2px dashed #d4d4d4;
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    transition: all 300ms ease-in;
    cursor: pointer;
}

.upload-area:hover {
    border-color: #737373;
    background: #f8f8f8;
}

.upload-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
}

/* FAQ Section */
.faq-section {
    background: white;
    border-radius: 12px;
    padding: 32px;
    border: 0.5px solid #d4d4d4;
}

.faq-title {
    font-size: 28px;
    font-weight: 400;
    color: #000;
    margin-bottom: 24px;
}

.faq-item {
    border-top: 0.5px solid #e5e5e5;
    padding: 20px 0;
}

.faq-question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    color: #000;
    transition: color 300ms ease-in;
}

.faq-question:hover {
    color: #525252;
}

.faq-icon {
    font-size: 24px;
    transition: transform 300ms ease-in;
}

.faq-icon.active {
    transform: rotate(45deg);
}

.faq-answer {
    margin-top: 16px;
    font-size: 14px;
    line-height: 20px;
    color: #737373;
}

.contact-btn {
    margin-top: 32px;
    display: inline-block;
}

/* Success and Error Messages */
.success-message {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 32px;
    text-align: center;
}

.error-message {
    background: #fef2f2;
    border: 1px solid #ef4444;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 32px;
    text-align: center;
}

/* Modal Styles */
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
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal {
    background: white;
    border-radius: 12px;
    max-width: 90%;
    width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from { 
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }
    to { 
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 8px;
    transition: background 300ms ease-in;
    background: none;
    border: none;
    color: #6b7280;
}

.modal-close:hover {
    background: #f5f5f5;
    color: #374151;
}

.modal-body {
    padding: 0;
}

.success-content {
    text-align: center;
    padding: 48px 32px;
}

.success-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    background: #10b98120;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    color: #10b981;
}

.error-icon {
    background: #ef444420;
    color: #ef4444;
}

.success-title {
    font-size: 24px;
    font-weight: 600;
    color: #000;
    margin-bottom: 16px;
}

.success-message {
    font-size: 16px;
    color: #6b7280;
    margin-bottom: 32px;
    line-height: 1.5;
}

.action-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
}

/* Responsive */
@media (max-width: 1024px) {
    .content {
        padding: 20px 40px;
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
    
    .content {
        padding: 20px;
    }
    
    .page-title {
        font-size: 28px;
        line-height: 36px;
    }
}
</style>

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
            <a href="/{clientSlug}/dashboard" class="nav-item">
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
            <a href="/{clientSlug}/dashboard/upload-guests" class="nav-item active">
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
                <a href="#" class="nav-item">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span class="nav-label">Settings</span>
                </a>
                <div class="client-profile mx-6 my-6">
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
        <!-- Breadcrumb -->
        <div class="breadcrumb">
            <div class="breadcrumb-path">Dashboard / Upload Guest List</div>
        </div>

        <!-- Content -->
        <div class="content">
            {#if isProcessing}
                <!-- Loading State -->
                <div style="text-align: center; padding: 60px;">
                    <div style="margin-bottom: 20px;">
                        <div style="width: 40px; height: 40px; border: 4px solid #f3f4f6; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                    </div>
                    <p>Processing your file...</p>
                </div>
            {:else if currentStep === 'upload'}
                <!-- Upload Section -->
                <section class="upload-section">
                    <h1 class="page-title">How to import your guest list</h1>
                    
                    <div class="step-container">
                        <!-- Step 1: Download Template -->
                        <div class="step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h3 class="step-title">Download template</h3>
                                <p class="step-description">
                                    Download our template with the correct format: Name, Phone Number, Expected Guest Numbers
                                </p>
                                <div class="button-group">
                                    <button class="btn" on:click={downloadCSVTemplate}>📄 CSV Template</button>
                                    <button class="btn" on:click={downloadXLSXTemplate}>📊 Excel Template</button>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Fill in the data -->
                        <div class="step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h3 class="step-title">Fill in the data</h3>
                                <p class="step-description">
                                    We require your guest's name, phone number and guest count to begin. Phone numbers can be in any format - we'll clean them up automatically!
                                </p>
                            </div>
                        </div>

                        <!-- Step 3: Upload the file -->
                        <div class="step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h3 class="step-title">Upload the file</h3>
                                <p class="step-description">
                                    Upload the file here, preview your data, and confirm the import to add guests to your dashboard
                                </p>
                                
                                <div class="upload-area" on:click={triggerFileUpload}>
                                    <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                    </svg>
                                    <p style="margin-bottom: 8px;">Click here to upload your file</p>
                                    <p style="font-size: 12px; color: #737373;">Supports .xlsx, .xls, and .csv files</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- FAQ Section -->
                <section class="faq-section">
                    <h2 class="faq-title">Trouble Uploading?</h2>
                    
                    {#each faqs as faq}
                        <div class="faq-item">
                            <div 
                                class="faq-question" 
                                on:click={() => activeFAQ = activeFAQ === faq.id ? null : faq.id}
                            >
                                <span>{faq.question}</span>
                                <span class="faq-icon" class:active={activeFAQ === faq.id}>+</span>
                            </div>
                            {#if activeFAQ === faq.id}
                                <div class="faq-answer">
                                    {faq.answer}
                                </div>
                            {/if}
                        </div>
                    {/each}
                    
                    <button class="btn contact-btn">Contact Us</button>
                </section>

            {:else if currentStep === 'preview'}
                <!-- Preview Section -->
                <section class="upload-section">
                    <h1 class="page-title">Preview Guest List</h1>
                    
                    <!-- File Info -->
                    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                        <p><strong>File:</strong> {selectedFile?.name || 'guest_list.csv'}</p>
                        <p><strong>Size:</strong> {selectedFile ? Math.round(selectedFile.size / 1024) + ' KB' : '0 KB'}</p>
                    </div>

                    <!-- Statistics -->
                    {#if previewData?.summary}
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 32px; font-weight: bold; color: #0066cc;">{previewData.summary.totalGuests}</div>
                                <div style="color: #0066cc;">Total Guests</div>
                            </div>
                            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 32px; font-weight: bold; color: #00aa00;">{previewData.summary.totalGuestCount}</div>
                                <div style="color: #00aa00;">Total Attendance</div>
                            </div>
                            <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">{previewData.summary.withPhone}</div>
                                <div style="color: #8b5cf6;">With Phone</div>
                            </div>
                        </div>
                    {/if}

                    <!-- Errors and Warnings with Dropdown -->
                    {#if parsedData?.errors && parsedData.errors.length > 0}
                        <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
                            <button 
                                class="w-full flex justify-between items-center p-4 text-left hover:bg-red-50 transition-colors"
                                style="background: none; border: none; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 16px; cursor: pointer;"
                                on:click={() => showErrors = !showErrors}
                            >
                                <h4 style="color: #dc2626; margin: 0; font-weight: 600;">⚠️ Errors ({parsedData.errors.length})</h4>
                                <span style="color: #dc2626; font-size: 18px; transform: {showErrors ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s;">▼</span>
                            </button>
                            {#if showErrors}
                                <div style="padding: 0 16px 16px 16px; border-top: 1px solid #fecaca;">
                                    {#each parsedData.errors as error}
                                        <p style="color: #dc2626; font-size: 14px; margin: 8px 0;">• {error}</p>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}

                    {#if parsedData?.warnings && parsedData.warnings.length > 0}
                        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
                            <button 
                                style="background: none; border: none; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 16px; cursor: pointer;"
                                on:click={() => showWarnings = !showWarnings}
                            >
                                <h4 style="color: #d97706; margin: 0; font-weight: 600;">⚠️ Warnings ({parsedData.warnings.length})</h4>
                                <span style="color: #d97706; font-size: 18px; transform: {showWarnings ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s;">▼</span>
                            </button>
                            {#if showWarnings}
                                <div style="padding: 0 16px 16px 16px; border-top: 1px solid #fcd34d;">
                                    {#each parsedData.warnings as warning}
                                        <p style="color: #d97706; font-size: 14px; margin: 8px 0;">• {warning}</p>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <!-- Preview Table -->
                    {#if previewData?.preview && previewData.preview.length > 0}
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 32px;">
                            <h4 style="padding: 16px; margin: 0; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                                Guest List Preview {#if previewData.hasMore}(showing first 10 of {parsedData.guests.length}){/if}
                            </h4>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #f9fafb;">
                                        <tr>
                                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Name</th>
                                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Phone</th>
                                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Guest Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each previewData.preview as guest, index}
                                            <tr style="border-top: 1px solid #e5e7eb;">
                                                <td style="padding: 12px; color: #111827;">{guest.full_name || '-'}</td>
                                                <td style="padding: 12px; color: #6b7280;">{guest.phone || '-'}</td>
                                                <td style="padding: 12px; color: #6b7280;">{guest.guest_count || 1}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    {/if}

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 16px; justify-content: center;">
                        <button class="btn" on:click={resetUpload} disabled={isProcessing}>
                            Upload Different File
                        </button>
                        <button 
                            class="btn btn-primary" 
                            on:click={confirmAndUploadGuests}
                            disabled={isProcessing || (parsedData?.errors && parsedData.errors.length > 0)}
                            style="opacity: {(parsedData?.errors && parsedData.errors.length > 0) ? '0.5' : '1'};"
                        >
                            {#if isProcessing}
                                <span style="display: inline-flex; align-items: center; gap: 8px;">
                                    <div style="width: 16px; height: 16px; border: 2px solid #ffffff40; border-top: 2px solid #ffffff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                    Importing...
                                </span>
                            {:else if parsedData?.errors && parsedData.errors.length > 0}
                                Fix Errors to Import
                            {:else}
                                Confirm Import ({parsedData?.guests?.length || 0} Guests)
                            {/if}
                        </button>
                    </div>
                </section>

            {:else if currentStep === 'success'}
                <!-- Success Message -->
                <div class="success-message">
                    <h2 style="color: #0ea5e9; margin-bottom: 16px;">🎉 Success!</h2>
                    <p style="color: #0369a1; margin-bottom: 24px;">
                        Your guest list has been imported successfully!
                        {#if importResult}
                            {importResult.imported} guests were added to your event.
                        {/if}
                    </p>
                    <div class="button-group" style="justify-content: center;">
                        <button class="btn" on:click={resetUpload}>Upload More Guests</button>
                        <button class="btn btn-primary" on:click={confirmSuccess}>Go to Dashboard</button>
                    </div>
                </div>

            {:else if currentStep === 'error'}
                <!-- Error Message -->
                <div class="error-message">
                    <h2 style="color: #ef4444; margin-bottom: 16px;">❌ Upload Failed</h2>
                    <p style="color: #dc2626; margin-bottom: 24px;">
                        There was an issue importing your guest list. Please check the file format and try again.
                    </p>
                    <div class="button-group" style="justify-content: center;">
                        <button class="btn btn-primary" on:click={resetUpload}>Try Again</button>
                    </div>
                </div>
            {/if}
        </div>
    </main>
</div>

<!-- Success Modal - Only show on successful import -->
{#if showSuccessModal}
    <div class="modal-overlay">
        <div class="modal">
            <div class="modal-body">
                <div class="success-content">
                    <div class="success-icon">✓</div>
                    <h2 class="success-title">Guest List Imported Successfully!</h2>
                    <p class="success-message">
                        {#if importResult}
                            A total of {importResult.imported} guests have been imported to your dashboard.
                            {#if importResult.duplicates?.length > 0}
                                <br>{importResult.duplicates.length} duplicates were skipped.
                            {/if}
                        {:else}
                            Your guests have been successfully added to the event.
                        {/if}
                    </p>
                    <div class="action-buttons">
                        <button class="btn" on:click={closeSuccessModal}>Upload More</button>
                        <button class="btn btn-primary" on:click={confirmSuccess}>Go to Dashboard</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}