import { supabase } from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const { slug } = params;

  const { data: product, error: err } = await supabase
    .from('products')
    .select('id, slug, title, description, price, preview_url, template_name, is_active, features')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (err || !product) {
    throw error(404, 'Product not found');
  }

  return { product };
}
