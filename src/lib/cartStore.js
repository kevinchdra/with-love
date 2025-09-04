
import { writable, derived } from 'svelte/store';

function createCartStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    
    addItem: (product) => update(items => {
      const existingItem = items.find(item => item.id === product.id);
      
      if (existingItem) {
        return items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...items, { ...product, quantity: 1 }];
    }),
    
    updateQuantity: (id, quantity) => update(items => {
      if (quantity <= 0) {
        return items.filter(item => item.id !== id);
      }
      
      return items.map(item =>
        item.id === id
          ? { ...item, quantity }
          : item
      );
    }),
    
    removeItem: (id) => update(items => 
      items.filter(item => item.id !== id)
    ),
    
    clearCart: () => set([])
  };
}

export const cart = createCartStore();

// Derived store for cart totals
export const cartTotal = derived(cart, $cart =>
  $cart.reduce((total, item) => {
    // Parse price string to number (e.g., "Rp. 158,000" -> 158000)
    const price = parseInt(item.price.replace(/[^0-9]/g, ''));
    return total + (price * item.quantity);
  }, 0)
);

export const cartItemCount = derived(cart, $cart =>
  $cart.reduce((count, item) => count + item.quantity, 0)
);