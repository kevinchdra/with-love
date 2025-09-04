<!-- src/routes/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { cart, cartItemCount } from '$lib/cartStore';
  import CartDrawer from '$lib/components/CartDrawer.svelte';

  let carousel;
  let activeIndex = 0;
  let observers = [];

  // Cart drawer state
  let isCartOpen = false;
  
  // Mobile menu state
  let isMobileMenuOpen = false;
  
  // Sample data - replace with actual data from your load function
  const featuredProduct = {
    name: "The Night We Met",
    image: "/images/featured-invite.png",
    demoUrl: "/demos/the-night-we-met"
  };
  
  const products = [
    {
      id: 1,
      name: "Home With You",
      price: "Rp. 158,000",
      priceRange: "Rp. 158,000 - 200,000",
      image: "/images/product-1.png",
      slug: "the-night-we-met",
      bgColor: "#B8A8E8",
      tag: "Elegant"
    },
    {
      id: 2,
      name: "Holocene",
      price: "Rp. 158,000",
      priceRange: "Rp. 158,000 - 200,000", 
      image: "/images/product-2.png",
      slug: "the-night-we-met-2",
      bgColor: "#F5E6D3",
      tag: "Intimate"
    },
    {
      id: 3,
      name: "Simple Love",
      price: "Rp. 158,000",
      priceRange: "Rp. 158,000 - 268,000",
      image: "/images/product-3.png", 
      slug: "the-night-we-met-3",
      bgColor: "#D4D4D4",
       tag: "Sangjit"
    },
    {
      id: 4,
      name: "Atlas Hands",
      price: "Rp. 158,000",
      priceRange: "Rp. 158,000 - 268,000",
      image: "/images/product-4.png", 
      slug: "the-night-we-met-4",
      bgColor: "#D4D4D4",
      tag: "Cinematic"
    }
  ];
  
  export let plans = [
    {
      id: 'essentials',
      name: 'Essentials',
      price: 'Rp. 158,000',
      description: 'All the basics you need — personalised invite links, RSVP tracking, custom background music, and 6 months live.',
      features: {
        'What\'s included:': [
          'Google Map & Calendar Integration',
          'Personalised Links', 
          'Custom Background Music',
          'Custom Sections',
          '10 Images',
          '1-year active period'
        ],
        '': [
          'RSVP Management Dashboard',
          'Late RSVP Reminders',
          'Whatsapp & WeChat Integrated'
        ]
      }
    },
    {
      id: 'signature', 
      name: 'Signature ',
      price: 'Rp. 288,000',
      description: 'Stress-free and seamless — we send your invites, late RSVP reminders, all active for 1 year.',
      features: {
        'Everything in our Essentials Plan and plus more:': [
          'Google Map & Calendar Integration',
          'Personalised Links',
          'Custom Background Music', 
          'Custom Sections',
          '10 Images',
          '1-year active period'
        ],
        '': [
          'RSVP Management Dashboard',
          'Invitations Sent For You',
          'Late RSVP Reminders',
          'Whatsapp & WeChat Integrated'
        ]
      }
    }
  ];

  let contactMessage = '';
  
  function handleProductClick(slug) {
    goto(`/shop/${slug}`);
  }
  
  function handleShopClick() {
    const shopSection = document.getElementById('shop');
    if (shopSection) {
      shopSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start' 
      });
    }
  }
  
  function handleDemoClick(url) {
    goto(url);
  }
  
  function handlePlanSelect(plan) {
    goto(`/checkout-section/plan-selection?plan=${plan}`);
  }
  
  // Cart functions
  function handleAddToCart(event, product) {
    event.stopPropagation();
    const productWithPlan = {
      ...product,
      plan: 'Essentials',
      planData: {
        id: 'essentials',
        name: 'Essentials', 
        price: 'Rp. 158,000'
      }
    };
    
    cart.addItem(productWithPlan);
    isCartOpen = true;
  }
  
  function handleCartClick() {
    isCartOpen = true;
  }
  
  function handleAboutClick() {
    goto('/about');
  }
  
  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  //Sticky Header Nav
  let isScrolled = false;
  let heroSection;

  //Template Demo
  let templateComponent = null;
  let isLoading = true;

  // Sample data for the template demo
  const demoData = {
    coupleNames: "Sarah & James",
    eventTitle: "Wedding Celebration",
    eventDate: "December 15, 2024",
    eventTime: "4:00 PM",
    location: "Bali, Indonesia",
    message: "We can't wait to celebrate with you!"
  };



 onMount(async () => {
  try {
    const module = await import('$lib/templates/public-floral.svelte');
    templateComponent = module.default;
    isLoading = false;
  } catch (error) {
    console.error('Failed to load template:', error);
    isLoading = false;
  }

  const placeholders = [
    "How long to set up?",
    "Can I customize fonts and colors?",
    "Do you offer bilingual invites?",
    "How long will my invite stay active?",
    "Can guests RSVP directly?"
  ];

  let i = 0;
  const input = document.getElementById("question");

  if (input) {
    setInterval(() => {
      i = (i + 1) % placeholders.length;
      input.setAttribute("placeholder", placeholders[i]);
    }, 3000);
  }

  // Handle form submit to WA
  const form = document.getElementById("whatsappForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const question = document.getElementById("question").value.trim();
      const name = document.getElementById("name").value.trim();

      let message = `Hi,\n\nWe would like to ask about ${question}.\n\nLove,\n${name}`;
      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = "6285692706559";

      window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, "_blank");
    });
  }

  // ✅ Carousel active dot tracking with IntersectionObserver
      if (carousel) {
      const cards = carousel.querySelectorAll(".pricing-card");

      cards.forEach((card, index) => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                activeIndex = index;
              }
            });
          },
          {
            root: carousel,
            threshold: 0.3, // ✅ more lenient
          }
        );

        observer.observe(card);
        observers.push(observer);
      });
    }
 
  // ✅ Header scroll behavior
  const handleHeaderScroll = () => {
    if (heroSection) {
      const heroHeight = heroSection.offsetHeight;
      const scrollPosition = window.scrollY;
      const triggerPoint = heroHeight * 0.3;

      isScrolled = scrollPosition > triggerPoint;
    }
  };

  window.addEventListener('scroll', handleHeaderScroll);

  return () => {
    window.removeEventListener('scroll', handleHeaderScroll);
    observers.forEach((obs) => obs.disconnect());
  };
});

  onDestroy(() => {
    observers.forEach((obs) => obs.disconnect());
  });


</script>

<svelte:head>
  <title>With Love | Digital Wedding Invites</title>
  <meta name="description" content="Create beautiful digital wedding invitations that feel personal and memorable. No more awkward spreadsheets - just smooth arrivals and beautiful notes." />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="landing-page">
<!-- Updated Header with Mobile Menu -->
<header class="main-header" class:scrolled={isScrolled} class:menu-open={isMobileMenuOpen}>
  <nav class="header-nav px-6 py-4 lg:p-5">
    <!-- Mobile Header: Cart Icon | Logo | Menu Icon -->
    <div class="flex md:hidden items-center justify-between w-full">

           <!-- Menu Icon (Right) -->
      <button class="flex flex-col justify-center w-3 h-4 md:w-7 md:h-7 bg-transparent border-none cursor-pointer p-0 gap-1"
              on:click={toggleMobileMenu}
              aria-label="Toggle menu">
            <span
          class="line transition-all duration-300 ease-in-out"
          class:bg-black={isScrolled || isMobileMenuOpen}
          class:bg-white={!isScrolled && !isMobileMenuOpen}
          class:rotate-45={isMobileMenuOpen}
          class:translate-y-1.5={isMobileMenuOpen}
        ></span>
        <span
          class="line transition-all duration-300 ease-in-out"
          class:bg-black={isScrolled || isMobileMenuOpen}
          class:bg-white={!isScrolled && !isMobileMenuOpen}
          class:opacity-0={isMobileMenuOpen}
        ></span>
        <span
          class="line transition-all duration-300 ease-in-out"
          class:bg-black={isScrolled || isMobileMenuOpen}
          class:bg-white={!isScrolled && !isMobileMenuOpen}
          class:-rotate-45={isMobileMenuOpen}
          class:-translate-y-1.5={isMobileMenuOpen}
        ></span>
      </button>


      
      <!-- Logo (Center) -->
      <img src="/landingpage/withloveheader.svg" 
           alt="With Love Logo" 
           class="h-4 md:h-6 lg:h-10 w-auto brightness-0 invert transition-all duration-300"
           class:!brightness-100={isScrolled}
           class:!invert-0={isScrolled}>
      

                <!-- Cart Icon (Left) -->
      <button class="relative bg-transparent border-none cursor-pointer p-1.5 flex items-center justify-center text-white transition-colors duration-300" 
              class:!text-black={isScrolled}
              on:click={handleCartClick}>
        <svg class="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="16.5" cy="18.5" r="1.5"/>
          <circle cx="9.5" cy="18.5" r="1.5"/>
          <path d="M18 16H8a1 1 0 0 1-.958-.713L4.256 6H3a1 1 0 0 1 0-2h2a1 1 0 0 1 .958.713L6.344 6H21a1 1 0 0 1 .937 1.352l-3 8A1 1 0 0 1 18 16zm-9.256-2h8.563l2.25-6H6.944z"/>
        </svg>
        {#if $cartItemCount > 0}
          <span class="absolute -top-1 -right-1 bg-black text-white text-xs font-semibold px-1 py-0.5 rounded-full min-w-4 text-center leading-none"
                class:!bg-white={isScrolled}
                class:!text-black={isScrolled}>
            {$cartItemCount}
          </span>
        {/if}
      </button>
    </div>

    <!-- Desktop Navigation -->
    <div class="nav-desktop hidden md:flex items-center justify-between w-full max-w-7xl mx-auto">
      <div class="nav-left flex items-center gap-8 flex-1 justify-start">
        <button class="nav-link lg:text-md" on:click={handleShopClick}>Shop<span class="extra">our collection</span></button>
        <button class="nav-link lg:text-md" on:click={handleAboutClick}>About<span class="extra">our story</span></button>
        <button class="nav-link lg:text-md" on:click={handleAboutClick}>Listen<span class="extra">to our curated playlists</span></button>
      </div>
      
      <div class="nav-center flex-shrink-0">
        <img src="/landingpage/withloveheader.svg" 
             alt="With Love Logo" 
             class="h-2 lg:h-4  w-auto brightness-0 invert transition-all duration-300"
             class:!brightness-100={isScrolled}
             class:!invert-0={isScrolled}>
      </div>
      
      <div class="nav-right flex items-center flex-1 justify-end">
        <span class="nav-link">IDR</span>
        <button class="nav-link cart-nav-btn relative" on:click={handleCartClick}>
          Cart
          {#if $cartItemCount > 0}
            <span class="absolute -top-1 -right-1 bg-black text-white text-xs font-semibold px-1.5 py-0.5 rounded-lg min-w-5 text-center"
                  class:!bg-white={isScrolled}
                  class:!text-black={isScrolled}>
              {$cartItemCount}
            </span>
          {/if}
        </button>
      </div>
    </div>
  </nav>


</header>
  <!-- Mobile Menu Overlay -->
  {#if isMobileMenuOpen}
    <div class="mobile-menu-overlay fixed inset-0 bg-black/50 z-[998] animate-fade-in" on:click={toggleMobileMenu}></div>
    <div class="mobile-menu fixed left-0 right-0 bg-[#FAFAF8] z-[999] p-5 shadow-lg animate-slide-down">
      <button class="mobile-menu-item block w-full text-left py-3 font-medium text-lg text-black bg-none border-none cursor-pointer" 
              on:click={() => { handleShopClick(); toggleMobileMenu(); }}>
        Shop
      </button>
      <button class="mobile-menu-item block w-full text-left py-3 font-medium text-lg text-black bg-none border-none cursor-pointer" 
              on:click={() => { handleAboutClick(); toggleMobileMenu(); }}>
        Guestbooks
      </button>
      <button class="mobile-menu-item block w-full text-left py-3 font-medium text-lg text-black bg-none border-none cursor-pointer" 
              on:click={() => { handleAboutClick(); toggleMobileMenu(); }}>
        About
      </button>
      <div class="h-px bg-[#E0E0D9] my-3"></div>
      <button class="mobile-menu-item block w-full text-left py-3 font-medium text-lg text-black bg-none border-none cursor-pointer" 
              on:click={() => { handleCartClick(); toggleMobileMenu(); }}>
        Cart ({$cartItemCount})
      </button>
      <span class="mobile-menu-item block w-full text-left py-3 font-medium text-lg text-black">IDR</span>
    </div>
  {/if}

  <!-- Hero Section -->
  <section class="hero" bind:this={heroSection}>
    <video autoplay muted loop playsinline class="hero-video">
      <source src="/prewed.webm" type="video/mp4" />
    </video>
    <div class="hero-content px-4 md:px-8">
      <h1 class="hero-title text-3xl lg:text-4xl">
        Digital invites.<br>
        Written like <em>love letters</em>.
      </h1>
    </div>
  </section>

  <!-- Products Section -->
  <section id="shop" class="products-section pt-6 sm:pt-6 md:pt-8 lg:pt-12">
    <div class="products-header mb-6 md:mb-12">
      <h2 class="section-title products text-4xl md:text-3xl lg:text-4xl">
        Shop our collection
      </h2>
    </div>
      
    <div class="products-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-y divide-[#E0E0D9]">
      {#each products as product}
        <div 
          class="product-card last:row-span-1 last:border-b border-[#E0E0D9]"
          on:click={() => handleProductClick(product.slug)}
          on:keydown={(e) => e.key === 'Enter' && handleProductClick(product.slug)}
          role="button"
          tabindex="0"
        >
          <div class="product-image">
            <img src="/landingpage/product-placeholder-1.png" alt="Product placeholder" />
          </div>
          <div class="product-container px-4 py-3 lg:px-6 lg:py-6 ">
          <div class="product-info mb-2 md:mb-3 lg:mb-4">
            <div class="info-text pr-4">
              <h3 class="product-name uppercase font-normal mb-0.5 text-xs lg:text-base lg:tracking-[1px] lg:font-medium">
                <a href={`/shop/${product.slug}`}>{product.name}</a>
              </h3>
              <h3 class="product-name tracking-wide font-light opacity-80 text-xs lg:text-base">{product.tag}</h3>
            </div>
     
            <button 
              class="product-cart-btn w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10"
              on:click={(e) => handleAddToCart(e, product)}
              aria-label="Add to cart"
            >
              <svg fill="#000000" class="w-2 h-2 md:w-3 md:h-3 lg:w-4 lg:h-4" width="24px" height="24px" viewBox="0 0 512 512">
                <path d="M232 280L64 280 64 232 232 232 232 64 280 64 280 232 448 232 448 280 280 280 280 448 232 448 232 280Z" />
              </svg>
            </button>

          </div>
          <p class="product-price text-xs lg:text-base">{product.price}</p>
        </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Pricing Section -->
  <section class="pricing-section px-8 md:px-12 py-12 md:py-16 lg:py-24">
    <div class="pricing-container">
      <div class="pricing-header mb-8 md:mb-10 lg:mb-12">

        
   
          
        <p class="section-label text-sm lg:text-base mb-4 md:mb-8 lg:mb-12 ">OUR PLANS</p>
       
        <h1 class="section-title text-4xl mb-6 md:mb-10 lg:mb-14">
          Plans for every moment
        </h1>
      </div>
      
      <div bind:this={carousel} class="pricing-cards-wrapper flex overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-12 lg:gap-16">
        {#each plans as plan}
          <div class="pricing-card p-8 md:p-10 lg:p-12" class:signature={plan.id === 'signature'}>
            <div class="card-header">
              <h3 class="plan-name text-2xl  lg:text-3xl">{plan.name}</h3>
              <div class="plan-price text-3xl lg:text-4xl">{plan.price}</div>
              <p class="plan-description text-lg lg:text-base">{plan.description}</p>
              <hr class="opacity-30">
            </div>
            
            <div class="features-section">
              {#each Object.entries(plan.features) as [sectionTitle, features]}
                {#if sectionTitle}
                  <h4 class="features-title text-lg lg:text-base my-4 md:my-6 lg:my-8">{@html sectionTitle}</h4>
                {/if}
                <div class="features-grid">
                  {#each features as feature}
                    <div class="feature-item text-lg lg:text-base">{feature}</div>
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
           <!-- Page dots -->
     <div class="flex justify-center mt-4 gap-2 md:hidden">
  {#each plans as _, i}
    <span class="w-2 h-2 rounded-full transition-all"
          class:bg-black={i === activeIndex}
          class:bg-gray-300={i !== activeIndex}></span>
  {/each}
</div>

  </section>

  <!-- Value Section -->
  <section class="value-section">
    <div class="value-container px-8 py-12 md:px-12 md:py-16 lg:px-16 lg:py-20">
      <div class="value-content">
        <div class="value-text">
          <p class="value-label text-sm lg:text-base mb-4 md:mb-8 lg:mb-12">GUESTBOOKS</p>
          <h2 class="value-title text-4xl lg:text-4xl mb-6 md:mb-10 lg:mb-14">
            No more <em>awkward</em><br>
            spreadsheets. <br>
            Just smooth arrivals,<br>
            and beautiful notes.
          </h2>
          
          <p class="value-subtitle  text-base md:text-lg lg:text-xl mb-8 md:mb-12 lg:mb-16">
            Make guest & gift registry management effortless <br class="hidden sm:block"> 
            with our custom QR code system.
          </p>

          <div class="value-buttons">
            <button class="btn-primary px-4 py-5 text-base lg:px-18 lg:py-6">SHOP NOW</button>
            <a href="/faq" class="faq-link lg:text-base mb-4 lg:mb-0">VIEW DEMO</a>
          </div>
        </div>
        
        <div class="value-visual">
          <img src="/landingpage/guestbook-placeholder.png" alt="Guestbook placeholder" />
        </div>
      </div>
    </div>
  </section>

  <!-- Contact Section -->
  <section class="contact-section px-8 py-12 md:px-12 md:py-16 lg:px-16 lg:py-20">
    <div class="contact-wrapper">
      <div class="contact-grid">
        <!-- Info Section -->
        <div class="contact-info">
          
          <p class="contact-label text-sm lg:text-base mb-4 md:mb-8 lg:mb-12">GET IN TOUCH</p>
   
          <!-- <h4 class="section-title text-4xl md:text-6xl lg:text-8xl mb-6 md:mb-10 lg:mb-14">
            Questions or <em>confessions?</em><br> We're listening.
          </h4> -->

          <h4 class="section-title text-4xl mb-6 md:mb-10 lg:mb-14">
            Questions?<br> We're listening.
          </h4>
        </div>

        <!-- Form Section -->
        <div class="contact-form">
          <form id="whatsappForm">
            <p class="contact-text text-2xl md:text-4xl lg:text-4xl lg:mb-8">
              <!-- <span style="display: inline-block; margin-bottom: 1rem;">
                Dear With Love,
              </span><br> -->
              We'd like to ask about
              <input type="text" id="question" placeholder="Do you offer guestbooks?" 
                     class="contact-input question text-xl md:text-3xl lg:text-4xl lg:mt-2 mb-6 lg:mb-12"><br>
              
              With Love,<br>
              <input type="text" id="name" placeholder="Eddie & Vanessa" 
                     class="contact-input name text-xl md:text-3xl lg:text-4xl lg:mt-2">
            </p>
            <div class="form-actions">
              <button type="submit" class="contact-submit px-4 py-5 lg:text-base lg:px-18 lg:py-6">SEND MESSAGE</button>
              <a href="/faq" class="faq-link">VIEW FAQ</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer Section -->
  <footer class="footer ">
    <div class="footer-container">
      <div class="footer-links-wrapper">
        <div class="footer-links text-base">
          <ul>
            <li><a href="#">Our Story</a></li>
            <li><a href="#">Catalog</a></li>
            <li><a href="#">Features</a></li>
            <li><a href="#">Support</a></li>
          </ul>
        </div>

        <div class="footer-links text-base">
          <ul>
            <li><a href="#">Refund Policy</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>

        <div class="footer-links  text-base">
          <ul>
            <li><a href="#">Instagram</a></li>
            <li><a href="#">Tiktok</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <img src="landingpage/withlovefooter.svg" alt="Footer Image" class="footer-svg opacity-20">
      <p class="footer-copy text-sm md:text-base">withlove™. All rights reserved</p>
    </div>
  </footer>
</div>

<!-- Cart Drawer -->
<CartDrawer bind:isOpen={isCartOpen} />

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

  :global(html) {
    background-color: #FAFAF8!important;
  }

  /* Mobile Menu Styles */
  .mobile-nav-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .hamburger-menu {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    z-index: 1001;
  }

  .hamburger-line {
    width: 24px;
    height: 2px;
    background: white;
    transition: all 0.3s;
  }

  .main-header.scrolled .hamburger-line {
    background: black;
  }

  .logo-mobile {
    height: 28px;
    width: auto;
    filter: brightness(0) invert(1);
    transition: filter 300ms ease-in-out;
  }

  .main-header.scrolled .logo-mobile {
    filter: none;
  }

  .cart-mobile-btn {
    position: relative;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .main-header.scrolled .cart-mobile-btn {
    color: black;
  }

  .cart-count-mobile {
    position: absolute;
    top: 0;
    right: 0;
    background: #000;
    color: white;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 4px;
    border-radius: 8px;
    min-width: 16px;
    text-align: center;
  }

  .mobile-menu-overlay {
 
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
    animation: fadeIn 0.3s;
  }

.mobile-menu {
  position: fixed;
  top: 0;   /* cover from very top */
  left: 0;
  right: 0;
  bottom: 0;   /* ensure full height */
  background: #FAFAF8;
  z-index: 999;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  animation: slideRight 0.3s ease-in forwards;
   padding-top:4rem;
}

  .mobile-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 12px 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 18px;
    font-weight: 500;
    color: black;
    background: none;
    border: none;
    cursor: pointer;
  }

  .mobile-menu-divider {
    height: 1px;
    background: #E0E0D9;
    margin: 12px 0;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  } */

  @keyframes slideRight {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0); 
  }
}


  /* Header Styles */
  .main-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2000;
   
  }

  .main-header.scrolled {
    background-color: rgba(250, 250, 248, 0.9);
    
    backdrop-filter: blur(8px);                
   -webkit-backdrop-filter: blur(10px)
  }

  .main-header.menu-open {
  background-color: #FAFAF8 !important;  /* match menu background */
}

.main-header.menu-open .nav-link,
.main-header.menu-open img,
.main-header.menu-open button {
  color: black !important;
  filter: none !important;  /* stop logo being inverted */
}

.line {
  display: block;
  width: 1.5rem;   /* match your w-5/md:w-6 */
  height: 2px;
  border-radius: 1px;
}

  .header-nav {
   
  
  }

  .nav-desktop {
    display: none;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 90vw;
    margin: 0 auto;
   
  }

  @media (min-width: 768px) {
    .nav-desktop {
      display: flex;
   
    }
  }

  .nav-left, .nav-right {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex: 1;
  }

  .nav-left {
    justify-content: flex-start;
  }

  .nav-right {
    justify-content: flex-end;
  }

  .nav-center {
    flex: 0 0 auto;
  }

  .logo {
    transform: scale(0.8);
    filter: brightness(0) invert(1);
    transition: filter 300ms ease-in-out;
  }

  .main-header.scrolled .logo {
    filter: none;
  }

  .nav-link {
    font-family: 'DM Sans', sans-serif;
    
    font-weight: 500;
    color: white;
    background: none;
    border: none;
   
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap:0.5rem;
    
  }

  .main-header.scrolled .nav-link {
    color: black;
  }

  .nav-link .extra {
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    transition: max-width 0.4s ease, opacity 0.8s ease;
  }

  .nav-link:hover .extra {
    opacity: 1;
    max-width: 600px;
  }

  .cart-nav-btn {
    position: relative;
  }

  .cart-count {
    position: absolute;
    top: 0;
    right: 0;
    background: #000;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: 10px;
    min-width: 1.25rem;
    text-align: center;
  }

  /* Hero Section */
  .hero {
    height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .hero-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: -1;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    text-align: center;
    max-width: 800px;
    margin: 0 auto;
  }

  .hero-title {
    font-family: 'Romie', serif;
    line-height: 1.25;
    font-weight: 400;
    letter-spacing: 0.03em;
    color: white;
    margin: 0;
  }

  /* Products Section */
  .products-section {
    padding-bottom: 0;
  }

  .products-header {
    text-align: center;
  }

  .section-title.products {
    font-family: 'Romie', serif;
    font-weight: 500;
    text-align: center;
    color: #000;
    margin: 0;
  }

  .product-card {
    background-color: #FAFAF8;
    cursor: pointer;
    transition: transform 300ms ease-in 100ms;
    /* border-right: 0.75px solid #E0E0D9;
    border-bottom: 0.75px solid #E0E0D9;
    border-top: 0.75px solid #E0E0D9; */
  }

  /* .product-card:first-child {
    border-left: 0.5px solid #ababab;
  } */

  .product-image {
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 300ms ease-in;
  }

  .product-image img:hover {
    transform: scale(1.05);
  }

  .product-info {
    display: flex;
    justify-content: space-between;
  }

  .product-name {
    font-family: 'DM Sans', sans-serif;
    
  
    color: #000;
    line-height:1.2;
  }

  .product-name a {
    color: inherit;
    text-decoration: none;
    transition: color 0.3s ease;
  }

  .product-price {
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
    color:#212121;
    margin: 0;
  }

  .product-cart-btn {
    background: transparent;
    border: 1px solid #383838;
    
    cursor: pointer;
    transition: all 300ms ease-in 100ms;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
  }

  .product-cart-btn:hover {
    background-color: #000;
    color: white;
    transform: scale(1.1);
  }

  /* Pricing Section */
  .pricing-section {
    background: #FAFAF8;
    min-height: auto;
  }

  .pricing-container {
    max-width: 1400px;
    margin: 0 auto;
  }

  .pricing-header {
    text-align: center;
  }

  .section-label {
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: black;
    opacity: 50%;
    margin-bottom: 1rem;
  }

  .section-title {
    font-family: 'Romie', serif;
    line-height: 1.25;
    font-weight: 500;
    letter-spacing: 0.03em;
    color: #000;
    margin: 0;
  }

 /* --- Mobile: horizontal swipe with peek + snapping --- */
.pricing-cards-wrapper {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;

  /* peek effect: give symmetric horizontal padding so next/prev card edges show */
  padding-left: 7.5vw;
  padding-right: 7.5vw;

  /* small bottom padding so any rounded shadows don't clip */
  padding-bottom: 1rem;
}

/* hide native scrollbar (optional, prettier) */
.pricing-cards-wrapper::-webkit-scrollbar { display: none; }
.pricing-cards-wrapper { -ms-overflow-style: none; scrollbar-width: none; }

/* cards in the carousel */
.pricing-cards-wrapper .pricing-card {
  flex: 0 0 85vw;      /* each card fills ~85% of viewport -> shows peek of next */
  max-width: 85vw;
  scroll-snap-align: center;
  margin-right: 1rem;
  box-sizing: border-box;
}

  @media (min-width: 768px) {
   .pricing-cards-wrapper {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* md:grid-cols-2 */
    gap: 1.5rem; /* adjust to match md:gap-10 / your design */
    padding-left: 0;
    padding-right: 0;
    overflow-x: visible;
  }

  .pricing-cards-wrapper .pricing-card {
    flex: none;
    max-width: none;
    margin-right: 0;
    width: auto;
  }
}

  .pricing-card {
    background: #B8A8E8;
    border-radius: 1rem;

    transition: transform 300ms ease-in 100ms;
  }

  .pricing-card:hover {
    /* transform: scale(1.02); */
  }

  .plan-name {
    font-family: 'Romie', serif;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #000;
    margin-bottom: 1rem;
  }

  .plan-price {
    font-family: 'DM Sans', serif;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: #000;
    margin-bottom: 1.5rem;
  }

  .plan-description {
    font-family: 'DM Sans', sans-serif;
    line-height: 1.5;
    font-weight: 400;
    color: #000;
    opacity: 80%;
    margin-bottom: 2rem;
  }

  .features-title {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    color: #000;
  
  }

  .feature-item {
    font-family: 'DM Sans', sans-serif;
    line-height: 1.8;
    font-weight: 300;
    color: #000;
    opacity: 80%;
  }

  /* Value Section */
  .value-section {
    background-color: #B8A8E8;
    min-height: auto;

  }

  @media (min-width: 768px) {
    .value-section {
      min-height: 100dvh;
      display: flex;
      align-items: center;
    }
  }

  .value-container {
    width: 100%;
   
    margin: 0 auto;
  }

  .value-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  @media (min-width: 768px) {
    .value-content {
      flex-direction: row;
      align-items: center;
      gap: 3rem;
    }
  }

  .value-text {
    flex: 1;
  }

  .value-label {
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: black;
    opacity: 50%;
 
  }

  .value-title {
    font-family: 'Romie', serif;
    line-height: 1.25;
    font-weight: 500;
    letter-spacing: 0.03em;
    color: #000;

  }

  .value-subtitle {
    font-family: 'DM Sans', sans-serif;
    line-height: 1.5;
    font-weight: 400;
    color: #000;
  
  }

  .value-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
     align-items: center;
  }

  @media (min-width: 640px) {
    .value-buttons {
      flex-direction: row;
      align-items: center;
      gap: 2rem;
    }
  }

  .btn-primary {
    background: black;
    border: 1px solid #000;
    border-radius: 60px;
   
    font-family: 'DM Sans', sans-serif;
      font-weight: 600;
     /* padding: 1rem 2rem;
    font-size: 1rem;
  
    letter-spacing: 0.03em; */
    color: #ffffff;
    cursor: pointer;
    transition: transform 300ms ease-in 100ms;
    text-align: center;
    width: 100%;
  }

  @media (min-width: 640px) {
    .btn-primary {
      width: auto;
    
    }
  }

  .btn-primary:hover {
    transform: scale(1.03);
  }

  .value-visual {
    flex: 1;
    position: relative;
    min-height: 300px;
  }

  @media (min-width: 768px) {
    .value-visual {
      min-height: 500px;
    }
  }

  .value-visual img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.5rem;
  }

  /* Contact Section */
  .contact-section {
    background: #FAFAF8;
    height:80vh;
  }

  /* .contact-wrapper {
    max-width: 1400px;
    margin: 0 auto;
  } */

  .contact-grid {
    display: flex;
    flex-direction: column;
    gap: 3rem;

  }

  
  .contact-info {
    flex: 1;
    max-width: 500px;
  }

  @media (min-width: 1024px) {
    .contact-grid {
      flex-direction: row;
      gap: 4rem;
      align-items: flex-start;
    }
    .pricing-cards-wrapper {
    grid-template-columns: repeat(2, 1fr);
    max-width: 1000px;
    margin: 0 auto;
  }
  
  }


  @media (min-width: 1024px) {
    .contact-info {
      flex: 0 0 400px;
    }
  }

  .contact-label {
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: black;
    opacity: 50%;
    margin-bottom: 1rem;
  }

  .contact-form {
    flex: 1;
  }

  .contact-text {
    font-family: 'Romie', serif;
    font-weight: 400;
    color: #000;
    
  }

  .contact-text em {
    font-style: italic;
  }

  .contact-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid #ababab;
    font-family: 'Romie', serif;
    color: #383838;
    outline: none;
    padding: 0.25rem 0;
    
    width: 100%;
  }

  .contact-input.question {
    width: 100%;

  }

  .contact-input.name {
    width: 100%;
    margin-bottom: 3rem;
  }

  @media (min-width: 768px) {
    .contact-input.name {
      width: 50%;
    }
  }

  .contact-input::placeholder {
    color: #666;
    opacity: 25%;
  }

  .form-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .form-actions {
      flex-direction: row;
      align-items: center;
      gap: 2rem;
    }
  }

  .contact-submit {
    background: #000;
    color: white;
    border: none;
    border-radius: 50px;
  
    font-family: 'DM Sans', sans-serif;
   
    font-weight: 600;
    cursor: pointer;
    transition: transform 300ms ease-in 100ms;
    width: 100%;
  }

  @media (min-width: 640px) {
    .contact-submit {
      width: auto;
      padding: 1.5rem 3rem;
    
    }
  }

  .contact-submit:hover {
    transform: scale(1.03);
  }

  .faq-link {
   display: inline-flex; /* so padding/line height works like a button */
  text-align: center;
    justify-content: center;
  font-family: 'DM Sans', sans-serif;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 6px;
  transition: color 300ms ease-in 100ms;
  opacity: 80%;
  color: inherit;
   
  }

  .faq-link:hover {
    background: linear-gradient(
      90deg,
      #000000 0%,
      #4f4f4f 25%,
      rgb(159, 159, 159) 50%,
      #4f4f4f 75%,
      #000000 100%
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: shimmer 6s linear infinite;
    text-decoration-color: #000000;
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* Footer */
  .footer {
    background: #B8A8E8;
    position: relative;
    overflow: hidden;
    padding: 3rem 2rem;
    color: #222;
    min-height: auto;
  }

  @media (min-width: 768px) {
    .footer {
      padding: 4rem 3rem;
      min-height: 60dvh;
    }
  }

  @media (min-width: 1024px) {
    .footer {
      padding: 6rem 4rem;
      min-height: 80dvh;
    }
  }

  .footer-container {
    max-width: 80vw;

  }

  .footer-links-wrapper {
     display: grid;
  grid-template-columns: repeat(3, 1fr); /* This makes 3 equal columns on mobile */
  justify-content: space-between;

   
  }

  @media (min-width: 640px) {
    .footer-links-wrapper {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 768px) {
    .footer-links-wrapper {
      grid-template-columns: repeat(3, 1fr);
    
    }
  }

  .footer-links ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .footer-links li {
    margin-bottom: 0.75rem;
  }

  .footer-links a {
    text-decoration: none;
    color: #222;
    font-family: 'DM Sans', sans-serif;

    transition: color 0.2s ease;
  }

  @media (min-width: 768px) {
    .footer-links a {
  
    }
  }

  @media (min-width: 1024px) {
    .footer-links a {

    }
  }

  .footer-links a:hover {
    color: #555;
  }

  .footer-svg {
    position: absolute;
    bottom: -100px;
    left: 0;
    width: 100%;
    height: auto;
    object-fit: contain;
    
     filter: invert(1); 
  }

  @media (min-width: 768px) {
    .footer-svg {
     
      bottom: -50px;
    }
  }

  @media (min-width: 1024px) {
    .footer-svg {
      
      bottom: 0;
    }
  }

  .footer-copy {
    font-family: 'DM Sans', sans-serif;
    color: rgba(0, 0, 0, 0.5);
    text-align: center;
    margin-top: 2rem;
  }

  @media (min-width: 768px) {
    .footer-copy {
      text-align: right;
    }
  }
</style>