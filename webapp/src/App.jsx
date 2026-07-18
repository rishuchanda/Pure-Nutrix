import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero3D from './components/Hero3D';
import ProductShowcase from './components/ProductShowcase';
import WhyChooseUs from './components/WhyChooseUs';
import TrustSection from './components/TrustSection';
import Footer from './components/Footer';
import NotificationBell from './components/NotificationBell';
import AuthModal from './components/AuthModal';
import OrderPage from './components/OrderPage';
import AccountPage from './components/AccountPage';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './supabaseClient';
import Lenis from 'lenis';
import { motion, useScroll, AnimatePresence } from 'framer-motion';

function App() {
  const { scrollYProgress } = useScroll();
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'order' | 'account'
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleOpenAccount = () => {
    setCurrentView('account');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrder = (product) => {
    setSelectedProduct(product);
    setCurrentView('order');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedProduct(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Check URL for admin route
    if (window.location.pathname === '/admin') {
      setCurrentView('admin');
      // Update URL back to / to avoid issues if they refresh, 
      // or we can keep it as is, but since it's a SPA without react-router, 
      // it's cleaner to reset the URL visually while keeping them in the admin state
      window.history.pushState({}, '', '/');
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  return (
    <>
      <motion.div
        className="scroll-progress-bar"
        style={{ scaleX: scrollYProgress }}
      />
      <Navbar 
        user={user} 
        onGoHome={handleBackToHome}
        onOpenAuth={() => setIsAuthModalOpen(true)} 
        onOpenAccount={handleOpenAccount}
        onSignOut={() => supabase.auth.signOut()} 
      />
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
              <Hero3D />
              <ProductShowcase onOrder={handleOrder} />
              <WhyChooseUs />
              <TrustSection />
            </main>
            <Footer />
          </motion.div>
        ) : currentView === 'order' ? (
          <motion.div 
            key="order"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <OrderPage product={selectedProduct} onBack={handleBackToHome} />
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
        ) : (
          <motion.div 
            key="account"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AccountPage user={user} onBack={handleBackToHome} onSignOut={() => supabase.auth.signOut()} />
          </motion.div>
        )}
      </AnimatePresence>
      <NotificationBell />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}

export default App;
