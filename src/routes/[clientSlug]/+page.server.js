import { supabase } from '$lib/supabaseClient';

export async function load({ params }) {
  const { clientSlug } = params;

  const { data: invite, error } = await supabase
    .from('invites')
    .select('*')
    .eq('slug', clientSlug)
    .single();

  if (error || !invite) {
    return {
      status: 404,
      error: new Error('Invite not found')
    };
  }

  return {
    invite,
    templateName: `public-${invite.template_name}`
  };
}
