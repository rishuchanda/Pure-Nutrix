import React, { useMemo, useState } from 'react';
import { Plus, Minus, Pencil, ExternalLink, AlertTriangle, X, Upload, Trash2, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { inr, LOW_STOCK } from './adminUtils';

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
const EMPTY = { name: '', category: '', price: '', original_price: '', stock: '', quantity: '', product_form: 'Capsules', short_description: '', nutrient_content: '', composition: '', usage_instructions: '', image_urls: [] };

async function compress(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WEBP photo.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(res, 'image/jpeg', 0.86));
  } finally { URL.revokeObjectURL(url); }
}

const ProductForm = ({ product, onClose, onSaved, onDeleted }) => {
  const [f, setF] = useState(() => ({ ...EMPTY, ...(product || {}), image_urls: [...(product?.image_urls || [])] }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const upload = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length) return;
    setBusy(true); setErr('');
    try {
      const urls = [];
      for (const file of files) {
        const blob = await compress(file);
        const path = `${slugify(f.name) || 'product'}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        urls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
      }
      setF(prev => ({ ...prev, image_urls: [...prev.image_urls, ...urls] }));
    } catch (e2) { setErr('Photo upload failed: ' + (e2.message || e2)); }
    finally { setBusy(false); }
  };

  const move = (i, d) => setF(prev => {
    const a = [...prev.image_urls]; const j = i + d; if (j < 0 || j >= a.length) return prev;
    [a[i], a[j]] = [a[j], a[i]]; return { ...prev, image_urls: a };
  });

  const save = async (e) => {
    e.preventDefault(); setErr('');
    if (!f.name.trim()) { setErr('Please enter the product name.'); return; }
    if (!(Number(f.price) > 0)) { setErr('Please enter a selling price.'); return; }
    if (f.original_price && Number(f.original_price) < Number(f.price)) { setErr('MRP should not be lower than the selling price.'); return; }
    setBusy(true);
    const row = {
      name: f.name.trim(), category: f.category.trim() || null, price: Number(f.price),
      original_price: f.original_price ? Number(f.original_price) : null, stock: Math.max(0, parseInt(f.stock || 0, 10) || 0),
      quantity: f.quantity || null, product_form: f.product_form || null, short_description: f.short_description || null,
      nutrient_content: f.nutrient_content || null, composition: f.composition || null, usage_instructions: f.usage_instructions || null,
      image_urls: f.image_urls,
    };
    try {
      const res = product
        ? await supabase.from('products').update(row).eq('id', product.id).select().single()
        : await supabase.from('products').insert({ ...row, slug: slugify(f.name) }).select().single();
      if (res.error) throw res.error;
      onSaved(res.data, !product);
    } catch (e2) { setErr('Could not save: ' + (e2.message || e2)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${product.name}" from the website? Past orders stay safe, but the product page will stop working. This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    setBusy(false);
    if (error) { setErr('Could not delete: ' + error.message); return; }
    onDeleted(product.id);
  };

  return (
    <div className="ax-sheet-backdrop" onClick={() => !busy && onClose()}>
      <form className="ax-sheet" onClick={e => e.stopPropagation()} onSubmit={save}>
        <div className="ax-sheet-head">
          <h2>{product ? 'Edit product' : 'New product'}</h2>
          <button type="button" className="ax-icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="ax-sheet-body">
          <label className="ax-field"><span>Product name *</span><input value={f.name} onChange={set('name')} required /></label>
          <div className="ax-row-3">
            <label className="ax-field"><span>Selling price ₹ *</span><input type="number" inputMode="decimal" min="1" value={f.price} onChange={set('price')} required /></label>
            <label className="ax-field"><span>MRP ₹</span><input type="number" inputMode="decimal" min="0" value={f.original_price ?? ''} onChange={set('original_price')} /></label>
            <label className="ax-field"><span>Stock</span><input type="number" inputMode="numeric" min="0" value={f.stock ?? ''} onChange={set('stock')} /></label>
          </div>
          <div className="ax-row-3">
            <label className="ax-field"><span>Category</span><input value={f.category || ''} onChange={set('category')} placeholder="e.g. RADIANCE CAPSULES" /></label>
            <label className="ax-field"><span>Pack size</span><input value={f.quantity || ''} onChange={set('quantity')} placeholder="e.g. 30 capsules" /></label>
            <label className="ax-field"><span>Form</span><input value={f.product_form || ''} onChange={set('product_form')} placeholder="Capsules" /></label>
          </div>

          <div className="ax-field">
            <span>Photos (first photo is the main one)</span>
            <div className="ax-photos">
              {f.image_urls.map((u, i) => (
                <div key={u + i} className="ax-photo">
                  <img src={u} alt="" />
                  <div className="ax-photo-tools">
                    <button type="button" aria-label="Move left" onClick={() => move(i, -1)} disabled={i === 0}><ArrowLeft size={13} /></button>
                    <button type="button" aria-label="Remove photo" onClick={() => setF(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, j) => j !== i) }))}><Trash2 size={13} /></button>
                    <button type="button" aria-label="Move right" onClick={() => move(i, 1)} disabled={i === f.image_urls.length - 1}><ArrowRight size={13} /></button>
                  </div>
                </div>
              ))}
              <label className="ax-photo-add">
                <Upload size={18} /><span>{busy ? 'Uploading…' : 'Add photos'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} disabled={busy} hidden />
              </label>
            </div>
          </div>

          <label className="ax-field"><span>Short description</span><textarea rows="3" value={f.short_description || ''} onChange={set('short_description')} /></label>
          <label className="ax-field"><span>How to use</span><textarea rows="2" value={f.usage_instructions || ''} onChange={set('usage_instructions')} /></label>
          <div className="ax-row-2">
            <label className="ax-field"><span>Nutrition / per serving</span><textarea rows="3" value={f.nutrient_content || ''} onChange={set('nutrient_content')} /></label>
            <label className="ax-field"><span>Ingredients</span><textarea rows="3" value={f.composition || ''} onChange={set('composition')} /></label>
          </div>
          {err && <p className="ax-error" role="alert">{err}</p>}
        </div>
        <div className="ax-sheet-foot">
          {product && <button type="button" className="ax-btn ax-btn-danger" onClick={remove} disabled={busy}><Trash2 size={15} /> Delete</button>}
          <span style={{ flex: 1 }} />
          <button type="button" className="ax-btn ax-btn-light" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="ax-btn ax-btn-dark" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
};

const StockStepper = ({ product, onSave, readOnly }) => {
  const [val, setVal] = useState(String(product.stock ?? 0));
  const [state, setState] = useState('');
  const commit = async (n) => {
    const qty = Math.max(0, parseInt(n, 10) || 0);
    setVal(String(qty));
    if (qty === Number(product.stock || 0)) return;
    setState('saving');
    const ok = await onSave(product.id, qty);
    setState(ok ? 'saved' : 'error');
    setTimeout(() => setState(''), 1500);
  };
  return (
    <div className={`ax-stepper ${state}`}>
      <button type="button" aria-label="Less stock" disabled={readOnly} onClick={() => commit(Number(val) - 1)}><Minus size={15} /></button>
      <input type="number" inputMode="numeric" min="0" value={val} disabled={readOnly} aria-label="Stock"
        onChange={e => setVal(e.target.value)} onBlur={() => commit(val)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      <button type="button" aria-label="More stock" disabled={readOnly} onClick={() => commit(Number(val) + 1)}><Plus size={15} /></button>
    </div>
  );
};

const AdminProducts = ({ products, setProducts, loading, readOnly }) => {
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [q, setQ] = useState('');
  const low = products.filter(p => Number(p.stock || 0) <= LOW_STOCK);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(p => !s || `${p.name} ${p.category || ''}`.toLowerCase().includes(s));
  }, [products, q]);

  const saveStock = async (id, qty) => {
    const { error } = await supabase.from('products').update({ stock: qty }).eq('id', id);
    if (error) { alert('Could not update stock: ' + error.message); return false; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: qty } : p));
    return true;
  };

  return (
    <div className="ax-page">
      <div className="ax-page-head ax-page-head-row">
        <div><h1>Products</h1><p className="ax-muted">{products.length} listed · {low.length} low on stock</p></div>
        {!readOnly && <button type="button" className="ax-btn ax-btn-dark" onClick={() => setEditing('new')}><Plus size={16} /> Add</button>}
      </div>

      {low.length > 0 && (
        <div className="ax-warn ax-warn-static">
          <AlertTriangle size={18} />
          <span><strong>{low.length} product{low.length === 1 ? '' : 's'} at {LOW_STOCK} or less.</strong> Update stock after a new batch arrives.</span>
        </div>
      )}

      <label className="ax-search"><Search size={16} /><input type="search" placeholder="Search products…" value={q} onChange={e => setQ(e.target.value)} /></label>

      {loading ? <p className="ax-muted">Loading products…</p> : (
        <div className="ax-list">
          {list.map(p => {
            const stock = Number(p.stock || 0);
            const off = p.original_price && Number(p.original_price) > Number(p.price) ? Math.round((1 - p.price / p.original_price) * 100) : 0;
            return (
              <article key={p.id} className={`ax-product ${stock <= LOW_STOCK ? 'is-low' : ''}`}>
                <img src={p.image_urls?.[0] || '/icons/icon-192.png'} alt="" loading="lazy" />
                <div className="ax-product-info">
                  <strong className="ax-product-name">{p.name}</strong>
                  <span className="ax-product-price">
                    <b>{inr(p.price)}</b>
                    {p.original_price && <s>{inr(p.original_price)}</s>}
                    {off > 0 && <em>{off}% off</em>}
                  </span>
                  <span className={`ax-stock-label ${stock === 0 ? 'out' : stock <= LOW_STOCK ? 'low' : ''}`}>{stock === 0 ? 'Out of stock' : stock <= LOW_STOCK ? 'Low stock' : 'In stock'}</span>
                </div>
                <div className="ax-product-side">
                  <StockStepper key={`${p.id}-${p.stock}`} product={p} onSave={saveStock} readOnly={readOnly} />
                  <div className="ax-product-links">
                    {!readOnly && <button type="button" className="ax-icon-btn" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil size={16} /></button>}
                    <a className="ax-icon-btn" href={`/product/${p.slug || p.id}`} target="_blank" rel="noopener noreferrer" aria-label="View on website"><ExternalLink size={16} /></a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(row, isNew) => { setProducts(prev => isNew ? [row, ...prev] : prev.map(p => p.id === row.id ? row : p)); setEditing(null); }}
          onDeleted={(id) => { setProducts(prev => prev.filter(p => p.id !== id)); setEditing(null); }}
        />
      )}
    </div>
  );
};

export default AdminProducts;
