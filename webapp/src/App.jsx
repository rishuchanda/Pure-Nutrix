import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero3D from './components/Hero3D';
import ProductShowcase from './components/ProductShowcase';
import WhyChooseUs from './components/WhyChooseUs';
import TrustSection from './components/TrustSection';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import OrderPage from './components/OrderPage';
import AccountPage from './components/AccountPage';
import AdminDashboard from './components/AdminDashboard';
import ProductsPage from './components/ProductsPage';
import ProductDetailsPage from './components/ProductDetailsPage';
import CartPage from './components/CartPage';
import QualityStandardsPage from './components/QualityStandardsPage';
import LegalPolicyPage from './components/LegalPolicyPage';
import SupportPage from './components/SupportPage';
import { supabase } from './supabaseClient';
import { requestPushPermissionAndSubscribe } from './pushNotifications';
import Lenis from 'lenis';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { getLiveSEOConfig } from './utils/seoConfig';
import { parsePath, getPathForView } from './parsePath';


import ChatbotWidget from './components/ChatbotWidget';

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
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const handlePopState = async (event) => {
      const state = event.state;
      if (state && state.view) {
        setCurrentView(state.view);
        if (state.product) setSelectedProduct(state.product);
      } else {
        const { view, slug: productSlug } = parsePath(window.location.pathname);
        const validViews = ['home', 'order', 'account', 'products', 'pdp', 'cart', 'quality-standards', 'legal-policy', 'support', 'whatsapp'];
        
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
    const validViews = ['home', 'order', 'account', 'products', 'pdp', 'cart', 'quality-standards', 'legal-policy', 'support', 'whatsapp'];

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
          window.history.replaceState({ view: initialView }, '', getPathForView(initialView, initialSlug));
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
        value: product.price,
        currency: 'INR'
      });
    }

    // Visual feedback handled by alert for now, or just let them know
    alert('Added to cart!');
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
        content_ids: [product.id],
        content_name: product.name,
        value: product.price,
        currency: 'INR'
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
      const fetchAndRedirect = async () => {
        try {
          const { data: phone, error } = await supabase.rpc('get_active_whatsapp_number');
          const targetPhone = phone || atob('OTE5MDU3NjA3MDMw');
          window.location.replace(`https://wa.me/${targetPhone}?text=${encodeURIComponent('Hi Pure Nutrix Support!')}`);
        } catch (err) {
          console.error('Redirect fallback to personal WhatsApp', err);
          const targetPhone = atob('OTE5MDU3NjA3MDMw');
          window.location.replace(`https://wa.me/${targetPhone}?text=${encodeURIComponent('Hi Pure Nutrix Support!')}`);
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

  const getSEOData = () => {
    switch (currentView) {
      case 'products':
        return {
          title: "Buy Premium Nutraceuticals & Supplements Online | Pure Nutrix Products",
          description: "Explore Pure Nutrix 100% science-backed product range: Ashwagandha Root Extract 500mg, L-Glutathione skin glow tablets, Gold Standard Whey Isolate, Multivitamins, and Collagen Peptides.",
          keywords: "ashwagandha root extract capsules buy online, buy glutathione online, whey protein isolate price india, best collagen supplement india, pure nutrix products, stress relief supplement",
          canonical: "https://purenutrix.in/#products"
        };
      case 'cart':
        return {
          title: "Shopping Cart & Express Checkout | Pure Nutrix",
          description: "Review your cart items. Enjoy express PAN India shipping, Cash on Delivery (COD), and 100% genuine sealed nutraceutical supplements.",
          keywords: "pure nutrix cart, buy supplements online, checkout supplement discount",
          canonical: "https://purenutrix.in/#cart"
        };
      case 'account':
        return {
          title: "My Account & Order History | Pure Nutrix",
          description: "Manage your Pure Nutrix profile, track active supplement shipments, download GST invoices, and check loyalty points.",
          keywords: "pure nutrix login, my orders, order tracking supplement",
          canonical: "https://purenutrix.in/#account"
        };
      case 'quality-standards':
        return {
          title: "Quality Standards & Third-Party Lab Reports | Pure Nutrix",
          description: "We subject all finished Pure Nutrix nutraceuticals to rigorous third-party NABL lab testing. View official certificates for heavy metal purity & GMP.",
          keywords: "lab tested supplements india, gmp certified nutraceuticals, pure nutrix quality test, fssai approved protein",
          canonical: "https://purenutrix.in/#quality-standards"
        };
      case 'legal-policy':
        return {
          title: "Legal Policy, Privacy & Return Terms | Pure Nutrix",
          description: "Read official terms of service, hygiene non-returnable policies for sealed supplements, and customer data protection guidelines.",
          keywords: "pure nutrix return policy, supplement refund policy india, privacy terms",
          canonical: "https://purenutrix.in/#legal-policy"
        };
      case 'support':
        return {
          title: "24/7 Customer Support & WhatsApp Help Desk | Pure Nutrix",
          description: "Connect instantly with Pure Nutrix nutrition experts and support representatives via WhatsApp or direct phone for dosage guidance and order help.",
          keywords: "pure nutrix contact number, customer care supplement india, whatsapp nutrition support",
          canonical: "https://purenutrix.in/#support"
        };
      case 'order':
        return {
          title: "Secure Checkout & Payment | Pure Nutrix",
          description: "Complete your Pure Nutrix purchase securely. Choose Cash on Delivery or instant UPI/card payment with extra prepaid savings.",
          keywords: "secure supplement payment india, cod supplements buy",
          canonical: "https://purenutrix.in/#order"
        };
      default:
        return {
          title: liveSEO.defaultTitle || "Pure Nutrix | India's #1 Premium Nutraceuticals, Skin Glow & Health Supplements",
          description: liveSEO.defaultDescription || "Pure Nutrix is India's leading brand for clinically proven health supplements, L-Glutathione 1000mg skin radiance tablets, 100% Whey Protein Isolate, Collagen Peptides, and Organic Supergreens.",
          keywords: liveSEO.defaultKeywords || "Pure Nutrix, pure nutrix supplements, l-glutathione tablets buy online india, glutathione skin glow, whey protein isolate 2kg price, collagen peptide complex india, best nutraceutical brand india",
          canonical: liveSEO.siteUrl || "https://purenutrix.in/"
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
      <AnimatePresence mode="wait">
        {currentView === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <main>
              <Hero3D onOrder={handleOrder} />

              <ProductShowcase onOrder={handleOrder} onProductClick={handleOpenProductDetails} onOpenProducts={handleOpenProducts} onAddToCart={handleAddToCart} />
              <WhyChooseUs />
              <TrustSection />
            </main>
            <Footer onOpenQuality={handleOpenQuality} onOpenLegalPolicy={handleOpenLegalPolicy} onOpenSupport={handleOpenSupport} />
          </motion.div>
        ) : currentView === 'order' ? (
          <motion.div
            key="order"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {!selectedProduct && (!cartItems || cartItems.length === 0) ? (
              <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div className="spinning" style={{ width: '40px', height: '40px', border: '4px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1rem' }}></div>
                <p>Loading Order Details...</p>
              </div>
            ) : (
              <OrderPage product={selectedProduct} cartItems={currentView === 'order' && !selectedProduct ? cartItems : null} onBack={handleBackToHome} />
            )}
          </motion.div>
        ) : currentView === 'cart' ? (
          <motion.div
            key="cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CartPage
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateCartQty}
              onRemoveItem={handleRemoveFromCart}
              onBack={handleBackToHome}
              onCheckout={() => {
                setSelectedProduct(null); // Clear selected product so OrderPage uses cartItems
                setCurrentView('order');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </motion.div>
        ) : currentView === 'admin' ? (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AdminDashboard user={user} onBack={handleBackToHome} />
          </motion.div>
        ) : currentView === 'account' ? (
          <motion.div
            key="account"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AccountPage user={user} onBack={handleBackToHome} onSignOut={() => supabase.auth.signOut()} />
          </motion.div>
        ) : currentView === 'products' ? (
          <motion.div
            key="products"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProductsPage onProductClick={handleOpenProductDetails} onBack={handleBackToHome} onOrder={handleOrder} onAddToCart={handleAddToCart} />
          </motion.div>
        ) : currentView === 'pdp' ? (
          <motion.div
            key="pdp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {!selectedProduct ? (
              <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div className="spinning" style={{ width: '40px', height: '40px', border: '4px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1rem' }}></div>
                <p>Loading Product Details...</p>
              </div>
            ) : (
              <ProductDetailsPage product={selectedProduct} onOrder={handleOrder} onBack={handleOpenProducts} onAddToCart={handleAddToCart} onProductClick={handleOpenProductDetails} />
            )}
          </motion.div>
        ) : currentView === 'quality-standards' ? (
          <motion.div
            key="quality-standards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <QualityStandardsPage onBack={handleBackToHome} onExplore={handleOpenProducts} />
          </motion.div>
        ) : currentView === 'legal-policy' ? (
          <motion.div
            key="legal-policy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LegalPolicyPage onBack={handleBackToHome} />
          </motion.div>
        ) : currentView === 'support' ? (
          <motion.div
            key="support"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SupportPage onBack={handleBackToHome} />
          </motion.div>
        ) : currentView === 'whatsapp' ? (
          <motion.div
            key="whatsapp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff', flexDirection: 'column' }}
          >
            <div className="spinning" style={{ width: '40px', height: '40px', border: '4px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1rem' }}></div>
            <h2>Connecting to WhatsApp...</h2>
            <p style={{ color: '#9ca3af' }}>Please wait while we redirect you to Pure-Nutrix support.</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      {currentView !== 'admin' && <ChatbotWidget defaultMessage="Hi, I need help with Pure Nutrix products." />}
    </>
  );
}

export default App;
