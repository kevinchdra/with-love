<script>
import { onMount } from 'svelte';
import MaskText from '../components/masktext.svelte';

const HeroHeading = [
  "Digital invites,",
  "Written like love letters."
];

const HeroSub = [
	"Thoughtfully written. Beautifully designed",
	"Crafted for the moment you've been waiting for."
];

const CollectionHeading = [
  "Our Collection"
];

const CollectionSub = [
"Everything a digital invite can do, and more."
];

const GuestbookHeading = [
	"Guestbooks",
];

const GuestbookSub = [
	"No more awkward spreadsheets.",
	"Just smooth arrivals & heartfelt notes.",
	
]

const GuestbookSub2 = [
	"Make check-ins effortless with our",
	"custom QR code system.",
]

const PlansHeading = [
	"Our Plans",
]

const PlansSub = [
	"Whether you need simple or something special.",
"Pick a plan that suits your needs — or reach out",
"and we'll tailor something just for you.",
]

const TableHeaders = [
  ["ESSENTIALS"],
  ["SIGNATURE"]
];

const TableFeatures = [
  ["RSVP & Guest Tracking"],
  ["Digital Dashboard (Track Gifts & Attendance)"],
  ["Google Map & Calendar Integration"],
  ["WeChat & WhatsApp Ready"],
  ["Send Invites with One Click"],
  ["Countdown Timers"],
  ["Personalised links"],
  ["Wish Wall"],
  ["Custom Background Music"]
];


//Navbar Viewport
onMount(() => {
	const navbar = document.getElementById("navbar");
	const trigger = document.getElementById("trigger");
	const guestbookSection = document.getElementById("guestbook-section");
	
	// Navbar show/hide observer
	const visibilityObserver = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) {
				navbar.classList.add("opacity-100", "pointer-events-auto");
			} else {
				navbar.classList.remove("opacity-100", "pointer-events-auto");
			}
		},
		{ threshold: 0 }
	);
	visibilityObserver.observe(trigger);
	
	// Navbar color change when over specific section
	const colorObserver = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
				navbar.classList.add("navbar-dark");
			} else {
				navbar.classList.remove("navbar-dark");
			}
		},
		{
			threshold: [0.6],
			rootMargin: "0px 0px -300px 0px"
		}
	);
	colorObserver.observe(guestbookSection);
});

//FAQ's
let faqs = [
	{
		question: 'How do I order?',
		answer: 'You can order by contacting us via email or using the order form on our website.',
		open: false
	},
	{
		question: 'Can we change background video with photos?',
		answer: 'Yes, you can replace the video with a photo slideshow or static images.',
		open: false
	},
	{
		question: 'Can I request custom background music?',
		answer: 'Absolutely! You can send us your preferred music and we will include it.',
		open: false
	},
	{
		question: 'What if I have 2 different event sessions?',
		answer: 'We can create multiple sections or pages to accommodate your sessions.',
		open: false
	},
	{
		question: 'Can I change fonts?',
		answer: 'Yes, font customization is available for both packages.',
		open: false
	}
];

function toggle(index) {
	faqs[index].open = !faqs[index].open;
}

// Scroll animation setup - using vanilla JS approach
let containerRef;
let heroSection;
let catalogSection;
let scrollProgress = 0;

// Transform values calculated from scroll
let heroScale = 1;
let heroRotate = 2.5;
let catalogScale = 0.9;
let catalogRotate = 2;

onMount(() => {
	const handleScroll = () => {
		if (containerRef) {
			const rect = containerRef.getBoundingClientRect();
			const windowHeight = window.innerHeight;
			
			// Calculate scroll progress (0 to 1)
			const scrollDistance = -rect.top;
            const maxScroll = windowHeight * 0.8; // Reduced scroll distance needed
            scrollProgress = Math.min(1, Math.max(0, scrollDistance / maxScroll));
			
			// Update transform values based on scroll progress
			heroScale = 1 - (scrollProgress * 0.15); // 1 to 0.8
			heroRotate = scrollProgress * -3; // 0 to -5
			catalogScale = 0.9 + (scrollProgress * 0.1); // 0.8 to 1
			catalogRotate = 2 - (scrollProgress * 2); // 5 to 0
			

			// Apply transforms directly
			if (heroSection) {
				heroSection.style.transform = `scale(${heroScale}) rotate(${heroRotate}deg)`;
			}
			if (catalogSection) {
				catalogSection.style.transform = `scale(${catalogScale}) rotate(${catalogRotate}deg)`;
			}
		}
	};
	
	// Add scroll listener
	window.addEventListener('scroll', handleScroll);
	handleScroll(); // Initial call
	
	 // Fade in observer setup
    let fadeInObserver;
    fadeInObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-show');
                fadeInObserver.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    });

    // Observe all elements with fade-in-hidden class
    document.querySelectorAll('.fade-in-hidden').forEach((element) => {
        fadeInObserver.observe(element);
    });

    // Single cleanup function that handles both
    return () => {
        window.removeEventListener('scroll', handleScroll);
        if (fadeInObserver) {
            fadeInObserver.disconnect();
        }
    };
});

import { goto } from '$app/navigation';

  function handleBuyNow() {
    goto('/checkout-section/plan-selection');
  }
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');


:global(html) {
	font-family: 'DM Sans', sans-serif;
	background-color: #FAFAF8;
	color: #000;
}

.navbar-dark {
	background-color: black !important;
	color: white;
}

.navbar-dark button {
	color: white !important;
}

.navbar-dark button:hover {
	color: #F5A3B3 !important;
}

#navbar {
	transition: background-color 0.8s ease, color 0.8s ease, opacity 0.8s ease, transform 0.8s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

:global(.animate-fade-in) {
    animation: fadeIn 1s ease-in forwards;
}

/* Mobile-specific styles */
@media (max-width: 768px) {

}

.fade-in-hidden {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.8s ease-out, transform 0.8s ease-out;
    will-change: opacity, transform;
}

.fade-in-show {
    opacity: 1;
    transform: translateY(0);
}
</style>

<!-- Container with 200vh height for scroll effect -->
<main bind:this={containerRef} class="relative height-[200vh] min-h-screen">
	<!-- Mobile-optimized Navbar -->
	<div
		id="navbar"
		class="fixed top-3 right-3 sm:top-6 sm:right-6 text-black rounded-full px-3 py-2 sm:px-6 sm:py-2 flex items-center space-x-4 sm:space-x-8 z-50 opacity-0 pointer-events-none transition-all duration-500 ease-in-out"
	>
		<!-- Menu Button -->
		<button class="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium tracking-widest">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			<span class="hidden sm:inline">MENU</span>
		</button>
		<!-- Cart Button -->
		<!-- <button class="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium tracking-widest">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 7M7 13l-1.3 5H18m0 0a1 1 0 102 0m-2 0a1 1 0 11-2 0" />
			</svg>
			<span class="hidden sm:inline">CART</span>
		</button> -->
	</div>

	<!-- Hero Section (Section 1) - Now sticky with scroll animations -->
	<section 
		bind:this={heroSection}
		class="sticky top-15 relative w-full  flex items-center justify-center px-6 sm:px-10"
		style="transition: transform 0.1s ease-out;"
	>
		<!-- Left: Text Content -->
		<div class="flex-1 max-w-lg text-left">
			<div class="font-['Romie_Regular'] text-5xl">
				<MaskText phrases={HeroHeading} />
			</div>
			<p class="mt-6 text-gray-700 text-sm sm:text-lg leading-relaxed">
				<MaskText phrases={HeroSub} />
			</p>
		</div>
		<!-- Right: Image + overlay -->
		<div class="relative flex-1 max-w-xl mt-12 sm:mt-0 fade-in-hidden">
			<!-- Hero image -->
			<img src="landingpage/heroimage.png" alt="Hero Couple" class="ml-auto max-w-[300px] sm:max-w-[400px] rotate-[-3deg]" />
			<!-- Overlay PNG -->
			<img
				src="landingpage/withlove.png"
				alt="With Love"
				class="absolute top-[-3rem] left-[1rem] sm:top-[-1rem] sm:left-[2rem] w-50 sm:w-74 rotate-[-3deg] pointer-events-none select-none"
			/>
		</div>
			</section>

	<!-- Catalog Section (Section 2) - With scroll animations -->
	<section
		bind:this={catalogSection}
		class="relative min-h-screen bg-[#FAFAF8]"
		style="transition: transform 0.1s ease-out;"
	>
		<div id="trigger" class="h-1"></div>
		
		<!-- Collection Section -->
		<section class="text-center pt-12 sm:pt-20 md:pt-30 pb-20 sm:pb-40 md:pb-60 px-6 sm:px-20 md:px-40">
			<div class="flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-12 md:gap-20">
				<!-- Left illustration -->
				<img src="/landingpage/illus-1.png" alt="Left Illustration" class="w-12 sm:w-16 md:w-30" />
				<!-- Heading + paragraph -->
				<div class="max-w-xl">
					<h2 class="text-2xl sm:text-3xl md:text-5xl font-['Romie_Regular']"><MaskText phrases={CollectionHeading}/></h2>
					<p class="text-gray-800 text-sm sm:text-md md:text-xl mt-2 sm:mt-4 tracking-[0.66px]">
						<MaskText phrases={CollectionSub}/>
					</p>
				</div>
				<!-- Right illustration -->
				<img src="/landingpage/illus-1.png" alt="Right Illustration" class="w-12 sm:w-16 md:w-30" />
			</div>
			<hr class="my-8 sm:my-12 border-gray-600">
			<!-- Cards Grid - Mobile Optimized -->
			<div class="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-2 sm:px-4 md:px-20">
				{#each Array(3) as _, index}
				<!-- Card -->
				<div class="rounded-md fade-in-hidden">
				<div class="relative w-full aspect-square group rounded-xl">
					<img
						src="/landingpage/card-placeholder.png"
						alt="Card demo"
						class="w-full h-full object-cover transition duration-300 transform group-hover:scale-105 group-hover:brightness-70"
					/>
					<!-- Preview Demo Button -->
					<a href="/demos/public-floral" class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
						<span class="bg-transparent text-white/80 px-3 py-2 sm:px-4 sm:py-2 rounded-md font-semibold text-xs sm:text-sm shadow-md tracking-[0.66px]">
							PREVIEW
						</span>
					</a>
				</div>

					<div class="mt-4 sm:mt-6 flex flex-col items-start space-y-1">
						<h3 class="text-lg sm:text-xl md:text-2xl text-left tracking-[0.66px]">The Night We Met</h3>
						<p class="text-sm sm:text-[16px] md:text-[20px] text-gray-400 text-left tracking-[0.66px]">
							Rp. 150,000 - 200,000
						</p>
						<button  
							on:click={handleBuyNow} 
							class="transition-transform hover:scale-[1.02] mt-3 sm:mt-4 bg-black text-white text-xs sm:text-sm md:text-md px-12 py-2 sm:px-8 sm:py-3 rounded-full tracking-[2px] sm:tracking-[4px] font-bold w-[calc(100%-1rem)] sm:w-auto mx-2 sm:mx-0"
							>
							SHOP NOW
							</button>
					</div>
				</div>
				{/each}
			</div>
		</section>
	</section>
</main>

<!-- Guestbook Section -->
<section id="guestbook-section" class="relative bg-[#F5A3B3] min-h-screen ">
	<div class="container mx-auto h-full flex items-center">
    <div class="flex flex-col md:flex-row items-center justify-between py-20 px-6 sm:px-20 md:px-40 gap-24 md:gap-44">
		<!-- Left text content -->
		<div class=" text-black text-center md:text-left order-2 md:order-1 pr-12">
			<img src="/landingpage/illus-1.png" alt="Icon" class="w-12 sm:w-16 md:w-30" />
			<h2 class="mt-6 sm:mt-8 md:mt-12 text-2xl sm:text-3xl md:text-5xl font-['Romie_Regular']">
				<MaskText phrases={GuestbookHeading}/>
			</h2>
			<p class="text-base sm:text-lg md:text-xl lg:text-2xl mt-4 sm:mt-6 md:mt-8 leading-relaxed">
				<MaskText phrases={GuestbookSub}/>
				
			</p>
			<p class="text-base sm:text-lg md:text-xl lg:text-2xl mt-4 sm:mt-6 md:mt-8 leading-relaxed">
				<MaskText phrases={GuestbookSub2}/>
			</p>
			<button class="transition-transform hover:scale-[1.02] mt-12 sm:mt-14	 bg-black text-white text-xs sm:text-sm md:text-md px-12 py-2 sm:px-8 sm:py-3 rounded-full tracking-[2px] sm:tracking-[4px] font-bold w-[calc(100%-1rem)] sm:w-auto mx-2 sm:mx-0">
				VIEW MORE
			</button>
		</div>
		<!-- Right-side image -->
		<div class="flex items-center justify-center pl-20 order-1 md:order-2 mb-8 md:mb-0 fade-in-hidden">
			<img src="/landingpage/guestbook-placeholder.png" alt="QR Hand" class="max-w-[280px] sm:max-w-[350px] md:max-w-none w-full h-auto object-contain rounded-2xl" />
		</div>
	</div>
	</div>
</section>

<!-- Plans Section -->
<section class="py-12 sm:py-20 md:py-30 px-6 sm:px-20 md:px-40 snap-start">
	<div class="mt-6 sm:mt-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8">
		<div class="flex-1">
			<h2 class="text-2xl sm:text-3xl md:text-5xl font-['Romie_Regular']"><MaskText phrases={PlansHeading}/></h2>
			<p class="mt-4 sm:mt-6 text-gray-600 text-sm sm:text-md md:text-xl leading-relaxed">
				<MaskText phrases={PlansSub}/>
			</p>
		</div>
		<div class="w-full md:w-1/3 flex justify-center ">
			<img src="/landingpage/illus-1.png" alt="Decorative" class="w-12 sm:w-16 md:w-30 fade-in-hidden" />
		</div>
	</div>
	
	<!-- Mobile-friendly table -->
	<div class="mt-8 sm:mt-10 overflow-x-auto">
		<table class="min-w-full border-collapse border-spacing-0 text-sm sm:text-base md:text-xl">
    <thead>
        <tr class="border-t border-b border-black">
            <th class="text-left p-2 sm:p-4 font-semibold border-r border-gray-300 min-w-[200px]"></th>
            {#each TableHeaders as header, i}
                <th class="text-center p-2 sm:p-4 font-semibold border-r border-gray-300 min-w-[120px]">
                    <MaskText phrases={header} />
                </th>
            {/each}
        </tr>
    </thead>
    <tbody>
        {#each TableFeatures as feature, i}
        <tr>
            <td class="border-r border-gray-300 p-0">
                <div class={`p-2 sm:p-3 ${i === 0 ? 'pt-4 sm:pt-8' : ''} ${i === 8 ? 'pb-4 sm:pb-8' : ''}`}>
                    <MaskText phrases={feature} />
                </div>
            </td>
            <td class="text-center border-r border-gray-300 p-0">
                <div class={`p-2 sm:p-3 ${i === 0 ? 'pt-4 sm:pt-8' : ''} ${i === 8 ? 'pb-4 sm:pb-8' : ''}`}>
                    {#if i < 6}
                    <img src="landingpage/checkmark.png" alt="Checkmark" class="mx-auto w-4 h-3 sm:w-5 sm:h-4" />
                    {/if}
                </div>
            </td>
            <td class="text-center p-0">
                <div class={`p-2 sm:p-3 ${i === 0 ? 'pt-4 sm:pt-8' : ''} ${i === 8 ? 'pb-4 sm:pb-8' : ''}`}>
                    <img src="landingpage/checkmark.png" alt="Checkmark" class="mx-auto w-4 h-3 sm:w-5 sm:h-4" />
                </div>
            </td>
        </tr>
        {/each}
    </tbody>
    <tfoot>
        <tr class="border-t border-gray-300">
            <td colspan="3" class="border-t border-black pt-2 sm:pt-4"></td>
        </tr>
    </tfoot>
</table>
	</div>
</section>

<!-- FAQ Section -->
<section class="px-6 sm:px-20 md:px-40 py-12 sm:py-20 pb-20 sm:pb-40 snap-start">
	<h2 class="text-2xl sm:text-3xl md:text-5xl font-['Romie_Regular']">Frequently Asked Questions</h2>
	<ul class="divide-y mt-6 sm:mt-8 text-sm sm:text-md md:text-xl">
		{#each faqs as faq, i}
		<li class="py-3 sm:py-4 cursor-pointer" on:click={() => toggle(i)} on:keydown={(e) => e.key === 'Enter' && toggle(i)} role="button" tabindex="0">
			<div class="flex justify-between items-center hover:text-[#F5A3B3] transition-colors">
				<span class="pr-4">{faq.question}</span>
				<span class="text-xl sm:text-2xl flex-shrink-0">{faq.open ? '−' : '+'}</span>
			</div>
			{#if faq.open}
			<p class="mt-2 text-gray-600 text-xs sm:text-base md:text-lg pr-4">{faq.answer}</p>
			{/if}
		</li>
		{/each}
	</ul>
</section>

<!-- Footer -->
<footer class="bg-[#570400] text-white py-8 sm:py-10 px-6 sm:px-20 md:px-40">
	<div class="flex flex-col md:flex-row md:justify-between space-y-8 md:space-y-0">
		<div class="flex flex-col space-y-6 sm:space-y-10">
			<h2 class="font-bold text-lg sm:text-xl tracking-[3px] sm:tracking-[5px] opacity-90">WITH LOVE</h2>
			<p class="text-2xl sm:text-3xl font-['Romie_Regular'] leading-wide">
				Digital invites,<br>Written like love letters.
			</p>
			<p class="text-xs opacity-70">© withlove. All rights reserved</p>
		</div>

		<div class="flex flex-col sm:flex-row md:flex-row gap-8 sm:gap-12 md:gap-24 text-sm sm:text-md tracking-[0.8px]">
			<!-- Column 1 -->
			<div class="flex flex-col space-y-3 sm:space-y-5">
				<a href="#" class="opacity-70 hover:opacity-100 transition-opacity duration-200">About Us</a>
				<a href="#" class="opacity-70 hover:opacity-100 transition-opacity duration-200">Features</a>
				<a href="#" class="opacity-70 hover:opacity-100 transition-opacity duration-200">Contact</a>
			</div>
			<!-- Column 2 -->
			<div class="flex flex-col space-y-3 sm:space-y-5">
				<a href="#" class="opacity-70 hover:opacity-100 transition-opacity duration-200">Refund Policy</a>
				<a href="#" class="opacity-70 hover:opacity-100 transition-opacity duration-200">FAQ</a>
			</div>
			<!-- Column 3 -->
			<div class="flex flex-col space-y-3 sm:space-y-5">
				<a href="#" class="opacity-70 hover:opacity-100 transition-opacity duration-200">Instagram</a>
				<a href="#" class="opacity-70 hover:opacity-100 transition-opacity duration-200">Tiktok</a>
			</div>
		</div>
	</div>
</footer>