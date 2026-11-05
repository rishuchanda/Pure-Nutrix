import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText, ShieldCheck, FlaskConical, Download, ExternalLink, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './LabReportPage.css';

const LEAD_KEY = 'pn_lab_report_visitor';

const ERRORS = {
  invalid_first_name: 'Please enter your first name.',
  invalid_last_name: 'Please enter your last name.',
  invalid_mobile: 'Please enter a valid 10-digit mobile number.',
  report_not_available: 'This report is not available right now. Please try again later.',
};

const cleanMobile = (v) => {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
};

const formatDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
};

/**
 * Lab report behind a QR code: /lab-report/<slug>
 * The visitor enters first name, last name and mobile, then sees the report.
 */
const LabReportPage = ({ slug }) => {
  const [info, setInfo] = useState(undefined); // undefined = loading, null = not found
  const [form, setForm] = useState({ first: '', last: '', mobile: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const openReport = async (details, { silent = false } = {}) => {
    setSubmitting(true);
    if (!silent) setError('');
    const { data, error: rpcError } = await supabase.rpc('open_lab_report', {
      p_slug: slug,
      p_first_name: details.first.trim(),
      p_last_name: details.last.trim(),
      p_mobile: cleanMobile(details.mobile),
    });
    setSubmitting(false);
    if (rpcError || !data) {
      const key = Object.keys(ERRORS).find(k => (rpcError?.message || '').includes(k));
      if (!silent) setError(key ? ERRORS[key] : 'Something went wrong. Please check your internet and try again.');
      return false;
    }
    const bucket = supabase.storage.from('lab-reports');
    const url = bucket.getPublicUrl(data.file_path).data.publicUrl;
    const downloadUrl = bucket.getPublicUrl(data.file_path, { download: data.file_name || true }).data.publicUrl;
    setReport({ ...data, url, downloadUrl });
    try { localStorage.setItem(LEAD_KEY, JSON.stringify(details)); } catch { /* storage blocked */ }
    return true;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc('lab_report_info', { p_slug: slug });
      if (!alive) return;
      const row = Array.isArray(data) ? data[0] : data;
      setInfo(row || null);
      // Returning visitor: skip the form
      if (row?.has_report) {
        try {
          const saved = JSON.parse(localStorage.getItem(LEAD_KEY) || 'null');
          if (saved?.first && saved?.last && saved?.mobile) {
            setForm(saved);
            await openReport(saved, { silent: true });
          }
        } catch { /* ignore */ }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.first.trim()) return setError(ERRORS.invalid_first_name);
    if (!form.last.trim()) return setError(ERRORS.invalid_last_name);
    if (!/^[6-9]\d{9}$/.test(cleanMobile(form.mobile))) return setError(ERRORS.invalid_mobile);
    openReport(form);
  };

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); };
  const isPdf = (report?.file_type || '').includes('pdf') || /\.pdf$/i.test(report?.file_path || '');

  return (
    <div className="lab-page">
      <Helmet>
        <title>{info?.product_name ? `${info.product_name} — Lab Test Report | Pure Nutrix` : 'Lab Test Report | Pure Nutrix'}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="lab-card">
        <div className="lab-badge"><FlaskConical size={16} /> Third-party lab tested</div>

        {info === undefined && (
          <div className="lab-state lab-loading"><Loader size={22} className="lab-spin" /> Loading…</div>
        )}

        {info === null && (
          <div className="lab-state">
            <h1 className="lab-title">Report not found</h1>
            <p className="lab-sub">Please scan the QR code on the pack again, or contact our support team.</p>
          </div>
        )}

        {info && !report && (
          <>
            <h1 className="lab-title">{info.product_name}</h1>
            <p className="lab-sub">Lab Test Report{info.batch_no ? ` · Batch ${info.batch_no}` : ''}</p>

            {!info.has_report ? (
              <div className="lab-state">
                <p className="lab-sub">The report for this product will be available here soon.</p>
              </div>
            ) : (
              <form className="lab-form" onSubmit={handleSubmit} noValidate>
                <p className="lab-intro">Enter your details to view the report.</p>
                <div className="lab-row">
                  <label>
                    <span>First name</span>
                    <input type="text" value={form.first} onChange={set('first')} autoComplete="given-name" maxLength={50} placeholder="e.g. Priya" />
                  </label>
                  <label>
                    <span>Last name</span>
                    <input type="text" value={form.last} onChange={set('last')} autoComplete="family-name" maxLength={50} placeholder="e.g. Sharma" />
                  </label>
                </div>
                <label>
                  <span>Mobile number</span>
                  <div className="lab-mobile">
                    <span className="lab-cc">+91</span>
                    <input type="tel" inputMode="numeric" value={form.mobile} onChange={set('mobile')} autoComplete="tel-national" maxLength={18} placeholder="10-digit mobile number" />
                  </div>
                </label>
                {error && <p className="lab-error" role="alert">{error}</p>}
                <button type="submit" className="lab-btn" disabled={submitting}>
                  {submitting ? <><Loader size={18} className="lab-spin" /> Opening…</> : <><FileText size={18} /> View Lab Report</>}
                </button>
                <p className="lab-note">
                  <ShieldCheck size={14} /> <span>Your details are safe with us and are used only by Pure Nutrix. See our <a href="/privacy-policy">Privacy Policy</a>.</span>
                </p>
              </form>
            )}
          </>
        )}

        {report && (
          <div className="lab-report">
            <h1 className="lab-title">{report.product_name}</h1>
            <p className="lab-sub">
              Lab Test Report{report.batch_no ? ` · Batch ${report.batch_no}` : ''}
              {report.updated_at ? ` · Updated ${formatDate(report.updated_at)}` : ''}
            </p>

            <div className="lab-actions">
              <a className="lab-btn" href={report.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={18} /> Open full report
              </a>
              <a className="lab-btn lab-btn-outline" href={report.downloadUrl} rel="noopener noreferrer">
                <Download size={18} /> Download
              </a>
            </div>

            {isPdf ? (
              <object className="lab-pdf" data={report.url} type="application/pdf" aria-label="Lab report">
                <p className="lab-sub">Tap “Open full report” to view the PDF.</p>
              </object>
            ) : (
              <a href={report.url} target="_blank" rel="noopener noreferrer">
                <img className="lab-image" src={report.url} alt={`${report.product_name} lab test report`} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabReportPage;
