import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { supabase } from '../supabaseClient';
import { ShoppingBag } from 'lucide-react';
import './Hero3D.css';

const Hero3D = ({ onOrder }) => {
  const [products, setProducts] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const slides = [
    { src: '/assets/hero-slider/1.jpg', keyword: 'sea buckthorn' },
    { src: '/assets/hero-slider/2.jpg', keyword: 'collagen' },
    { src: '/assets/hero-slider/3.jpg', keyword: 'glutathione' }
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*');
        if (data) setProducts(data);
      } catch (e) {
        console.error("Failed to fetch products for hero slider", e);
      }
    };
    fetchProducts();
  }, []);

  // Automatic image slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 7000); // Changed from 4s to 7s for slower scrolling
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleShopNow = () => {
    if (products.length > 0 && onOrder) {
      // Find the product that matches the current slide's keyword
      const keyword = slides[currentImageIndex].keyword;
      const matchedProduct = products.find(p => p.name.toLowerCase().includes(keyword));

      // If we found a match, order it. Otherwise, fallback to the first product.
      if (matchedProduct) {
        onOrder(matchedProduct);
      } else {
        onOrder(products[currentImageIndex % products.length]);
      }
    }
  };

  return (
    <section className="hero-section-interactive" id="home" style={{ minHeight: 'auto', display: 'block' }}>

      <motion.div
        className="hero-poster-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{
          position: 'relative',
          width: '100%',
          cursor: 'pointer',
          zIndex: 10,
          pointerEvents: 'auto',
          overflow: 'hidden'
        }}
        onClick={handleShopNow}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          {slides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={`Premium Product Slide ${index + 1}`}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                maxWidth: 'none',
                position: index === 0 ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                opacity: currentImageIndex === index ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                zIndex: currentImageIndex === index ? 2 : 1
              }}
            />
          ))}
        </div>

        {/* Manual Navigation Arrows */}
        <button
          onClick={handlePrev}
          style={{
            position: 'absolute', left: '2%', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.15)', color: 'rgba(255,255,255,0.8)', border: 'none',
            borderRadius: '50%', width: '35px', height: '35px', fontSize: '16px',
            cursor: 'pointer', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)', transition: 'background 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
        >
          &#10094;
        </button>
        <button
          onClick={handleNext}
          style={{
            position: 'absolute', right: '2%', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.15)', color: 'rgba(255,255,255,0.8)', border: 'none',
            borderRadius: '50%', width: '35px', height: '35px', fontSize: '16px',
            cursor: 'pointer', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)', transition: 'background 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
        >
          &#10095;
        </button>
      </motion.div>



    </section>
  );
};

export default Hero3D;
