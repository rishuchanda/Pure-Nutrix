import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ProductShowcase.css';

const ProductIngredients = ({ ingredients }) => {
  return (
    <div className="product-ingredients-container">
      <h4 className="section-mini-title">Key Ingredients</h4>
      <div className="ingredients-list">
        {ingredients.map((ing, i) => (
          <div key={i} className="ingredient-pill">
            <span className="ing-name">{ing.name}</span>
            <span className="ing-desc">{ing.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductReviews = ({ reviews }) => {
  return (
    <div className="product-reviews-container">
      <h4 className="section-mini-title">Real Results</h4>
      <div className="reviews-slider" data-lenis-prevent="true">
        {reviews.map((review, i) => (
          <div key={i} className="review-card">
            <div className="stars">★★★★★</div>
            <p className="review-text">"{review.text}"</p>
            <p className="review-author">- {review.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductCard = ({ product, index }) => {
  const cardRef = useRef(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"]
  });
  
  // Parallax: Image moves down, Details move up (Opposite scroll effect)
  const yImage = useTransform(scrollYProgress, [0, 1], [-60, 60]);
  const yDetails = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const nextImage = () => {
    setCurrentImgIdx((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImgIdx((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "0px" }}
      transition={{ duration: 0.8 }}
      className={`product-card glass-card ${index % 2 === 0 ? 'row-normal' : 'row-reverse'}`}
    >
      <motion.div style={{ y: yImage }} className="product-image-container">
        
        {/* Left Arrow */}
        <button className="carousel-btn prev-btn" onClick={prevImage}>
          <ChevronLeft size={24} />
        </button>

        {/* Image with Tilt */}
        <div className="tilt-wrapper">
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
            />
          </AnimatePresence>
        </div>

        {/* Right Arrow */}
        <button className="carousel-btn next-btn" onClick={nextImage}>
          <ChevronRight size={24} />
        </button>

        {/* Carousel Dots */}
        <div className="carousel-dots">
          {product.images.map((_, idx) => (
            <span 
              key={idx} 
              className={`carousel-dot ${idx === currentImgIdx ? 'active' : ''}`}
              onClick={() => setCurrentImgIdx(idx)}
            />
          ))}
        </div>

      </motion.div>
      
      <motion.div style={{ y: yDetails }} className="product-details">
        <h3 className="product-category text-gold">{product.category}</h3>
        <h2 className="product-name">{product.name}</h2>
        <div className="product-meta">
          <span className="product-qty">{product.qty}</span>
          <span className="product-price">{product.price}</span>
        </div>
        
        {/* Embedded Ingredients Spotlight */}
        <ProductIngredients ingredients={product.ingredients} />

        <div className="product-description">
          <ul>
            {product.description.map((desc, i) => (
              <li key={i}>{desc}</li>
            ))}
          </ul>
        </div>
        <button className="btn-ag-primary add-to-cart-btn">Add To Cart</button>
        
        {/* Embedded Reviews Slider */}
        <ProductReviews reviews={product.reviews} />
      </motion.div>
    </motion.div>
  );
};

const ProductShowcase = () => {
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
        { name: "L-Glutathione", desc: "Skin Brightening" },
        { name: "Vitamin C", desc: "Boosts Absorption" }
      ],
      description: [
        "ADVANCED SKIN RADIANCE FORMULA: Repairs dull skin and promotes a youthful, luminous radiance.",
        "POWERFUL COMBINATION WITH VITAMIN C: Aids in the maximum absorption of Glutathione.",
        "FIGHTS PIGMENTATION & DARK SPOTS: Regulates melanin production, effectively reducing dark spots.",
        "ANTI-AGING & ANTIOXIDANT SUPPORT: Fights free radicals and helps prevent fine lines."
      ],
      reviews: [
        { name: "Sneha R., Mumbai", text: "Amazing for skin brightening! Saw results in 4 weeks." },
        { name: "Anjali D., Delhi", text: "Pigmentation on my cheeks has visibly faded." },
        { name: "Riya K., Pune", text: "Love the glow it gives. Very premium packaging." },
        { name: "Neha S., Bangalore", text: "Best Glutathione supplement in India. Highly recommended." },
        { name: "Pooja M., Jaipur", text: "Dark spots are almost gone. My skin tone looks even now." },
        { name: "Shruti T., Hyderabad", text: "I take this with Vitamin C and the results are unbelievable." },
        { name: "Kavya P., Chennai", text: "Worth the price. You can feel the quality from day one." },
        { name: "Meera J., Ahmedabad", text: "My dermatologist recommended this, and I'm very happy." }
      ]
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
        { name: "Marine Collagen", desc: "Skin Elasticity" },
        { name: "Biotin", desc: "Hair Strength" },
        { name: "Hyaluronic Acid", desc: "Deep Hydration" }
      ],
      description: [
        "CELLULAR SKIN RADIANCE: Improves skin elasticity, retains moisture, and reduces fine lines.",
        "HAIR ROOT DEFENSE: Strengthens hair follicles, reduces hair fall, and supports thicker hair.",
        "ANTIOXIDANT POWERHOUSE: Vitamin C boosts collagen synthesis and protects skin cells.",
        "PREMIUM QUALITY & SAFE: Formulated for maximum bioavailability."
      ],
      reviews: [
        { name: "Ritu V., Delhi", text: "Hair fall stopped completely! Nails are much stronger." },
        { name: "Aisha N., Bangalore", text: "My skin feels so hydrated and plump. Highly impressed." },
        { name: "Simran K., Chandigarh", text: "Fine lines around my eyes have reduced visibly." },
        { name: "Nidhi P., Mumbai", text: "Very effective collagen. Taste is neutral and works fast." },
        { name: "Kritika B., Pune", text: "Joint pain is gone and my skin is glowing naturally." },
        { name: "Swati L., Kolkata", text: "I’ve tried many, but this one actually shows results." },
        { name: "Divya C., Gurgaon", text: "A must-have in my daily routine. Will buy again." },
        { name: "Tanya M., Noida", text: "Premium ingredients. My hair volume has improved massively." }
      ]
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
          <h2 className="section-title">Our Premium <span className="text-gradient">Collection</span></h2>
          <p className="section-subtitle">Scientifically backed ingredients for visible, lasting results.</p>
        </motion.div>

        <div className="products-list">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
