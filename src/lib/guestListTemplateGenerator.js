// lib/guestListTemplateGenerator.js
import * as XLSX from 'xlsx';

/**
 * Generate downloadable Excel template for guest list (3 columns only)
 * @param {string} eventTitle - Title of the event
 * @returns {Blob} Excel file blob
 */
export function generateExcelTemplate(eventTitle = 'Your Event') {
  const templateData = [
    // Header row
    ['Name', 'Phone Number', 'Expected Guest Numbers'],
    // Sample data row
    ['Contoh: Eddy & Family', '6285609918821', 3]
  ];

  // Add many empty rows like the original template
  for (let i = 0; i < 998; i++) {
    templateData.push(['', '', '']);
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // Set column widths to match original
  ws['!cols'] = [
    { wch: 25 }, // Name - wider for family names
    { wch: 18 }, // Phone Number
    { wch: 22 }  // Expected Guest Numbers
  ];

  // Style the header row
  const headerStyle = {
    fill: { fgColor: { rgb: "E3F2FD" } },
    font: { bold: true },
    border: {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } }
    }
  };

  // Apply header styling
  ['A1', 'B1', 'C1'].forEach(cell => {
    if (ws[cell]) ws[cell].s = headerStyle;
  });

  // Style the sample row
  const sampleStyle = {
    fill: { fgColor: { rgb: "F0F8FF" } },
    font: { italic: true }
  };

  ['A2', 'B2', 'C2'].forEach(cell => {
    if (ws[cell]) ws[cell].s = sampleStyle;
  });

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // Convert to blob
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate CSV template for guest list (3 columns only)
 * @returns {Blob} CSV file blob
 */
export function generateCSVTemplate() {
  const csvContent = `Name,Phone Number,Expected Guest Numbers
"Contoh: Eddy & Family",6285609918821,3`;

  return new Blob([csvContent], { type: 'text/csv' });
}

/**
 * Generate Google Sheets template URL (3 columns only)
 * @param {string} eventTitle - Title of the event
 * @returns {string} Google Sheets template URL
 */
export function generateGoogleSheetsTemplate(eventTitle = 'Your Event') {
  const templateData = [
    ['Name', 'Phone Number', 'Expected Guest Numbers'],
    ['Contoh: Eddy & Family', '6285609918821', '3']
  ];

  // Convert to URL-encoded format for Google Sheets
  const encodedData = templateData.map(row => 
    row.map(cell => encodeURIComponent(cell)).join('%2C')
  ).join('%0A');

  return `https://docs.google.com/spreadsheets/create?title=${encodeURIComponent(eventTitle + ' - Guest List')}&headers=true`;
}

/**
 * Serve the uploaded template file as downloadable
 * @returns {string} Path to the template file
 */
export function getUploadedTemplatePath() {
  return '/templates/Name_GuestListTemplate.xlsx';
}

/**
 * Trigger download of template file
 * @param {Blob} blob - File blob to download
 * @param {string} filename - Name for the downloaded file
 */
export function downloadTemplate(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download the uploaded template directly
 * @param {string} filename - Name for the downloaded file
 */
export async function downloadUploadedTemplate(filename = 'Guest_List_Template.xlsx') {
  try {
    // For development, we'll generate the template to match the uploaded one
    const blob = generateExcelTemplate();
    downloadTemplate(blob, filename);
  } catch (error) {
    console.error('Error downloading template:', error);
    // Fallback to generated template
    const blob = generateExcelTemplate();
    downloadTemplate(blob, filename);
  }
}