import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
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

const ProductCard = ({ product, index, onOrder }) => {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  const nextImage = (e) => {
    if(e) e.stopPropagation();
    setCurrentImgIdx((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = (e) => {
    if(e) e.stopPropagation();
    setCurrentImgIdx((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
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
              src={product.images[currentImgIdx]} 
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
          {product.images.map((_, idx) => (
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
          <span className="rating-text">({product.reviews.length * 15}+ Reviews)</span>
        </div>
        
        <h3 className="product-category text-gold">{product.category}</h3>
        <h2 className="product-name">{product.name}</h2>
        
        <div className="product-meta">
          <span className="product-qty">{product.qty}</span>
          <span className="product-price">{product.price}</span>
        </div>
        
        <ProductIngredients ingredients={product.ingredients} />

        <div className="product-description-short">
          <p>{product.description[0]}</p>
        </div>
        
        <button className="btn-primary add-to-cart-btn" onClick={() => onOrder(product)}>
          Order Now
        </button>
      </div>
    </motion.div>
  );
};

const ProductShowcase = ({ onOrder }) => {
  const products = [
    {
      id: 1,
      name: "Ultra L-Glutathione 500mg with Vitamin C",
      category: "RADIANCE CAPSULES",
      qty: "30 Capsules",
      price: "₹499",
      images: [
        "/assets/products/glutathione/1.png",
        "/assets/products/glutathione/2.png",
        "/assets/products/glutathione/3.png",
        "/assets/products/glutathione/4.png",
        "/assets/products/glutathione/5.png",
        "/assets/products/glutathione/6.png",
        "/assets/products/glutathione/7.jpg"
      ],
      ingredients: [
        { name: "L-Glutathione" },
        { name: "Vitamin C" }
      ],
      description: [
        "ADVANCED SKIN RADIANCE FORMULA: Repairs dull skin and promotes a youthful, luminous radiance."
      ],
      reviews: new Array(8).fill({}) 
    },
    {
      id: 2,
      name: "Advanced Collagen & Biotin with Hyaluronic Acid",
      category: "RENEWAL CAPSULES",
      qty: "30 Capsules",
      price: "₹399",
      images: [
        "/assets/products/collagen/collagen 1.jpg",
        "/assets/products/collagen/collagen 2.jpg",
        "/assets/products/collagen/collagen 3.jpg",
        "/assets/products/collagen/collagen 4.jpg",
        "/assets/products/collagen/collagen 5.jpg",
        "/assets/products/collagen/collagen 6.jpg",
        "/assets/products/collagen/collagen 7.jpg",
        "/assets/products/collagen/collagen 8.jpg",
        "/assets/products/collagen/collagen 9.jpg"
      ],
      ingredients: [
        { name: "Marine Collagen" },
        { name: "Biotin" },
        { name: "Hyaluronic Acid" }
      ],
      description: [
        "CELLULAR SKIN RADIANCE: Improves skin elasticity, retains moisture, and reduces fine lines."
      ],
      reviews: new Array(8).fill({}) 
    },
    // Adding a placeholder third product to show the grid works well
    {
      id: 3,
      name: "Daily Multivitamin For Men & Women",
      category: "ESSENTIALS",
      qty: "60 Capsules",
      price: "₹599",
      images: [
        "/assets/products/glutathione/1.png" // using existing image as placeholder
      ],
      ingredients: [
        { name: "Vitamins A-Z" },
        { name: "Zinc & Magnesium" }
      ],
      description: [
        "COMPLETE DAILY NUTRITION: Fills dietary gaps and boosts immunity and energy levels."
      ],
      reviews: new Array(5).fill({}) 
    }
  ];

  return (
    <section className="product-showcase section-padding" id="products">
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
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} onOrder={onOrder} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
