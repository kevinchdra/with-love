// lib/guestListParser.js
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Column mapping for flexible header recognition (simplified for 3 columns)
 * Order matters - more specific terms first to avoid conflicts
 */
const COLUMN_MAPPINGS = {
  name: ['name', 'full_name', 'guest_name', 'nama', 'full name', 'guest name', 'names'],
  phone: ['phone', 'phone_number', 'mobile', 'telephone', 'telp', 'hp', 'phone number', 'no hp', 'nomor hp', 'cell', 'contact'],
  guest_count: ['expected_guest_numbers', 'guest_count', 'expected guest numbers', 'guest numbers', 'jumlah tamu', 'expected', 'count', 'numbers']
};

/**
 * Parse uploaded file (Excel or CSV) - Updated for 3 columns only
 * @param {File} file - The uploaded file
 * @returns {Promise<Object>} Parsed data with guests array and errors
 */
export async function parseGuestFile(file) {
  try {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return await parseExcelFile(file);
    } else if (fileExtension === 'csv') {
      return await parseCSVFile(file);
    } else {
      throw new Error('Unsupported file format. Please upload .xlsx, .xls, or .csv files.');
    }
  } catch (error) {
    return {
      guests: [],
      errors: [error.message],
      warnings: []
    };
  }
}

/**
 * Parse Excel file
 * @param {File} file - Excel file
 * @returns {Promise<Object>} Parsed data
 */
async function parseExcelFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        resolve(processRawData(rawData));
      } catch (error) {
        resolve({
          guests: [],
          errors: [`Failed to parse Excel file: ${error.message}`],
          warnings: []
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse CSV file
 * @param {File} file - CSV file
 * @returns {Promise<Object>} Parsed data
 */
async function parseCSVFile(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          resolve(processRawData(results.data));
        } catch (error) {
          resolve({
            guests: [],
            errors: [`Failed to parse CSV file: ${error.message}`],
            warnings: []
          });
        }
      },
      header: false,
      skipEmptyLines: true,
      error: (error) => {
        resolve({
          guests: [],
          errors: [`CSV parsing error: ${error.message}`],
          warnings: []
        });
      }
    });
  });
}

/**
 * Process raw data array into structured guest data
 * @param {Array} rawData - Raw 2D array from file
 * @returns {Object} Processed data with guests, errors, and warnings
 */
function processRawData(rawData) {
  if (!rawData || rawData.length === 0) {
    return {
      guests: [],
      errors: ['File appears to be empty'],
      warnings: []
    };
  }

  // Find header row (first non-empty row)
  let headerRowIndex = -1;
  for (let i = 0; i < rawData.length; i++) {
    if (rawData[i] && rawData[i].some(cell => cell && cell.toString().trim())) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return {
      guests: [],
      errors: ['No valid header row found'],
      warnings: []
    };
  }

  const headers = rawData[headerRowIndex].map(h => (h || '').toString().toLowerCase().trim());
  const columnMapping = mapColumns(headers);
  console.log('🔍 Mapped columns:', columnMapping );
  
  const guests = [];
  const errors = [];
  const warnings = [];
  const processedPhones = new Set();

  // Process data rows
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    // Skip empty rows
    if (!row || !row.some(cell => cell && cell.toString().trim())) {
      continue;
    }

    // Skip example/sample rows
    const firstCell = (row[0] || '').toString().toLowerCase();
    if (firstCell.includes('contoh') || firstCell.includes('example') || firstCell.includes('eddy')) {
      continue;
    }

    const guest = processGuestRow(row, columnMapping, i + 1);
    
    // Validate and check for duplicates
    const validation = validateGuest(guest, processedPhones);
    
    if (validation.errors.length > 0) {
      errors.push(...validation.errors.map(err => `Row ${i + 1}: ${err}`));
    }
    
    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings.map(warn => `Row ${i + 1}: ${warn}`));
    }

    if (guest.full_name) { // Only add if we have at least a name
      guests.push(guest);
      
      if (guest.phone) processedPhones.add(guest.phone);
    }
  }

  // Check if we found any required columns
  if (!columnMapping.name  === undefined) {
    errors.unshift('No name column found. Please ensure your file has a "Name" column.');
  }

  return {
    guests,
    errors,
    warnings,
    columnMapping,
    totalRows: guests.length
  };
}

/**
 * Map file columns to expected fields - FIXED to prevent duplicate mappings
 * @param {Array} headers - Array of header strings
 * @returns {Object} Column mapping
 */
function mapColumns(headers) {
  const mapping = {};
  const usedIndices = new Set(); // Track which column indices are already used
  
  console.log('Headers found:', headers);
  
  // Process each field in priority order: name first, then phone, then guest_count
  const fieldPriority = ['name', 'phone', 'guest_count'];
  
  fieldPriority.forEach(field => {
    const possibleNames = COLUMN_MAPPINGS[field];
    
    // Find the best matching column that hasn't been used yet
    let bestMatch = -1;
    let bestScore = 0;
    
    headers.forEach((header, index) => {
      // Skip if this column is already mapped
      if (usedIndices.has(index)) return;
      
      const cleanHeader = header.toLowerCase().trim();
      
      possibleNames.forEach(possible => {
        let score = 0;
        
        // Exact match gets highest score
        if (cleanHeader === possible) {
          score = 100;
        }
        // Contains match gets medium score
        else if (cleanHeader.includes(possible)) {
          score = 50;
        }
        // Partial match gets low score
        else if (possible.length > 3 && cleanHeader.includes(possible.substring(0, 4))) {
          score = 25;
        }
        
        // Update best match if this score is higher
        if (score > bestScore) {
          bestScore = score;
          bestMatch = index;
        }
      });
    });
    
    // If we found a match, use it
    if (bestMatch !== -1) {
      mapping[field] = bestMatch;
      usedIndices.add(bestMatch);
      console.log(`Mapped ${field} to column ${bestMatch} (${headers[bestMatch]})`);
    }
  });
  
  console.log('Final column mapping:', mapping);
  console.log('Used column indices:', Array.from(usedIndices));
  
  return mapping;
}

/**
 * Process a single guest row with smart data cleaning
 * @param {Array} row - Row data array
 * @param {Object} columnMapping - Column index mapping
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} Guest object
 */
function processGuestRow(row, columnMapping, rowNumber) {
  const guest = {
    full_name: '',
    phone: '',
    guest_count: 1,
    email: '',
    dietary_restriction: '',
    rowNumber
  };

  // Extract and clean name
  if (columnMapping.name !== undefined) {
    guest.full_name = cleanName((row[columnMapping.name] || '').toString().trim());
  }
  
  // Extract and clean phone number
  if (columnMapping.phone !== undefined) {
    guest.phone = cleanPhoneNumber((row[columnMapping.phone] || '').toString().trim());
  }
  
  // Extract and clean guest count
  if (columnMapping.guest_count !== undefined) {
    const rawValue = (row[columnMapping.guest_count] || '').toString().trim();
    const cleanedCount = cleanGuestCount(rawValue);
    console.log(`Raw guest count for row ${rowNumber}:`, rawValue, '→', cleanedCount);
    
    if (cleanedCount === null) {
      // Mark this guest as having invalid guest count for validation
      guest.guest_count = null;
      guest._invalidGuestCount = true;
      guest._originalGuestCountValue = rawValue;
    } else {
      guest.guest_count = cleanedCount;
    }
  }

  return guest;
}

/**
 * Clean and validate name data (supports international characters)
 * @param {string} name - Raw name input
 * @returns {string} Cleaned name
 */
function cleanName(name) {
  if (!name) return '';
  
  // Convert to string and trim
  let cleaned = name.toString().trim();
  
  // Remove excessive numbers (more than 2 consecutive digits)
  cleaned = cleaned.replace(/\d{3,}/g, '');
  
  // Remove special characters but keep international characters, spaces, &, -, ., and common punctuation
  cleaned = cleaned.replace(/[^\p{L}\p{N}\s&\-.,()]/gu, '');
  
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Trim again
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Clean and format phone number with smart detection
 * @param {string} phone - Raw phone number
 * @returns {string} Cleaned phone number
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Only handle the unambiguous Indonesian case: numbers starting with 0
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    // Convert 08xx to +628xx (0-prefix is uniquely Indonesian)
    cleaned = '+62' + cleaned.substring(1);
  }
  // For everything else, just ensure it has a + if it looks like an international number
  else if (!cleaned.startsWith('+') && cleaned.length >= 8) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Clean and validate guest count - STRICT numbers only
 * @param {string} guestCountStr - Raw guest count input
 * @returns {number|null} Cleaned guest count or null if invalid
 */
function cleanGuestCount(guestCountStr) {
  if (!guestCountStr || guestCountStr.toString().trim() === '') return 1;
  
  const str = guestCountStr.toString().trim();
  
  // Check if input contains any letters - if so, reject it
  if (/[a-zA-Z]/.test(str)) {
    return null; // Reject any alphabetic input
  }
  
  // Extract only numbers from the string
  const numbers = str.match(/\d+/g);
  
  if (!numbers || numbers.length === 0) {
    // If no numbers found, return null to indicate error
    return null;
  }
  
  // Take the first number found
  const count = parseInt(numbers[0]);
  
  // Validate range (1-20 seems reasonable)
  if (isNaN(count) || count < 1) return null;
  if (count > 20) return 20; // Cap at 20 for safety
  
  return count;
}

/**
 * Validate guest data with updated rules
 * @param {Object} guest - Guest object to validate
 * @param {Set} processedPhones - Set of already processed phone numbers
 * @returns {Object} Validation result with errors and warnings
 */
function validateGuest(guest, processedPhones) {
  const errors = [];
  const warnings = [];

  // Required field validation
  if (!guest.full_name || guest.full_name.length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }

  // Name quality checks
  if (guest.full_name && /^\d+$/.test(guest.full_name)) {
    errors.push('Name cannot be only numbers');
  }

  // Guest count validation - now more strict
  if (guest._invalidGuestCount) {
    errors.push(`Invalid guest count: "${guest._originalGuestCountValue}" - No letters are allowed.`);
  } else if (guest.guest_count === null) {
    errors.push('Guest count is required and must be a valid number');
  } else if (guest.guest_count > 10) {
    warnings.push('Guest count seems unusually high (>10)');
  }

  // Phone validation
  if (guest.phone) {
    if (guest.phone.length < 8) {
      warnings.push('Phone number seems too short');
    }
    if (!guest.phone.startsWith('+')) {
      warnings.push('Phone number should include country code');
    }
    if (processedPhones.has(guest.phone)) {
      warnings.push('Duplicate phone number');
    }
  } else {
    warnings.push('No phone number provided');
  }

  return { errors, warnings };
}

/**
 * Generate preview data for UI display
 * @param {Array} guests - Array of guest objects
 * @param {number} limit - Maximum number of rows to preview
 * @returns {Object} Preview data
 */
export function generatePreviewData(guests, limit = 10) {
  const preview = guests.slice(0, limit);
  const hasMore = guests.length > limit;
  
  const summary = {
    totalGuests: guests.length,
    totalGuestCount: guests.reduce((sum, guest) => sum + (guest.guest_count || 1), 0),
    withPhone: guests.filter(guest => guest.phone).length,
    avgGuestCount: guests.length > 0 ? 
      (guests.reduce((sum, guest) => sum + (guest.guest_count || 1), 0) / guests.length).toFixed(1) : 0
  };

  return {
    preview,
    hasMore,
    summary
  };
}