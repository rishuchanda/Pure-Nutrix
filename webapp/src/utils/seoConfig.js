const SEO_CONFIG_KEY = 'pn_live_seo_config';

const defaultSEOConfig = {
  siteName: "Pure Nutrix",
  defaultTitle: "Pure Nutrix | India's #1 Premium Nutraceuticals, Skin Glow & Health Supplements",
  defaultDescription: "Pure Nutrix nutraceuticals: Liposomal Glutathione 600mg, Ultra L-Glutathione with Vitamin C, Advanced Collagen & Biotin, Himalayan Sea Buckthorn Juice and Ashwagandha Root Extract 500mg. FSSAI licensed, made in India. Buy 1 Get 1 FREE.",
  defaultKeywords: "Pure Nutrix, pure nutrix supplements, liposomal glutathione 600mg, glutathione capsules india, l-glutathione with vitamin c, collagen biotin capsules, sea buckthorn juice, ashwagandha root extract 500mg",
  siteUrl: "https://purenutrix.in",
  googleVerificationCode: "",
  bingVerificationCode: "",
  googleAnalyticsId: "",
  ogImage: "https://purenutrix.in/assets/og-image.jpg",
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
