// lib/guestImporter.js
import { supabase } from '$lib/supabaseClient.js';

/**
 * Import guests to Supabase database with error handling and rollback support
 * @param {Array} guests - Array of guest objects to import
 * @param {string} inviteId - The invite ID to associate guests with
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<Object>} Import result with success/failure details
 */
export async function importGuestsToSupabase(guests, inviteId, onProgress = null) {
  if (!guests || guests.length === 0) {
    throw new Error('No guests to import');
  }

  if (!inviteId) {
    throw new Error('Invite ID is required');
  }

  const result = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [],
    duplicates: [],
    guestIds: []
  };

  try {
    // First, check for existing guests with same email/phone to prevent duplicates
    const existingGuests = await checkForExistingGuests(guests, inviteId);
    
    if (existingGuests.length > 0) {
      result.duplicates = existingGuests;
      console.warn('Found existing guests:', existingGuests);
    }

    // Filter out duplicates for import
    const guestsToImport = guests.filter(guest => 
      !existingGuests.some(existing => 
        (guest.email && existing.email === guest.email) ||
        (guest.phone && existing.phone === guest.phone)
      )
    );

    if (guestsToImport.length === 0) {
      result.success = true;
      result.errors.push('All guests already exist in the database');
      return result;
    }

    // Prepare guest data for insertion with better slug generation
    const preparedGuests = [];
    const usedSlugs = new Set();
    
    for (let i = 0; i < guestsToImport.length; i++) {
      const guest = guestsToImport[i];
      let slug = generateUniqueSlug(guest.full_name);
      
      // Handle duplicate slugs
      let counter = 1;
      let originalSlug = slug;
      while (usedSlugs.has(slug)) {
        slug = `${originalSlug}-${counter}`;
        counter++;
      }
      usedSlugs.add(slug);
      
      preparedGuests.push({
        invite_id: inviteId,
        full_name: guest.full_name.trim(),
        slug: slug,
        email: guest.email?.trim() || null,
        phone: guest.phone?.trim() || null,
        rsvp_status: null, // Set to null instead of 'pending'
        guest_count: guest.guest_count || 1,
        dietary_restriction: guest.dietary_restriction?.trim() || null,
        wishes: null,
        submitted_at: null,
        created_at: new Date().toISOString(),
        checked_in: false,
        checked_in_at: null,
        qr_code_url: null // Will be generated later if needed
      });
    }

    // Import in batches to handle large lists efficiently
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < preparedGuests.length; i += batchSize) {
      batches.push(preparedGuests.slice(i, i + batchSize));
    }

    let totalImported = 0;

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        const { data, error } = await supabase
          .from('guests')
          .insert(batch)
          .select('guest_id, full_name, email');

        if (error) {
          throw error;
        }

        totalImported += batch.length;
        result.imported += batch.length;
        
        // Store imported guest IDs for potential rollback
        if (data) {
          result.guestIds.push(...data.map(g => g.guest_id));
        }

        // Update progress
        const progress = Math.round((totalImported / preparedGuests.length) * 100);
        if (onProgress) {
          onProgress(progress);
        }

      } catch (batchError) {
        console.error(`Error importing batch ${batchIndex + 1}:`, batchError);
        result.failed += batch.length;
        result.errors.push(`Batch ${batchIndex + 1}: ${batchError.message}`);
        
        // If this is a critical error, we might want to rollback
        if (batchError.code === 'PGRST116' || batchError.code === '23505') {
          // Handle constraint violations or duplicate key errors
          result.errors.push('Database constraint violation - some guests may already exist');
        }
      }
    }

    // Generate QR codes for imported guests (optional, can be done later)
    if (result.guestIds.length > 0) {
      try {
        await generateQRCodesForGuests(result.guestIds);
      } catch (qrError) {
        console.warn('Failed to generate QR codes:', qrError);
        result.errors.push('QR code generation failed (guests imported successfully)');
      }
    }

    result.success = result.imported > 0;
    
    if (onProgress) {
      onProgress(100);
    }

  } catch (error) {
    console.error('Import failed:', error);
    result.errors.push(error.message);
    
    // Attempt rollback if we have imported guest IDs
    if (result.guestIds.length > 0) {
      try {
        await rollbackImport(result.guestIds);
        result.errors.push('Import rolled back due to error');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        result.errors.push('Rollback failed - manual cleanup may be required');
      }
    }
  }

  return result;
}

/**
 * Check for existing guests to prevent duplicates
 * @param {Array} guests - Guests to check
 * @param {string} inviteId - Invite ID to check within
 * @returns {Promise<Array>} Existing guests found
 */
async function checkForExistingGuests(guests, inviteId) {
  const emails = guests.map(g => g.email).filter(Boolean);
  const phones = guests.map(g => g.phone).filter(Boolean);
  
  if (emails.length === 0 && phones.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('guests')
    .select('guest_id, full_name, email, phone')
    .eq('invite_id', inviteId)
    .or(`email.in.(${emails.join(',')}),phone.in.(${phones.join(',')})`);

  if (error) {
    console.warn('Error checking for existing guests:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate URL-friendly slug from name with proper international character handling
 * @param {string} originalName - Guest name
 * @param {number} index - Index for uniqueness (fallback only)
 * @returns {string} URL-friendly slug
 */
function generateUniqueSlug(originalName, index = 0) {
  if (!originalName || typeof originalName !== 'string') {
    return `guest-${Date.now()}-${index}`;
  }

  let slug = originalName.toLowerCase().trim();
  
  // Method 1: Use built-in normalize() to handle most diacritics automatically
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Method 2: Handle Chinese characters - check if we have ANY Chinese characters
  const hasChinese = /[\u4e00-\u9fff]/.test(slug);
  
  if (hasChinese) {
    // For Chinese names, use a clean hash-based approach
    const cleanHash = generateCleanChineseSlug(originalName);
    return index > 0 ? `${cleanHash}-${index}` : cleanHash;
  }
  
  // Method 3: Handle remaining international characters with basic romanization
  const basicCharMap = {
    // Vietnamese specific (after normalize)
    'đ': 'd', 'Đ': 'd',
    // Any other specific mappings needed
    'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'þ': 'th'
  };

  // Apply basic character replacements
  for (const [char, replacement] of Object.entries(basicCharMap)) {
    slug = slug.replace(new RegExp(char, 'g'), replacement);
  }
  
  // Replace spaces and special characters with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');
  
  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');
  
  // If slug is empty or too short after cleaning, create a meaningful fallback
  if (!slug || slug.length < 2) {
    // Use a simple hash of the original name
    const hash = simpleHash(originalName);
    slug = `guest-${hash}`;
  }
  
  // Add index only if greater than 0 (for duplicates)
  if (index > 0) {
    slug += `-${index}`;
  }
  
  // Ensure slug isn't too long (max 50 chars)
  if (slug.length > 50) {
    slug = slug.substring(0, 47) + (index > 0 ? `-${index}` : '');
  }
  
  return slug;
}

/**
 * Generate a clean, short slug for Chinese names
 * @param {string} name - Chinese name
 * @returns {string} Clean slug
 */
function generateCleanChineseSlug(name) {
  // Extract any ASCII parts (like spaces, punctuation, numbers)
  const asciiParts = name.match(/[a-zA-Z0-9\s&-]+/g);
  const asciiSlug = asciiParts ? 
    asciiParts.join('').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 
    '';
  
  // Create a short hash from the full name
  const hash = simpleHash(name);
  
  // Combine ASCII parts with hash
  if (asciiSlug && asciiSlug.length > 1) {
    return `${asciiSlug}-${hash}`;
  } else {
    return `guest-${hash}`;
  }
}

/**
 * Simple hash function for generating short, consistent slugs
 * @param {string} str - String to hash
 * @returns {string} Short hash string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to base36 and take first 6 characters for short, readable hash
  return Math.abs(hash).toString(36).substring(0, 6);
}

/**
 * Convert Chinese characters to ASCII using a simpler, more readable approach
 * @param {string} text - Text containing Chinese characters
 * @returns {string} Text with Chinese characters converted to ASCII
 */
function chineseToAscii(text) {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    
    // Check if character is in main Chinese Unicode range
    const isChinese = (code >= 0x4E00 && code <= 0x9FFF);
    
    if (isChinese) {
      // Generate a short, consistent identifier based on the Unicode code point
      // Use base36 to create shorter strings
      const shortCode = (code - 0x4E00).toString(36);
      
      // Prefix with 'zh' to indicate Chinese character
      // Keep it short (max 4 chars per character)
      return 'zh' + shortCode.slice(-2);
    }
    
    return char;
  }).join('');
}

/**
 * Alternative method: Use hash-based approach for completely unique characters
 * This can be used as a fallback or alternative implementation
 * @param {string} inputName - The name to generate hash slug for
 * @returns {string} Hash-based slug
 */
function generateHashSlug(inputName) {
  // Simple hash function for consistent slug generation
  let hash = 0;
  for (let i = 0; i < inputName.length; i++) {
    const char = inputName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to base36 for shorter, more readable representation
  const hashString = Math.abs(hash).toString(36);
  
  // Extract recognizable ASCII parts from the name
  const asciiParts = inputName.match(/[a-zA-Z0-9\s&-]+/g);
  const asciiSlug = asciiParts ? 
    asciiParts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 
    '';
  
  return asciiSlug ? `${asciiSlug}-${hashString}` : `guest-${hashString}`;
}

/**
 * Generate QR codes for imported guests
 * @param {Array} guestIds - Array of guest IDs
 * @returns {Promise<void>}
 */
async function generateQRCodesForGuests(guestIds) {
  // This would typically call your QR code generation function
  // For now, we'll just log that QR codes should be generated
  console.log(`QR codes should be generated for ${guestIds.length} guests`);
  
  // Example implementation:
  // const qrCodePromises = guestIds.map(async (guestId) => {
  //   const qrCodeUrl = await generateQrDataUrl(guestId);
  //   return supabase
  //     .from('guests')
  //     .update({ qr_code_url: qrCodeUrl })
  //     .eq('guest_id', guestId);
  // });
  // 
  // await Promise.all(qrCodePromises);
}

/**
 * Rollback import by deleting imported guests
 * @param {Array} guestIds - Guest IDs to delete
 * @returns {Promise<void>}
 */
async function rollbackImport(guestIds) {
  if (!guestIds || guestIds.length === 0) return;

  const { error } = await supabase
    .from('guests')
    .delete()
    .in('guest_id', guestIds);

  if (error) {
    throw new Error(`Rollback failed: ${error.message}`);
  }

  console.log(`Rolled back ${guestIds.length} guest imports`);
}

/**
 * Get import statistics for an invite
 * @param {string} inviteId - Invite ID
 * @returns {Promise<Object>} Import statistics
 */
export async function getImportStatistics(inviteId) {
  const { data, error } = await supabase
    .from('guests')
    .select('guest_id, rsvp_status, guest_count, created_at')
    .eq('invite_id', inviteId);

  if (error) {
    throw new Error(`Failed to get statistics: ${error.message}`);
  }

  const stats = {
    totalGuests: data.length,
    totalExpectedAttendance: data.reduce((sum, guest) => sum + (guest.guest_count || 1), 0),
    rsvpStats: {
      pending: data.filter(g => g.rsvp_status === 'pending').length,
      confirmed: data.filter(g => g.rsvp_status === 'confirmed').length,
      declined: data.filter(g => g.rsvp_status === 'declined').length
    },
    recentImports: data.filter(g => {
      const createdAt = new Date(g.created_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return createdAt > oneDayAgo;
    }).length
  };

  return stats;
}

/**
 * Validate guest data before import
 * @param {Array} guests - Guests to validate
 * @returns {Object} Validation result
 */
export function validateGuestsForImport(guests) {
  const errors = [];
  const warnings = [];
  
  if (!Array.isArray(guests) || guests.length === 0) {
    errors.push('No guests provided for import');
    return { valid: false, errors, warnings };
  }

  guests.forEach((guest, index) => {
    const rowNum = index + 1;
    
    // Required fields
    if (!guest.full_name || guest.full_name.trim().length < 2) {
      errors.push(`Row ${rowNum}: Guest name is required and must be at least 2 characters`);
    }

    // Email validation
    if (guest.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guest.email)) {
        errors.push(`Row ${rowNum}: Invalid email format`);
      }
    }

    // Phone validation
    if (guest.phone && guest.phone.length < 8) {
      warnings.push(`Row ${rowNum}: Phone number seems too short`);
    }

    // Guest count validation
    if (guest.guest_count && (guest.guest_count < 1 || guest.guest_count > 20)) {
      warnings.push(`Row ${rowNum}: Guest count seems unusual (${guest.guest_count})`);
    }

    // RSVP status validation
    if (guest.rsvp_status && !['pending', 'confirmed', 'declined'].includes(guest.rsvp_status.toLowerCase())) {
      warnings.push(`Row ${rowNum}: Invalid RSVP status, will default to 'pending'`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}