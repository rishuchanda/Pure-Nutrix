export const parsePath = (path) => {
  if (path === '/' || path === '') return { view: 'home', slug: null };
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { view: 'home', slug: null };
  
  const segment = parts[0];
  
  const exactRoutes = {
    'admin': 'admin',
    'products': 'products',
    'cart': 'cart',
    'account': 'account',
    'quality': 'quality-standards',
    'legal': 'legal-policy',
    'privacy-policy': 'privacy-policy',
    'support': 'support',
    'whatsapp': 'whatsapp'
  };
  
  if (exactRoutes[segment]) return { view: exactRoutes[segment], slug: null };
  
  if (segment === 'product' || segment === 'pdp') return { view: 'pdp', slug: parts[1] };
  if (segment === 'buy' || segment === 'order') return { view: 'order', slug: parts[1] };

  return { view: 'home', slug: null };
};
export const getPathForView = (view, slug = null) => {
  const routeMap = {
    'home': '/',
    'admin': '/admin',
    'products': '/products',
    'cart': '/cart',
    'account': '/account',
    'quality-standards': '/quality',
    'legal-policy': '/legal',
    'privacy-policy': '/privacy-policy',
    'support': '/support',
    'whatsapp': '/whatsapp',
    'pdp': `/product/${slug}`,
    'order': `/buy/${slug}`,
  };
  return routeMap[view] || '/';
};
