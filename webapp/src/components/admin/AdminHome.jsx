import React, { useMemo, useState } from 'react';
import { ShoppingBag, Truck, Wallet, TrendingUp, AlertTriangle, ChevronRight, Trophy } from 'lucide-react';
import OrderAlertsCard from '../OrderAlertsCard';
import { OrderCard } from './AdminOrders';
import { isOpen, isInTransit, isLost, isCOD, inr, sameDay, orderLines, LOW_STOCK } from './adminUtils';

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Revenue per day, single series: one ink colour, no legend; per-bar tooltip.
const SalesChart = ({ orders }) => {
  const [days, setDays] = useState(7);
  const [hover, setHover] = useState(null);
  const data = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      buckets.push({ date: d, key: dayKey(d), revenue: 0, count: 0 });
    }
    const map = Object.fromEntries(buckets.map(b => [b.key, b]));
    orders.filter(o => !isLost(o)).forEach(o => {
      const b = map[dayKey(new Date(o.created_at))];
      if (b) { b.revenue += Number(o.price || 0); b.count += 1; }
    });
    return buckets;
  }, [orders, days]);

  const total = data.reduce((a, b) => a + b.revenue, 0);
  const count = data.reduce((a, b) => a + b.count, 0);
  const max = Math.max(1, ...data.map(d => d.revenue));
  const W = 320, H = 120, gap = days > 7 ? 2 : 6;
  const slot = (W - gap * (data.length - 1)) / data.length;
  const bw = Math.min(slot, 22); // thin bars, centred in their day slot
  const label = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const h = hover != null ? data[hover] : null;

  return (
    <section className="ax-card">
      <div className="ax-card-head">
        <h2><TrendingUp size={17} /> Sales</h2>
        <div className="ax-seg" role="tablist" aria-label="Range">
          {[7, 30].map(n => <button key={n} type="button" className={days === n ? 'on' : ''} onClick={() => { setDays(n); setHover(null); }}>{n} days</button>)}
        </div>
      </div>
      <p className="ax-big">{inr(total)} <span className="ax-muted">· {count} order{count === 1 ? '' : 's'}</span></p>
      <div className="ax-chart" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`Revenue per day, last ${days} days`}>
          <line x1="0" x2={W} y1={H} y2={H} className="ax-axis" />
          {data.map((d, i) => {
            const bh = d.revenue > 0 ? Math.max(3, (d.revenue / max) * (H - 8)) : 0;
            const x = i * (slot + gap) + (slot - bw) / 2;
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
                <rect x={i * (slot + gap)} y="0" width={slot + gap} height={H} fill="transparent" />
                {bh > 0 && <path className={`ax-bar ${hover === i ? 'is-hover' : ''}`}
                  d={`M${x},${H} V${H - bh + Math.min(4, bw / 2)} Q${x},${H - bh} ${x + Math.min(4, bw / 2)},${H - bh} H${x + bw - Math.min(4, bw / 2)} Q${x + bw},${H - bh} ${x + bw},${H - bh + Math.min(4, bw / 2)} V${H} Z`} />}
                {(days === 7 || i % 7 === 0 || i === data.length - 1) && (
                  <text x={i * (slot + gap) + slot / 2} y={H + 13} textAnchor="middle" className="ax-tick">{days === 7 ? d.date.toLocaleDateString('en-IN', { weekday: 'short' }) : label(d.date)}</text>
                )}
              </g>
            );
          })}
        </svg>
        {h && (
          <div className="ax-tip" style={{ left: `${((hover * (slot + gap) + slot / 2) / W) * 100}%` }}>
            <strong>{label(h.date)}</strong>
            <span>{inr(h.revenue)} · {h.count} order{h.count === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>
      <details className="ax-table-toggle">
        <summary>Show as table</summary>
        <table className="ax-table"><thead><tr><th>Day</th><th>Orders</th><th>Revenue</th></tr></thead>
          <tbody>{[...data].reverse().map(d => <tr key={d.key}><td>{label(d.date)}</td><td>{d.count}</td><td>{inr(d.revenue)}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
};

const AdminHome = ({ orders, products, loading, onStatus, readOnly, go, adminEmail }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const today = orders.filter(o => sameDay(new Date(o.created_at), now) && !isLost(o));
    const month = orders.filter(o => { const d = new Date(o.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !isLost(o); });
    const toShip = orders.filter(isOpen);
    const codPending = orders.filter(o => isCOD(o) && (isOpen(o) || isInTransit(o)));
    return {
      todayCount: today.length, todayRevenue: today.reduce((a, o) => a + Number(o.price || 0), 0),
      toShip: toShip.length, transit: orders.filter(isInTransit).length,
      codCount: codPending.length, codAmount: codPending.reduce((a, o) => a + Number(o.price || 0), 0),
      monthRevenue: month.reduce((a, o) => a + Number(o.price || 0), 0), monthCount: month.length,
    };
  }, [orders]);

  const lowStock = useMemo(() => products.filter(p => Number(p.stock || 0) <= LOW_STOCK).sort((a, b) => (a.stock || 0) - (b.stock || 0)), [products]);

  const best = useMemo(() => {
    const since = Date.now() - 30 * 864e5;
    const tally = {};
    orders.filter(o => !isLost(o) && new Date(o.created_at).getTime() >= since).forEach(o => {
      orderLines(o).forEach(l => {
        const p = products.find(pp => l.name.toLowerCase().includes(pp.name.toLowerCase()) || pp.name.toLowerCase().includes(l.name.toLowerCase()));
        const key = p ? p.name : l.name;
        tally[key] = tally[key] || { name: key, image: p?.image_urls?.[0], units: 0 };
        tally[key].units += l.qty;
      });
    });
    return Object.values(tally).sort((a, b) => b.units - a.units).slice(0, 3);
  }, [orders, products]);

  const toShipList = orders.filter(isOpen).slice(0, 5);
  const hello = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="ax-page">
      <div className="ax-page-head">
        <h1>{hello} 👋</h1>
        <p className="ax-muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <div className="ax-stats">
        <button type="button" className="ax-stat" onClick={() => go('orders', 'all')}>
          <span className="ax-stat-icon"><ShoppingBag size={18} /></span>
          <span className="ax-stat-label">Today</span>
          <strong>{loading ? '…' : stats.todayCount} <small>orders</small></strong>
          <span className="ax-muted">{inr(stats.todayRevenue)}</span>
        </button>
        <button type="button" className={`ax-stat ${stats.toShip ? 'is-alert' : ''}`} onClick={() => go('orders', 'open')}>
          <span className="ax-stat-icon"><Truck size={18} /></span>
          <span className="ax-stat-label">To ship</span>
          <strong>{loading ? '…' : stats.toShip}</strong>
          <span className="ax-muted">{stats.transit} on the way</span>
        </button>
        <button type="button" className="ax-stat" onClick={() => go('orders', 'transit')}>
          <span className="ax-stat-icon"><Wallet size={18} /></span>
          <span className="ax-stat-label">COD to collect</span>
          <strong>{loading ? '…' : inr(stats.codAmount)}</strong>
          <span className="ax-muted">{stats.codCount} order{stats.codCount === 1 ? '' : 's'}</span>
        </button>
        <div className="ax-stat">
          <span className="ax-stat-icon"><TrendingUp size={18} /></span>
          <span className="ax-stat-label">This month</span>
          <strong>{loading ? '…' : inr(stats.monthRevenue)}</strong>
          <span className="ax-muted">{stats.monthCount} orders</span>
        </div>
      </div>

      {lowStock.length > 0 && (
        <button type="button" className="ax-warn" onClick={() => go('products')}>
          <AlertTriangle size={18} />
          <span><strong>Low stock:</strong> {lowStock.map(p => `${p.name.replace(/^Pure Nutrix\s+/i, '').split(/\s+/).slice(0, 4).join(' ')} (${p.stock || 0})`).join(', ')}</span>
          <ChevronRight size={18} />
        </button>
      )}

      <section className="ax-section">
        <div className="ax-section-head">
          <h2>To ship now</h2>
          <button type="button" onClick={() => go('orders', 'open')}>All <ChevronRight size={15} /></button>
        </div>
        {loading ? <p className="ax-muted">Loading…</p> : toShipList.length === 0 ? (
          <div className="ax-empty">All caught up — nothing waiting to ship. 🎉</div>
        ) : <div className="ax-list">{toShipList.map(o => <OrderCard key={o.id} order={o} onStatus={onStatus} readOnly={readOnly} compact />)}</div>}
      </section>

      <div className="ax-grid-2">
        <SalesChart orders={orders} />
        <section className="ax-card">
          <div className="ax-card-head"><h2><Trophy size={17} /> Best sellers · 30 days</h2></div>
          {best.length === 0 ? <p className="ax-muted">No sales in the last 30 days yet.</p> : (
            <ol className="ax-best">
              {best.map((b, i) => (
                <li key={b.name}>
                  <span className="ax-rank">{i + 1}</span>
                  {b.image && <img src={b.image} alt="" />}
                  <span className="ax-best-name">{b.name}</span>
                  <strong>{b.units} sold</strong>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <OrderAlertsCard adminEmail={adminEmail} />
    </div>
  );
};

export default AdminHome;
