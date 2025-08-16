// import { supabase } from '$lib/supabaseClient';

// export async function load({ params }) {
//   const { clientSlug, guestSlug } = params;

//   const { data: guest, error: guestError } = await supabase
//     .from('guests')
//     .select('*, invites(*)')
//     .eq('slug', guestSlug)
//     .single();

//   if (guestError || !guest || guest.invites.slug !== clientSlug) {
//     return {
//       status: 404,
//       error: new Error('Guest invite not found')
//     };
//   }

//   return {
//     guest,
//     invite: guest.invites,
//     templateName: `guest-${guest.invites.template_name}`
//   };
// }




// export const actions = {
//   updateRSVP: async ({ request }) => {
//     const data = await request.formData();
    
//     const guestId = data.get('guest_id');
//     const attending = data.get('attending');
//     const guestCount = parseInt(data.get('guest_count')) || 0;
//     const dietary = data.get('dietary') || '';
//     const wishes = data.get('wishes') || '';
//     const name = data.get('name');
//     const email = data.get('email');
//     const phone = data.get('phone');

//     console.log('🔄 Server action - updating RSVP:', {
//       guestId,
//       attending,
//       guestCount,
//       dietary,
//       wishes,
//       name,
//       email,
//       phone
//     });

//     if (!guestId) {
//       return fail(400, { error: 'Guest ID is required' });
//     }

//     // Update the guest record
//     const { data: updatedGuest, error: updateError } = await supabase
//       .from('guests')
//       .update({
//         full_name: name,
//         email: email,
//         phone: phone,
//         rsvp_status: attending === 'yes',
//         guest_count: attending === 'yes' ? guestCount : 0,
//         dietary_restriction: dietary,
//         wishes: wishes,
//         submitted_at: new Date().toISOString()
//       })
//       .eq('guest_id', guestId)
//       .select();

//     if (updateError) {
//       console.error('❌ Database update error:', updateError);
//       return fail(500, { error: updateError.message });
//     }

//     console.log('✅ RSVP updated successfully:', updatedGuest);
//     return { success: true, message: 'RSVP updated successfully!' };
//   }
// };

//V2
import { supabase } from '$lib/supabaseClient';

export async function load({ params }) {
  const { clientSlug, guestSlug } = params;

  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select('*, invites(*)')
    .eq('slug', guestSlug)
    .single();

  if (guestError || !guest || guest.invites.slug !== clientSlug) {
    return {
      status: 404,
      error: new Error('Guest invite not found')
    };
  }

   const { data: couple, error: coupleError } = await supabase
    .from('couple')
    .select('*')
    .eq('invite_id', guest.invites.id) // or however you get the invite_id
    .single();

    if (coupleError) {
  console.error('Error fetching couple:', coupleError);
}


  // NEW: Fetch events for this invite
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('invite_id', guest.invites.id)
    .order('start_time', { ascending: true });

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
  }

  return {
    guest,
    invite: guest.invites,
    events: events || [], // Add events to the returned data
    templateName: `guest-${guest.invites.template_name}`,
    couple,
  };
}

export const actions = {
  updateRSVP: async ({ request }) => {
    const data = await request.formData();
    
    const guestId = data.get('guest_id');
    const attending = data.get('attending');
    const guestCount = parseInt(data.get('guest_count')) || 0;
    const dietary = data.get('dietary') || '';
    const wishes = data.get('wishes') || '';
    const name = data.get('name');
    const email = data.get('email');
    const phone = data.get('phone');

    console.log('🔄 Server action - updating RSVP:', {
      guestId,
      attending,
      guestCount,
      dietary,
      wishes,
      name,
      email,
      phone
    });

    if (!guestId) {
      return fail(400, { error: 'Guest ID is required' });
    }

    // Update the guest record
    const { data: updatedGuest, error: updateError } = await supabase
      .from('guests')
      .update({
        full_name: name,
        email: email,
        phone: phone,
        rsvp_status: attending === 'yes',
        guest_count: attending === 'yes' ? guestCount : 0,
        dietary_restriction: dietary,
        wishes: wishes,
        submitted_at: new Date().toISOString()
      })
      .eq('guest_id', guestId)
      .select();

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return fail(500, { error: updateError.message });
    }

    console.log('✅ RSVP updated successfully:', updatedGuest);
    return { success: true, message: 'RSVP updated successfully!' };
  }
};