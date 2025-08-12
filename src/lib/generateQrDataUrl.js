import QRCode from 'qrcode'

export async function generateQrDataUrl(guest_id) {
  try {
    console.log('Generating QR data URL for guest_id:', guest_id);
    
    const qrData = guest_id.toString();
    
    // Generate QR as Data URL (base64) - no file upload needed!
    const dataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });
    
    console.log('✅ QR data URL generated successfully');
    return dataUrl; // Returns something like: "data:image/png;base64,iVBORw0KGgo..."
    
  } catch (error) {
    console.error('❌ QR generation error:', error);
    throw error;
  }
}