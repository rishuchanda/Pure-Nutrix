export const getProductDetails = (productName) => {
  const name = productName ? productName.toLowerCase() : '';

  // Default fallback details
  let details = {
    subtitle: "Premium Nutraceutical Support for Optimal Health",
    tags: ["✨ Premium Quality", "🌱 Natural Ingredients", "🔬 Clinically Proven"],
    whatMakesItSpecial: {
      description: "A premium, science-backed formula designed for optimal health and vitality.",
      bullets: [
        "Provides comprehensive nutritional support",
        "Formulated for high absorption and bioavailability",
        "Manufactured in certified facilities",
        "Free from unnecessary fillers or additives"
      ]
    },
    howToUse: {
      steps: [
        { title: "Step 1", desc: "Take as directed on the packaging." },
        { title: "Step 2", desc: "For best results, maintain a consistent routine." }
      ],
      note: "Consult a healthcare professional if you have any pre-existing conditions."
    },
    scienceAndIngredients: {
      keyIngredients: "Premium bioactive compounds",
      description: "Carefully selected ingredients backed by clinical research to ensure maximum efficacy and safety."
    },
    specs: {
      form: "Capsules / Liquid",
      quantity: "Standard Pack",
      packOf: "1",
      shelfLife: "18 months from manufacturing"
    },
    aiSummary: {
      text: "Customers appreciate the high quality and effectiveness of this product. Many report feeling more energetic and healthier after consistent use. The premium formulation is frequently highlighted as a major positive.",
      topics: ["High Quality", "Effectiveness", "Energy Boost", "Premium Formula"]
    },
    faq: [
      { q: "Is this product safe for daily use?", a: "Yes, our products are formulated with safe, natural ingredients for daily consumption." },
      { q: "Can men and women both use this?", a: "Yes, this product is perfectly suitable for both men and women." },
      { q: "Are there any side effects?", a: "Our products are generally well-tolerated. However, please consult your doctor if you have specific allergies or conditions." }
    ]
  };

  // Match Glutathione
  if (name.includes('glutathione')) {
    details = {
      subtitle: "ADVANCED SKIN RADIANCE FORMULA: Repairs dull skin and promotes a youthful, luminous radiance.",
      tags: ["✨ Skin Brightening", "🌱 Vegetarian", "🔬 Clinically Proven"],
      whatMakesItSpecial: {
        description: "An advanced skin radiance formula combining L-Glutathione and Vitamin C. It repairs dull skin from within, promoting a youthful, luminous glow while neutralizing free radicals.",
        bullets: [
          "Promotes intense skin brightening and even skin tone",
          "Powerful antioxidant action to fight cellular aging",
          "Added Vitamin C boosts Glutathione absorption by up to 50%",
          "Reduces dark spots, pigmentation, and oxidative stress"
        ]
      },
      howToUse: {
        steps: [
          { title: "Step 1", desc: "Take 1 capsule daily." },
          { title: "Step 2", desc: "Consume after a meal with a full glass of water." },
          { title: "Step 3", desc: "For best results, use consistently for 3-4 months." }
        ],
        note: "Use daily (AM or PM) for best results."
      },
      scienceAndIngredients: {
        keyIngredients: "L-Glutathione 500mg, Vitamin C",
        description: "L-Glutathione is a master antioxidant that inhibits melanin production. Vitamin C acts as a synergistic catalyst, ensuring the Glutathione remains in its active, reduced state for maximum bioavailability."
      },
      specs: {
        form: "Capsule",
        quantity: "30 Capsules",
        packOf: "1",
        shelfLife: "18 months from manufacturing"
      },
      aiSummary: {
        text: "Customers highly praise this Glutathione supplement for its noticeable effects on skin brightness and even tone. Many users report a visible reduction in pigmentation and dark spots within a few weeks of consistent use. The addition of Vitamin C is frequently mentioned as a great benefit for immunity and overall glow.",
        topics: ["Skin Brightening", "Reduces Pigmentation", "Glowing Skin", "Antioxidant Boost"]
      },
      faq: [
        { q: "How long until I see results?", a: "Most users begin noticing a brighter, more even skin tone within 4 to 8 weeks of consistent daily use." },
        { q: "Can men use this product?", a: "Absolutely! Glutathione works equally well for both men and women looking to improve skin health." },
        { q: "Is it safe for long-term use?", a: "Yes, L-Glutathione is a naturally occurring antioxidant in the body and is safe for daily, long-term supplementation." }
      ]
    };
  } 
  // Match Collagen
  else if (name.includes('collagen')) {
    details = {
      subtitle: "CELLULAR SKIN RADIANCE: Improves skin elasticity, retains moisture, and reduces fine lines.",
      tags: ["✨ Anti-Aging", "💧 Hydrating", "🔬 High Bioavailability"],
      whatMakesItSpecial: {
        description: "A comprehensive cellular skin radiance complex. It replenishes diminishing collagen levels to improve skin elasticity, retain vital moisture, and visibly reduce fine lines.",
        bullets: [
          "Boosts skin elasticity and firmness",
          "Hyaluronic Acid locks in moisture for a plump appearance",
          "Biotin strengthens hair follicles and nail beds",
          "Zinc helps control inflammation and supports clear skin"
        ]
      },
      howToUse: {
        steps: [
          { title: "Step 1", desc: "Take 1 capsule daily." },
          { title: "Step 2", desc: "Preferably consume after dinner or before bed." },
          { title: "Step 3", desc: "Ensure adequate water intake throughout the day." }
        ],
        note: "Cellular repair happens mostly at night, making evening consumption ideal."
      },
      scienceAndIngredients: {
        keyIngredients: "Hydrolyzed Collagen, Biotin, Hyaluronic Acid, Vitamin C, Zinc",
        description: "Features hydrolyzed collagen peptides which are small enough to be easily absorbed through the intestinal wall. Hyaluronic acid acts as a moisture magnet, holding up to 1000x its weight in water."
      },
      specs: {
        form: "Capsule",
        quantity: "30 Capsules",
        packOf: "1",
        shelfLife: "18 months from manufacturing"
      },
      aiSummary: {
        text: "Customers love this collagen complex for its multi-benefit formula. Many report not only improved skin elasticity and hydration but also significantly stronger hair and nails thanks to the Biotin and Hyaluronic Acid. Users appreciate that it doesn't cause breakouts, likely due to the added Zinc.",
        topics: ["Skin Elasticity", "Hair & Nail Growth", "Deep Hydration", "Anti-Aging"]
      },
      faq: [
        { q: "Is this marine or bovine collagen?", a: "Our formula uses highly bioavailable hydrolyzed collagen peptides for maximum absorption." },
        { q: "Will this help with hair loss?", a: "Yes, the inclusion of Biotin and Zinc specifically targets hair follicle strength and promotes healthier, thicker hair growth." },
        { q: "What is the best time to take it?", a: "We recommend taking it before bed, as the body's natural cellular repair processes are most active during sleep." }
      ]
    };
  }
  // Match Sea Buckthorn
  else if (name.includes('sea buckthorn') || name.includes('juice')) {
    details = {
      subtitle: "Supports Immunity, Glowing Skin & Gut Health | With Omega 3, 6, 7 & 9",
      tags: ["🌱 100% Natural", "🍊 Immunity Booster", "💧 Omega 7 Rich"],
      whatMakesItSpecial: {
        description: "A potent, natural Himalayan essence containing over 190 bio-active elements. It delivers a massive boost to immunity, gut health, and skin hydration through rare Omega fatty acids.",
        bullets: [
          "Rich in rare Omega 7 for intense cellular and skin hydration",
          "Contains Omegas 3, 6, and 9 for heart and brain support",
          "High dietary fiber content improves digestion and gut flora",
          "Dual-action immunity boost with natural Vitamin C and Calcium"
        ]
      },
      howToUse: {
        steps: [
          { title: "Step 1", desc: "Shake the bottle well before use." },
          { title: "Step 2", desc: "Dilute 15-20 ml of juice in a glass of water." },
          { title: "Step 3", desc: "Consume twice daily on an empty stomach." }
        ],
        note: "Refrigerate after opening and consume within 30 days."
      },
      scienceAndIngredients: {
        keyIngredients: "100% Pure Himalayan Sea Buckthorn Extract",
        description: "Sourced from high-altitude Himalayan berries, known for surviving extreme conditions. This resilience translates into a dense nutritional profile, naturally rich in antioxidants and the rare Omega 7 fatty acid."
      },
      specs: {
        form: "Liquid Juice",
        quantity: "500 ml",
        packOf: "1",
        shelfLife: "12 months from manufacturing"
      },
      aiSummary: {
        text: "Customers consistently report feeling more energetic and noticing improved digestion after incorporating this juice into their morning routine. The natural hydration benefits for the skin from the Omega 7 content are frequently praised. Users appreciate the pure, unadulterated quality of the Himalayan berries.",
        topics: ["Energy Boost", "Gut Health & Digestion", "Skin Hydration", "Immunity Support"]
      },
      faq: [
        { q: "What does it taste like?", a: "It has a naturally tart and tangy flavor, characteristic of pure Sea Buckthorn berries. We recommend diluting it in water or juice." },
        { q: "Can I drink it without diluting?", a: "Because it is a highly concentrated natural extract, we strongly recommend diluting 15-20ml in a full glass of water." },
        { q: "Is it safe for children?", a: "While natural, we recommend consulting a pediatrician before introducing concentrated nutritional supplements to children under 12." }
      ]
    };
  }

  return details;
};
