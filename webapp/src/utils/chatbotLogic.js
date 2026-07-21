export const getChatbotResponse = (message) => {
  const msg = message.toLowerCase();

  // Greeting
  if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || msg.includes('namaste')) {
    return {
      text: "Hello! 👋 Welcome to Pure-Nutrix. How can I help you today? You can ask me about our products, pricing, or orders.",
      options: ["Product Info", "Track Order", "Chat with Human"]
    };
  }

  // Shilajit
  if (msg.includes('shilajit')) {
    return {
      text: "Our Himalayan Shilajit Resin is pure, lab-tested, and rich in Fulvic Acid. It boosts energy, stamina, and overall vitality. Would you like to know the price or how to use it?",
      options: ["Shilajit Price", "How to use Shilajit"]
    };
  }

  // Ashwagandha
  if (msg.includes('ashwagandha')) {
    return {
      text: "Pure-Nutrix Ashwagandha KSM-66 helps reduce stress, improve sleep, and boost immunity. It's 100% natural and highly potent.",
      options: ["Buy Ashwagandha", "Benefits"]
    };
  }

  // Sea Moss
  if (msg.includes('moss') || msg.includes('sea moss')) {
    return {
      text: "Our Irish Sea Moss is packed with 92 of the 102 minerals your body needs! It's great for thyroid support, digestion, and glowing skin.",
      options: ["Buy Sea Moss"]
    };
  }

  // Creatine
  if (msg.includes('creatine')) {
    return {
      text: "Our Creatine Monohydrate is micronized for rapid absorption, helping you build muscle, increase strength, and improve workout performance.",
      options: ["Buy Creatine"]
    };
  }

  // Price / Cost / Products
  if (msg.includes('price') || msg.includes('cost') || msg.includes('how much') || msg.includes('rate') || msg.includes('product') || msg.includes('buy') || msg.includes('item')) {
    return {
      text: "We offer premium Himalayan Shilajit, Ashwagandha KSM-66, Irish Sea Moss, and Creatine Monohydrate. Prices range from ₹499 to ₹1,499. You can check our 'Products' page for exact pricing!",
      options: ["Shilajit", "Ashwagandha", "Chat with Human"]
    };
  }

  // Order / Tracking
  if (msg.includes('order') || msg.includes('track') || msg.includes('shipping') || msg.includes('delivery') || msg.includes('where is')) {
    return {
      text: "Orders typically take 3-5 business days to arrive. To track your order, please visit the 'My Account' section or share your Order ID with our human support team.",
      options: ["Chat with Human"]
    };
  }

  // Human / Agent / WhatsApp
  if (msg.includes('human') || msg.includes('agent') || msg.includes('person') || msg.includes('whatsapp') || msg.includes('call') || msg.includes('talk') || msg.includes('support') || msg.includes('help')) {
    return {
      text: "Sure! I can connect you to our support team on WhatsApp.",
      action: "open_whatsapp"
    };
  }

  // Fallback
  return {
    text: "I'm still learning! 🤖 If I couldn't answer your question properly, I can connect you to a human support agent.",
    options: ["Chat with Human", "Products"]
  };
};
