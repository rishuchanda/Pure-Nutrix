export const getChatbotResponse = (message) => {
  const msg = message.toLowerCase();

  // Helper function for safe word matching
  const hasWord = (words) => {
    const pattern = new RegExp(`(^|\\s|\\W)(${words.join('|')})($|\\s|\\W)`);
    return pattern.test(msg);
  };

  // Greeting
  if (hasWord(['hi', 'hello', 'hey', 'namaste', 'helo', 'hlo'])) {
    return {
      text: "Hello! 👋 Welcome to Pure-Nutrix. How can I help you today? You can ask me about our products, pricing, offers, or orders.",
      options: ["Product Info", "Current Offers", "Track Order"]
    };
  }

  // Offers / Discounts / Sale
  if (hasWord(['offer', 'offers', 'discount', 'discounts', 'sale', 'promo', 'coupon'])) {
    return {
      text: "🎉 We currently have our Monsoon Mega Sale! Get up to 50% OFF on all products + an extra 10% OFF on prepaid orders. No coupon code required!",
      options: ["Products", "Chat with Human"]
    };
  }

  // Returns / Refunds / Cancellations
  if (hasWord(['return', 'returns', 'refund', 'refunds', 'cancel', 'cancellation'])) {
    return {
      text: "We have a 7-day hassle-free return policy for unopened/sealed products. If your product is damaged, we will replace it immediately. Would you like to process a return?",
      options: ["Chat with Human", "Support"]
    };
  }

  // Quality / Purity / Lab Tests
  if (hasWord(['quality', 'pure', 'purity', 'lab', 'test', 'tested', 'certificate', 'fake', 'original', 'real'])) {
    return {
      text: "Our products are 100% natural, ethically sourced, and undergo rigorous third-party lab testing for purity and safety. We guarantee 0% fillers or artificial additives.",
      options: ["Products", "Chat with Human"]
    };
  }

  // Payments / COD
  if (hasWord(['pay', 'payment', 'cod', 'cash on delivery', 'upi', 'card'])) {
    return {
      text: "We accept all major secure payment methods including UPI, Credit/Debit Cards, and Net Banking. We also offer Cash on Delivery (COD) for most pincodes in India! 🚚",
      options: ["Track Order", "Products"]
    };
  }

  // How to use / Dosage
  if (hasWord(['use', 'usage', 'dosage', 'how to take', 'consume'])) {
    return {
      text: "Usage depends on the product! Shilajit: A pea-sized amount in warm water/milk. Ashwagandha: 1 capsule daily. Creatine: 1 scoop (3g-5g) post-workout. Sea Moss: 1-2 tablespoons daily.",
      options: ["Shilajit", "Creatine", "Ashwagandha"]
    };
  }

  // Shilajit
  if (hasWord(['shilajit', 'silajit'])) {
    return {
      text: "Our Himalayan Shilajit Resin is pure, lab-tested, and rich in Fulvic Acid. It boosts energy, stamina, and overall vitality. Prices start at ₹1,499.",
      options: ["Shilajit Price", "Buy Shilajit"]
    };
  }

  // Ashwagandha
  if (hasWord(['ashwagandha', 'aswagandha'])) {
    return {
      text: "Pure-Nutrix Ashwagandha KSM-66 helps reduce stress, improve sleep, and boost immunity. It's 100% natural and highly potent.",
      options: ["Buy Ashwagandha", "Offers"]
    };
  }

  // Sea Moss
  if (hasWord(['moss', 'sea moss', 'seamoss'])) {
    return {
      text: "Our Irish Sea Moss is packed with 92 of the 102 minerals your body needs! It's great for thyroid support, digestion, and glowing skin.",
      options: ["Buy Sea Moss"]
    };
  }

  // Creatine
  if (hasWord(['creatine', 'protein', 'gym'])) {
    return {
      text: "Our Creatine Monohydrate is micronized for rapid absorption, helping you build muscle, increase strength, and improve workout performance.",
      options: ["Buy Creatine"]
    };
  }

  // Price / Cost / Products
  if (hasWord(['price', 'cost', 'how much', 'rate', 'product', 'products', 'buy', 'item', 'items', 'info', 'details'])) {
    return {
      text: "We offer premium Himalayan Shilajit, Ashwagandha KSM-66, Irish Sea Moss, and Creatine. Prices range from ₹499 to ₹1,499. Please check the 'Products' page on our website for exact details!",
      options: ["Offers", "Track Order", "Chat with Human"]
    };
  }

  // Order / Tracking / Shipping
  if (hasWord(['order', 'track', 'shipping', 'delivery', 'where is', 'dispatch', 'courier'])) {
    return {
      text: "Orders typically take 3-5 business days to arrive. To track your order, please log into the 'My Account' section or tap below to speak with an agent.",
      options: ["Chat with Human"]
    };
  }

  // Human / Agent / WhatsApp / Help
  if (hasWord(['human', 'agent', 'person', 'whatsapp', 'call', 'talk', 'support', 'help', 'contact', 'customer care'])) {
    return {
      text: "Sure! I can connect you to our real human support team on WhatsApp right now.",
      action: "open_whatsapp"
    };
  }

  // Fallback for unrecognized questions
  return {
    text: "I might not have the exact answer for that! 🤖 But don't worry, our human support team can help you with anything related to Pure-Nutrix.",
    options: ["Chat with Human", "Current Offers", "Products"]
  };
};
