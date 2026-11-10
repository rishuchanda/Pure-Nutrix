import React, { useEffect } from 'react';
import { Home, LayoutGrid, ShoppingBag, User, MessageCircle } from 'lucide-react';
import './MobileTabBar.css';

// App-style bottom navigation for phones. Hidden on desktop by CSS and not
// rendered on product, cart and checkout pages (they have their own bars).
const MobileTabBar = ({ active, cartCount = 0, user, onHome, onShop, onCart, onAccount, onAuth }) => {
  useEffect(() => {
    document.body.classList.add('pn-tabbar');
    return () => document.body.classList.remove('pn-tabbar');
  }, []);

  const tabs = [
    { key: 'home', label: 'Home', icon: Home, onClick: onHome },
    { key: 'products', label: 'Shop', icon: LayoutGrid, onClick: onShop },
    { key: 'cart', label: 'Cart', icon: ShoppingBag, onClick: onCart, badge: cartCount },
    { key: 'help', label: 'Help', icon: MessageCircle, href: '/whatsapp' },
    { key: 'account', label: user ? 'Account' : 'Login', icon: User, onClick: user ? onAccount : onAuth },
  ];

  return (
    <nav className="mobile-tabbar" aria-label="Main">
      {tabs.map(({ key, label, icon: Icon, onClick, href, badge }) => {
        const content = (
          <>
            <span className="mtb-icon">
              <Icon size={21} strokeWidth={active === key ? 2.4 : 1.8} />
              {badge > 0 && <span className="mtb-badge pn-bump" key={badge}>{badge > 9 ? '9+' : badge}</span>}
            </span>
            <span className="mtb-label">{label}</span>
          </>
        );
        return href ? (
          <a key={key} href={href} className="mtb-tab">{content}</a>
        ) : (
          <button key={key} type="button" className={`mtb-tab ${active === key ? 'is-active' : ''}`} onClick={onClick} aria-current={active === key ? 'page' : undefined}>{content}</button>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
