// import { json } from '@sveltejs/kit';
// import crypto from 'crypto';
// import { DUITKU_MERCHANT_CODE, DUITKU_MERCHANT_KEY, PUBLIC_BASE_URL } from '$env/static/private';

// export async function POST({ request }) {
//   try {
//     const body = await request.json();
//     const { amount, invoiceId, customerName, email, phone } = body;

//     // Debug log incoming request
//     console.log('Received payment request:', { amount, invoiceId, customerName, email, phone });

//     // Validate required fields
//     if (!amount || !invoiceId || !customerName || !email || !phone) {
//       return json({
//         statusCode: '01',
//         statusMessage: 'Missing required fields'
//       }, { status: 400 });
//     }

//     const merchantCode = DUITKU_MERCHANT_CODE;
//     const merchantKey = DUITKU_MERCHANT_KEY;
//     const paymentAmount = Math.round(parseFloat(amount));

//     // Generate signature (merchantCode + orderId + amount + apiKey)
//     const signature = crypto
//       .createHash('md5')
//       .update(merchantCode + invoiceId + paymentAmount + merchantKey)
//       .digest('hex');

//     // Construct payload according to Duitku docs v2.0
//     const payload = {
//       merchantCode: merchantCode,
//       paymentAmount: paymentAmount,
//       paymentMethod: 'VC',
//       merchantOrderId: invoiceId,
//       productDetails: 'Digital Invitation',
//       email: email,
//       phoneNumber: phone.replace(/\D/g, '').slice(0, 15),
//       additionalParam: '',
//       merchantUserInfo: '',
//       customerVaName: customerName.slice(0, 20),
//       callbackUrl: `${PUBLIC_BASE_URL}/api/payment-callback`,
//       returnUrl: `${PUBLIC_BASE_URL}/payment-success`,
//       signature: signature,
//       expiryPeriod: 60
//     };

//     // Debug log outgoing request
//     console.log('Sending to Duitku:', {
//       ...payload,
//       signature: '***',
//       merchantKey: '***'
//     });

//     const res = await fetch('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(payload)
//     });

//     const data = await res.json();
//     console.log('Duitku response:', data);

//     if (!res.ok || data.statusCode !== '00') {
//       throw new Error(data.statusMessage || 'Payment initialization failed');
//     }

//     return json(data);

//   } catch (error: any) {
//     console.error('Payment error:', error);
//     return json({
//       statusCode: '99',
//       statusMessage: error.message || 'Internal server error'
//     }, { status: 500 });
//   }
// }
