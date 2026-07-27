const SEO_CONFIG_KEY = 'pn_live_seo_config';

const defaultSEOConfig = {
  siteName: "Pure Nutrix",
  defaultTitle: "Pure Nutrix | India's #1 Premium Nutraceuticals, Skin Glow & Health Supplements",
  defaultDescription: "Pure Nutrix is India's leading brand for clinically proven health supplements: Ashwagandha Root Extract 500mg, L-Glutathione skin radiance tablets, 100% Whey Protein Isolate, Collagen Peptides, and Organic Supergreens. FSSAI & NABL lab tested.",
  defaultKeywords: "Pure Nutrix, pure nutrix supplements, ashwagandha root extract capsules 500mg, l-glutathione tablets buy online india, glutathione skin glow, whey protein isolate 2kg price, collagen peptide complex india, best nutraceutical brand india, stress relief adaptogen supplement",
  siteUrl: "https://purenutrix.in",
  googleVerificationCode: "",
  bingVerificationCode: "",
  googleAnalyticsId: "",
  ogImage: "https://purenutrix.in/assets/logo.png",
  contactPhone: "+91-9057607030",
  addressLocality: "Jaipur, Rajasthan, 302019"
};

export const getLiveSEOConfig = () => {
  try {
    const stored = localStorage.getItem(SEO_CONFIG_KEY);
    if (stored) {
      return { ...defaultSEOConfig, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Error reading live SEO config:", e);
  }
  return defaultSEOConfig;
};

export const saveLiveSEOConfig = (newConfig) => {
  try {
    localStorage.setItem(SEO_CONFIG_KEY, JSON.stringify(newConfig));
    window.dispatchEvent(new Event('pn_seo_config_updated'));
    return true;
  } catch (e) {
    console.error("Error saving live SEO config:", e);
    return false;
  }
};
