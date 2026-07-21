export const getChatbotResponse = (message, dbProducts = []) => {
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
      options: ["Products", "Current Offers", "Track Order"]
    };
  }

  // Offers / Discounts / Sale
  if (hasWord(['offer', 'offers', 'discount', 'discounts', 'sale', 'promo', 'coupon'])) {
    return {
      text: "🎉 We currently have our Mega Sale! Get amazing discounts on all products + extra OFF on prepaid orders. No coupon code required!",
      options: ["Products", "Chat with Human"]
    };
  }

  // Returns / Refunds / Cancellations
  if (hasWord(['return', 'returns', 'refund', 'refunds', 'cancel', 'cancellation'])) {
    return {
      text: "We have a 7-day hassle-free return policy for unopened/sealed products. If your product is damaged, we will replace it immediately.",
      options: ["Chat with Human", "Support"]
    };
  }

  // Quality / Purity / Lab Tests
  if (hasWord(['quality', 'pure', 'purity', 'lab', 'test', 'tested', 'certificate', 'fake', 'original', 'real'])) {
    return {
      text: "Our products are 100% natural, ethically sourced, and undergo rigorous third-party lab testing for purity and safety.",
      options: ["Products", "Chat with Human"]
    };
  }

  // Payments / COD
  if (hasWord(['pay', 'payment', 'cod', 'cash on delivery', 'upi', 'card'])) {
    return {
      text: "We accept all major secure payment methods including UPI, Credit/Debit Cards, and Net Banking. We also offer Cash on Delivery (COD)! 🚚",
      options: ["Track Order", "Products"]
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

  // Dynamic Product Search (Matches any keyword against real DB products)
  if (dbProducts && dbProducts.length > 0) {
    // Check if user is asking for general products/pricing
    if (hasWord(['price', 'cost', 'how much', 'rate', 'product', 'products', 'buy', 'item', 'items', 'info', 'details', 'catalog', 'menu'])) {
      const topProducts = dbProducts.slice(0, 3).map(p => p.name).join(', ');
      return {
        text: `We offer a premium range of nutrition products including ${topProducts} and more! Please check the 'Products' page on our website for exact prices and details.`,
        options: ["Current Offers", "Chat with Human"]
      };
    }

    // Check if user's message matches any specific product name, category, or description (like "skin", "hair", "muscle")
    const words = msg.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 2); // get meaningful words
    
    let matchedProducts = [];
    for (const product of dbProducts) {
      const pName = (product.name || '').toLowerCase();
      const pCat = (product.category || '').toLowerCase();
      const pDesc = (product.description || '').toLowerCase() + ' ' + (product.short_description || '').toLowerCase();
      
      // Look for exact word matches in product data
      const isMatch = words.some(word => 
        pName.includes(word) || 
        pCat.includes(word) || 
        pDesc.includes(word)
      );

      if (isMatch) {
        matchedProducts.push(product);
      }
    }

    if (matchedProducts.length > 0) {
      // Return the top matched product
      const topMatch = matchedProducts[0];
      return {
        text: `Yes, we have products for that! For example: ${topMatch.name}. ${topMatch.short_description || ''} It is priced at ₹${topMatch.price}. Visit our Products page to buy!`,
        options: ["Products", "Chat with Human"]
      };
    }
  }

  // Fallback for unrecognized questions
  return {
    text: "I might not have the exact answer for that! 🤖 But don't worry, our human support team can help you with anything related to Pure-Nutrix.",
    options: ["Chat with Human", "Current Offers", "Products"]
  };
};
