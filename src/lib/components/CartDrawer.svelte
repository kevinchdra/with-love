<!-- src/lib/components/CartDrawer.svelte -->
<script>
  import { fade, fly } from 'svelte/transition';
  import { cart, cartTotal, cartItemCount } from '$lib/cartStore';
  import { goto } from '$app/navigation';
  
  export let isOpen = false;
  
  function closeCart() {
    isOpen = false;
  }
  
  function handleCheckout() {
    goto('/checkout/');
    closeCart();
  }
  
  function formatPrice(price) {
    if (typeof price === 'number') {
      return `Rp. ${price.toLocaleString('id-ID')}`;
    }
    return price;
  }
  
  function increaseQuantity(item) {
    cart.updateQuantity(item.id, item.quantity + 1);
  }
  
  function decreaseQuantity(item) {
    cart.updateQuantity(item.id, item.quantity - 1);
  }
  
  function removeItem(id) {
    cart.removeItem(id);
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="backdrop"
    on:click={closeCart}
    on:keydown={(e) => e.key === 'Escape' && closeCart()}
    transition:fade={{ duration: 300 }}
    role="button"
    tabindex="0"
    aria-label="Close cart"
  />
  
  <!-- Cart Drawer -->
  <div 
    class="cart-drawer"
    transition:fly={{ x: 500, duration: 300 }}
  >
    <div class="cart-header text-lg px-6 py-3 lg:px-8  lg:text-xl">
      <h2 class="">Your Cart</h2>
      <button class="close-btn" on:click={closeCart}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    
    <div class="cart-content">
      {#if $cartItemCount === 0}
        <div class="empty-cart">
          <p>Your cart is empty</p>
          <button class="continue-shopping" on:click={closeCart}>
            Continue Shopping
          </button>
        </div>
      {:else}
        <div class="cart-items p-6 md:p-7 lg:p-8">
          {#each $cart as item (item.id)}
            <div class="cart-item">
              <div class="item-image">
                <img src={item.image || '/landingpage/product-placeholder-1.png'} alt={item.name} />
              </div>
              
              <div class="item-details lg:space-y-1">
                <h3 class="uppercase">{item.name}</h3>
                <p class="item-plan text-base lg:text-base">{item.plan || 'Essentials Plan'}</p>
                
                <!-- <div class="quantity-controls">
                  <button 
                    class="qty-btn"
                    on:click={() => decreaseQuantity(item)}
                    aria-label="Decrease quantity"
                  >
                    -</button>
                  <span class="quantity">{item.quantity}</span>
                  <button 
                    class="qty-btn"
                    on:click={() => increaseQuantity(item)}
                    aria-label="Increase quantity"
                  >
                    +</button>
                </div> -->
              </div>
              
              <div class="item-right">
                <p class="item-price text-base">{formatPrice(item.price)}</p>
                <button 
                  class="remove-btn text-base"
                  on:click={() => removeItem(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          {/each}
        </div>
        
        <div class="cart-footer">
          <div class="subtotal text-base lg:text-base">
            <span>Subtotal • {$cartItemCount} Item{$cartItemCount > 1 ? 's' : ''}</span>
            <span class="total-price">{formatPrice($cartTotal)}</span>
          </div>
          
          <button class="checkout-btn text-base px-12 py-3 lg:px-24 lg:py-6" on:click={handleCheckout}>
            CHECKOUT
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9998;
  }
  
  .cart-drawer {
    position: fixed;
    top: 0;
    right: 0;
    height: 100dvh;
    width: 40dvw;
    background: #FAFAF8;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    display: flex;
    flex-direction: column;
  }
  
  .cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    border-bottom: 0.5px solid #E0E0D9;
  }
  
  .cart-header h2 {
    font-family: 'DM Sans', sans-serif;
    font-weight: 400;
    margin: 0;

  }
  
  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
  }
  
  .close-btn:hover {
    opacity: 0.6;
  }
  
  .cart-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  
  .empty-cart {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }
  
  .empty-cart p {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.25rem;
    color: #666;
    margin-bottom: 2rem;
  }
  
  .continue-shopping {
    background: #000;
    color: white;
    border: none;
    border-radius: 50px;
    padding: 24px 48px;
    font-family: 'DM Sans', sans-serif;
    font-size: 1.25em;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }
  
  .continue-shopping:hover {
    transform: scale(1.05);
  }
  
  .cart-items {
    flex: 1;
    overflow-y: auto;
  }
  
  .cart-item {
    display: flex;
    gap: 1rem;

    border-radius: 12px;
    margin-bottom: 1rem;
  }
  
  .item-image {
    width:30%;
    aspect-ratio:1/1;
    /* width:120px; */
    /* height: 120px; */
    border-radius: 8px;
    overflow: hidden;
    background: #B8A8E8;
    flex-shrink: 0;
 
  }
  
  .item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .item-details {
   flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* Changed from space-between */

  }
  
  .item-details h3 {
    font-family: 'DM Sans', sans-serif;
    font-weight: 400;
   letter-spacing:0.015em;
  }
  
  .item-plan {
    font-family: 'DM Sans', sans-serif;
    
    color: #000000;
    opacity:50%;
    letter-spacing:0.015em;

    
  }
  
  .quantity-controls {
   display: inline-flex;
  align-items: center;
  align-self:flex-start;
  border: 1px solid #444; /* subtle outline */
  border-radius: 9999px; /* fully rounded pill */
  padding: 1rem 2rem; /* vertical + horizontal padding */
  background: none; /* light neutral background */
  font-family: 'DM Sans', sans-serif;
  
  }
  
  .qty-btn {
    background: none;
  border: none;
  color: #666;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0 0.5rem;
  line-height: 1;
  transition: color 0.2s ease;

  }
  
  .qty-btn:hover {
    background: #929292;
 
  }
  
  .quantity {
   font-size: 1.25rem;
  font-weight: 500;
  color: #222;
  margin: 0 0.75rem;
  min-width: 1.5rem; /* keeps it from shrinking on single digit */
  text-align: center;
  }
  
  .item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
  }
  
  .item-price {
    font-family: 'DM Sans', sans-serif;
  
    font-weight: 400;
    margin: 0;
  }
  
  .remove-btn {
    background: none;
    border: none;
    color: #000000;
    opacity:50%;
    font-family: 'DM Sans', sans-serif;

    text-decoration: underline;
     text-underline-offset: 3px;
    cursor: pointer;
    padding: 0;
    transition: color 0.2s;
    letter-spacing:0.015em;
  }
  
  .remove-btn:hover {
    color: #000;
  }
  
  .cart-footer {
    padding: 2rem;
    border-top: 0.5px solid #E0E0D9;
    background: #FAFAF8;
  }
  
  .subtotal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    font-family: 'DM Sans', sans-serif;
  
  }
  
  .total-price {
    font-size: 1.25em;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
  }
  
  .checkout-btn {
    width: 100%;
    background: #000;
    color: white;
    border: none;
    border-radius: 50px;

    font-family: 'DM Sans', sans-serif;

    font-weight: 600;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: transform 0.2s;
  }
  
  .checkout-btn:hover {
    transform: scale(1.02);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .cart-drawer {
      width: 100%;
      max-width: 420px;
    }
  }
  
  @media (max-width: 480px) {
    .cart-drawer {
      width: 100%;
      max-width: 100%;
    }
    
    /* .cart-item {
      flex-direction: row;
    }
    
    .item-image {
      width: 100%;
      height: 200px;
    }
    
    .item-right {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
    } */
  }
</style>