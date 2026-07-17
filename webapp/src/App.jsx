import React from 'react';
import Navbar from './components/Navbar';
import Hero3D from './components/Hero3D';
import ProductShowcase from './components/ProductShowcase';
import TrustSection from './components/TrustSection';
import Footer from './components/Footer';
import Lenis from 'lenis';
import { motion, useScroll } from 'framer-motion';

function App() {
  const { scrollYProgress } = useScroll();

  React.useEffect(() => {
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
      <Navbar />
      <main>
        <Hero3D />
        <ProductShowcase />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}

export default App;
