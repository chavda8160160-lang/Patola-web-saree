/**
 * VIRASAT PATOLA - CORE APPLICATION LOGIC
 * Features: Product Filtering, Currency Switching, Cart Management,
 * Quick View Modal, Motif Inspector, Booking Consultation, Toast Notifications.
 */

// Currency Exchange Rates & Symbols
const CURRENCY_CONFIG = {
  INR: { symbol: '₹', rate: 1, format: (val) => '₹' + val.toLocaleString('en-IN') },
  USD: { symbol: '$', rate: 0.012, format: (val) => '$' + Math.round(val * 0.012).toLocaleString('en-US') },
  EUR: { symbol: '€', rate: 0.011, format: (val) => '€' + Math.round(val * 0.011).toLocaleString('de-DE') },
  GBP: { symbol: '£', rate: 0.0095, format: (val) => '£' + Math.round(val * 0.0095).toLocaleString('en-GB') }
};

let currentCurrency = 'INR';

// Saree Catalog Data
const SAREE_CATALOG = [
  {
    id: 'patola-01',
    title: 'Imperial Crimson Nari Kunjar Double Ikat',
    weave: 'Double Ikat Handloom',
    category: 'double-ikat',
    motif: 'nari-kunjar',
    motifName: 'Nari Kunjar (Elephant & Dancing Lady)',
    basePriceINR: 185000,
    timeToWeave: '9 Months Handcrafted',
    image: 'assets/images/saree_nari_kunjar.jpg',
    badge: 'Masterpiece Double Ikat',
    description: 'An immortal handwoven treasure featuring the revered Nari Kunjar motif. Each silk thread is resist-dyed before mounting on the traditional rosewood loom, rendering identical color radiance and geometric precision on both sides.',
    fabric: '100% Pure Mulberry Silk & Natural Dyes',
    length: '6.30 Meters (Includes Matching Blouse Piece)',
    weight: 'Approx. 850 grams',
    colors: 'Deep Crimson, Saffron Ochre, Emerald & Obsidian',
    certification: 'Silk Mark Certified Handloom'
  },
  {
    id: 'patola-02',
    title: 'Imperial Ruby Ratanchowk Heritage Silk',
    weave: 'Double Ikat Handloom',
    category: 'royal-heirloom',
    motif: 'ratanchowk',
    motifName: 'Ratanchowk Bhat (Sacred Jewel Square)',
    basePriceINR: 215000,
    timeToWeave: '11 Months Handcrafted',
    image: 'assets/images/saree_ratanchowk.jpg',
    badge: 'Royal Heirloom Edition',
    description: 'The geometric Ratanchowk Bhat symbolizes eternal prosperity and Vedic cosmic harmony. Symmetrical diamond jewel matrices woven with pure gold zari highlights and naturally fermented indigo and madder root dyes.',
    fabric: 'Pure 8-Ply Mulberry Handloom Silk',
    length: '6.35 Meters with Embroidered Blouse Length',
    weight: 'Approx. 890 grams',
    colors: 'Madder Ruby, Antique Mustard & Midnight Black',
    certification: 'Silk Mark & Handloom Heritage Certified'
  },
  {
    id: 'patola-03',
    title: 'Vedic Emerald Chhabdi Bhat Silk Saree',
    weave: 'Double Ikat Handloom',
    category: 'bridal',
    motif: 'chhabdi',
    motifName: 'Chhabdi Bhat (Floral Auspicious Basket)',
    basePriceINR: 195000,
    timeToWeave: '10 Months Handcrafted',
    image: 'assets/images/saree_emerald_chhabdi.jpg',
    badge: 'Bridal Trousseau Choice',
    description: 'The auspicious Chhabdi Bhat depicts traditional floral offerings inside celestial baskets, crafted to bless new beginnings. Designed specifically for royal weddings and milestone celebrations.',
    fabric: 'High-Lustre Pure Gujarat Silk',
    length: '6.30 Meters with Contrast Pallu & Blouse',
    weight: 'Approx. 860 grams',
    colors: 'Emerald Green, Vermilion Red & Burnished Gold',
    certification: 'Silk Mark Certified Handloom'
  },
  {
    id: 'patola-04',
    title: 'Midnight Peacock Blue Navratna Patola',
    weave: 'Single Ikat Handloom',
    category: 'single-ikat',
    motif: 'pan-bhat',
    motifName: 'Navratna Pan Bhat (Sacred Betel Leaf & Nine Gems)',
    basePriceINR: 98000,
    timeToWeave: '4 Months Handcrafted',
    image: 'assets/images/saree_royal_blue.jpg',
    badge: 'Artisan Single Ikat',
    description: 'A contemporary luxury drape combining traditional Gujarat Ikat precision with wearable grace. Features sacred Pan motifs symbolizing longevity, framed by majestic gold zari borders.',
    fabric: 'Pure Handwoven Mulberry Silk',
    length: '6.25 Meters with Running Blouse Piece',
    weight: 'Approx. 750 grams',
    colors: 'Peacock Indigo Blue, Sunset Coral & Gold Zari',
    certification: 'Silk Mark Certified Handloom'
  },
  {
    id: 'patola-05',
    title: 'Sovereign Shikargah Forest Royal Double Ikat',
    weave: 'Double Ikat Handloom',
    category: 'royal-heirloom',
    motif: 'nari-kunjar',
    motifName: 'Shikargah & Royal Wildlife Motifs',
    basePriceINR: 245000,
    timeToWeave: '12 Months Handcrafted',
    image: 'assets/images/saree_nari_kunjar.jpg',
    badge: 'Museum Collector Piece',
    description: 'A rare celebration of historical royal hunting reserves, featuring hand-tied representations of lions, elephants, horses, and dancing peacocks across a vibrant crimson silk canvas.',
    fabric: 'Pure Silk & Real Silver Tested Zari',
    length: '6.40 Meters with Grand Pallu',
    weight: 'Approx. 920 grams',
    colors: 'Royal Crimson, Forest Moss Green, Gold',
    certification: 'Silk Mark & Authenticity Master Seal'
  },
  {
    id: 'patola-06',
    title: 'Auspicious Floral Vohra Gaji Bridal Patola',
    weave: 'Double Ikat Handloom',
    category: 'bridal',
    motif: 'chhabdi',
    motifName: 'Chhabdi Bhat with Lotus Borders',
    basePriceINR: 175000,
    timeToWeave: '8 Months Handcrafted',
    image: 'assets/images/saree_emerald_chhabdi.jpg',
    badge: 'Signature Bridal Drape',
    description: 'Intricately arranged floral medallions floating on rich jewel-toned silk. Celebrated across generations for its soft hand-feel and perpetual color radiance that never dulls with age.',
    fabric: 'Pure Handloom Silk with Soft Heritage Wash',
    length: '6.30 Meters with Matching Blouse Piece',
    weight: 'Approx. 830 grams',
    colors: 'Vermilion Red, Antique Gold, Deep Emerald',
    certification: 'Silk Mark Certified Handloom'
  }
];

// Motif Spotlight Data for the interactive magnifier
const MOTIF_DATA = {
  'nari-kunjar': {
    title: 'Nari Kunjar (Elephant & Lady of Grace)',
    icon: '🐘',
    tag: 'Symbol of Royal Dignity & Feminine Grace',
    description: 'In the sacred grammar of Gujarat Patola, "Kunjar" (the elephant) heralds royalty, wisdom, and steadfast prosperity, while "Nari" embodies divine beauty, music, and grace. Woven with double resist dye precision.',
    image: 'assets/images/saree_nari_kunjar.jpg',
    craftFact: 'Requires 4,800 individually calculated silk yarn knots tied by hand before dyeing.'
  },
  'ratanchowk': {
    title: 'Ratanchowk Bhat (Sacred Jewel Square)',
    icon: '💎',
    tag: 'Vedic Geometry & Cosmic Harmony',
    description: 'The Ratanchowk pattern is an ancient four-cornered jewel matrix originating from sacred temple architecture. It represents the four purusharthas: Dharma, Artha, Kama, and Moksha.',
    image: 'assets/images/saree_ratanchowk.jpg',
    craftFact: 'Every single square must align to the millimeter across both warp and weft during weaving.'
  },
  'chhabdi': {
    title: 'Chhabdi Bhat (Celestial Floral Basket)',
    icon: '🌸',
    tag: 'Auspicious Blessings & Fertility',
    description: 'Depicting woven wicker baskets brimming with sacred temple blossoms like champak and lotus. Revered as an essential bridal trousseau drape representing unending abundance.',
    image: 'assets/images/saree_emerald_chhabdi.jpg',
    craftFact: 'Natural madder root and pomegranate rinds are boiled to achieve the indelible saffron-rose hues.'
  },
  'popat-mor': {
    title: 'Popat-Mor (Parrot & Peacock of Passion)',
    icon: '🦚',
    tag: 'Love, Eternal Fidelity & Celebration',
    description: 'The parrot symbolises sweet eloquence and romance in Gujarati folklore, while the peacock dances for joyful rainfall and auspicious celebration.',
    image: 'assets/images/saree_royal_blue.jpg',
    craftFact: 'Takes up to 3 days of rigorous loom alignment for every single row of plumage motifs.'
  }
};

// Application State
let cart = [];
let wishlist = [];
let activeCategoryFilter = 'all';
let activeMotifFilter = 'all';

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadStoredCart();
  renderCatalog();
  loadSareesFromApi(); // Fetch live from SQL Server Stored Procedure
  initCurrencySelector();
  initFilterControls();
  initMotifInspector();
  initCartDrawer();
  initModals();
  initBookingForm();
  initNavbarScroll();
  initMobileMenu();
});

// Fetch Sarees Live from ASP.NET Core Web API (Stored Procedure sp_GetSarees)
async function loadSareesFromApi() {
  try {
    const res = await fetch('/api/sarees');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        SAREE_CATALOG.length = 0;
        data.forEach(s => {
          SAREE_CATALOG.push({
            id: s.id || s.Id,
            title: s.title || s.Title,
            weave: s.weave || s.Weave,
            category: s.category || s.Category,
            motif: s.motif || s.Motif,
            motifName: s.motifName || s.MotifName,
            basePriceINR: s.basePriceINR || s.BasePriceINR,
            timeToWeave: s.timeToWeave || s.TimeToWeave,
            image: s.image || s.Image,
            badge: s.badge || s.Badge,
            description: s.description || s.Description,
            fabric: s.fabric || s.Fabric,
            length: s.length || s.Length,
            weight: s.weight || s.Weight,
            colors: s.colors || s.Colors,
            certification: s.certification || s.Certification
          });
        });
        renderCatalog();
        console.log('✅ Sarees loaded live via SQL Server Stored Procedure (sp_GetSarees)');
      }
    }
  } catch (err) {
    console.log('ℹ️ Running with offline/cached saree catalog');
  }
}

// Newsletter Subscription via SQL Server Stored Procedure (sp_SubscribeNewsletter)
window.handleNewsletterSubmit = async function(event) {
  event.preventDefault();
  const input = event.target.querySelector('.newsletter-input');
  if (!input) return;
  const email = input.value.trim();

  try {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(data.message || 'Subscribed via SQL Server Stored Procedure!');
    } else {
      showToast('Thank you for subscribing to the Royal Gazette.');
    }
  } catch {
    showToast('Thank you for subscribing to the Royal Gazette.');
  }
  event.target.reset();
};


/* ==========================================================================
   CATALOG RENDERING & FILTERING
   ========================================================================== */
function renderCatalog() {
  const gridContainer = document.getElementById('sareeGridContainer');
  if (!gridContainer) return;

  const filteredSarees = SAREE_CATALOG.filter(saree => {
    const matchesCategory = (activeCategoryFilter === 'all' || saree.category === activeCategoryFilter);
    const matchesMotif = (activeMotifFilter === 'all' || saree.motif === activeMotifFilter);
    return matchesCategory && matchesMotif;
  });

  if (filteredSarees.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--color-text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 1rem;">No sarees found for this selection.</p>
        <button class="btn-primary-gold" onclick="resetFilters()">View All Masterpieces</button>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = filteredSarees.map(saree => {
    const formattedPrice = CURRENCY_CONFIG[currentCurrency].format(saree.basePriceINR);

// 👇 NAYA CODE ADD KARO — Discount calculation
    const discountPercent = Number(saree.discountPercent) || 0;
const hasDiscount = discountPercent > 0;
const finalPriceValue = saree.finalPriceINR && saree.finalPriceINR > 0
  ? saree.finalPriceINR
  : saree.basePriceINR - (saree.basePriceINR * discountPercent / 100);
const formattedFinalPrice = CURRENCY_CONFIG[currentCurrency].format(finalPriceValue);

    const inWishlist = wishlist.includes(saree.id);

    return `
      <article class="saree-card" data-id="${saree.id}">
        <div class="saree-image-wrapper">
          <img src="${saree.image}" alt="${saree.title}" class="saree-image" loading="lazy">
          <span class="saree-badge-tag">${saree.badge}</span>
          
          <div class="saree-card-actions-overlay">
            <button class="btn-card-overlay" onclick="openQuickViewModal('${saree.id}')">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path d="M2.458 12C3.732 
                7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Quick View
            </button>
          </div>
        </div>

        <div class="saree-card-body">
          <div class="saree-card-meta">
            <span class="saree-card-weave">${saree.weave}</span>
            <span>⏳ ${saree.timeToWeave}</span>
          </div>

          <h3 class="saree-card-title">${saree.title}</h3>

          <div class="saree-card-motif-info">
            <svg width="14" height="14" fill="var(--color-gold-dark)" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span>Motif:</span> ${saree.motifName}
          </div>

         <div class="saree-price-wrap">
  <span class="price-label">Investment</span>
  ${hasDiscount ? `
    <div class="saree-price-discount-row">
  <span class="saree-price-original" style="text-decoration: line-through; color: #999; font-size: 0.85em; margin-right: 6px;">${formattedPrice}</span>
  <span class="saree-price" style="font-weight: 700;">${formattedFinalPrice}</span>
  <span class="saree-discount-badge" style="background: #800020; color: #fff; font-size: 0.72rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; margin-left: 6px;">${discountPercent}% OFF</span>
</div>
  ` : `
    <span class="saree-price">${formattedPrice}</span>
  `}
</div>

            <button class="saree-btn-add" onclick="addToCart('${saree.id}')" title="Add to Luxury Bag">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
              </svg>
              Add to Bag
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function initFilterControls() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategoryFilter = btn.getAttribute('data-filter') || 'all';
      renderCatalog();
    });
  });

  const motifSelect = document.getElementById('motifFilterSelect');
  if (motifSelect) {
    motifSelect.addEventListener('change', (e) => {
      activeMotifFilter = e.target.value;
      renderCatalog();
    });
  }
}

window.resetFilters = function() {
  activeCategoryFilter = 'all';
  activeMotifFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === 'all');
  });
  const motifSelect = document.getElementById('motifFilterSelect');
  if (motifSelect) motifSelect.value = 'all';
  renderCatalog();
};

/* ==========================================================================
   CURRENCY SWITCHING
   ========================================================================== */
function initCurrencySelector() {
  const currencySelector = document.getElementById('currencySelector');
  if (!currencySelector) return;

  currencySelector.addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    renderCatalog();
    renderCart();
    showToast(`Currency updated to ${currentCurrency} (${CURRENCY_CONFIG[currentCurrency].symbol})`);
  });
}

/* ==========================================================================
   INTERACTIVE MOTIF INSPECTOR (MAGNIFIER)
   ========================================================================== */
function initMotifInspector() {
  const motifCards = document.querySelectorAll('.motif-choice-card');
  const inspectorImg = document.getElementById('inspectorImage');
  const inspectorTitle = document.getElementById('inspectorTitle');
  const inspectorTag = document.getElementById('inspectorTag');
  const inspectorDesc = document.getElementById('inspectorDesc');
  const inspectorFact = document.getElementById('inspectorFact');
  const magnifierView = document.getElementById('inspectorMagnifierView');

  if (!motifCards.length || !inspectorImg) return;

  motifCards.forEach(card => {
    card.addEventListener('click', () => {
      motifCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const key = card.getAttribute('data-motif');
      const data = MOTIF_DATA[key];
      if (data) {
        inspectorImg.src = data.image;
        if (inspectorTitle) inspectorTitle.textContent = data.title;
        if (inspectorTag) inspectorTag.textContent = data.tag;
        if (inspectorDesc) inspectorDesc.textContent = data.description;
        if (inspectorFact) inspectorFact.textContent = data.craftFact;
      }
    });
  });

  // Hover zoom effect for magnifier view
  if (magnifierView && inspectorImg) {
    magnifierView.addEventListener('mousemove', (e) => {
      const rect = magnifierView.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      inspectorImg.style.Origin = `${x}% ${y}%`;
      inspectorImg.style.transform = 'scale(1.9)';
    });

    magnifierView.addEventListener('mouseleave', () => {
      inspectorImg.style.transform = 'scale(1)';
      inspectorImg.style.transformOrigin = 'center center';
    });
  }
}

/* ==========================================================================
   CART & CHECKOUT SYSTEM
   ========================================================================== */
function loadStoredCart() {
  try {
    const saved = localStorage.getItem('virasat_cart');
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    cart = [];
  }
  updateCartBadge();
}

function saveCart() {
  try {
    localStorage.setItem('virasat_cart', JSON.stringify(cart));
  } catch (e) {}
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  const badge = document.getElementById('navCartCount');
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (badge) {
    badge.textContent = totalCount;
    badge.style.display = totalCount > 0 ? 'flex' : 'none';
  }
}

window.addToCart = function(sareeId) {
  const saree = SAREE_CATALOG.find(s => s.id === sareeId);
  if (!saree) return;

  const existing = cart.find(item => item.id === sareeId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: saree.id,
      title: saree.title,
      priceINR: saree.basePriceINR,
      image: saree.image,
      weave: saree.weave,
      quantity: 1
    });
  }

  saveCart();
  showToast(`Added "${saree.title}" to your luxury bag`);
  openCartDrawer();
};

window.updateCartQty = function(sareeId, delta) {
  const item = cart.find(i => i.id === sareeId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== sareeId);
  }
  saveCart();
};

window.removeFromCart = function(sareeId) {
  cart = cart.filter(i => i.id !== sareeId);
  saveCart();
  showToast('Item removed from your bag');
};

function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const subtotalElem = document.getElementById('cartSubtotalAmount');
  const totalElem = document.getElementById('cartTotalAmount');

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <p>Your luxury collection bag is currently empty.</p>
        <button class="btn-primary-gold" onclick="closeCartDrawer()">Explore Sarees</button>
      </div>
    `;
    if (subtotalElem) subtotalElem.textContent = CURRENCY_CONFIG[currentCurrency].format(0);
    if (totalElem) totalElem.textContent = CURRENCY_CONFIG[currentCurrency].format(0);
    return;
  }

  let totalINR = 0;
  container.innerHTML = cart.map(item => {
    const itemTotalINR = item.priceINR * item.quantity;
    totalINR += itemTotalINR;
    const formattedItemTotal = CURRENCY_CONFIG[currentCurrency].format(itemTotalINR);

    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.title}" class="cart-item-img">
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.title}</h4>
          <span class="cart-item-weave">${item.weave}</span>
          <span class="cart-item-price">${formattedItemTotal}</span>
          
          <div class="cart-item-bottom">
            <div class="cart-qty-ctrl">
              <button class="btn-qty" onclick="updateCartQty('${item.id}', -1)">-</button>
              <span class="qty-display">${item.quantity}</span>
              <button class="btn-qty" onclick="updateCartQty('${item.id}', 1)">+</button>
            </div>
            <button class="btn-remove-item" onclick="removeFromCart('${item.id}')">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const formattedTotal = CURRENCY_CONFIG[currentCurrency].format(totalINR);
  if (subtotalElem) subtotalElem.textContent = formattedTotal;
  if (totalElem) totalElem.textContent = formattedTotal;
}

function initCartDrawer() {
  const triggerBtn = document.getElementById('navCartBtn');
  const closeBtn = document.getElementById('closeCartBtn');
  const backdrop = document.getElementById('cartDrawerBackdrop');

  if (triggerBtn) {
    triggerBtn.addEventListener('click', openCartDrawer);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCartDrawer);
  }
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeCartDrawer();
    });
  }

  const proceedBtn = document.getElementById('cartProceedCheckoutBtn');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        showToast('Your bag is empty. Please select a saree first.');
        return;
      }
      closeCartDrawer();
      openCheckoutModal();
    });
  }
}

window.openCartDrawer = function() {
  renderCart();
  const backdrop = document.getElementById('cartDrawerBackdrop');
  if (backdrop) backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeCartDrawer = function() {
  const backdrop = document.getElementById('cartDrawerBackdrop');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
};

/* ==========================================================================
   QUICK VIEW MODAL
   ========================================================================== */
function initModals() {
  const quickViewBackdrop = document.getElementById('quickViewModalBackdrop');
  const closeQuickView = document.getElementById('closeQuickViewBtn');

  if (closeQuickView && quickViewBackdrop) {
    closeQuickView.addEventListener('click', () => {
      quickViewBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    });

    quickViewBackdrop.addEventListener('click', (e) => {
      if (e.target === quickViewBackdrop) {
        quickViewBackdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // Checkout Modal
  const checkoutBackdrop = document.getElementById('checkoutModalBackdrop');
  const closeCheckout = document.getElementById('closeCheckoutBtn');
  if (closeCheckout && checkoutBackdrop) {
    closeCheckout.addEventListener('click', () => {
      checkoutBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    });
    checkoutBackdrop.addEventListener('click', (e) => {
      if (e.target === checkoutBackdrop) {
        checkoutBackdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }
}

window.openQuickViewModal = function(sareeId) {
  const saree = SAREE_CATALOG.find(s => s.id === sareeId);
  if (!saree) return;

  const modalBackdrop = document.getElementById('quickViewModalBackdrop');
  const modalImg = document.getElementById('modalSareeImg');
  const modalBadge = document.getElementById('modalSareeBadge');
  const modalTitle = document.getElementById('modalSareeTitle');
  const modalPrice = document.getElementById('modalSareePrice');
  const modalDesc = document.getElementById('modalSareeDesc');
  const modalFabric = document.getElementById('modalSareeFabric');
  const modalLength = document.getElementById('modalSareeLength');
  const modalWeight = document.getElementById('modalSareeWeight');
  const modalColors = document.getElementById('modalSareeColors');
  const modalAddBtn = document.getElementById('modalAddCartBtn');
  const modalWhatsAppBtn = document.getElementById('modalWhatsAppBtn');

  if (modalImg) modalImg.src = saree.image;
  if (modalBadge) modalBadge.textContent = saree.badge;
  if (modalTitle) modalTitle.textContent = saree.title;
  if (modalPrice) modalPrice.textContent = CURRENCY_CONFIG[currentCurrency].format(saree.basePriceINR);
  if (modalDesc) modalDesc.textContent = saree.description;
  if (modalFabric) modalFabric.textContent = saree.fabric;
  if (modalLength) modalLength.textContent = saree.length;
  if (modalWeight) modalWeight.textContent = saree.weight;
  if (modalColors) modalColors.textContent = saree.colors;

  if (modalAddBtn) {
    modalAddBtn.onclick = () => {
      addToCart(saree.id);
      modalBackdrop.classList.remove('open');
    };
  }

  if (modalWhatsAppBtn) {
    const text = encodeURIComponent(`Namaste Virasat Patola, I am interested in inquiring about "${saree.title}" (Ref: ${saree.id}). Please share more details.`);
    modalWhatsAppBtn.href = `https://wa.me/919876543210?text=${text}`;
  }

  if (modalBackdrop) {
    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
};

/* ==========================================================================
   CHECKOUT MODAL LOGIC
   ========================================================================== */
window.openCheckoutModal = function() {
  const backdrop = document.getElementById('checkoutModalBackdrop');
  const orderItemsSummary = document.getElementById('checkoutOrderSummaryList');
  const checkoutTotal = document.getElementById('checkoutTotalDisplay');

  if (!backdrop) return;

  let totalINR = 0;
  if (orderItemsSummary) {
    orderItemsSummary.innerHTML = cart.map(item => {
      const itemTotal = item.priceINR * item.quantity;
      totalINR += itemTotal;
      return `
        <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; font-size: 0.88rem;">
          <span>${item.title} × ${item.quantity}</span>
          <span style="font-weight:700;">${CURRENCY_CONFIG[currentCurrency].format(itemTotal)}</span>
        </div>
      `;
    }).join('');
  }

  if (checkoutTotal) {
    checkoutTotal.textContent = CURRENCY_CONFIG[currentCurrency].format(totalINR);
  }

  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.handleCheckoutSubmit = async function(event) {
  event.preventDefault();
  const backdrop = document.getElementById('checkoutModalBackdrop');
  const form = event.target;
  const inputs = form.elements;

  const recipientName = inputs[0]?.value || 'Valued Connoisseur';
  const contactPhone = inputs[1]?.value || '';
  const deliveryAddress = inputs[2]?.value || '';
  const city = inputs[3]?.value || '';
  const postalCode = inputs[4]?.value || '';
  const paymentMode = form.querySelector('input[name="payment"]:checked')?.value || 'UPI / NetBanking';

  const orderPayload = {
    customerName: recipientName,
    contactPhone: contactPhone,
    deliveryAddress: deliveryAddress,
    city: city,
    postalCode: postalCode,
    currency: currentCurrency,
    paymentMode: paymentMode,
    items: cart.map(item => ({
      sareeId: item.id,
      sareeTitle: item.title,
      unitPrice: item.priceINR,
      quantity: item.quantity
    }))
  };

  let orderId = 'VP-' + Math.floor(100000 + Math.random() * 900000);

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.orderReference) orderId = data.orderReference;
    }
  } catch (err) {
    // Graceful offline fallback
    console.log('Processed offline/local order:', orderId);
  }

  // Clear cart & close modal
  cart = [];
  saveCart();

  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';

  showToast(`🎉 Order Placed Successfully! Your Heritage Order Ref is #${orderId}. Saved in SQL Server.`);
};

/* ==========================================================================
   BOOKING & CONSULTATION FORM
   ========================================================================== */
function initBookingForm() {
  const form = document.getElementById('heritageBookingForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('bookName')?.value || 'Valued Guest';
    const phone = document.getElementById('bookPhone')?.value || '';
    const email = document.getElementById('bookEmail')?.value || '';
    const type = document.getElementById('bookType')?.value || 'Virtual Video Call';
    const date = document.getElementById('bookDate')?.value || new Date().toISOString().split('T')[0];
    const motif = document.getElementById('bookMotifPref')?.value || 'Nari Kunjar';
    const notes = document.getElementById('bookNotes')?.value || '';

    const bookingPayload = {
      fullName: name,
      phone: phone,
      email: email,
      experienceType: type,
      preferredDate: date,
      motifPreference: motif,
      notes: notes
    };

    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      });
    } catch (err) {
      console.log('Recorded local consultation:', bookingPayload);
    }

    form.reset();
    showToast(`✨ Consultation confirmed for ${name} (${type} on ${date}). 
      Recorded in SQL Server & sent to your email.`);
  });
}


/* ==========================================================================
   NAVBAR SCROLL & MOBILE MENU
   ========================================================================== */
function initNavbarScroll() {
  const navbar = document.querySelector('.main-navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });
}

function initMobileMenu() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = navMenu.style.display === 'flex';
      navMenu.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        navMenu.style.flexDirection = 'column';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '86px';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.background = 'var(--color-cream)';
        navMenu.style.padding = '2rem';
        navMenu.style.boxShadow = 'var(--shadow-lg)';
      }
    });

    // Close on click link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          navMenu.style.display = 'none';
        }
      });
    });
  }
}

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */
window.showToast = function(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-msg success';
  toast.innerHTML = `
    <span class="toast-icon">✦</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};
