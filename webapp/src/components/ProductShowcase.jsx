import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';
import RainEffect from './RainEffect';
import './ProductShowcase.css';

const ProductIngredients = ({ ingredients }) => {
  return (
    <div className="product-ingredients-container">
      <div className="ingredients-list">
        {ingredients.map((ing, i) => (
          <div key={i} className="ingredient-pill">
            <span className="ing-name">{ing.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductCard = ({ product, index, onOrder, onProductClick, onAddToCart }) => {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  const imagesList = product.image_urls || product.images || [];

  const nextImage = (e) => {
    if(e) e.stopPropagation();
    setCurrentImgIdx((prev) => (prev + 1) % imagesList.length);
  };

  const prevImage = (e) => {
    if(e) e.stopPropagation();
    setCurrentImgIdx((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset, velocity) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="product-tile glass-card"
      onClick={() => onProductClick(product)}
    >
      <div className="product-image-container">
        {/* Left Arrow */}
        <button className="carousel-btn prev-btn" onClick={prevImage}>
          <ChevronLeft size={20} />
        </button>

        {/* Image with simple fade */}
        <div className="image-wrapper" style={{ touchAction: 'none' }}>
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentImgIdx}
              src={imagesList[currentImgIdx]} 
              alt={`${product.name} - Image ${currentImgIdx + 1}`} 
              className="product-image"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  nextImage(null);
                } else if (swipe > swipeConfidenceThreshold) {
                  prevImage(null);
                }
              }}
            />
          </AnimatePresence>
        </div>

        {/* Right Arrow */}
        <button className="carousel-btn next-btn" onClick={nextImage}>
          <ChevronRight size={20} />
        </button>

        {/* Carousel Dots */}
        <div className="carousel-dots">
          {imagesList.map((_, idx) => (
            <span 
              key={idx} 
              className={`carousel-dot ${idx === currentImgIdx ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(idx); }}
            />
          ))}
        </div>
      </div>
      
      <div className="product-details">
        <div className="product-rating">
          <Star size={14} className="star-icon" fill="currentColor" />
          <Star size={14} className="star-icon" fill="currentColor" />
          <Star size={14} className="star-icon" fill="currentColor" />
          <Star size={14} className="star-icon" fill="currentColor" />
          <Star size={14} className="star-icon" fill="currentColor" />
          <span className="rating-text">({(product.reviews && product.reviews.length * 15) || 120}+ Reviews)</span>
        </div>
        
        <h3 className="product-category text-gold">{product.category}</h3>
        <h2 className="product-name">{product.name}</h2>
        
        <div className="product-meta">
          <span className="product-qty">{product.quantity || '30'} {product.product_form || 'Capsules'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="product-price">{typeof product.price === 'number' ? '₹' + product.price : product.price}</span>
            {product.original_price && product.original_price > product.price && (
              <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.9rem' }}>₹{product.original_price}</span>
            )}
          </div>
        </div>
        
        <div className="product-actions">
          <button 
            className="add-to-cart-btn" 
            onClick={(e) => { e.stopPropagation(); onAddToCart && onAddToCart(product); }}
          >
            Add to Cart
          </button>
          <button 
            className="buy-now-btn" 
            onClick={(e) => { e.stopPropagation(); onOrder(product); }}
          >
            Buy Now
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const ProductShowcase = ({ onOrder, onProductClick, onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(2);
        
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <section className="product-showcase section-padding" id="products">
      <RainEffect />
      <div className="container">
        <motion.div 
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="section-title">Our Premium <span className="text-gradient">Products</span></h2>
          <p className="section-subtitle">Scientifically backed ingredients for visible, lasting results. Available in a compact grid view.</p>
        </motion.div>

        <div className="products-grid">
          {loading ? (
            <div style={{ textAlign: 'center', width: '100%', padding: '40px' }}>Loading premium products...</div>
          ) : (
            products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} onOrder={onOrder} onProductClick={onProductClick} onAddToCart={onAddToCart} />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
