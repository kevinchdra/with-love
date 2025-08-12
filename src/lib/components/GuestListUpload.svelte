<!-- components/GuestListUpload.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { parseGuestFile, generatePreviewData } from '$lib/guestListParser.js';
  import { 
    generateExcelTemplate, 
    generateCSVTemplate, 
    generateGoogleSheetsTemplate, 
    downloadTemplate 
  } from '$lib/guestListTemplateGenerator.js';

  // Props
  export let inviteId = null;
  export let eventTitle = 'Your Event';
  export let isLoading = false;
  
  // State
  let dragActive = false;
  let files = [];
  let parsedData = null;
  let previewData = null;
  let uploadProgress = 0;
  let currentStep = 'upload'; // 'upload', 'preview', 'importing'
  
  const dispatch = createEventDispatcher();

  // Handle file drop
  function handleDrop(event) {
    event.preventDefault();
    dragActive = false;
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    processFiles(droppedFiles);
  }

  // Handle file input change
  function handleFileInput(event) {
    const selectedFiles = Array.from(event.target.files);
    processFiles(selectedFiles);
  }

  // Process uploaded files
  async function processFiles(fileList) {
    if (fileList.length === 0) return;
    
    const file = fileList[0]; // Only process first file
    
    // Validate file type
    const allowedExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      alert('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    files = [file];
    currentStep = 'preview';
    isLoading = true;

    try {
      parsedData = await parseGuestFile(file);
      previewData = generatePreviewData(parsedData.guests);
      
      if (parsedData.errors.length > 0) {
        console.warn('Parsing errors:', parsedData.errors);
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file: ' + error.message);
      resetUpload();
    } finally {
      isLoading = false;
    }
  }

  // Download template functions
  function downloadExcelTemplate() {
    const blob = generateExcelTemplate(eventTitle);
    downloadTemplate(blob, `${eventTitle}_guest_list_template.xlsx`);
  }

  function downloadCSVTemplate() {
    const blob = generateCSVTemplate();
    downloadTemplate(blob, `${eventTitle}_guest_list_template.csv`);
  }

  function openGoogleSheetsTemplate() {
    const url = generateGoogleSheetsTemplate(eventTitle);
    window.open(url, '_blank');
  }

  // Import guests to database
  async function importGuests() {
    if (!parsedData?.guests?.length || !inviteId) {
      alert('No guests to import or missing invite ID');
      return;
    }

    currentStep = 'importing';
    isLoading = true;
    uploadProgress = 0;

    try {
      // Prepare guest data for database
      const guestsToImport = parsedData.guests.map(guest => ({
        invite_id: inviteId,
        full_name: guest.full_name,
        phone: guest.phone || null,
        email: guest.email || null,
        guest_count: guest.guest_count || 1,
        rsvp_status: guest.rsvp_status || 'pending',
        dietary_restriction: guest.dietary_restriction || null,
        slug: generateSlug(guest.full_name),
        submitted_at: null,
        created_at: new Date().toISOString(),
        checked_in: false,
        checked_in_at: null
      }));

      // Dispatch event to parent component to handle the actual database insertion
      dispatch('import-guests', {
        guests: guestsToImport,
        summary: previewData.summary
      });

    } catch (error) {
      console.error('Error importing guests:', error);
      alert('Error importing guests: ' + error.message);
      isLoading = false;
    }
  }

  // Generate URL-friendly slug from name
  function generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Reset upload state
  function resetUpload() {
    files = [];
    parsedData = null;
    previewData = null;
    currentStep = 'upload';
    uploadProgress = 0;
    
    // Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  }

  // Handle successful import
  export function handleImportSuccess() {
    isLoading = false;
    currentStep = 'upload';
    resetUpload();
  }

  // Handle import error
  export function handleImportError(error) {
    isLoading = false;
    currentStep = 'preview';
    alert('Import failed: ' + error);
  }

  $: canImport = parsedData?.guests?.length > 0 && inviteId && !isLoading;
</script>

<div class="guest-upload-container bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
  <div class="mb-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-2">Upload Guest List</h2>
    <p class="text-gray-600">Import your guest list from Excel or CSV files</p>
  </div>

  <!-- Step Indicator -->
  <div class="flex items-center mb-8">
    <div class="flex items-center">
      <div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep === 'upload' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'} text-sm font-medium">
        {#if currentStep === 'upload'}1{:else}✓{/if}
      </div>
      <span class="ml-2 text-sm font-medium {currentStep === 'upload' ? 'text-blue-600' : 'text-green-600'}">Upload File</span>
    </div>
    <div class="w-12 h-px bg-gray-300 mx-4"></div>
    <div class="flex items-center">
      <div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep === 'preview' ? 'bg-blue-500 text-white' : currentStep === 'importing' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'} text-sm font-medium">
        {#if currentStep === 'preview'}2{:else if currentStep === 'importing'}✓{:else}2{/if}
      </div>
      <span class="ml-2 text-sm font-medium {currentStep === 'preview' || currentStep === 'importing' ? 'text-blue-600' : 'text-gray-500'}">Preview & Import</span>
    </div>
  </div>

  {#if currentStep === 'upload'}
    <!-- Template Download Section -->
    <div class="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 class="text-lg font-semibold text-blue-900 mb-3">📋 Download Guest List Template</h3>
      <p class="text-blue-800 mb-4">Use our template with the exact format: <strong>Name</strong>, <strong>Phone Number</strong>, and <strong>Expected Guest Numbers</strong>.</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button 
          on:click={downloadExcelTemplate}
          class="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 12a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 7a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V7z"/>
          </svg>
          📥 Download Excel Template
        </button>
        
        <button 
          on:click={downloadCSVTemplate}
          class="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z"/>
          </svg>
          📄 Download CSV Template
        </button>
      </div>
      
      <div class="mt-3 text-sm text-blue-700">
        <p><strong>📱 Phone Format Examples:</strong> +6285692706559, 0856-9270-6559, 0856 9270 6559 (we'll auto-format these!)</p>
        <p><strong>👥 Guest Numbers:</strong> Just enter a number like 1, 2, 3, etc.</p>
      </div>
    </div>

    <!-- Upload Area -->
    <div 
      class="upload-area border-2 border-dashed {dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg p-8 text-center transition-colors"
      on:dragover|preventDefault={() => dragActive = true}
      on:dragleave|preventDefault={() => dragActive = false}
      on:drop|preventDefault={handleDrop}
    >
      <div class="space-y-4">
        <div class="mx-auto w-16 h-16 {dragActive ? 'text-blue-500' : 'text-gray-400'}">
          <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        
        <div>
          <p class="text-lg font-medium {dragActive ? 'text-blue-900' : 'text-gray-900'}">
            {dragActive ? 'Drop your file here' : 'Drag and drop your guest list file'}
          </p>
          <p class="text-gray-500 mt-1">or</p>
        </div>

        <label for="file-input" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          Browse Files
        </label>
        <input 
          id="file-input"
          type="file" 
          accept=".xlsx,.xls,.csv" 
          on:change={handleFileInput}
          class="hidden"
        >

        <p class="text-sm text-gray-500">
          Supports Excel (.xlsx, .xls) and CSV (.csv) files
        </p>
      </div>
    </div>

  {:else if currentStep === 'preview'}
    <!-- Preview Section -->
    <div class="space-y-6">
      <!-- File Info -->
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <svg class="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{files[0]?.name}</p>
            <p class="text-sm text-gray-500">{Math.round(files[0]?.size / 1024)} KB</p>
          </div>
        </div>
        <button 
          on:click={resetUpload}
          class="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Remove
        </button>
      </div>

      <!-- Errors and Warnings -->
      {#if parsedData?.errors?.length > 0}
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 class="text-red-800 font-medium mb-2">⚠️ Errors Found:</h4>
          <ul class="text-sm text-red-700 space-y-1">
            {#each parsedData.errors as error}
              <li>• {error}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if parsedData?.warnings?.length > 0}
        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 class="text-yellow-800 font-medium mb-2">⚠️ Warnings:</h4>
          <ul class="text-sm text-yellow-700 space-y-1">
            {#each parsedData.warnings as warning}
              <li>• {warning}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Summary Stats -->
      {#if previewData?.summary}
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-600">{previewData.summary.totalGuests}</div>
            <div class="text-sm text-blue-800">Total Guests</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-600">{previewData.summary.totalGuestCount}</div>
            <div class="text-sm text-green-800">Total Attendance</div>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-purple-600">{previewData.summary.withPhone}</div>
            <div class="text-sm text-purple-800">With Phone</div>
          </div>
        </div>
      {/if}

      <!-- Preview Table -->
      {#if previewData?.preview?.length > 0}
        <div class="bg-white border rounded-lg overflow-hidden">
          <div class="px-4 py-3 bg-gray-50 border-b">
            <h4 class="text-lg font-medium text-gray-900">
              Guest List Preview 
              {#if previewData.hasMore}
                <span class="text-sm text-gray-500">(showing first 10 of {parsedData.guests.length})</span>
              {/if}
            </h4>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Count</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each previewData.preview as guest, index}
                  <tr class="{index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {guest.full_name || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.phone || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.guest_count || 1}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex justify-between items-center pt-6">
        <button 
          on:click={resetUpload}
          class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          disabled={isLoading}
        >
          Upload Different File
        </button>
        
        <button 
          on:click={importGuests}
          class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={!canImport}
        >
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          {:else}
            Import {parsedData?.guests?.length || 0} Guests
          {/if}
        </button>
      </div>
    </div>

  {:else if currentStep === 'importing'}
    <!-- Importing State -->
    <div class="text-center py-12">
      <div class="animate-spin mx-auto h-12 w-12 text-blue-500 mb-4">
        <svg fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Importing Guests...</h3>
      <p class="text-gray-500">Please wait while we add your guests to the database.</p>
      
      {#if uploadProgress > 0}
        <div class="mt-4 max-w-xs mx-auto">
          <div class="bg-gray-200 rounded-full h-2">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: {uploadProgress}%"></div>
          </div>
          <p class="text-sm text-gray-500 mt-2">{uploadProgress}% complete</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .upload-area {
    transition: all 0.3s ease;
  }
  
  .upload-area:hover {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }
</style>