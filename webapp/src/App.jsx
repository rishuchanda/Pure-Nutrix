import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Hero3D from './components/Hero3D';
import PromoTicker from './components/PromoTicker';
import ShopByConcern from './components/ShopByConcern';
import MobileTabBar from './components/MobileTabBar';
import PromiseStrip from './components/PromiseStrip';
import HelpCta from './components/HelpCta';
import RecentlyViewed from './components/RecentlyViewed';
import ProductShowcase from './components/ProductShowcase';
import WhyChooseUs from './components/WhyChooseUs';
import HowItWorks from './components/HowItWorks';
import HomeFaq from './components/HomeFaq';
import MarketplaceStrip from './components/MarketplaceStrip';
import TrustSection from './components/TrustSection';
import Footer from './components/Footer';
import { supabase } from './supabaseClient';
import { requestPushPermissionAndSubscribe } from './pushNotifications';
import Lenis from 'lenis';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { getLiveSEOConfig } from './utils/seoConfig';
import { parsePath, getPathForView } from './parsePath';


import ChatbotWidget from './components/ChatbotWidget';
import ExitOffer from './components/ExitOffer';

// Pages that are not needed for the first screen are loaded on demand, so the
// home page downloads far less JavaScript (admin, CRM, GST, PDF code etc.).
const loadProducts = () => import('./components/ProductsPage');
const loadPdp = () => import('./components/ProductDetailsPage');
const loadCart = () => import('./components/CartPage');
const loadOrder = () => import('./components/OrderPage');
const AuthModal = lazy(() => import('./components/AuthModal'));
const OrderPage = lazy(loadOrder);
const AccountPage = lazy(() => import('./components/AccountPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const LabReportPage = lazy(() => import('./components/LabReportPage'));
const ProductsPage = lazy(loadProducts);
const ProductDetailsPage = lazy(loadPdp);
const CartPage = lazy(loadCart);
const QualityStandardsPage = lazy(() => import('./components/QualityStandardsPage'));
const LegalPolicyPage = lazy(() => import('./components/LegalPolicyPage'));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage'));
const SupportPage = lazy(() => import('./components/SupportPage'));

const PageLoader = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinning" style={{ width: 36, height: 36, border: '3px solid #111', borderTopColor: 'transparent', borderRadius: '50%' }} />
  </div>
);
const Lazy = ({ children }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

function App() {
  const { scrollYProgress } = useScroll();
  const [user, setUser] = useState(null);
  const [liveSEO, setLiveSEO] = useState(getLiveSEOConfig());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const isPathAdmin = window.location.pathname === '/admin';
    if (isPathAdmin) return 'admin';
    const { view } = parsePath(window.location.pathname);
    return view;
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  // The cart used to live only in memory, so a refresh - or coming back later -
  // silently emptied it, and abandoned-cart recovery was impossible.
  const CART_STORAGE_KEY = 'pn_cart';
  const [cartToast, setCartToast] = useState(null);
  useEffect(() => {
    if (!cartToast) return undefined;
    const t = setTimeout(() => setCartToast(null), 3500);
    return () => clearTimeout(t);
  }, [cartToast]);

  // After the first screen is ready, quietly fetch the shop pages in the
  // background so opening a product or the cart feels instant.
  useEffect(() => {
    const warm = () => { loadProducts(); loadPdp(); loadCart(); };
    if ('requestIdleCallback' in window) { const id = window.requestIdleCallback(warm, { timeout: 4000 }); return () => window.cancelIdleCallback?.(id); }
    const t = setTimeout(warm, 2500); return () => clearTimeout(t);
  }, []);

  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(i => i && i.product && i.product.id) : [];
    } catch {
      return [];
    }
  });

  // After an order is placed, take the ordered products out of the cart. A cart
  // checkout keeps a copy for the success screen, so it doesn't flip to "loading".
  const [placedCartItems, setPlacedCartItems] = useState(null);
  const handleOrderPlaced = (items, fromCart) => {
    if (fromCart) setPlacedCartItems(items);
    const ordered = new Set((items || []).map(i => i?.product?.id));
    setCartItems(prev => prev.filter(i => !ordered.has(i.product.id)));
  };
  useEffect(() => { if (currentView !== 'order') setPlacedCartItems(null); }, [currentView]);
  const orderCartItems = placedCartItems || cartItems;

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // storage blocked (private window, full quota) - cart still works for this visit
    }
  }, [cartItems]);

  useEffect(() => {
    const handlePopState = async (event) => {
      const state = event.state;
      if (state && state.view) {
        setCurrentView(state.view);
        if (state.product) setSelectedProduct(state.product);
      } else {
        const { view, slug: productSlug } = parsePath(window.location.pathname);
        const validViews = ['home', 'order', 'account', 'products', 'pdp', 'cart', 'quality-standards', 'legal-policy', 'privacy-policy', 'support', 'whatsapp', 'lab-report'];
        
        if (validViews.includes(view)) {
          if ((view === 'pdp' || view === 'order') && productSlug) {
            try {
              const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('slug', productSlug)
                .single();
                
              if (data) {
                setSelectedProduct(data);
                setCurrentView(view);
              } else {
                const { data: idData } = await supabase.from('products').select('*').eq('id', productSlug).single();
                if (idData) {
                  setSelectedProduct(idData);
                  setCurrentView(view);
                } else {
                  setCurrentView('products');
                  window.history.replaceState({ view: 'products' }, '', getPathForView('products'));
                }
              }
            } catch (err) {
              setCurrentView('products');
              window.history.replaceState({ view: 'products' }, '', getPathForView('products'));
            }
          } else {
            setCurrentView(view);
          }
        } else {
          setCurrentView('home');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initial load
    const isPathAdmin = window.location.pathname === '/admin';
    const { view: initialView, slug: initialSlug } = parsePath(window.location.pathname);
    const validViews = ['home', 'order', 'account', 'products', 'pdp', 'cart', 'quality-standards', 'legal-policy', 'privacy-policy', 'support', 'whatsapp', 'lab-report'];

    if (isPathAdmin) {
      // Do nothing to the hash if we are on the admin page
    } else if (validViews.includes(initialView) && initialView !== 'home') {
      const state = window.history.state;
      
      if (state && state.product) {
        setSelectedProduct(state.product);
        setCurrentView(initialView);
      } else if ((initialView === 'pdp' || initialView === 'order') && initialSlug) {
        // We have a slug but no state, fetch it
        supabase
          .from('products')
          .select('*')
          .eq('slug', initialSlug)
          .single()
          .then(({ data, error }) => {
             if (data) {
               setSelectedProduct(data);
               setCurrentView(initialView);
             } else {
               // Fallback to id
               return supabase.from('products').select('*').eq('id', initialSlug).single();
             }
          })
          .then(res => {
             if (res && res.data) {
               setSelectedProduct(res.data);
               setCurrentView(initialView);
             } else if (res && res.error) {
               setCurrentView('products');
               window.history.replaceState({ view: 'products' }, '', getPathForView('products'));
             }
          });
      } else if ((initialView === 'pdp' || initialView === 'order') && !initialSlug) {
        setCurrentView('products');
        window.history.replaceState({ view: 'products' }, '', getPathForView('products'));
      } else {
        setCurrentView(initialView);
        if (!state || !state.product) {
          // keep /account/orders etc. so My Account can open the right section
          const keepPath = initialView === 'account' ? window.location.pathname : getPathForView(initialView, initialSlug);
          window.history.replaceState({ view: initialView }, '', keepPath);
        }
      }
    } else {
      setCurrentView('home');
      window.history.replaceState({ view: 'home' }, '', getPathForView('home'));
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    
    // Meta Pixel AddToCart
    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        value: typeof product.price === 'number' ? product.price : Number(String(product.price).replace(/[^0-9.-]+/g, "")),
        currency: 'INR'
      });
    }

    // Tiny haptic tap on phones that support it
    try { navigator.vibrate && navigator.vibrate(12); } catch { /* not supported */ }

    // Small non-blocking confirmation instead of a browser alert
    setCartToast({ name: product.name?.length > 40 ? product.name.slice(0, 38) + '…' : product.name, at: Date.now() });
  };

  const handleUpdateCartQty = (productId, qty) => {
    setCartItems(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleOpenCart = () => {
    setCurrentView('cart');
    window.history.pushState({ view: 'cart' }, '', getPathForView('cart'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAccount = () => {
    setCurrentView('account');
    window.history.pushState({ view: 'account' }, '', getPathForView('account'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrder = (product) => {
    setSelectedProduct(product);
    setCurrentView('order');
    const path = getPathForView('order', product.slug || product.id);
    window.history.pushState({ view: 'order', product }, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Meta Pixel InitiateCheckout
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: [String(product.id || product.slug)],
        content_type: 'product',
        content_name: product.name,
        value: typeof product.price === 'number' ? product.price : Number(String(product.price).replace(/[^0-9.-]+/g, "")),
        currency: 'INR'
      });
      // Fallback custom event to guarantee it shows up
      window.fbq('trackCustom', 'ClickedBuyNow', {
        product: product.name,
        url: window.location.href
      });
    }
  };

  const handleOpenProducts = () => {
    setCurrentView('products');
    window.history.pushState({ view: 'products' }, '', getPathForView('products'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenQuality = () => {
    setCurrentView('quality-standards');
    window.history.pushState({ view: 'quality-standards' }, '', getPathForView('quality-standards'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLegalPolicy = () => {
    setCurrentView('legal-policy');
    window.history.pushState({ view: 'legal-policy' }, '', getPathForView('legal-policy'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPrivacyPolicy = () => {
    setCurrentView('privacy-policy');
    window.history.pushState({ view: 'privacy-policy' }, '', getPathForView('privacy-policy'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSupport = () => {
    setCurrentView('support');
    window.history.pushState({ view: 'support' }, '', getPathForView('support'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProductDetails = (product) => {
    setSelectedProduct(product);
    setCurrentView('pdp');
    const path = getPathForView('pdp', product.slug || product.id);
    window.history.pushState({ view: 'pdp', product }, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedProduct(null);
    window.history.pushState({ view: 'home' }, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Check URL for admin route
    if (window.location.pathname === '/admin') {
      setCurrentView('admin');
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        requestPushPermissionAndSubscribe(session.user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        requestPushPermissionAndSubscribe(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // WhatsApp QR Code Redirection Logic
  useEffect(() => {
    if (currentView === 'whatsapp') {
      // "Hi" opens the WhatsApp menu bot; ?p=<product slug> adds which product they were looking at.
      const waHello = () => {
        const p = new URLSearchParams(window.location.search).get('p');
        return p ? `Hi! I want to know about ${p.replace(/[^a-z0-9-]/gi, '').replace(/-/g, ' ').slice(0, 60)}` : 'Hi';
      };
      const fetchAndRedirect = async () => {
        try {
          const { data: phone, error } = await supabase.rpc('get_active_whatsapp_number');
          const targetPhone = phone || '917976979355' /* CRM (WhatsApp API) number */;
          window.location.replace(`https://wa.me/${targetPhone}?text=${encodeURIComponent(waHello())}`);
        } catch (err) {
          console.error('Redirect fallback to personal WhatsApp', err);
          const targetPhone = '917976979355' /* CRM (WhatsApp API) number */;
          window.location.replace(`https://wa.me/${targetPhone}?text=${encodeURIComponent(waHello())}`);
        }
      };
      fetchAndRedirect();
    }
  }, [currentView]);

  useEffect(() => {
    const lenis = new Lenis({
      smoothTouch: true,
      lerp: 0.08
    });
    window.lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const handleSEOUpdate = () => {
      setLiveSEO(getLiveSEOConfig());
    };
    window.addEventListener('pn_seo_config_updated', handleSEOUpdate);
    return () => window.removeEventListener('pn_seo_config_updated', handleSEOUpdate);
  }, []);

  // Track Meta Pixel PageView on route changes (SPA)
  useEffect(() => {
    if (window.fbq) {
      // Wait a moment for React Helmet to update the <head> tags (canonical URL)
      setTimeout(() => {
        window.fbq('track', 'PageView');
        // Custom explicit event to guarantee the user sees the actual URL path in Meta
        window.fbq('trackCustom', 'SPA_Page_View', { 
          page_url: window.location.href, 
          page_path: window.location.pathname 
        });
      }, 200);
    }
  }, [currentView, selectedProduct]);

  // Canonical always reflects the URL the visitor is actually on.
  // Never fall back to the homepage: while a product is still loading from
  // Supabase, a "/" canonical tells Google the product page is a duplicate
  // of the homepage - which is what de-indexed every non-home page.
  const SITE_ORIGIN = 'https://purenutrix.in';
  const canonicalForCurrentPath = () => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    return SITE_ORIGIN + (path === '/' ? '/' : path.replace(/\/+$/, ''));
  };

  const getSEOData = () => {
    switch (currentView) {
      case 'products':
        return {
          title: "Buy Premium Nutraceuticals & Supplements Online | Pure Nutrix Products",
          description: "Shop the Pure Nutrix range: Liposomal Glutathione 600mg, Ultra L-Glutathione with Vitamin C, Advanced Collagen & Biotin, Himalayan Sea Buckthorn Juice and Ashwagandha Root Extract 500mg. Buy 1 Get 1 FREE.",
          keywords: "liposomal glutathione buy online, ashwagandha root extract capsules buy online, buy glutathione online, collagen biotin capsules india, sea buckthorn juice, pure nutrix products",
          canonical: "https://purenutrix.in/products"
        };
      case 'pdp':
        return {
          title: selectedProduct ? `${selectedProduct.name} | Pure Nutrix` : "Pure Nutrix Product",
          description: selectedProduct ? selectedProduct.description : "Premium Pure Nutrix Supplement",
          keywords: "pure nutrix product, buy supplement online",
          canonical: selectedProduct ? `${SITE_ORIGIN}/product/${selectedProduct.slug || selectedProduct.id}` : canonicalForCurrentPath()
        };
      case 'cart':
        return {
          title: "Shopping Cart & Express Checkout | Pure Nutrix",
          description: "Review your cart items. Enjoy express PAN India shipping, Cash on Delivery (COD), and 100% genuine sealed nutraceutical supplements.",
          keywords: "pure nutrix cart, buy supplements online, checkout supplement discount",
          canonical: "https://purenutrix.in/cart"
        };
      case 'account':
        return {
          title: "My Account & Order History | Pure Nutrix",
          description: "Manage your Pure Nutrix profile, track active supplement shipments, download GST invoices, and check loyalty points.",
          keywords: "pure nutrix login, my orders, order tracking supplement",
          canonical: "https://purenutrix.in/account"
        };
      case 'quality-standards':
        return {
          title: "Quality Standards & Third-Party Lab Reports | Pure Nutrix",
          description: "We subject all finished Pure Nutrix nutraceuticals to rigorous third-party NABL lab testing. View official certificates for heavy metal purity & GMP.",
          keywords: "lab tested supplements india, gmp certified nutraceuticals, pure nutrix quality test, fssai approved protein",
          canonical: "https://purenutrix.in/quality"
        };
      case 'legal-policy':
        return {
          title: "Legal Policy, Privacy & Return Terms | Pure Nutrix",
          description: "Read official terms of service, hygiene non-returnable policies for sealed supplements, and customer data protection guidelines.",
          keywords: "pure nutrix return policy, supplement refund policy india, privacy terms",
          canonical: "https://purenutrix.in/legal"
        };
      case 'support':
        return {
          title: "24/7 Customer Support & WhatsApp Help Desk | Pure Nutrix",
          description: "Connect instantly with Pure Nutrix nutrition experts and support representatives via WhatsApp or direct phone for dosage guidance and order help.",
          keywords: "pure nutrix contact number, customer care supplement india, whatsapp nutrition support",
          canonical: "https://purenutrix.in/support"
        };
      case 'order':
        return {
          title: "Secure Checkout & Payment | Pure Nutrix",
          description: "Complete your Pure Nutrix purchase securely. Choose Cash on Delivery or instant UPI/card payment with extra prepaid savings.",
          keywords: "secure supplement payment india, cod supplements buy",
          canonical: selectedProduct ? `${SITE_ORIGIN}/buy/${selectedProduct.slug || selectedProduct.id}` : canonicalForCurrentPath()
        };
      default:
        return {
          title: liveSEO.defaultTitle || "Pure Nutrix | India's #1 Premium Nutraceuticals, Skin Glow & Health Supplements",
          description: liveSEO.defaultDescription || "Pure Nutrix nutraceuticals: Liposomal Glutathione 600mg, Ultra L-Glutathione with Vitamin C, Advanced Collagen & Biotin, Himalayan Sea Buckthorn Juice and Ashwagandha Root Extract 500mg. FSSAI licensed, made in India.",
          keywords: liveSEO.defaultKeywords || "Pure Nutrix, pure nutrix supplements, liposomal glutathione 600mg, glutathione capsules india, collagen biotin capsules, sea buckthorn juice, ashwagandha root extract 500mg",
          canonical: canonicalForCurrentPath()
        };
    }
  };

  const seo = getSEOData();

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <link rel="canonical" href={seo.canonical} />
        {liveSEO.googleVerificationCode && (
          <meta name="google-site-verification" content={liveSEO.googleVerificationCode} />
        )}
        {liveSEO.bingVerificationCode && (
          <meta name="msvalidate.01" content={liveSEO.bingVerificationCode} />
        )}
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.canonical} />
        <meta property="twitter:title" content={seo.title} />
        <meta property="twitter:description" content={seo.description} />
      </Helmet>
      <motion.div
        className="scroll-progress-bar"
        style={{ scaleX: scrollYProgress }}
      />
      {currentView !== 'admin' && (
        <Navbar
          user={user}
          onGoHome={handleBackToHome}
          onOpenProducts={handleOpenProducts}
          onOpenQuality={handleOpenQuality}
          onOpenSupport={handleOpenSupport}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenAccount={handleOpenAccount}
          onSignOut={() => supabase.auth.signOut()}
          onOpenCart={handleOpenCart}
          cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
          onProductClick={handleOpenProductDetails}
        />
      )}
      <AnimatePresence onExitComplete={() => { window.scrollTo(0, 0); if (window.lenis) window.lenis.scrollTo(0, { immediate: true }); }}>
        {currentView === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <main>
              <Hero3D onProductClick={handleOpenProductDetails} onOpenProducts={handleOpenProducts} />
              <PromoTicker />
              <ShopByConcern onProductClick={handleOpenProductDetails} onOpenProducts={handleOpenProducts} />
              <PromiseStrip />

              <ProductShowcase onOrder={handleOrder} onProductClick={handleOpenProductDetails} onOpenProducts={handleOpenProducts} onAddToCart={handleAddToCart} />
              <RecentlyViewed onProductClick={handleOpenProductDetails} />
              <HowItWorks />
              <WhyChooseUs />
              <TrustSection />
              <HomeFaq />
              <MarketplaceStrip />
              <HelpCta />
            </main>
            <Footer onOpenQuality={handleOpenQuality} onOpenLegalPolicy={handleOpenLegalPolicy} onOpenPrivacyPolicy={handleOpenPrivacyPolicy} onOpenSupport={handleOpenSupport} onOpenProducts={handleOpenProducts} />
          </motion.div>
        ) : currentView === 'order' ? (
          <motion.div
            key="order"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {!selectedProduct && (!orderCartItems || orderCartItems.length === 0) ? (
              <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div className="spinning" style={{ width: '40px', height: '40px', border: '4px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1rem' }}></div>
                <p>Loading Order Details...</p>
              </div>
            ) : (
              <Lazy><OrderPage product={selectedProduct} cartItems={currentView === 'order' && !selectedProduct ? orderCartItems : null} onBack={handleBackToHome} onOrderPlaced={handleOrderPlaced} /></Lazy>
            )}
          </motion.div>
        ) : currentView === 'cart' ? (
          <motion.div
            key="cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lazy><CartPage
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateCartQty}
              onRemoveItem={handleRemoveFromCart}
              onBack={handleBackToHome}
              onCheckout={() => {
                setSelectedProduct(null); // Clear selected product so OrderPage uses cartItems
                setCurrentView('order');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            /></Lazy>
          </motion.div>
        ) : currentView === 'admin' ? (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lazy><AdminDashboard user={user} onBack={handleBackToHome} /></Lazy>
          </motion.div>
        ) : currentView === 'account' ? (
          <motion.div
            key="account"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lazy><AccountPage user={user} onBack={handleBackToHome} onSignOut={() => supabase.auth.signOut()} onProductClick={handleOpenProductDetails} onOpenAuth={() => setIsAuthModalOpen(true)} /></Lazy>
          </motion.div>
        ) : currentView === 'products' ? (
          <motion.div
            key="products"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lazy><ProductsPage onProductClick={handleOpenProductDetails} onBack={handleBackToHome} onOrder={handleOrder} onAddToCart={handleAddToCart} /></Lazy>
          </motion.div>
        ) : currentView === 'pdp' ? (
          <motion.div
            key="pdp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {!selectedProduct ? (
              <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div className="spinning" style={{ width: '40px', height: '40px', border: '4px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1rem' }}></div>
                <p>Loading Product Details...</p>
              </div>
            ) : (
              <Lazy><ProductDetailsPage product={selectedProduct} onOrder={handleOrder} onBack={handleOpenProducts} onAddToCart={handleAddToCart} onProductClick={handleOpenProductDetails} onOpenAuth={() => setIsAuthModalOpen(true)} /></Lazy>
            )}
          </motion.div>
        ) : currentView === 'quality-standards' ? (
          <motion.div
            key="quality-standards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lazy><QualityStandardsPage onBack={handleBackToHome} onExplore={handleOpenProducts} /></Lazy>
          </motion.div>
        ) : currentView === 'legal-policy' ? (
          <motion.div
            key="legal-policy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lazy><LegalPolicyPage onBack={handleBackToHome} /></Lazy>
          </motion.div>
        ) : currentView === 'privacy-policy' ? (
          <motion.div
            key="privacy-policy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lazy><PrivacyPolicyPage onBack={handleBackToHome} /></Lazy>
          </motion.div>
        ) : currentView === 'support' ? (
          <motion.div
            key="support"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lazy><SupportPage onBack={handleBackToHome} /></Lazy>
          </motion.div>
        ) : currentView === 'lab-report' ? (
          <motion.div
            key="lab-report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Lazy><LabReportPage slug={parsePath(window.location.pathname).slug} /></Lazy>
          </motion.div>
        ) : currentView === 'whatsapp' ? (
          <motion.div
            key="whatsapp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff', flexDirection: 'column' }}
          >
            <div className="spinning" style={{ width: '40px', height: '40px', border: '4px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1rem' }}></div>
            <h2>Connecting to WhatsApp...</h2>
            <p style={{ color: '#9ca3af' }}>Please wait while we redirect you to Pure-Nutrix support.</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        </Suspense>
      )}
      {cartToast && (
        <div className="cart-toast" role="status" aria-live="polite">
          <span>✓ Added to cart{cartToast.name ? `: ${cartToast.name}` : ''}</span>
          <button onClick={() => { setCartToast(null); handleOpenCart(); }}>View cart</button>
        </div>
      )}
      {currentView !== 'admin' && <ChatbotWidget defaultMessage="Hi, I need help with Pure Nutrix products." />}
      <ExitOffer active={['home', 'products', 'pdp', 'cart'].includes(currentView)} onShop={() => { if (currentView !== 'products' && currentView !== 'pdp' && currentView !== 'cart') handleOpenProducts(); }} />
      {['home', 'products', 'quality-standards', 'support', 'legal-policy', 'privacy-policy', 'account'].includes(currentView) && (
        <MobileTabBar
          active={currentView}
          cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
          user={user}
          onHome={handleBackToHome}
          onShop={handleOpenProducts}
          onCart={handleOpenCart}
          onAccount={handleOpenAccount}
          onAuth={() => setIsAuthModalOpen(true)}
        />
      )}
    </>
  );
}

export default App;
