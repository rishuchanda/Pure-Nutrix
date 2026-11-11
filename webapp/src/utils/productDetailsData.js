export const getProductDetails = (productName) => {
  const name = productName ? productName.toLowerCase() : '';

  // Default fallback details
  let details = {
    subtitle: "Premium Nutraceutical Support for Optimal Health",
    tags: ["✨ Premium Quality", "🌱 Natural Ingredients", "🏭 ISO 22000 Facility"],
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
      text: "Made in an ISO 22000 and GMP certified facility in Jaipur. The full ingredient list, batch number and best-before date are printed on every pack.",
      topics: ["High Quality", "Effectiveness", "Energy Boost", "Premium Formula"]
    },
    faq: [
      { q: "Is this product safe for daily use?", a: "Yes, our products are formulated with safe, natural ingredients for daily consumption." },
      { q: "Can men and women both use this?", a: "Yes, this product is perfectly suitable for both men and women." },
      { q: "Are there any side effects?", a: "Our products are generally well-tolerated. However, please consult your doctor if you have specific allergies or conditions." }
    ]
  };

  // Match Liposomal Glutathione (checked before plain Glutathione).
  // Text follows the jar label; keep claims to "supports", no cure/treatment words.
  if (name.includes('liposomal') && name.includes('glutathione')) {
    details = {
      subtitle: "600 mg Liposomal Glutathione (85% purity) per capsule, wrapped in sunflower-lecithin liposomes. One veg capsule a day for skin radiance and antioxidant support.",
      tags: ["✨ Skin Radiance", "🌱 Veg Capsule (HPMC)", "🧪 Lab Report on QR"],
      labReportSlug: 'liposomal-glutathione',
      whatMakesItSpecial: {
        description: "Glutathione is the body's own master antioxidant. In this formula each capsule carries 600 mg of Liposomal Glutathione, providing 510 mg of L-Glutathione (85%), held inside a nano-sized phospholipid (liposome) layer from sunflower lecithin.",
        bullets: [
          "600 mg Liposomal Glutathione per capsule, providing 510 mg L-Glutathione (85%)",
          "Nano-liposomal delivery: glutathione wrapped in a protective phospholipid layer",
          "Supports natural skin glow and a healthy-looking complexion",
          "Antioxidant support that helps the body fight oxidative stress",
          "Just 1 capsule a day — 1 jar lasts 30 days",
          "Vegetarian HPMC capsule, no soy, zero sugar",
          "Batch lab report available — scan the QR on the jar"
        ]
      },
      howToUse: {
        steps: [
          { title: "Step 1", desc: "Take 1 capsule daily." },
          { title: "Step 2", desc: "Take it on an empty stomach, in the morning before breakfast, with water." },
          { title: "Step 3", desc: "Use regularly every day; do not exceed the recommended daily usage." }
        ],
        note: "If pregnant, nursing or on medication, consult your doctor before use. Keep out of reach of children. Not for medicinal use."
      },
      scienceAndIngredients: {
        keyIngredients: "Liposomal L-Glutathione 600 mg (Reduced L-Glutathione, Phospholipids) providing L-Glutathione 510 mg (85%). Other ingredients: Vegetable Cellulose Capsule (HPMC).",
        description: "A liposome is a tiny sphere made of phospholipids — the same kind of material as the body's cell walls. Placing glutathione inside this layer is designed to protect it from stomach acid and enzymes on the way to absorption. Per capsule (approx.): Energy 2.9 kcal, Protein 0.5 g, Carbohydrate 0 g, Sugars 0 g, Fat 0.1 g, Sodium 0 mg."
      },
      specs: {
        form: "Veg Capsule (HPMC)",
        quantity: "30 Capsules (PET jar)",
        packOf: "1",
        shelfLife: "See Best Before date on the jar"
      },
      aiSummary: {
        text: "This is a new product, so customer reviews are still coming in. Highlights from the label: 600 mg liposomal glutathione at 85% purity, one capsule a day, vegetarian capsule, and a batch lab report you can open from the QR code on the jar.",
        topics: ["Liposomal", "85% Purity", "1 Capsule Daily", "Lab Report QR"]
      },
      faq: [
        { q: "What does 'liposomal' mean?", a: "The glutathione is wrapped in a very small phospholipid bubble (a liposome) made from sunflower lecithin. This layer is designed to protect it in the stomach and help it get absorbed." },
        { q: "How do I take it?", a: "1 capsule a day on an empty stomach, in the morning before breakfast, with water — or as advised by your healthcare professional." },
        { q: "Is it vegetarian?", a: "Yes. The capsule shell is vegetable cellulose (HPMC) and the liposomes are made from sunflower lecithin. It contains no soy and no sugar." },
        { q: "Where can I see the lab report?", a: "Scan the 'Lab Report' QR code on the jar, or open purenutrix.in/lab-report/liposomal-glutathione." },
        { q: "Can men use it?", a: "Yes, it is for adult men and women. If you are pregnant, nursing or on medication, please ask your doctor first." }
      ]
    };
  }
  // Match Glutathione
  else if (name.includes('glutathione')) {
    details = {
      subtitle: "SKIN RADIANCE FORMULA: L-Glutathione 500mg with Vitamin C, one capsule a day for antioxidant and skin glow support.",
      tags: ["✨ Skin Radiance", "🌱 Vegetarian", "🏭 ISO 22000 Facility"],
      whatMakesItSpecial: {
        description: "An advanced skin radiance formula combining L-Glutathione and Vitamin C. It supports skin radiance from within and helps the body fight free radicals.",
        bullets: [
          "Supports skin radiance and an even-looking skin tone",
          "Powerful antioxidant action to fight cellular aging",
          "Added Vitamin C works alongside glutathione as an antioxidant",
          "Helps the body handle everyday oxidative stress"
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
        text: "From the label: 500 mg L-Glutathione with Vitamin C per capsule, 30 vegetarian capsules (one month), one capsule a day after a meal. Made in an ISO 22000 and GMP certified facility.",
        topics: ["500 mg per capsule", "With Vitamin C", "1 capsule a day", "30-day pack"]
      },
      faq: [
        { q: "How long until I see results?", a: "Results differ from person to person. Take it daily, together with sun protection and a good diet, for at least 8–12 weeks before you judge it." },
        { q: "Can men use this product?", a: "Yes, it is for adult men and women." },
        { q: "Is it safe for long-term use?", a: "Glutathione is an antioxidant the body makes on its own. Stay within one capsule a day, and ask your doctor first if you are pregnant, nursing, or on any medicine." }
      ]
    };
  } 
  // Match Collagen
  else if (name.includes('collagen')) {
    details = {
      subtitle: "SKIN, HAIR & NAIL SUPPORT: Collagen with Biotin, Hyaluronic Acid, Vitamin C and Zinc in one daily capsule.",
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
        text: "From the label: hydrolyzed collagen with Biotin, Hyaluronic Acid, Vitamin C and Zinc, 30 capsules (one month), one capsule a day. Made in an ISO 22000 and GMP certified facility.",
        topics: ["Collagen + Biotin", "Hyaluronic Acid", "Vitamin C & Zinc", "30-day pack"]
      },
      faq: [
        { q: "Is this marine or bovine collagen?", a: "Our formula uses highly bioavailable hydrolyzed collagen peptides for maximum absorption." },
        { q: "Will this help with hair fall?", a: "Biotin and Zinc are nutrients that support normal hair and nails. Hair fall has many causes, so if it is heavy please see a doctor." },
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
        text: "From the label: Himalayan Sea Buckthorn juice, 500 ml bottle. Mix 15–20 ml in a glass of water, twice a day. Refrigerate after opening and finish within 30 days.",
        topics: ["500 ml bottle", "Omega 3, 6, 7 & 9", "Mix with water", "Twice a day"]
      },
      faq: [
        { q: "What does it taste like?", a: "It has a naturally tart and tangy flavor, characteristic of pure Sea Buckthorn berries. We recommend diluting it in water or juice." },
        { q: "Is it safe for children?", a: "While natural, we recommend consulting a pediatrician before introducing concentrated nutritional supplements to children under 12." }
      ]
    };
  }
  // Match Ashwagandha
  else if (name.includes('ashwagandha')) {
    details = {
      subtitle: "STRESS, ENERGY & IMMUNITY SUPPORT: 500mg ashwagandha root extract, a traditional Ayurvedic adaptogen.",
      tags: ["✨ Stress Support", "🌱 Root Extract", "🏭 ISO 22000 Facility", "⚡ Daily Energy"],
      whatMakesItSpecial: {
        description: "Formulated with 500mg of 100% pure, root-derived ashwagandha per capsule, this traditional adaptogen helps your body adapt to physical and mental stress without causing drowsiness.",
        bullets: [
          "Potent 500mg Strength: Delivers a concentrated dose of 100% pure root-derived extract for maximum absorption and efficacy.",
          "Everyday Stress Support: A traditional adaptogen that helps the body handle daily stress and supports calmness.",
          "Energy & Vitality Booster: Helps fight persistent fatigue, supporting improved stamina, endurance, and physical performance.",
          "Immunity & Wellness Support: Rich in natural antioxidants to reinforce your body's immune system and overall health."
        ]
      },
      howToUse: {
        steps: [
          { title: "Step 1", desc: "Take 1 capsule daily after a meal." },
          { title: "Step 2", desc: "Consume with a full glass of lukewarm water or milk." },
          { title: "Step 3", desc: "For optimal sleep and relaxation benefits, take in the evening before bed." }
        ],
        note: "Safe, reliable, and packaged in a convenient 30-capsule bottle for a full month of daily support."
      },
      scienceAndIngredients: {
        keyIngredients: "100% Pure Ashwagandha Root Extract (500mg)",
        description: "Formulated exclusively from pure root-derived extract rather than leaves, ensuring maximum concentration of bioactive withanolides. This traditional adaptogen supports the nervous system while simultaneously revitalizing cellular energy production."
      },
      specs: {
        form: "Capsules",
        quantity: "30 Capsules",
        packOf: "1",
        shelfLife: "24 months from manufacturing"
      },
      aiSummary: {
        text: "From the label: 500 mg ashwagandha root extract per capsule, 30 capsules (one month), one capsule a day after a meal. Made in an ISO 22000 and GMP certified facility.",
        topics: ["500 mg root extract", "1 capsule a day", "Root, not leaf", "30-day pack"]
      },
      faq: [
        { q: "Will this make me drowsy during the daytime?", a: "No, Pure Nutrix Ashwagandha is an adaptogen that calms the nervous system without acting as a sedative or causing daytime drowsiness." },
        { q: "How long before I see results?", a: "It differs from person to person. Take it daily for at least 8 weeks, with good sleep and diet, before you judge it." },
        { q: "Can fitness athletes and gym-goers take this?", a: "Yes! Active individuals take it daily to support muscle recovery, stamina, endurance, and physical vitality." },
        { q: "Is this safe for long-term daily use?", a: "It is not habit forming. Stay within one capsule a day, and ask your doctor first if you are pregnant, nursing, have a thyroid condition or take any medicine." }
      ]
    };
  }

  return details;
};
