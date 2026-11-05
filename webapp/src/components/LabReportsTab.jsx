import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { FlaskConical, Upload, Download, Copy, ExternalLink, Plus, Save, RefreshCcw, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './LabReportsTab.css';

const SITE = 'https://purenutrix.in';
const BUCKET = 'lab-reports';
const MAX_BYTES = 20 * 1024 * 1024;
const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export const reportUrl = (slug) => `${SITE}/lab-report/${slug}`;
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

/** Print-ready QR: big code, product name and "Scan to view lab report" underneath. */
async function qrPngWithLabel(url, productName) {
  const size = 1200, pad = 80, textH = 220;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, url, { width: size - pad * 2, margin: 0, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#ffffff' } });
  const c = document.createElement('canvas');
  c.width = size; c.height = size + textH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(qr, pad, pad);
  ctx.fillStyle = '#111111'; ctx.textAlign = 'center';
  ctx.font = 'bold 64px "DM Sans", Arial, sans-serif';
  ctx.fillText('Scan to view Lab Report', size / 2, size + 60);
  ctx.font = '48px "DM Sans", Arial, sans-serif';
  ctx.fillText(productName, size / 2, size + 135);
  ctx.fillStyle = '#666666'; ctx.font = '36px "DM Sans", Arial, sans-serif';
  ctx.fillText('purenutrix.in', size / 2, size + 190);
  return c.toDataURL('image/png');
}

function ReportCard({ report, leadCount, onChanged }) {
  const [name, setName] = useState(report.product_name);
  const [batch, setBatch] = useState(report.batch_no || '');
  const [busy, setBusy] = useState('');
  const [qr, setQr] = useState('');
  const fileRef = useRef(null);
  const url = reportUrl(report.slug);
  const fileUrl = report.file_path ? supabase.storage.from(BUCKET).getPublicUrl(report.file_path).data.publicUrl : null;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 360, margin: 1, errorCorrectionLevel: 'H' }).then(setQr).catch(() => setQr(''));
  }, [url]);

  const save = async (patch, label) => {
    setBusy(label);
    // "Last updated" (also shown to customers) only moves when a new report file is uploaded.
    const stamp = patch.file_path ? { updated_at: new Date().toISOString() } : {};
    const { error } = await supabase.from('lab_reports').update({ ...patch, ...stamp }).eq('slug', report.slug);
    setBusy('');
    if (error) { alert('Could not save: ' + error.message); return false; }
    onChanged();
    return true;
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return alert('Please upload a PDF, JPG, PNG or WEBP file.');
    if (file.size > MAX_BYTES) return alert('File is too big. Maximum size is 20 MB.');
    setBusy('upload');
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    // Random name so the file can't be guessed without filling the form.
    const path = `${report.slug}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { setBusy(''); return alert('Upload failed: ' + upErr.message); }
    await save({ file_path: path, file_name: file.name, file_type: file.type }, 'upload');
  };

  const downloadQr = async () => {
    setBusy('qr');
    try {
      const png = await qrPngWithLabel(url, name || report.product_name);
      const a = document.createElement('a');
      a.href = png; a.download = `QR-lab-report-${report.slug}.png`; a.click();
    } finally { setBusy(''); }
  };

  const downloadSvg = async () => {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'H' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    a.download = `QR-lab-report-${report.slug}.svg`; a.click();
  };

  return (
    <div className="lab-admin-card">
      <div className="lab-admin-qr">
        {qr ? <img src={qr} alt={`QR code for ${url}`} /> : <div className="lab-admin-qr-empty" />}
        <div className="lab-admin-qr-btns">
          <button className="admin-btn admin-btn-primary" onClick={downloadQr} disabled={busy === 'qr'}><Download size={16} /> QR (PNG, print)</button>
          <button className="admin-btn admin-btn-secondary" onClick={downloadSvg}><Download size={16} /> QR (SVG)</button>
        </div>
      </div>

      <div className="lab-admin-body">
        <div className="lab-admin-head">
          <h3><FlaskConical size={18} /> {report.product_name}</h3>
          <label className="lab-admin-toggle">
            <input type="checkbox" checked={report.is_active} onChange={(e) => save({ is_active: e.target.checked }, 'active')} />
            <span>{report.is_active ? 'Live' : 'Hidden'}</span>
          </label>
        </div>

        <div className="lab-admin-link">
          <code>{url}</code>
          <button className="header-icon-btn" title="Copy link" onClick={() => navigator.clipboard?.writeText(url)}><Copy size={16} /></button>
          <a className="header-icon-btn" title="Open page" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /></a>
        </div>
        <p className="lab-admin-hint">This link — and the QR — never change. Upload a new report any time; the same QR will show it.</p>

        <div className="lab-admin-fields">
          <label><span>Product name</span><input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label><span>Batch no. (optional)</span><input className="admin-input" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. PNLG-2611" /></label>
          <button className="admin-btn admin-btn-secondary" disabled={busy === 'details' || (name === report.product_name && batch === (report.batch_no || ''))}
            onClick={() => save({ product_name: name.trim() || report.product_name, batch_no: batch.trim() || null }, 'details')}>
            <Save size={16} /> Save
          </button>
        </div>

        <div className="lab-admin-file">
          <div>
            <span className="lab-admin-label">Current report</span>
            {fileUrl
              ? <a href={fileUrl} target="_blank" rel="noopener noreferrer">{report.file_name || 'View file'}</a>
              : <span className="lab-admin-missing">No report uploaded yet — customers see "available soon".</span>}
            <span className="lab-admin-meta">Last updated: {fmt(report.updated_at)} · Opened by {leadCount} {leadCount === 1 ? 'person' : 'people'}</span>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={upload} style={{ display: 'none' }} />
          <button className="admin-btn admin-btn-primary" onClick={() => fileRef.current?.click()} disabled={busy === 'upload'}>
            {busy === 'upload' ? <><RefreshCcw size={16} className="spinning" /> Uploading…</> : <><Upload size={16} /> {fileUrl ? 'Replace report' : 'Upload report'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const LabReportsTab = () => {
  const [reports, setReports] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [leadFilter, setLeadFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    const [{ data: r, error: rErr }, { data: l }] = await Promise.all([
      supabase.from('lab_reports').select('*').order('created_at', { ascending: true }),
      supabase.from('lab_report_leads').select('*').order('created_at', { ascending: false }).limit(1000),
    ]);
    if (rErr) console.error('lab_reports:', rErr.message);
    setReports(r || []);
    setLeads(l || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addReport = async () => {
    const product_name = newName.trim();
    const slug = slugify(product_name);
    if (!slug) return;
    if (reports.some(r => r.slug === slug)) return alert('A report with this name already exists.');
    const { error } = await supabase.from('lab_reports').insert({ slug, product_name });
    if (error) return alert('Could not add: ' + error.message);
    setNewName('');
    load();
  };

  const shownLeads = leadFilter === 'all' ? leads : leads.filter(l => l.slug === leadFilter);
  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Date', 'First name', 'Last name', 'Mobile', 'Report'], ...shownLeads.map(l => [fmt(l.created_at), l.first_name, l.last_name, l.mobile, l.slug])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `lab-report-visitors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="lab-admin">
      <div className="admin-page-header">
        <div>
          <h1>Lab Reports &amp; QR</h1>
          <p>Upload lab reports and download the QR code to print on packs. Customers enter their name and mobile to view the report.</p>
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={load}><RefreshCcw size={16} /> Refresh</button>
      </div>

      {loading ? <p>Loading…</p> : reports.length === 0 ? (
        <p className="lab-admin-missing">No lab reports yet. If this stays empty, the lab report database setup has not been run.</p>
      ) : reports.map(r => (
        <ReportCard key={r.slug} report={r} leadCount={leads.filter(l => l.slug === r.slug).length} onChanged={load} />
      ))}

      <div className="lab-admin-add">
        <input className="admin-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add a report for another product, e.g. Advanced Collagen" />
        <button className="admin-btn admin-btn-secondary" onClick={addReport} disabled={!slugify(newName)}><Plus size={16} /> Add</button>
      </div>
      {newName && slugify(newName) && <p className="lab-admin-hint">QR link will be: {reportUrl(slugify(newName))}</p>}

      <div className="lab-admin-leads-head">
        <h3><Users size={18} /> People who opened a report ({shownLeads.length})</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="admin-select" value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All reports</option>
            {reports.map(r => <option key={r.slug} value={r.slug}>{r.product_name}</option>)}
          </select>
          <button className="admin-btn admin-btn-secondary" onClick={exportCsv} disabled={!shownLeads.length}><Download size={16} /> Export CSV</button>
        </div>
      </div>
      <div className="admin-table-container">
        <table className="admin-table admin-table-stack t-leads">
          <thead><tr><th>Name</th><th>Mobile</th><th>Report</th><th>Date</th></tr></thead>
          <tbody>
            {shownLeads.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center' }}>Nobody has opened a report yet.</td></tr>
            ) : shownLeads.slice(0, 300).map(l => (
              <tr key={l.id}>
                <td style={{ fontWeight: 500 }}>{l.first_name} {l.last_name}</td>
                <td><a href={`tel:+91${l.mobile}`} style={{ color: 'inherit' }}>+91 {l.mobile}</a></td>
                <td style={{ color: 'var(--admin-text-muted)' }}>{reports.find(r => r.slug === l.slug)?.product_name || l.slug}</td>
                <td style={{ color: 'var(--admin-text-muted)' }}>{fmt(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LabReportsTab;
