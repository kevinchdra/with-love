import { supabase } from '$lib/supabaseClient';

export async function load() {
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, title, description, price, preview_url, is_active')
    .eq('is_active', true)
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error.message);
    return { products: [] };
  }

  return { products: data ?? [] };
}
