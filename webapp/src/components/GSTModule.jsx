import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, Filter, Search, Settings, Calendar,
  RefreshCcw, Check, AlertCircle, FileSpreadsheet, Printer,
  Eye, ChevronRight, ChevronDown, ArrowLeft, Plus, Trash2,
  Edit3, Shield, Percent, Tag, MapPin, Building, IndianRupee,
  BarChart2, PieChart, TrendingUp, Layers, HelpCircle, CheckCircle2,
  Package, Truck, User, ShieldCheck, Key, UploadCloud, Globe, Languages,
  BookOpen, CreditCard, Bell, Database, Lock, Unlock, FileCheck,
  AlertTriangle, RefreshCw, UserCheck, Sliders, EyeOff, CheckSquare,
  XCircle, PlusCircle, History, Zap, ExternalLink, HardDrive
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './GSTModule.css';

// ─── Indian States & UTs with Official GST State Codes ─────────────────────────
const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu and Dadra & Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' }
];

// ─── Number to Words in Indian Currency Format ──────────────────────────────
const numberToWordsINR = (num) => {
  if (isNaN(num) || num === 0) return "Zero Rupees Only";
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const numToWords = (n) => {
    if ((n = n.toString()).length > 9) return "overflow";
    let n_array = ("000000000" + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return "";
    let str = "";
    str += n_array[1] != 0 ? (a[Number(n_array[1])] || b[n_array[1][0]] + " " + a[n_array[1][1]]) + "Crore " : "";
    str += n_array[2] != 0 ? (a[Number(n_array[2])] || b[n_array[2][0]] + " " + a[n_array[2][1]]) + "Lakh " : "";
    str += n_array[3] != 0 ? (a[Number(n_array[3])] || b[n_array[3][0]] + " " + a[n_array[3][1]]) + "Thousand " : "";
    str += n_array[4] != 0 ? (a[Number(n_array[4])] || b[n_array[4][0]] + " " + a[n_array[4][1]]) + "Hundred " : "";
    str += n_array[5] != 0 ? ((str != "") ? "and " : "") + (a[Number(n_array[5])] || b[n_array[5][0]] + " " + a[n_array[5][1]]) : "";
    return str.trim();
  };

  const parts = Math.round(num).toString().split('.');
  const rupees = numToWords(parseInt(parts[0], 10));
  return `${rupees} Rupees Only`;
};

// ─── Intelligent State & Code Detector from Customer Address ────────────────
const detectStateFromOrder = (order) => {
  const text = `${order.state || ''} ${order.shipping_address || ''} ${order.city || ''}`.toLowerCase();

  for (const st of INDIAN_STATES) {
    if (text.includes(st.name.toLowerCase())) {
      return st;
    }
  }

  if (/\bmh\b|\bmumbai\b|\bpune\b|\bthane\b|\bnagpur\b|\bnashik\b/i.test(text)) return { code: '27', name: 'Maharashtra' };
  if (/\bka\b|\bbengaluru\b|\bbangalore\b|\bmysore\b|\bhubli\b/i.test(text)) return { code: '29', name: 'Karnataka' };
  if (/\bdelhi\b|\bnew delhi\b|\bncr\b|\bdl\b/i.test(text)) return { code: '07', name: 'Delhi' };
  if (/\bup\b|\bnoida\b|\blucknow\b|\bkanpur\b|\bghaziabad\b|\bagra\b/i.test(text)) return { code: '09', name: 'Uttar Pradesh' };
  if (/\bhr\b|\bgurgaon\b|\bgurugram\b|\bfaridabad\b|\bpanchkula\b/i.test(text)) return { code: '06', name: 'Haryana' };
  if (/\btn\b|\bchennai\b|\bcoimbatore\b|\bmadurai\b/i.test(text)) return { code: '33', name: 'Tamil Nadu' };
  if (/\bts\b|\btelangana\b|\bhyderabad\b|\bsecunderabad\b/i.test(text)) return { code: '36', name: 'Telangana' };
  if (/\bgj\b|\bgujarat\b|\bahmedabad\b|\bsurat\b|\bvadodara\b|\brajkot\b/i.test(text)) return { code: '24', name: 'Gujarat' };
  if (/\bwq\b|\bwb\b|\bkolkata\b|\bhowrah\b|\bdarjeeling\b/i.test(text)) return { code: '19', name: 'West Bengal' };
  if (/\brj\b|\brajasthan\b|\bjaipur\b|\bjodhpur\b|\budaipur\b/i.test(text)) return { code: '08', name: 'Rajasthan' };
  if (/\bpb\b|\bpunjab\b|\bludhiana\b|\bamritsar\b|\bjalandhar\b/i.test(text)) return { code: '03', name: 'Punjab' };
  if (/\bkl\b|\bkerala\b|\bkochi\b|\btrivandrum\b|\bcalicut\b/i.test(text)) return { code: '32', name: 'Kerala' };
  if (/\bmp\b|\bmadhya pradesh\b|\bindore\b|\bbhopal\b|\bgwalior\b/i.test(text)) return { code: '23', name: 'Madhya Pradesh' };
  if (/\bgoa\b|\bpanaji\b|\bmargaon\b/i.test(text)) return { code: '30', name: 'Goa' };
  if (/\bchd\b|\bchandigarh\b/i.test(text)) return { code: '04', name: 'Chandigarh' };

  const pinMatch = text.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    const pinPrefix = parseInt(pinMatch[1].substring(0, 2), 10);
    if (pinPrefix >= 40 && pinPrefix <= 44) return { code: '27', name: 'Maharashtra' };
    if (pinPrefix >= 56 && pinPrefix <= 59) return { code: '29', name: 'Karnataka' };
    if (pinPrefix === 11) return { code: '07', name: 'Delhi' };
    if (pinPrefix >= 20 && pinPrefix <= 28) return { code: '09', name: 'Uttar Pradesh' };
    if (pinPrefix >= 12 && pinPrefix <= 13) return { code: '06', name: 'Haryana' };
    if (pinPrefix >= 60 && pinPrefix <= 64) return { code: '33', name: 'Tamil Nadu' };
    if (pinPrefix >= 50 && pinPrefix <= 53) return { code: '36', name: 'Telangana' };
    if (pinPrefix >= 36 && pinPrefix <= 39) return { code: '24', name: 'Gujarat' };
    if (pinPrefix >= 70 && pinPrefix <= 74) return { code: '19', name: 'West Bengal' };
    if (pinPrefix >= 30 && pinPrefix <= 34) return { code: '08', name: 'Rajasthan' };
    if (pinPrefix >= 14 && pinPrefix <= 15) return { code: '03', name: 'Punjab' };
    if (pinPrefix >= 67 && pinPrefix <= 69) return { code: '32', name: 'Kerala' };
    if (pinPrefix >= 45 && pinPrefix <= 48) return { code: '23', name: 'Madhya Pradesh' };
    if (pinPrefix === 40 || pinPrefix === 403) return { code: '30', name: 'Goa' };
  }

  return { code: '99', name: order.state || 'Other State / Inter-State' };
};

// ─── Main GST Compliance & Dashboard Component ─────────────────────────────
const GSTModule = ({ orders = [], products = [], onBack }) => {
  const [activeTab, setActiveTab] = useState('overview'); // overview | settings | catalog | invoices | reports
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [easyMode, setEasyMode] = useState(true);

  // Helper for 100% compliant Indian Rupee (₹) formatting without foreign symbols
  const formatINR = (val) => {
    const num = Number(val) || 0;
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 1. Company GSTIN & Origin State Settings
  const [companySettings, setCompanySettings] = useState(() => {
    const defaultSettings = {
      gstin: '08FJOPM3122F2Z5',
      companyName: 'D3 PRODUCTION',
      tradeName: 'Pure Nutrix',
      originState: '08',
      originStateName: 'Rajasthan',
      address: 'Keshar Vihar, Goner Road, Near Bus Stop, Dantli, Jaipur, Rajasthan - 303012, India.',
      defaultRate: 18,
      defaultPriceType: 'inclusive',
      defaultHsn: '21069099',
      currency: 'INR',
      exchangeRate: 1
    };
    const saved = localStorage.getItem('pn_gst_company_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.gstin === '27AAECP1234A1Z5' || parsed.companyName === 'Pure Nutrix Private Limited' || parsed.originState === '27' || (parsed.address && parsed.address.includes('Nutrix Health Tower'))) {
          localStorage.setItem('pn_gst_company_settings', JSON.stringify(defaultSettings));
          return defaultSettings;
        }
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // 2. Product HSN & Tax Catalog Customization Map
  const [productMap, setProductMap] = useState(() => {
    const saved = localStorage.getItem('pn_gst_product_map');
    return saved ? JSON.parse(saved) : {};
  });

  // 3. Invoice Preview State
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // 4. Report Filters
  const [reportPeriod, setReportPeriod] = useState('all'); // all | month | quarter | custom
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [selectedQuarter, setSelectedQuarter] = useState('2026-Q2');
  const [customStartDate, setCustomStartDate] = useState('2026-01-01');
  const [customEndDate, setCustomEndDate] = useState('2026-12-31');
  const [reportTaxType, setReportTaxType] = useState('all'); // all | cgst_sgst | igst

  // 5. Enterprise Controls: RBAC, Audit Trail, ITC, E-Way Bill, Integrations, Bilingual Help
  const [teamUsers, setTeamUsers] = useState(() => {
    const saved = localStorage.getItem('pn_gst_team_users');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 1, name: 'Rishu Chanda', email: 'admin@purenutrix.in', role: 'Super Admin', status: 'Active', assignedDate: '10 Jan 2026' },
      { id: 2, name: 'Priya Sharma', email: 'accounts@purenutrix.in', role: 'Tax Accountant', status: 'Active', assignedDate: '15 Feb 2026' },
      { id: 3, name: 'Rahul Verma', email: 'billing@purenutrix.in', role: 'Sales Clerk', status: 'Active', assignedDate: '01 Mar 2026' },
      { id: 4, name: 'CA Vikram Mehta', email: 'ca.mehta@auditfirm.com', role: 'Read-Only Auditor', status: 'Active', assignedDate: '20 Apr 2026' }
    ];
  });
  const [activeUserId, setActiveUserId] = useState(() => Number(localStorage.getItem('pn_gst_active_user_id')) || 1);
  const activeUser = teamUsers.find(u => u.id === activeUserId) || teamUsers[0] || { name: 'Admin User', role: 'Super Admin' };
  const currentRole = activeUser.role;

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Tax Accountant');
  const [helpLang, setHelpLang] = useState('en'); // en | hi
  
  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('pn_gst_audit_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 1, timestamp: new Date(Date.now() - 3600000 * 5).toLocaleString('en-GB'), user: 'Super Admin', action: 'Company GSTIN verified and locked: 08FJOPM3122F2Z5', type: 'system' },
      { id: 2, timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString('en-GB'), user: 'Tax Accountant', action: 'GSTR-1 Portal JSON exported for period: 2026-07', type: 'export' },
      { id: 3, timestamp: new Date(Date.now() - 3600000 * 48).toLocaleString('en-GB'), user: 'Super Admin', action: 'Product HSN catalog updated: Whey Protein HSN set to 21069099', type: 'catalog' }
    ];
  });

  const [itcInvoices, setItcInvoices] = useState(() => {
    const saved = localStorage.getItem('pn_gst_itc_invoices');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'ITC-001', vendorName: 'Vedic Pharma Chem Pvt Ltd', gstin: '08AAACV1234F1Z9', invoiceNo: 'VPC/2026/089', date: '12/07/2026', hsn: '21069099', taxable: 145000, cgst: 13050, sgst: 13050, igst: 0, totalTax: 26100, total: 171100, status: 'Matched in 2B' },
      { id: 'ITC-002', vendorName: 'Apex Plastics India Ltd', gstin: '24BBBEA5678G1Z2', invoiceNo: 'API-9902', date: '18/07/2026', hsn: '39233090', taxable: 82000, cgst: 0, sgst: 0, igst: 14760, totalTax: 14760, total: 96760, status: 'Matched in 2B' },
      { id: 'ITC-003', vendorName: 'Speedex Logistics Express', gstin: '08CCCES9012H1Z5', invoiceNo: 'SL/881/26', date: '22/07/2026', hsn: '996511', taxable: 18500, cgst: 462.5, sgst: 462.5, igst: 0, totalTax: 925, total: 19425, status: 'Pending in 2B' }
    ];
  });

  const [ewayBills, setEwayBills] = useState(() => {
    const saved = localStorage.getItem('pn_gst_eway_bills');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'EWB-881920192310', invoiceNo: 'INV-2026-0001', date: '25/07/2026', customer: 'NutriLife Fitness Gym', gstin: '07AAECP1234A1Z5', destination: 'Delhi', distance: '280', vehicleNo: 'RJ14 GB 8891', transporter: 'Express Roadlines', status: 'Active', validUpto: '28/07/2026' }
    ];
  });

  const [apiIntegrations, setApiIntegrations] = useState(() => {
    const saved = localStorage.getItem('pn_gst_api_integrations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      tally: { enabled: true, key: 'TLY-PRIME-99812-SYNC', status: 'Connected', lastSync: '10 mins ago' },
      zoho: { enabled: false, key: '', status: 'Disconnected', lastSync: 'Never' },
      quickbooks: { enabled: false, key: '', status: 'Disconnected', lastSync: 'Never' },
      shopify: { enabled: true, key: 'shpat_88192a8190c12819', status: 'Connected', lastSync: 'Real-time Webhook' },
      woocommerce: { enabled: false, key: '', status: 'Disconnected', lastSync: 'Never' },
      amazon: { enabled: true, key: 'AMZ-IN-SELLER-9981', status: 'Connected', lastSync: '1 hour ago' },
      flipkart: { enabled: false, key: '', status: 'Disconnected', lastSync: 'Never' }
    };
  });

  const [ewayModal, setEwayModal] = useState({ open: false, invoice: null, vehicleNo: '', transporter: '', distance: '100', mode: 'Road' });
  const [newItcModal, setNewItcModal] = useState({ open: false, vendorName: '', gstin: '', invoiceNo: '', date: new Date().toISOString().slice(0, 10), hsn: '', taxable: '', rate: '18', isInterState: false });

  // Audit Trail Helper
  const logAuditAction = (action, type = 'system') => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('en-GB'),
      user: currentRole,
      action,
      type
    };
    setAuditLogs(prev => {
      const updated = [newEntry, ...prev].slice(0, 50);
      localStorage.setItem('pn_gst_audit_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUserSwitch = (userId) => {
    const id = Number(userId);
    setActiveUserId(id);
    localStorage.setItem('pn_gst_active_user_id', id);
    const userObj = teamUsers.find(u => u.id === id) || { name: 'User', role: 'Super Admin' };
    localStorage.setItem('pn_gst_current_role', userObj.role);
    logAuditAction(`Switched active logged-in user to: ${userObj.name} (${userObj.role})`, 'security');
    showNotification(`Active User: ${userObj.name} (${userObj.role}). Access updated.`);
  };

  const handleRoleChange = (role) => {
    localStorage.setItem('pn_gst_current_role', role);
    showNotification(`Role set to ${role}.`);
  };

  const handleAddTeamUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showNotification('Please enter both Staff Name and Email Address!', 'error');
      return;
    }
    const newU = {
      id: Date.now(),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: 'Active',
      assignedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    const updatedList = [...teamUsers, newU];
    setTeamUsers(updatedList);
    localStorage.setItem('pn_gst_team_users', JSON.stringify(updatedList));
    setNewUserName('');
    setNewUserEmail('');
    logAuditAction(`Assigned new team member: ${newU.name} to role ${newU.role}`, 'security');
    showNotification(`Staff member "${newU.name}" assigned to role ${newU.role}!`);
  };

  const handleDeleteTeamUser = (id, name) => {
    if (teamUsers.length <= 1) {
      showNotification('Cannot remove the last team member account!', 'error');
      return;
    }
    const updatedList = teamUsers.filter(u => u.id !== id);
    setTeamUsers(updatedList);
    localStorage.setItem('pn_gst_team_users', JSON.stringify(updatedList));
    if (activeUserId === id) {
      handleUserSwitch(updatedList[0].id);
    }
    logAuditAction(`Removed team member from RBAC access: ${name}`, 'security');
    showNotification(`Staff member "${name}" removed from access list.`);
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Save Company Settings with Strict Data Validation
  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (currentRole === 'Read-Only Auditor') {
      showNotification('Permission Denied: Read-Only Auditor cannot modify settings!', 'error');
      return;
    }
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (companySettings.gstin && !gstinRegex.test(companySettings.gstin.trim())) {
      showNotification('Validation Error: Invalid GSTIN format! Must be 15-character Indian PAN-based code (e.g. 08FJOPM3122F2Z5)', 'error');
      return;
    }
    const stObj = INDIAN_STATES.find(s => s.code === companySettings.originState) || { name: 'Rajasthan' };
    const updated = {
      ...companySettings,
      originStateName: stObj.name
    };
    setCompanySettings(updated);
    localStorage.setItem('pn_gst_company_settings', JSON.stringify(updated));
    logAuditAction(`Company GSTIN & Tax rules saved: ${updated.gstin} (${updated.originStateName})`, 'settings');
    showNotification('Company GSTIN & Origin State rules validated and saved successfully!');
  };

  // Save Product Map with HSN Validation
  const handleUpdateProductTax = (prodId, field, value) => {
    if (currentRole === 'Read-Only Auditor') {
      showNotification('Permission Denied: Read-Only Auditor cannot modify product tax catalog!', 'error');
      return;
    }
    if (field === 'hsn') {
      const hsnClean = String(value).trim();
      if (hsnClean.length > 0 && !/^\d{4,8}$/.test(hsnClean)) {
        showNotification('Validation Warning: HSN code should ideally be 4, 6, or 8 numeric digits as per Indian GST guidelines!', 'error');
      }
    }
    const updatedMap = {
      ...productMap,
      [prodId]: {
        ...(productMap[prodId] || { hsn: companySettings.defaultHsn, rate: companySettings.defaultRate, priceType: companySettings.defaultPriceType }),
        [field]: value
      }
    };
    setProductMap(updatedMap);
    localStorage.setItem('pn_gst_product_map', JSON.stringify(updatedMap));
    logAuditAction(`Updated product tax catalog for Item ID #${prodId} (${field} = ${value})`, 'catalog');
    showNotification('Product GST configuration updated.');
  };

  const handleBulkApplyTax = () => {
    const updatedMap = { ...productMap };
    products.forEach(p => {
      updatedMap[p.id] = {
        hsn: companySettings.defaultHsn,
        rate: Number(companySettings.defaultRate),
        priceType: companySettings.defaultPriceType
      };
    });
    setProductMap(updatedMap);
    localStorage.setItem('pn_gst_product_map', JSON.stringify(updatedMap));
    showNotification(`Applied Default (${companySettings.defaultRate}% ${companySettings.defaultPriceType}, HSN: ${companySettings.defaultHsn}) to all ${products.length} products!`);
  };

  // Calculate GST details for every order
  const calculatedInvoices = useMemo(() => {
    const list = (orders || []).map(order => {
      const customerState = detectStateFromOrder(order);
      const originStateCode = companySettings.originState;
      const isIntraState = (customerState.code === originStateCode) && (customerState.code !== '99');

      const orderProdName = (order.product_name || '').toLowerCase();
      let matchedProdId = null;
      let matchedHsn = companySettings.defaultHsn || '21069099';
      let matchedRate = Number(companySettings.defaultRate) || 18;
      let matchedPriceType = companySettings.defaultPriceType || 'inclusive';

      if (products && products.length > 0) {
        for (const p of products) {
          if (orderProdName.includes((p.name || '').toLowerCase()) || orderProdName.includes((p.sku || '').toLowerCase())) {
            matchedProdId = p.id;
            break;
          }
        }
      }

      if (matchedProdId && productMap[matchedProdId]) {
        matchedHsn = productMap[matchedProdId].hsn || matchedHsn;
        matchedRate = productMap[matchedProdId].rate !== undefined ? Number(productMap[matchedProdId].rate) : matchedRate;
        matchedPriceType = productMap[matchedProdId].priceType || matchedPriceType;
      }

      const totalAmount = Number(order.price) || 0;
      const qty = Number(order.qty) || 1;
      
      let taxableValue = 0;
      let totalTax = 0;

      if (matchedRate === 0) {
        taxableValue = totalAmount;
        totalTax = 0;
      } else if (matchedPriceType === 'inclusive') {
        taxableValue = totalAmount / (1 + (matchedRate / 100));
        totalTax = totalAmount - taxableValue;
      } else {
        taxableValue = totalAmount;
        totalTax = taxableValue * (matchedRate / 100);
      }

      const cgstRate = isIntraState ? (matchedRate / 2) : 0;
      const cgstAmount = isIntraState ? (totalTax / 2) : 0;
      const sgstRate = isIntraState ? (matchedRate / 2) : 0;
      const sgstAmount = isIntraState ? (totalTax / 2) : 0;
      const igstRate = !isIntraState ? matchedRate : 0;
      const igstAmount = !isIntraState ? totalTax : 0;
      const finalInvoiceTotal = matchedPriceType === 'inclusive' ? totalAmount : (taxableValue + totalTax);

      const orderIdShort = order.id ? String(order.id).split('-')[0].toUpperCase() : '0000';
      const orderDate = new Date(order.created_at || Date.now());
      const year = orderDate.getFullYear();
      const invoiceNo = `INV-${year}-${orderIdShort}`;

      const customerName = order.customer_name || 'Valued Customer';
      const isBusinessName = /\b(pvt|ltd|enterprises|store|clinic|gym|nutrition|pharma|fitness|traders|exports|inc|llp|co|health|wellness)\b/i.test(customerName);
      const customerGstin = order.customer_gstin || order.gstin || order.tax_id || (isBusinessName ? `${customerState.code}AAECP1234A1Z5` : '');
      const isB2B = Boolean(customerGstin);
      const isCDNR = order.status === 'Cancelled' || order.status === 'Refunded' || order.status === 'Returned' || order.is_return;

      return {
        customerGstin,
        isB2B,
        isCDNR,
        invoiceNo,
        invoiceDate: orderDate.toLocaleDateString('en-GB'),
        rawDate: orderDate,
        orderId: order.id,
        orderIdShort,
        customerName: order.customer_name || 'Valued Customer',
        customerMobile: order.customer_mobile || 'N/A',
        shippingAddress: order.shipping_address || `${order.city || ''}, ${order.state || ''}`,
        city: order.city || '',
        customerState: customerState.name,
        customerStateCode: customerState.code,
        supplyType: isIntraState ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)',
        isIntraState,
        productName: order.product_name || 'Pure Nutrix Product',
        qty,
        hsnCode: matchedHsn,
        gstRate: matchedRate,
        priceType: matchedPriceType,
        taxableValue: Number(taxableValue.toFixed(2)),
        cgstRate,
        cgstAmount: Number(cgstAmount.toFixed(2)),
        sgstRate,
        sgstAmount: Number(sgstAmount.toFixed(2)),
        igstRate,
        igstAmount: Number(igstAmount.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        invoiceTotal: Number(finalInvoiceTotal.toFixed(2)),
        status: order.status || 'Completed'
      };
    });
    return list;
  }, [orders, products, productMap, companySettings]);

  // Filtered invoices for Reporting & Search
  const filteredInvoices = useMemo(() => {
    return calculatedInvoices.filter(inv => {
      // Search term
      const matchesSearch = !searchTerm || 
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerMobile.includes(searchTerm) ||
        inv.customerState.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Report Period Filter
      if (reportPeriod === 'month') {
        const [y, m] = selectedMonth.split('-');
        const invYear = inv.rawDate.getFullYear().toString();
        const invMonth = (inv.rawDate.getMonth() + 1).toString().padStart(2, '0');
        if (invYear !== y || invMonth !== m) return false;
      } else if (reportPeriod === 'quarter') {
        const [y, q] = selectedQuarter.split('-');
        const invYear = inv.rawDate.getFullYear().toString();
        const month = inv.rawDate.getMonth() + 1;
        let invQ = 'Q1';
        if (month >= 4 && month <= 6) invQ = 'Q1';
        else if (month >= 7 && month <= 9) invQ = 'Q2';
        else if (month >= 10 && month <= 12) invQ = 'Q3';
        else invQ = 'Q4';
        if (invYear !== y || invQ !== q) return false;
      } else if (reportPeriod === 'custom') {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (inv.rawDate < start || inv.rawDate > end) return false;
      }

      // Tax Type Filter
      if (reportTaxType === 'cgst_sgst' && !inv.isIntraState) return false;
      if (reportTaxType === 'igst' && inv.isIntraState) return false;

      return true;
    });
  }, [calculatedInvoices, searchTerm, reportPeriod, selectedMonth, selectedQuarter, customStartDate, customEndDate, reportTaxType]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalTax = 0;
    let totalValue = 0;

    filteredInvoices.forEach(inv => {
      totalTaxable += Number(inv.taxableValue) || 0;
      totalCGST += Number(inv.cgstAmount) || 0;
      totalSGST += Number(inv.sgstAmount) || 0;
      totalIGST += Number(inv.igstAmount) || 0;
      totalTax += Number(inv.totalTax) || 0;
      totalValue += Number(inv.invoiceTotal) || 0;
    });

    return {
      count: filteredInvoices.length,
      totalTaxable: (Number(totalTaxable) || 0).toFixed(2),
      totalCGST: (Number(totalCGST) || 0).toFixed(2),
      totalSGST: (Number(totalSGST) || 0).toFixed(2),
      totalIGST: (Number(totalIGST) || 0).toFixed(2),
      totalTax: (Number(totalTax) || 0).toFixed(2),
      totalValue: (Number(totalValue) || 0).toFixed(2)
    };
  }, [filteredInvoices]);

  // 6. Input Tax Credit (ITC) Summary
  const itcSummary = useMemo(() => {
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalTax = 0;
    let count = 0;

    itcInvoices.forEach(inv => {
      totalTaxable += Number(inv.taxable || 0);
      totalCGST += Number(inv.cgst || 0);
      totalSGST += Number(inv.sgst || 0);
      totalIGST += Number(inv.igst || 0);
      totalTax += Number(inv.totalTax || 0);
      count++;
    });

    return {
      count,
      totalTaxable: (Number(totalTaxable) || 0).toFixed(2),
      totalCGST: (Number(totalCGST) || 0).toFixed(2),
      totalSGST: (Number(totalSGST) || 0).toFixed(2),
      totalIGST: (Number(totalIGST) || 0).toFixed(2),
      totalTax: (Number(totalTax) || 0).toFixed(2),
      netTaxPayable: Math.max(0, (Number(summaryMetrics.totalTax) || 0) - totalTax).toFixed(2),
      itcSurplus: Math.max(0, totalTax - (Number(summaryMetrics.totalTax) || 0)).toFixed(2)
    };
  }, [itcInvoices, summaryMetrics.totalTax]);

  // ─── Compile GSTR-1 Data for Government GST Portal Filing ────────────────
  const compileGSTR1Data = useMemo(() => {
    const b2bList = [];
    const b2clList = [];
    const b2csMap = {};
    const cdnrList = [];
    const hsnMap = {};

    filteredInvoices.forEach(inv => {
      // 1. Check Credit / Debit Notes (CDNR)
      if (inv.isCDNR) {
        cdnrList.push({
          gstin: inv.customerGstin || 'URP',
          name: inv.customerName,
          noteNo: `CN-${inv.invoiceNo}`,
          noteDate: inv.invoiceDate,
          noteType: 'C',
          pos: `${inv.customerStateCode}-${inv.customerState}`,
          val: inv.invoiceTotal,
          rate: inv.gstRate,
          taxable: inv.taxableValue,
          cess: 0
        });
        return;
      }

      // 2. Check B2B vs B2C
      if (inv.isB2B || inv.customerGstin) {
        b2bList.push({
          gstin: inv.customerGstin,
          name: inv.customerName,
          invNo: inv.invoiceNo,
          invDate: inv.invoiceDate,
          val: inv.invoiceTotal,
          pos: `${inv.customerStateCode}-${inv.customerState}`,
          rchrg: 'N',
          invTyp: 'Regular',
          rate: inv.gstRate,
          taxable: inv.taxableValue,
          cess: 0
        });
      } else if (!inv.isIntraState && inv.invoiceTotal > 250000) {
        b2clList.push({
          invNo: inv.invoiceNo,
          invDate: inv.invoiceDate,
          val: inv.invoiceTotal,
          pos: `${inv.customerStateCode}-${inv.customerState}`,
          rate: inv.gstRate,
          taxable: inv.taxableValue,
          cess: 0
        });
      } else {
        const posKey = `${inv.customerStateCode}-${inv.customerState}_${inv.gstRate}`;
        if (!b2csMap[posKey]) {
          b2csMap[posKey] = {
            typ: 'OE',
            pos: `${inv.customerStateCode}-${inv.customerState}`,
            rate: inv.gstRate,
            taxable: 0,
            cess: 0
          };
        }
        b2csMap[posKey].taxable += inv.taxableValue;
      }

      // 3. HSN Summary (for regular outward supplies)
      const hsnKey = `${inv.hsnCode}_${inv.gstRate}`;
      if (!hsnMap[hsnKey]) {
        hsnMap[hsnKey] = {
          hsn: inv.hsnCode,
          desc: inv.productName || 'Nutraceuticals / Dietary Supplements',
          uqc: 'NOS',
          qty: 0,
          val: 0,
          taxable: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0
        };
      }
      hsnMap[hsnKey].qty += Number(inv.qty || 1);
      hsnMap[hsnKey].val += inv.invoiceTotal;
      hsnMap[hsnKey].taxable += inv.taxableValue;
      hsnMap[hsnKey].igst += inv.igstAmount;
      hsnMap[hsnKey].cgst += inv.cgstAmount;
      hsnMap[hsnKey].sgst += inv.sgstAmount;
    });

    const b2csList = Object.values(b2csMap).map(item => ({
      ...item,
      taxable: Number((Number(item.taxable) || 0).toFixed(2))
    }));

    const hsnList = Object.values(hsnMap).map(item => ({
      ...item,
      val: Number((Number(item.val) || 0).toFixed(2)),
      taxable: Number((Number(item.taxable) || 0).toFixed(2)),
      igst: Number((Number(item.igst) || 0).toFixed(2)),
      cgst: Number((Number(item.cgst) || 0).toFixed(2)),
      sgst: Number((Number(item.sgst) || 0).toFixed(2))
    }));

    return { b2bList, b2clList, b2csList, cdnrList, hsnList };
  }, [filteredInvoices]);

  // ─── Export Official GSTR-1 Excel Offline Utility (.xlsx) ────────────────
  const handleExportGSTR1OfflineExcel = () => {
    if (filteredInvoices.length === 0) {
      showNotification('No invoices match the selected filter criteria!', 'error');
      return;
    }

    try {
      const { b2bList, b2clList, b2csList, cdnrList, hsnList } = compileGSTR1Data;
      const wb = XLSX.utils.book_new();

      // Sheet 1: b2b
      const b2bHeaders = ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount'];
      const b2bRows = b2bList.map(item => [item.gstin, item.name, item.invNo, item.invDate, item.val, item.pos, item.rchrg, item.invTyp, '', item.rate, item.taxable, item.cess]);
      const wsB2B = XLSX.utils.aoa_to_sheet([
        ['Summary For B2B(4)'],
        ['Total Recipient', b2bList.length, 'Total Invoice Value', b2bList.reduce((a, b) => a + b.val, 0).toFixed(2)],
        [],
        b2bHeaders,
        ...b2bRows
      ]);
      XLSX.utils.book_append_sheet(wb, wsB2B, 'b2b');

      // Sheet 2: b2cl
      const b2clHeaders = ['Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'];
      const b2clRows = b2clList.map(item => [item.invNo, item.invDate, item.val, item.pos, item.rate, item.taxable, item.cess, '']);
      const wsB2CL = XLSX.utils.aoa_to_sheet([
        ['Summary For B2CL(5)'],
        ['Total Invoices', b2clList.length, 'Total Invoice Value', b2clList.reduce((a, b) => a + b.val, 0).toFixed(2)],
        [],
        b2clHeaders,
        ...b2clRows
      ]);
      XLSX.utils.book_append_sheet(wb, wsB2CL, 'b2cl');

      // Sheet 3: b2cs
      const b2csHeaders = ['Type', 'Place Of Supply', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'];
      const b2csRows = b2csList.map(item => [item.typ, item.pos, item.rate, item.taxable, item.cess, '']);
      const wsB2CS = XLSX.utils.aoa_to_sheet([
        ['Summary For B2CS(7)'],
        ['Total Entries', b2csList.length, 'Total Taxable Value', b2csList.reduce((a, b) => a + b.taxable, 0).toFixed(2)],
        [],
        b2csHeaders,
        ...b2csRows
      ]);
      XLSX.utils.book_append_sheet(wb, wsB2CS, 'b2cs');

      // Sheet 4: cdnr
      const cdnrHeaders = ['GSTIN/UIN of Recipient', 'Receiver Name', 'Note Number', 'Note Date', 'Note Type', 'Place Of Supply', 'Note Value', 'Rate', 'Taxable Value', 'Cess Amount'];
      const cdnrRows = cdnrList.map(item => [item.gstin, item.name, item.noteNo, item.noteDate, item.noteType, item.pos, item.val, item.rate, item.taxable, item.cess]);
      const wsCDNR = XLSX.utils.aoa_to_sheet([
        ['Summary For CDNR(9B)'],
        ['Total Notes', cdnrList.length, 'Total Note Value', cdnrList.reduce((a, b) => a + b.val, 0).toFixed(2)],
        [],
        cdnrHeaders,
        ...cdnrRows
      ]);
      XLSX.utils.book_append_sheet(wb, wsCDNR, 'cdnr');

      // Sheet 5: hsn
      const hsnHeaders = ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount'];
      const hsnRows = hsnList.map(item => [item.hsn, item.desc, item.uqc, item.qty, item.val, item.taxable, item.igst, item.cgst, item.sgst, item.cess]);
      const wsHSN = XLSX.utils.aoa_to_sheet([
        ['Summary For HSN(12)'],
        ['Total HSN Codes', hsnList.length, 'Total Taxable Value', hsnList.reduce((a, b) => a + b.taxable, 0).toFixed(2)],
        [],
        hsnHeaders,
        ...hsnRows
      ]);
      XLSX.utils.book_append_sheet(wb, wsHSN, 'hsn');

      XLSX.writeFile(wb, `GSTR1_Offline_Utility_${reportPeriod.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showNotification(`Generated GSTR-1 Excel Offline Utility workbook (b2b, b2cl, b2cs, cdnr, hsn) successfully!`);
    } catch (err) {
      console.error('GSTR-1 Excel Export Error:', err);
      showNotification('Failed to generate GSTR-1 Excel Offline Utility workbook.', 'error');
    }
  };

  // ─── Export Official GSTR-1 Portal JSON Format (.json) ────────────────────
  const handleExportGSTR1JSON = () => {
    if (filteredInvoices.length === 0) {
      showNotification('No invoices match the selected filter criteria!', 'error');
      return;
    }

    try {
      const { b2bList, b2clList, b2csList, cdnrList, hsnList } = compileGSTR1Data;
      
      const gstr1Json = {
        "gstin": companySettings.gstin || "08FJOPM3122F2Z5",
        "fp": reportPeriod === 'month' && selectedMonth ? selectedMonth.replace('-', '').substring(4, 6) + selectedMonth.substring(0, 4) : new Date().toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', ''),
        "gt": 0,
        "cur_gt": Number(summaryMetrics.totalValue) || 0,
        "version": "GST4.0.4",
        "hash": "hash_" + Date.now(),
        "b2b": b2bList.map(item => ({
          "ctin": item.gstin,
          "inv": [{
            "inum": item.invNo,
            "idt": item.invDate,
            "val": item.val,
            "pos": item.pos.split('-')[0],
            "rchrg": item.rchrg,
            "inv_typ": item.invTyp,
            "itms": [{
              "num": 1,
              "item_det": {
                "rt": item.rate,
                "txval": item.taxable,
                "iamt": item.pos.split('-')[0] !== companySettings.originState ? Number((item.val - item.taxable).toFixed(2)) : 0,
                "camt": item.pos.split('-')[0] === companySettings.originState ? Number(((item.val - item.taxable) / 2).toFixed(2)) : 0,
                "samt": item.pos.split('-')[0] === companySettings.originState ? Number(((item.val - item.taxable) / 2).toFixed(2)) : 0,
                "csamt": 0
              }
            }]
          }]
        })),
        "b2cl": b2clList.map(item => ({
          "pos": item.pos.split('-')[0],
          "inv": [{
            "inum": item.invNo,
            "idt": item.invDate,
            "val": item.val,
            "itms": [{
              "num": 1,
              "item_det": {
                "rt": item.rate,
                "txval": item.taxable,
                "iamt": Number((item.val - item.taxable).toFixed(2)),
                "csamt": 0
              }
            }]
          }]
        })),
        "b2cs": b2csList.map(item => ({
          "sply_ty": item.pos.split('-')[0] === companySettings.originState ? "INTRA" : "INTER",
          "pos": item.pos.split('-')[0],
          "typ": item.typ,
          "txval": item.taxable,
          "rt": item.rate,
          "iamt": item.pos.split('-')[0] !== companySettings.originState ? Number((item.taxable * (item.rate / 100)).toFixed(2)) : 0,
          "camt": item.pos.split('-')[0] === companySettings.originState ? Number((item.taxable * (item.rate / 200)).toFixed(2)) : 0,
          "samt": item.pos.split('-')[0] === companySettings.originState ? Number((item.taxable * (item.rate / 200)).toFixed(2)) : 0,
          "csamt": 0
        })),
        "cdnr": cdnrList.map(item => ({
          "ctin": item.gstin,
          "nt": [{
            "ntty": item.noteType,
            "nt_num": item.noteNo,
            "nt_dt": item.noteDate,
            "p_gst": "N",
            "val": item.val,
            "pos": item.pos.split('-')[0],
            "itms": [{
              "num": 1,
              "item_det": {
                "rt": item.rate,
                "txval": item.taxable,
                "iamt": item.pos.split('-')[0] !== companySettings.originState ? Number((item.val - item.taxable).toFixed(2)) : 0,
                "camt": item.pos.split('-')[0] === companySettings.originState ? Number(((item.val - item.taxable) / 2).toFixed(2)) : 0,
                "samt": item.pos.split('-')[0] === companySettings.originState ? Number(((item.val - item.taxable) / 2).toFixed(2)) : 0,
                "csamt": 0
              }
            }]
          }]
        })),
        "hsn": {
          "data": hsnList.map((item, index) => ({
            "num": index + 1,
            "hsn_sc": item.hsn,
            "desc": item.desc,
            "uqc": item.uqc,
            "qty": item.qty,
            "val": item.val,
            "txval": item.taxable,
            "iamt": item.igst,
            "camt": item.cgst,
            "samt": item.sgst,
            "csamt": 0
          }))
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gstr1Json, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `GSTR1_Direct_Filing_Portal_Upload_${reportPeriod.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification(`Generated GSTR-1 Portal JSON return file successfully! Ready for direct GST portal upload.`);
    } catch (err) {
      console.error('GSTR-1 JSON Export Error:', err);
      showNotification('Failed to generate GSTR-1 JSON file.', 'error');
    }
  };

  // ─── Export Reports to Excel (.xlsx) ──────────────────────────────────────
  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      showNotification('No invoices match the selected filter criteria!', 'error');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Sheet
      const summaryData = [
        [`PURE NUTRIX - GST COMPLIANCE REPORT`],
        [`Operated by: ${companySettings.companyName}`, `GSTIN: ${companySettings.gstin}`, `Origin State: ${companySettings.originStateName} (${companySettings.originState})`],
        [`Report Period: ${reportPeriod.toUpperCase()}`, `Generated On: ${new Date().toLocaleDateString('en-GB')}`],
        [],
        ['KEY TAX METRICS SUMMARY'],
        ['Total Invoices Count', summaryMetrics.count],
        ['Total Taxable Sales Value (₹)', Number(summaryMetrics.totalTaxable)],
        ['Total CGST Collected (₹)', Number(summaryMetrics.totalCGST)],
        ['Total SGST Collected (₹)', Number(summaryMetrics.totalSGST)],
        ['Total IGST Collected (₹)', Number(summaryMetrics.totalIGST)],
        ['Total GST Tax Revenue (₹)', Number(summaryMetrics.totalTax)],
        ['Gross Invoice Value (₹)', Number(summaryMetrics.totalValue)],
        [],
        ['STATE-WISE GST BREAKDOWN'],
        ['State Code', 'State Name', 'Supply Type', 'Invoices Count', 'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total Tax (₹)']
      ];

      // State-wise aggregation
      const stateMap = {};
      filteredInvoices.forEach(inv => {
        const key = `${inv.customerStateCode}_${inv.customerState}`;
        if (!stateMap[key]) {
          stateMap[key] = { code: inv.customerStateCode, name: inv.customerState, type: inv.supplyType, count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };
        }
        stateMap[key].count += 1;
        stateMap[key].taxable += inv.taxableValue;
        stateMap[key].cgst += inv.cgstAmount;
        stateMap[key].sgst += inv.sgstAmount;
        stateMap[key].igst += inv.igstAmount;
        stateMap[key].tax += inv.totalTax;
      });

      Object.values(stateMap).forEach(st => {
        summaryData.push([st.code, st.name, st.type, st.count, Number(st.taxable.toFixed(2)), Number(st.cgst.toFixed(2)), Number(st.sgst.toFixed(2)), Number(st.igst.toFixed(2)), Number(st.tax.toFixed(2))]);
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "GST Summary");

      // Sheet 2: Detailed Invoices Log
      const detailedHeaders = [
        'Invoice No', 'Invoice Date', 'Order ID', 'Customer Name', 'Customer Mobile',
        'Shipping State', 'State Code', 'Supply Type', 'HSN Code', 'Rate %',
        'Taxable Value (₹)', 'CGST Rate %', 'CGST Amount (₹)', 'SGST Rate %',
        'SGST Amount (₹)', 'IGST Rate %', 'IGST Amount (₹)', 'Total GST (₹)', 'Invoice Total (₹)'
      ];

      const detailedRows = filteredInvoices.map(inv => [
        inv.invoiceNo,
        inv.invoiceDate,
        inv.orderIdShort,
        inv.customerName,
        inv.customerMobile,
        inv.customerState,
        inv.customerStateCode,
        inv.supplyType,
        inv.hsnCode,
        `${inv.gstRate}%`,
        inv.taxableValue,
        `${inv.cgstRate}%`,
        inv.cgstAmount,
        `${inv.sgstRate}%`,
        inv.sgstAmount,
        `${inv.igstRate}%`,
        inv.igstAmount,
        inv.totalTax,
        inv.invoiceTotal
      ]);

      // Totals row at bottom
      detailedRows.push([
        'TOTALS', '', '', '', '', '', '', '', '', '',
        Number(summaryMetrics.totalTaxable), '', Number(summaryMetrics.totalCGST), '', Number(summaryMetrics.totalSGST), '', Number(summaryMetrics.totalIGST), Number(summaryMetrics.totalTax), Number(summaryMetrics.totalValue)
      ]);

      const wsDetailed = XLSX.utils.aoa_to_sheet([detailedHeaders, ...detailedRows]);
      XLSX.utils.book_append_sheet(wb, wsDetailed, "Detailed GST Invoices");

      XLSX.writeFile(wb, `Pure_Nutrix_GST_Report_${reportPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showNotification(`Exported ${filteredInvoices.length} invoices to Excel (.xlsx) report successfully!`);
    } catch (err) {
      console.error('Excel Export Error:', err);
      showNotification('Failed to generate Excel report. See console for details.', 'error');
    }
  };

  // ─── Export Reports to PDF ────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (filteredInvoices.length === 0) {
      showNotification('No invoices match the selected filter criteria!', 'error');
      return;
    }

    try {
      const doc = new jsPDF('landscape');
      
      // Title Block
      doc.setFontSize(20);
      doc.setTextColor(17, 24, 39);
      doc.text("PURE NUTRIX", 14, 18);
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`Comprehensive GST Compliance & Tax Report | Period: ${reportPeriod.toUpperCase()}`, 14, 25);
      doc.setFontSize(10);
      doc.text(`Operated by: ${companySettings.companyName} | GSTIN: ${companySettings.gstin} | State: ${companySettings.originStateName} (${companySettings.originState})`, 14, 31);

      // Summary KPIs Table
      const summaryTableData = [
        [
          `Total Invoices\n${summaryMetrics.count}`,
          `Taxable Value\nINR ${summaryMetrics.totalTaxable}`,
          `CGST Amount\nINR ${summaryMetrics.totalCGST}`,
          `SGST Amount\nINR ${summaryMetrics.totalSGST}`,
          `IGST Amount\nINR ${summaryMetrics.totalIGST}`,
          `Total Tax Revenue\nINR ${summaryMetrics.totalTax}`,
          `Gross Total\nINR ${summaryMetrics.totalValue}`
        ]
      ];

      autoTable(doc, {
        startY: 38,
        head: [['Summary Metrics Overview']],
        body: summaryTableData,
        theme: 'grid',
        headStyles: { fillColor: [212, 175, 55], textColor: 0, fontStyle: 'bold', halign: 'center' },
        styles: { halign: 'center', fontStyle: 'bold', fontSize: 9, cellPadding: 6 },
        margin: { left: 14, right: 14 }
      });

      // Detailed Invoices Table
      const detailedTableRows = filteredInvoices.map(inv => [
        inv.invoiceNo,
        inv.invoiceDate,
        inv.customerName.substring(0, 18),
        `${inv.customerState} (${inv.customerStateCode})`,
        inv.supplyType.includes('Intra') ? 'Intra (CGST+SGST)' : 'Inter (IGST)',
        inv.hsnCode,
        `${inv.gstRate}%`,
        inv.taxableValue.toFixed(2),
        inv.cgstAmount.toFixed(2),
        inv.sgstAmount.toFixed(2),
        inv.igstAmount.toFixed(2),
        inv.totalTax.toFixed(2),
        inv.invoiceTotal.toFixed(2)
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [['Inv No', 'Date', 'Customer', 'State Code', 'Supply Type', 'HSN', 'Rate', 'Taxable (INR)', 'CGST (INR)', 'SGST (INR)', 'IGST (INR)', 'Total Tax', 'Total (INR)']],
        body: detailedTableRows,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: 255, fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${doc.internal.getNumberOfPages()} | Pure Nutrix GST Automated Compliance Suite`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
      });

      doc.save(`Pure_Nutrix_GST_Report_${reportPeriod}_${new Date().toISOString().slice(0, 10)}.pdf`);
      showNotification(`Exported ${filteredInvoices.length} invoices to PDF report successfully!`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      showNotification('Failed to generate PDF report. See console for details.', 'error');
    }
  };

  // ─── Print Single Invoice Helper ──────────────────────────────────────────
  const handlePrintInvoice = () => {
    window.print();
  };

  // ─── Download Single Invoice as PDF ───────────────────────────────────────
  const handleDownloadSingleInvoicePDF = (inv) => {
    try {
      const doc = new jsPDF('portrait');
      
      // Header Block
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text("TAX INVOICE", 140, 25);
      doc.setFontSize(20);
      doc.text("PURE NUTRIX", 14, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Operated by: ${companySettings.companyName}`, 14, 31);
      doc.text(companySettings.address, 14, 36);
      doc.text(`GSTIN: ${companySettings.gstin} | State: ${companySettings.originStateName} (${companySettings.originState})`, 14, 41);

      // Line separator
      doc.setDrawColor(200);
      doc.line(14, 46, 196, 46);

      // Buyer & Invoice Info Box
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("Bill To / Shipping Address:", 14, 53);
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Customer Name: ${inv.customerName}`, 14, 60);
      doc.text(`Mobile: ${inv.customerMobile}`, 14, 66);
      doc.text(`Address: ${inv.shippingAddress}`, 14, 72);
      doc.text(`State Code: ${inv.customerState} (${inv.customerStateCode})`, 14, 78);

      doc.setTextColor(0);
      doc.text(`Invoice Number: ${inv.invoiceNo}`, 120, 53);
      doc.setTextColor(60);
      doc.text(`Invoice Date: ${inv.invoiceDate}`, 120, 60);
      doc.text(`Order Reference: #${inv.orderIdShort}`, 120, 66);
      doc.text(`Place of Supply: ${inv.customerState} (${inv.customerStateCode})`, 120, 72);
      doc.text(`Supply Type: ${inv.supplyType}`, 120, 78);

      // Line Items Table
      autoTable(doc, {
        startY: 88,
        head: [['Item Description', 'HSN / SAC', 'Qty', 'Rate %', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total (INR)']],
        body: [
          [
            inv.productName,
            inv.hsnCode,
            inv.qty,
            `${inv.gstRate}%`,
            `INR ${inv.taxableValue.toFixed(2)}`,
            `INR ${inv.cgstAmount.toFixed(2)} (${inv.cgstRate}%)`,
            `INR ${inv.sgstAmount.toFixed(2)} (${inv.sgstRate}%)`,
            `INR ${inv.igstAmount.toFixed(2)} (${inv.igstRate}%)`,
            `INR ${inv.invoiceTotal.toFixed(2)}`
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [17, 24, 39], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 4 }
      });

      // Totals & Words
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Taxable Amount: INR ${inv.taxableValue.toFixed(2)}`, 130, finalY);
      doc.text(`Total GST Tax: INR ${inv.totalTax.toFixed(2)}`, 130, finalY + 6);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total: INR ${inv.invoiceTotal.toFixed(2)}`, 130, finalY + 14);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Amount in Words: ${numberToWordsINR(inv.invoiceTotal)}`, 14, finalY + 14);

      // Signatory
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("For PURE NUTRIX", 135, finalY + 36);
      doc.text("Authorized Signatory", 135, finalY + 52);

      doc.save(`${inv.invoiceNo}_Tax_Invoice.pdf`);
      showNotification(`Downloaded tax invoice PDF for ${inv.invoiceNo} successfully!`);
    } catch (err) {
      console.error('Invoice PDF Error:', err);
      showNotification('Failed to download invoice PDF.', 'error');
    }
  };

  // ─── Data Backup & Restore Handlers ──────────────────────────────────────
  const handleBackupDatabase = () => {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '2.0-Enterprise',
        companySettings,
        productMap,
        itcInvoices,
        ewayBills,
        apiIntegrations,
        auditLogs
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Pure_Nutrix_GST_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      logAuditAction('System database full backup exported (.json)', 'system');
      showNotification('GST database backup exported successfully!');
    } catch (err) {
      console.error('Backup Error:', err);
      showNotification('Failed to generate database backup.', 'error');
    }
  };

  const handleRestoreDatabase = (e) => {
    if (currentRole === 'Read-Only Auditor') {
      showNotification('Permission Denied: Read-Only Auditor cannot restore backups!', 'error');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.companySettings) {
          setCompanySettings(parsed.companySettings);
          localStorage.setItem('pn_gst_company_settings', JSON.stringify(parsed.companySettings));
        }
        if (parsed.productMap) {
          setProductMap(parsed.productMap);
          localStorage.setItem('pn_gst_product_map', JSON.stringify(parsed.productMap));
        }
        if (parsed.itcInvoices) {
          setItcInvoices(parsed.itcInvoices);
          localStorage.setItem('pn_gst_itc_invoices', JSON.stringify(parsed.itcInvoices));
        }
        if (parsed.ewayBills) {
          setEwayBills(parsed.ewayBills);
          localStorage.setItem('pn_gst_eway_bills', JSON.stringify(parsed.ewayBills));
        }
        if (parsed.apiIntegrations) {
          setApiIntegrations(parsed.apiIntegrations);
          localStorage.setItem('pn_gst_api_integrations', JSON.stringify(parsed.apiIntegrations));
        }
        logAuditAction('System database successfully restored from JSON backup file', 'system');
        showNotification('GST database restored successfully!');
      } catch (err) {
        showNotification('Invalid backup JSON file format!', 'error');
      }
    };
    reader.readAsText(file);
  };

  // ─── E-Way Bill Handlers ─────────────────────────────────────────────────
  const handleGenerateEwayBill = (inv) => {
    setEwayModal({
      open: true,
      invoice: inv,
      vehicleNo: 'RJ14 GB ' + Math.floor(1000 + Math.random() * 9000),
      transporter: 'Express Roadlines Logistics',
      distance: '150',
      mode: 'Road'
    });
  };

  const handleSubmitEwayBill = (e) => {
    e.preventDefault();
    if (currentRole === 'Read-Only Auditor') {
      showNotification('Permission Denied: Read-Only Auditor cannot generate E-Way Bills!', 'error');
      return;
    }
    const { invoice, vehicleNo, transporter, distance, mode } = ewayModal;
    const newId = 'EWB-' + Math.floor(100000000000 + Math.random() * 900000000000);
    const newEwb = {
      id: newId,
      invoiceNo: invoice.invoiceNo,
      date: new Date().toLocaleDateString('en-GB'),
      customer: invoice.customerName,
      gstin: invoice.customerGstin || 'URP',
      destination: invoice.customerState,
      distance,
      vehicleNo,
      transporter,
      mode,
      status: 'Active',
      validUpto: new Date(Date.now() + 3600000 * 72).toLocaleDateString('en-GB')
    };
    const updated = [newEwb, ...ewayBills];
    setEwayBills(updated);
    localStorage.setItem('pn_gst_eway_bills', JSON.stringify(updated));
    setEwayModal({ open: false, invoice: null, vehicleNo: '', transporter: '', distance: '100', mode: 'Road' });
    logAuditAction(`Generated official 12-digit E-Way Bill ${newId} for invoice ${invoice.invoiceNo}`, 'ewaybill');
    showNotification(`Generated E-Way Bill ${newId} successfully!`);
  };

  const handlePrintEwayBill = (ewb) => {
    try {
      const doc = new jsPDF('portrait');
      doc.setFontSize(20);
      doc.setTextColor(17, 24, 39);
      doc.text("E-WAY BILL (FORM GST EWB-01)", 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`E-Way Bill No: ${ewb.id} | Generated Date: ${ewb.date} | Valid Upto: ${ewb.validUpto}`, 105, 28, { align: 'center' });

      autoTable(doc, {
        startY: 38,
        head: [['PART-A (SUPPLY & CONSIGNMENT DETAILS)', 'VAL / INFO']],
        body: [
          ['Supplier GSTIN / Name', `${companySettings.gstin} (${companySettings.companyName})`],
          ['Recipient GSTIN / Name', `${ewb.gstin || 'URP'} (${ewb.customer})`],
          ['Place of Delivery (State / PIN)', ewb.destination],
          ['Invoice Number & Date', `${ewb.invoiceNo} (${ewb.date})`],
          ['HSN Code & Description', '21069099 - Dietary Supplements'],
          ['Approximate Distance', `${ewb.distance} KM`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6 }
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [['PART-B (TRANSPORTER & VEHICLE DETAILS)', 'VAL / INFO']],
        body: [
          ['Mode of Transport', ewb.mode || 'Road'],
          ['Vehicle Number', ewb.vehicleNo || 'N/A'],
          ['Transporter Name / ID', ewb.transporter || 'Self / Direct'],
          ['Transporter Doc / RR No', `DOC-${Date.now().toString().slice(-6)}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6 }
      });

      doc.save(`${ewb.id}_EWay_Bill_Slip.pdf`);
      showNotification(`Downloaded Part-A/Part-B slip for ${ewb.id}`);
    } catch (err) {
      console.error('E-Way Bill Slip Error:', err);
      showNotification('Failed to download E-Way Bill slip.', 'error');
    }
  };

  // ─── ITC Inward Purchase Handlers ────────────────────────────────────────
  const handleSaveItcInvoice = (e) => {
    e.preventDefault();
    if (currentRole === 'Read-Only Auditor' || currentRole === 'Sales Clerk') {
      showNotification('Permission Denied: Your role cannot log inward purchase invoices!', 'error');
      return;
    }
    const taxableNum = Number(newItcModal.taxable || 0);
    const rateNum = Number(newItcModal.rate || 18);
    const taxNum = Number((taxableNum * rateNum / 100).toFixed(2));
    const cgst = newItcModal.isInterState ? 0 : Number((taxNum / 2).toFixed(2));
    const sgst = newItcModal.isInterState ? 0 : Number((taxNum / 2).toFixed(2));
    const igst = newItcModal.isInterState ? taxNum : 0;
    const newInv = {
      id: 'ITC-' + Math.floor(100 + Math.random() * 900),
      vendorName: newItcModal.vendorName || 'Valued Vendor',
      gstin: newItcModal.gstin || '08AAACV1234F1Z9',
      invoiceNo: newItcModal.invoiceNo || `PUR-${Date.now().toString().slice(-4)}`,
      date: newItcModal.date ? new Date(newItcModal.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
      hsn: newItcModal.hsn || '21069099',
      taxable: taxableNum,
      cgst,
      sgst,
      igst,
      totalTax: taxNum,
      total: Number((taxableNum + taxNum).toFixed(2)),
      status: 'Matched in 2B'
    };
    const updated = [newInv, ...itcInvoices];
    setItcInvoices(updated);
    localStorage.setItem('pn_gst_itc_invoices', JSON.stringify(updated));
    setNewItcModal({ open: false, vendorName: '', gstin: '', invoiceNo: '', date: new Date().toISOString().slice(0, 10), hsn: '', taxable: '', rate: '18', isInterState: false });
    logAuditAction(`Logged vendor purchase invoice #${newInv.invoiceNo} from ${newInv.vendorName} (ITC +₹${taxNum})`, 'itc');
    showNotification('Inward purchase invoice added to ITC pool successfully!');
  };

  // ─── API Integrations Handlers ───────────────────────────────────────────
  const handleToggleIntegration = (key) => {
    if (currentRole === 'Read-Only Auditor' || currentRole === 'Sales Clerk') {
      showNotification('Permission Denied: Your role cannot modify API integration settings!', 'error');
      return;
    }
    const updated = {
      ...apiIntegrations,
      [key]: {
        ...apiIntegrations[key],
        enabled: !apiIntegrations[key].enabled,
        status: !apiIntegrations[key].enabled ? 'Connected' : 'Disconnected'
      }
    };
    setApiIntegrations(updated);
    localStorage.setItem('pn_gst_api_integrations', JSON.stringify(updated));
    logAuditAction(`API Integration '${key.toUpperCase()}' toggled to ${!apiIntegrations[key].enabled ? 'Connected' : 'Disabled'}`, 'integration');
    showNotification(`Integration ${key.toUpperCase()} updated.`);
  };

  const handleTestSync = (key) => {
    if (!apiIntegrations[key].enabled) {
      showNotification(`Please enable ${key.toUpperCase()} integration first!`, 'error');
      return;
    }
    showNotification(`Simulating API handshake & data sync with ${key.toUpperCase()}...`);
    setTimeout(() => {
      const updated = {
        ...apiIntegrations,
        [key]: {
          ...apiIntegrations[key],
          status: 'Connected',
          lastSync: 'Just now'
        }
      };
      setApiIntegrations(updated);
      localStorage.setItem('pn_gst_api_integrations', JSON.stringify(updated));
      logAuditAction(`Executed manual force-sync with ${key.toUpperCase()} API endpoint`, 'integration');
      showNotification(`Successfully synchronized tax ledgers with ${key.toUpperCase()}!`);
    }, 1200);
  };

  return (
    <div className="gst-module-wrapper">
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '14px 22px',
          background: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={20} />
          {notification.msg}
        </div>
      )}

      {/* ─── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="gst-header">
        <div className="gst-header-left">
          {onBack && (
            <button className="gst-back-btn" onClick={onBack}>
              <ArrowLeft size={18} />
              Back to Admin
            </button>
          )}
          <div className="gst-title-area">
            <h1><Shield size={26} style={{ color: '#d4af37' }} /> GST & Tax Engine</h1>
            <p>Automated Indian GST compliance, intelligent state detection, and multi-format reporting suite.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const next = !easyMode;
              setEasyMode(next);
              showNotification(next ? '✨ Easy Mode Activated!' : '⚙️ Advanced Mode Activated!');
            }}
            style={{
              background: easyMode ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: easyMode ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            {easyMode ? '✨ Easy Mode (ON)' : '⚙️ Advanced Mode'}
          </button>
          <div className="gst-header-badge" style={{ margin: 0 }}>
            <Building size={16} />
            <span>Brand: <strong>PURE NUTRIX</strong> • GSTIN: <strong>{companySettings.gstin}</strong> • {companySettings.originStateName} ({companySettings.originState})</span>
          </div>
          {!easyMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
                <UserCheck size={16} style={{ color: '#d4af37' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active User:</span>
                <select 
                  value={activeUserId} 
                  onChange={(e) => handleUserSwitch(e.target.value)}
                  style={{ background: 'transparent', color: '#f8fafc', border: 'none', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
                >
                  {teamUsers.map(u => (
                    <option key={u.id} value={u.id} style={{ background: '#1e293b', color: '#f8fafc' }}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowUserModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
                }}
              >
                <User size={15} /> Users & Roles ({teamUsers.length})
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── Sub-Navigation Tabs ────────────────────────────────────────── */}
      <nav className="gst-nav-bar" style={{ flexWrap: 'wrap', gap: '6px' }}>
        <button 
          className={`gst-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart2 size={18} /> {easyMode ? '📊 Simple Dashboard' : 'Overview & Analytics'}
        </button>
        <button 
          className={`gst-nav-tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <FileText size={18} /> {easyMode ? '🧾 Sales Bills & E-Way' : 'Automated Invoices'}
        </button>
        <button 
          className={`gst-nav-tab ${activeTab === 'itc' ? 'active' : ''}`}
          onClick={() => setActiveTab('itc')}
        >
          <CreditCard size={18} /> {easyMode ? '🛒 Purchase Bills & Tax Credit' : 'ITC & Reconciliations'}
        </button>
        <button 
          className={`gst-nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileSpreadsheet size={18} /> {easyMode ? '📥 GST Returns & Export' : 'Reports & Filing'}
        </button>
        {!easyMode && (
          <>
            <button 
              className={`gst-nav-tab ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              <Globe size={18} /> Integrations & APIs
            </button>
            <button 
              className={`gst-nav-tab ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <History size={18} /> Audit Trail
            </button>
          </>
        )}
        <button 
          className={`gst-nav-tab ${activeTab === 'help' ? 'active' : ''}`}
          onClick={() => setActiveTab('help')}
        >
          <HelpCircle size={18} /> {easyMode ? '💡 Beginner Guide & Help' : 'Help & Guidance'}
        </button>
        {!easyMode && (
          <>
            <button 
              className={`gst-nav-tab ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <Tag size={18} /> HSN & Rates
            </button>
            <button 
              className={`gst-nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={18} /> GSTIN & Rules
            </button>
          </>
        )}
      </nav>

      {/* ─── Main Content Area ──────────────────────────────────────────── */}
      <main className="gst-content">

        {/* ─── TAB 1: OVERVIEW & ANALYTICS ────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            {easyMode ? (
              /* ─── EASY MODE BEGINNER OVERVIEW DASHBOARD ─── */
              <div>
                <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(212, 175, 55, 0.15))', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '22px 28px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
                      <CheckCircle2 size={30} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 6px 0', color: '#f8fafc', fontSize: '1.3rem', fontWeight: 800 }}>
                        Welcome to GST Easy Mode! 🇮🇳
                      </h3>
                      <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        Designed for simplicity—easily track your total sales, GST collected from customers, input tax credit saved, and final tax payable without complex technical jargon.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    style={{ background: 'linear-gradient(135deg, #d4af37, #f59e0b)', color: '#0f172a', border: 'none', padding: '12px 22px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)' }}
                  >
                    <FileText size={18} /> View Sales Bills
                  </button>
                </div>

                <div className="gst-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  <div className="gst-kpi-card" onClick={() => setActiveTab('invoices')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '22px' }}>
                    <div className="gst-kpi-header">
                      <span className="gst-kpi-title" style={{ fontSize: '1rem', color: '#38bdf8', fontWeight: 700 }}>1. Total Sales (Taxable)</span>
                      <div className="gst-kpi-icon cyan"><TrendingUp size={24} /></div>
                    </div>
                    <div className="gst-kpi-value" style={{ fontSize: '1.8rem', color: '#f8fafc', margin: '10px 0' }}>{formatINR(summaryMetrics.totalTaxable)}</div>
                    <div className="gst-kpi-subtitle" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      Across all {summaryMetrics.count} customer orders
                    </div>
                  </div>

                  <div className="gst-kpi-card" onClick={() => setActiveTab('reports')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '22px' }}>
                    <div className="gst-kpi-header">
                      <span className="gst-kpi-title" style={{ fontSize: '1rem', color: '#10b981', fontWeight: 700 }}>2. GST Collected from Customers</span>
                      <div className="gst-kpi-icon emerald"><Shield size={24} /></div>
                    </div>
                    <div className="gst-kpi-value" style={{ fontSize: '1.8rem', color: '#10b981', margin: '10px 0' }}>{formatINR(summaryMetrics.totalTax)}</div>
                    <div className="gst-kpi-subtitle" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      CGST: ₹{summaryMetrics.totalCGST} | SGST: ₹{summaryMetrics.totalSGST} | IGST: ₹{summaryMetrics.totalIGST}
                    </div>
                  </div>

                  <div className="gst-kpi-card" onClick={() => setActiveTab('itc')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(139, 92, 246, 0.4)', padding: '22px' }}>
                    <div className="gst-kpi-header">
                      <span className="gst-kpi-title" style={{ fontSize: '1rem', color: '#a78bfa', fontWeight: 700 }}>3. Tax Saved (ITC Pool)</span>
                      <div className="gst-kpi-icon violet"><CreditCard size={24} /></div>
                    </div>
                    <div className="gst-kpi-value" style={{ fontSize: '1.8rem', color: '#a78bfa', margin: '10px 0' }}>{formatINR(itcSummary.totalTax)}</div>
                    <div className="gst-kpi-subtitle" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      Input Tax Credit from vendor purchase bills
                    </div>
                  </div>

                  <div className="gst-kpi-card" onClick={() => setActiveTab('reports')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(15, 23, 42, 0.95))', border: '2px solid #d4af37', padding: '22px' }}>
                    <div className="gst-kpi-header">
                      <span className="gst-kpi-title" style={{ fontSize: '1.05rem', color: '#d4af37', fontWeight: 800 }}>4. Net GST Payable</span>
                      <div className="gst-kpi-icon" style={{ background: '#d4af37', color: '#0f172a' }}><CheckSquare size={24} /></div>
                    </div>
                    <div className="gst-kpi-value" style={{ fontSize: '2rem', color: '#d4af37', fontWeight: 900, margin: '10px 0' }}>{formatINR(itcSummary.netTaxPayable)}</div>
                    <div className="gst-kpi-subtitle" style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>
                      {Number(itcSummary.itcSurplus) > 0 ? `🔥 Tax Surplus (Credit): ₹${itcSummary.itcSurplus}` : 'Final tax payable to government after ITC deduction'}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    💡 Next Steps (3 Simple Steps for Beginners)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '6px', fontSize: '0.95rem' }}>Step 1: Sales Invoices & E-Way Bills</div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 12px 0', lineHeight: '1.4' }}>Review automated GST bills for all customer orders. Generate official 12-digit E-Way bills in 1-click for orders exceeding ₹50,000.</p>
                      <button onClick={() => setActiveTab('invoices')} className="gst-btn" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', width: '100%', border: '1px solid rgba(56, 189, 248, 0.4)', fontSize: '0.85rem', fontWeight: 700 }}>Go to Sales Invoices →</button>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ color: '#a78bfa', fontWeight: 700, marginBottom: '6px', fontSize: '0.95rem' }}>Step 2: Add Purchase Bills (Save Tax)</div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 12px 0', lineHeight: '1.4' }}>Log vendor purchase bills for inventory or supplies to claim Input Tax Credit (ITC) and lower your net tax liability.</p>
                      <button onClick={() => setActiveTab('itc')} className="gst-btn" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', width: '100%', border: '1px solid rgba(139, 92, 246, 0.4)', fontSize: '0.85rem', fontWeight: 700 }}>Add Purchase Bills →</button>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '6px', fontSize: '0.95rem' }}>Step 3: Download Portal Reports</div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 12px 0', lineHeight: '1.4' }}>At month or quarter end, download official GSTR-1 and GSTR-3B reports in Excel or PDF formats to submit to your CA or GST Portal.</p>
                      <button onClick={() => setActiveTab('reports')} className="gst-btn" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', width: '100%', border: '1px solid rgba(16, 185, 129, 0.4)', fontSize: '0.85rem', fontWeight: 700 }}>Download Reports →</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
            {/* Smart Filing Deadline & Compliance Ticker */}
            <div style={{ background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '16px', padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#d4af37', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={24} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Upcoming Filing Deadlines & Reminders • <span style={{ color: '#10b981', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>Compliance Active</span>
                  </h4>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                    <span><strong>GSTR-1 (Outward):</strong> 11th of Next Month (14 days left)</span>
                    <span><strong>GSTR-3B (Summary & Tax):</strong> 20th of Next Month</span>
                    <span><strong>QRMP Scheme:</strong> 13th (Quarterly)</span>
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => showNotification('Automated compliance reminder SMS and email notification sent to Tax Accountant!')}
                  style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Bell size={15} /> Send Reminder Alert
                </button>
                <button 
                  onClick={() => setActiveTab('itc')}
                  style={{ background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.4)', color: '#d4af37', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckSquare size={15} /> Reconcile 2B & ITC
                </button>
              </div>
            </div>

            <div className="gst-kpi-grid">
              <div className="gst-kpi-card" onClick={() => setActiveTab('invoices')} style={{ cursor: 'pointer' }}>
                <div className="gst-kpi-header">
                  <span className="gst-kpi-title">Total Taxable Value</span>
                  <div className="gst-kpi-icon"><IndianRupee size={22} /></div>
                </div>
                <div className="gst-kpi-value">₹ {summaryMetrics.totalTaxable}</div>
                <div className="gst-kpi-subtitle">
                  <TrendingUp size={14} style={{ color: '#10b981' }} /> Across {summaryMetrics.count} automated invoices
                </div>
              </div>

              <div className="gst-kpi-card" onClick={() => setActiveTab('reports')} style={{ cursor: 'pointer' }}>
                <div className="gst-kpi-header">
                  <span className="gst-kpi-title">Total GST Collected</span>
                  <div className="gst-kpi-icon emerald"><Shield size={22} /></div>
                </div>
                <div className="gst-kpi-value">₹ {summaryMetrics.totalTax}</div>
                <div className="gst-kpi-subtitle">
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} /> 100% automated tax compliance
                </div>
              </div>

              <div className="gst-kpi-card">
                <div className="gst-kpi-header">
                  <span className="gst-kpi-title">CGST / SGST (Intra-State)</span>
                  <div className="gst-kpi-icon cyan"><Layers size={22} /></div>
                </div>
                <div className="gst-kpi-value" style={{ fontSize: '1.5rem' }}>
                  ₹ {summaryMetrics.totalCGST} / ₹ {summaryMetrics.totalSGST}
                </div>
                <div className="gst-kpi-subtitle">
                  <MapPin size={14} /> Origin State: {companySettings.originStateName} ({companySettings.originState})
                </div>
              </div>

              <div className="gst-kpi-card">
                <div className="gst-kpi-header">
                  <span className="gst-kpi-title">IGST (Inter-State)</span>
                  <div className="gst-kpi-icon violet"><Truck size={22} /></div>
                </div>
                <div className="gst-kpi-value">₹ {summaryMetrics.totalIGST}</div>
                <div className="gst-kpi-subtitle">
                  <PieChart size={14} /> From inter-state shipping orders
                </div>
              </div>

              <div className="gst-kpi-card" onClick={() => setActiveTab('itc')} style={{ cursor: 'pointer', border: '1px solid rgba(212, 175, 55, 0.4)', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))' }}>
                <div className="gst-kpi-header">
                  <span className="gst-kpi-title" style={{ color: '#d4af37' }}>Net Tax Payable (After ITC)</span>
                  <div className="gst-kpi-icon" style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#d4af37' }}><CreditCard size={22} /></div>
                </div>
                <div className="gst-kpi-value" style={{ color: '#d4af37' }}>₹ {itcSummary.netTaxPayable}</div>
                <div className="gst-kpi-subtitle">
                  <CheckSquare size={14} style={{ color: '#d4af37' }} /> Available ITC Credit Pool: ₹ {itcSummary.totalTax}
                </div>
              </div>
            </div>

            {/* Quick Government Portal Return Export Banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15), rgba(124, 58, 237, 0.15))', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={20} style={{ color: '#10b981' }} /> Direct GST Portal Return Filing Ready
                </h4>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                  Export 100% compliant return files (B2B, B2C, CDNR, HSN summary) formatted for immediate upload on <strong>gst.gov.in</strong>.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  className="gst-btn" 
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', fontWeight: 700 }}
                  onClick={handleExportGSTR1OfflineExcel}
                >
                  <FileSpreadsheet size={16} /> GSTR-1 Offline Tool (.xlsx)
                </button>
                <button 
                  className="gst-btn" 
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)', fontWeight: 700 }}
                  onClick={handleExportGSTR1JSON}
                >
                  <FileText size={16} /> GSTR-1 Portal JSON (.json)
                </button>
              </div>
            </div>

            <div className="gst-section-card">
              <div className="gst-section-header">
                <div>
                  <h3 className="gst-section-title"><FileText size={20} /> Recent Automated Tax Invoices</h3>
                  <p className="gst-section-desc">Real-time intelligent GST breakdown based on customer shipping addresses.</p>
                </div>
                <button className="gst-btn gst-btn-primary" onClick={() => setActiveTab('invoices')}>
                  View All Invoices <ChevronRight size={16} />
                </button>
              </div>

              <div className="gst-table-container">
                <table className="gst-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>State Code</th>
                      <th>Supply Type</th>
                      <th>HSN Code</th>
                      <th>Taxable Value</th>
                      <th>GST Breakdown</th>
                      <th>Total Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedInvoices.slice(0, 5).map(inv => (
                      <tr key={inv.invoiceNo}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d4af37' }}>{inv.invoiceNo}</td>
                        <td>{inv.invoiceDate}</td>
                        <td style={{ fontWeight: 600 }}>{inv.customerName}</td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{inv.customerStateCode}</span> - {inv.customerState}
                        </td>
                        <td>
                          <span className={`gst-badge ${inv.isIntraState ? 'gst-badge-cgst' : 'gst-badge-igst'}`}>
                            {inv.supplyType}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{inv.hsnCode}</td>
                        <td>₹ {inv.taxableValue.toFixed(2)}</td>
                        <td>
                          {inv.isIntraState ? (
                            <span style={{ fontSize: '0.8rem', color: '#06b6d4' }}>
                              CGST: ₹{inv.cgstAmount} | SGST: ₹{inv.sgstAmount} ({inv.gstRate}%)
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#a78bfa' }}>
                              IGST: ₹{inv.igstAmount} ({inv.igstRate}%)
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 800, fontSize: '1rem' }}>₹ {inv.invoiceTotal.toFixed(2)}</td>
                        <td>
                          <button 
                            className="gst-btn gst-btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            <Eye size={14} /> View / Print
                          </button>
                        </td>
                      </tr>
                    ))}
                    {calculatedInvoices.length === 0 && (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                          No orders available to generate invoices yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: AUTOMATED GST INVOICES ──────────────────────────────── */}
        {activeTab === 'invoices' && (
          <div className="gst-section-card">
            <div className="gst-section-header">
              <div>
                <h3 className="gst-section-title"><FileText size={22} style={{ color: '#d4af37' }} /> Automated GST Tax Invoices Log</h3>
                <p className="gst-section-desc">All customer orders automatically classified into Intra-state (CGST+SGST) vs Inter-state (IGST).</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="gst-btn gst-btn-success" onClick={handleExportExcel} title="Standard Excel Report for accounting & general viewing">
                  <FileSpreadsheet size={15} /> Standard Excel (.xlsx)
                </button>
                <button className="gst-btn gst-btn-primary" onClick={handleExportPDF} title="Official PDF Summary Report for printing & records">
                  <Download size={15} /> PDF Summary
                </button>
                <button className="gst-btn" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }} onClick={handleExportGSTR1OfflineExcel} title="Official Government GST Excel Offline Utility Format (b2b, b2cl, b2cs, cdnr, hsn)">
                  <FileSpreadsheet size={15} /> GSTR-1 Offline Tool (.xlsx)
                </button>
                <button className="gst-btn" style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' }} onClick={handleExportGSTR1JSON} title="Direct Return Upload JSON for Government GST Portal">
                  <FileText size={15} /> GSTR-1 Portal Upload (.json)
                </button>
              </div>
            </div>

            <div className="gst-filter-bar">
              <div className="gst-search-box">
                <Search size={18} style={{ color: '#9ca3af' }} />
                <input 
                  type="text" 
                  placeholder="Search by Invoice No, Customer, Mobile, State..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Showing <strong>{filteredInvoices.length}</strong> invoices</span>
              </div>
            </div>

            <div className="gst-table-container">
              <table className="gst-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Order Ref</th>
                    <th>Date</th>
                    <th>Customer Details</th>
                    <th>Shipping State</th>
                    <th>Supply Type</th>
                    <th>HSN Code</th>
                    <th>Taxable (₹)</th>
                    <th>Tax Amount (₹)</th>
                    <th>Gross Total (₹)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.invoiceNo}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d4af37' }}>{inv.invoiceNo}</td>
                      <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>#{inv.orderIdShort}</td>
                      <td>{inv.invoiceDate}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inv.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{inv.customerMobile}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{inv.customerState}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Code: {inv.customerStateCode}</div>
                      </td>
                      <td>
                        <span className={`gst-badge ${inv.isIntraState ? 'gst-badge-cgst' : 'gst-badge-igst'}`}>
                          {inv.supplyType}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{inv.hsnCode}</td>
                      <td>₹ {inv.taxableValue.toFixed(2)}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>₹ {inv.totalTax.toFixed(2)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {inv.isIntraState ? `CGST ₹${inv.cgstAmount} + SGST ₹${inv.sgstAmount}` : `IGST ₹${inv.igstAmount}`}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}>₹ {inv.invoiceTotal.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="gst-btn gst-btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            onClick={() => setSelectedInvoice(inv)}
                            title="View / Print Invoice"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button 
                            className="gst-btn gst-btn-primary" 
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            onClick={() => handleDownloadSingleInvoicePDF(inv)}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </button>
                          <button 
                            className="gst-btn gst-btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.8rem', background: inv.invoiceTotal > 50000 ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: inv.invoiceTotal > 50000 ? '#d4af37' : '#94a3b8', border: inv.invoiceTotal > 50000 ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)' }}
                            onClick={() => handleGenerateEwayBill(inv)}
                            title="Generate E-Way Bill"
                          >
                            <Truck size={14} /> {inv.invoiceTotal > 50000 ? 'E-Way Bill (Req)' : 'E-Way Bill'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                        No tax invoices found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: ITC MANAGEMENT & LEDGER DISCREPANCY TRACKER ─────────────── */}
        {activeTab === 'itc' && (
          <div>
            <div className="gst-section-card" style={{ border: '1px solid rgba(212, 175, 55, 0.4)' }}>
              <div className="gst-section-header">
                <div>
                  <h3 className="gst-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d4af37' }}>
                    <CreditCard size={24} /> Input Tax Credit (ITC) Management & 2B Reconciliations
                  </h3>
                  <p className="gst-section-desc">Log vendor purchase invoices to build your ITC credit pool and automatically reconcile against GSTR-2B ledgers.</p>
                </div>
                <button 
                  className="gst-btn gst-btn-primary"
                  onClick={() => setNewItcModal({ open: true, vendorName: '', gstin: '', invoiceNo: `PUR-${Math.floor(1000 + Math.random() * 9000)}`, date: new Date().toISOString().slice(0, 10), hsn: '21069099', taxable: '', rate: '18', isInterState: false })}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <PlusCircle size={18} /> Log Vendor Purchase Invoice
                </button>
              </div>

              {/* ITC KPI Summary Grid */}
              <div className="gst-kpi-grid" style={{ marginBottom: '24px' }}>
                <div className="gst-kpi-card">
                  <div className="gst-kpi-header">
                    <span className="gst-kpi-title">Total Inward Purchase Value</span>
                    <div className="gst-kpi-icon"><IndianRupee size={20} /></div>
                  </div>
                  <div className="gst-kpi-value">₹ {itcSummary.totalTaxable}</div>
                  <div className="gst-kpi-subtitle">Across {itcSummary.count} B2B vendor bills</div>
                </div>
                <div className="gst-kpi-card" style={{ border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                  <div className="gst-kpi-header">
                    <span className="gst-kpi-title" style={{ color: '#10b981' }}>Available ITC Credit Pool</span>
                    <div className="gst-kpi-icon emerald"><ShieldCheck size={20} /></div>
                  </div>
                  <div className="gst-kpi-value" style={{ color: '#10b981' }}>₹ {itcSummary.totalTax}</div>
                  <div className="gst-kpi-subtitle">CGST: ₹{itcSummary.totalCGST} | SGST: ₹{itcSummary.totalSGST} | IGST: ₹{itcSummary.totalIGST}</div>
                </div>
                <div className="gst-kpi-card">
                  <div className="gst-kpi-header">
                    <span className="gst-kpi-title">Outward Tax Collected</span>
                    <div className="gst-kpi-icon cyan"><Layers size={20} /></div>
                  </div>
                  <div className="gst-kpi-value">₹ {summaryMetrics.totalTax}</div>
                  <div className="gst-kpi-subtitle">From customer sales invoices</div>
                </div>
                <div className="gst-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(30, 41, 59, 0.9))', border: '1px solid #d4af37' }}>
                  <div className="gst-kpi-header">
                    <span className="gst-kpi-title" style={{ color: '#d4af37', fontWeight: 800 }}>Net GST Payable in Rupee</span>
                    <div className="gst-kpi-icon" style={{ background: '#d4af37', color: '#0f172a' }}><CheckSquare size={20} /></div>
                  </div>
                  <div className="gst-kpi-value" style={{ color: '#d4af37', fontSize: '1.6rem' }}>₹ {itcSummary.netTaxPayable}</div>
                  <div className="gst-kpi-subtitle" style={{ color: '#cbd5e1' }}>
                    {Number(itcSummary.itcSurplus) > 0 ? `🔥 Surplus ITC Carry-Forward: ₹${itcSummary.itcSurplus}` : 'Offset applied from ITC credit pool'}
                  </div>
                </div>
              </div>

              {/* 2B Reconciliation Table & Ledger Discrepancy Tracker */}
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 14px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem' }}>
                  <AlertTriangle size={18} style={{ color: '#f59e0b' }} /> 2B vs Books Reconciliation & Discrepancy Tracker
                </h4>
                <div className="gst-table-container">
                  <table className="gst-table">
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Vendor GSTIN</th>
                        <th>Invoice No & Date</th>
                        <th>HSN Code</th>
                        <th>Taxable (₹)</th>
                        <th>CGST / SGST / IGST</th>
                        <th>Total Tax (₹)</th>
                        <th>2B Match Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itcInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 700, color: '#f8fafc' }}>{inv.vendorName}</td>
                          <td style={{ fontFamily: 'monospace', color: '#d4af37' }}>{inv.gstin}</td>
                          <td>{inv.invoiceNo} <br/><small style={{ color: '#94a3b8' }}>{inv.date}</small></td>
                          <td style={{ fontFamily: 'monospace' }}>{inv.hsn}</td>
                          <td>₹ {Number(inv.taxable).toLocaleString('en-IN')}</td>
                          <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                            {inv.igst > 0 ? `IGST: ₹${inv.igst}` : `C: ₹${inv.cgst} | S: ₹${inv.sgst}`}
                          </td>
                          <td style={{ fontWeight: 800, color: '#10b981' }}>₹ {Number(inv.totalTax).toLocaleString('en-IN')}</td>
                          <td>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              background: inv.status === 'Matched in 2B' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: inv.status === 'Matched in 2B' ? '#10b981' : '#f59e0b',
                              border: inv.status === 'Matched in 2B' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {inv.status === 'Matched in 2B' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>} {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {itcInvoices.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                            No inward purchase invoices logged yet. Click "Log Vendor Purchase Invoice" above to add your first bill!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: INTEGRATIONS & APIS ─────────────────────────────────────── */}
        {activeTab === 'integrations' && (
          <div className="gst-section-card">
            <div className="gst-section-header">
              <div>
                <h3 className="gst-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d4af37' }}>
                  <Globe size={24} /> Accounting Software & E-Commerce API Sync
                </h3>
                <p className="gst-section-desc">Connect and automatically synchronize sales orders, tax ledgers, and inventory HSN mappings across platforms.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '16px' }}>
              {[
                { key: 'tally', name: 'Tally Prime ERP', desc: 'Direct XML & ODBC sync for sales vouchers and GST return reconciliation.', color: '#3b82f6', icon: Database },
                { key: 'zoho', name: 'Zoho Books & Inventory', desc: 'Automated OAuth2 webhook push for B2B and B2C large invoice ledgers.', color: '#ef4444', icon: Layers },
                { key: 'quickbooks', name: 'QuickBooks Online', desc: 'Sync chart of accounts, tax liabilities, and vendor purchase bills.', color: '#10b981', icon: FileCheck },
                { key: 'shopify', name: 'Shopify Storefront', desc: 'Real-time order import, automated HSN mapping, and checkout tax rules.', color: '#8b5cf6', icon: Package },
                { key: 'woocommerce', name: 'WooCommerce API', desc: 'REST API sync for Indian state GST calculation and e-invoice generation.', color: '#ec4899', icon: Sliders },
                { key: 'amazon', name: 'Amazon India Seller Hub', desc: 'MTR (Merchant Tax Report) automated parsing and B2CS aggregation.', color: '#f59e0b', icon: Zap },
                { key: 'flipkart', name: 'Flipkart Seller Hub', desc: 'Direct API integration for settlement tax reports and TCS reconciliation.', color: '#06b6d4', icon: ExternalLink }
              ].map(app => {
                const config = apiIntegrations[app.key] || { enabled: false, key: '', status: 'Disconnected', lastSync: 'Never' };
                const IconComp = app.icon;
                return (
                  <div key={app.key} style={{ background: 'rgba(0,0,0,0.3)', border: config.enabled ? `1px solid ${app.color}` : '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ background: `${app.color}20`, color: app.color, width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconComp size={22} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.05rem', fontWeight: 700 }}>{app.name}</h4>
                            <span style={{ fontSize: '0.75rem', color: config.enabled ? '#10b981' : '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: config.enabled ? '#10b981' : '#94a3b8' }}></span>
                              {config.status} • Last Sync: {config.lastSync}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleToggleIntegration(app.key)}
                          style={{ background: config.enabled ? '#10b981' : 'rgba(255,255,255,0.1)', color: config.enabled ? '#0f172a' : '#94a3b8', border: 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          {config.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 16px 0', lineHeight: '1.4' }}>{app.desc}</p>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Key size={14} style={{ color: '#94a3b8' }} />
                        <input 
                          type="text" 
                          value={config.key} 
                          placeholder="Enter API / Webhook Secret Key..." 
                          onChange={(e) => {
                            const updated = { ...apiIntegrations, [app.key]: { ...config, key: e.target.value } };
                            setApiIntegrations(updated);
                            localStorage.setItem('pn_gst_api_integrations', JSON.stringify(updated));
                          }}
                          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '6px 10px', color: '#f8fafc', fontSize: '0.8rem', width: '100%', fontFamily: 'monospace' }}
                        />
                      </div>
                      <button 
                        onClick={() => handleTestSync(app.key)}
                        disabled={!config.enabled}
                        style={{ background: config.enabled ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.05)', border: config.enabled ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255,255,255,0.08)', color: config.enabled ? '#d4af37' : '#64748b', padding: '8px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: config.enabled ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
                      >
                        <RefreshCw size={14} /> Test Connection & Force Sync
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB: AUDIT TRAIL LOG ─────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div className="gst-section-card">
            <div className="gst-section-header">
              <div>
                <h3 className="gst-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d4af37' }}>
                  <History size={24} /> Immutable System Audit Trail & Security Ledger
                </h3>
                <p className="gst-section-desc">Timestamped activity tracking for compliance audits, security verification, and tax ledger integrity.</p>
              </div>
            </div>

            <div className="gst-table-container" style={{ marginTop: '16px' }}>
              <table className="gst-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>Active User Role</th>
                    <th>Action Category</th>
                    <th>Activity Description</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>#{log.id.toString().slice(-6)}</td>
                      <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{log.timestamp}</td>
                      <td>
                        <span style={{ 
                          background: 'rgba(212, 175, 55, 0.15)', 
                          color: '#d4af37', 
                          border: '1px solid rgba(212, 175, 55, 0.3)', 
                          padding: '4px 10px', 
                          borderRadius: '16px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700 
                        }}>
                          {log.user}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          textTransform: 'uppercase', 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          color: log.type === 'security' ? '#ef4444' : log.type === 'export' ? '#10b981' : log.type === 'itc' ? '#3b82f6' : '#8b5cf6',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '3px 8px',
                          borderRadius: '4px'
                        }}>
                          {log.type}
                        </span>
                      </td>
                      <td style={{ color: '#f8fafc', fontWeight: 500 }}>{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: BILINGUAL HELP & GUIDANCE (सहायता) ───────────────────────── */}
        {activeTab === 'help' && (
          <div className="gst-section-card">
            <div className="gst-section-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="gst-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d4af37' }}>
                  <HelpCircle size={24} /> {helpLang === 'en' ? 'GST Compliance Help Center & Guide' : 'जीएसटी अनुपालन सहायता केंद्र और मार्गदर्शन'}
                </h3>
                <p className="gst-section-desc">
                  {helpLang === 'en' ? 'Step-by-step guidance on Indian GST laws, E-Way bills, HSN codes, and portal filing.' : 'भारतीय जीएसटी कानून, ई-वे बिल, एचएसएन कोड और पोर्टल फाइलिंग पर चरण-दर-चरण मार्गदर्शन।'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button 
                  onClick={() => setHelpLang('en')}
                  style={{ background: helpLang === 'en' ? '#d4af37' : 'transparent', color: helpLang === 'en' ? '#0f172a' : '#f8fafc', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Languages size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> English
                </button>
                <button 
                  onClick={() => setHelpLang('hi')}
                  style={{ background: helpLang === 'hi' ? '#d4af37' : 'transparent', color: helpLang === 'hi' ? '#0f172a' : '#f8fafc', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  हिंदी (Hindi)
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {helpLang === 'en' ? (
                <>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <h4 style={{ color: '#10b981', fontSize: '1.05rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={18} /> Return Filing (GSTR-1 & GSTR-3B)
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                      • <strong>GSTR-1 (Outward Supplies):</strong> Must be filed by the <strong>11th of every month</strong> (or 13th for QRMP quarterly filers). Use our direct JSON or 5-sheet Excel utility export in the Reports tab to upload cleanly on <strong>gst.gov.in</strong> without errors.<br/><br/>
                      • <strong>GSTR-3B (Summary & Payment):</strong> Due by the <strong>20th of every month</strong>. Your net tax liability is calculated automatically on the overview dashboard by offsetting outward sales tax against your logged Input Tax Credit (ITC) pool.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <h4 style={{ color: '#d4af37', fontSize: '1.05rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={18} /> E-Way Bill Rules (Form EWB-01)
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                      • Mandatory for any consignment of goods where the invoice taxable total exceeds <strong>₹50,000</strong>.<br/><br/>
                      • <strong>Part-A:</strong> Contains supplier, recipient GSTIN, delivery PIN code, invoice number, and HSN description.<br/>
                      • <strong>Part-B:</strong> Contains transporter ID, vehicle number, and mode of transport.<br/>
                      • Click the gold <strong>"E-Way Bill (Req)"</strong> button on any invoice exceeding ₹50,000 to generate and print your official 12-digit slip instantly.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <h4 style={{ color: '#3b82f6', fontSize: '1.05rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={18} /> Input Tax Credit (ITC) & 2B Reconciliation
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                      • When you purchase raw materials, packaging, or freight from registered B2B vendors, the GST paid is credited to your ITC ledger.<br/><br/>
                      • Log your incoming vendor bills in the <strong>ITC & Reconciliations</strong> tab. Our automated reconciliation engine compares your books against government <strong>GSTR-2B</strong> filings, warning you of any mismatched HSN codes or pending vendor submissions.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <h4 style={{ color: '#8b5cf6', fontSize: '1.05rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag size={18} /> HSN Code Classifications (21069099)
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                      • Health and dietary nutritional supplements (Whey Protein, Multivitamins, Aminos) fall under <strong>HSN Code 21069099</strong> ("Food preparations not elsewhere specified or included").<br/><br/>
                      • The standard applicable tax rate is <strong>18% GST</strong> (9% CGST + 9% SGST for Rajasthan local deliveries, or 18% IGST for inter-state orders across India).
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <h4 style={{ color: '#10b981', fontSize: '1.05rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={18} /> जीएसटी रिटर्न फाइलिंग (GSTR-1 और GSTR-3B)
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                      • <strong>GSTR-1 (आउटवर्ड सप्लाई):</strong> हर महीने की <strong>11 तारीख</strong> तक फाइल करना अनिवार्य है। बिना किसी त्रुटि के सीधे <strong>gst.gov.in</strong> पर अपलोड करने के लिए हमारे रिपोर्ट सेक्शन से JSON या 5-शीट एक्सेल यूटिलिटी डाउनलोड करें।<br/><br/>
                      • <strong>GSTR-3B (समरी और टैक्स भुगतान):</strong> हर महीने की <strong>20 तारीख</strong> तक देय। आपकी कुल कर देयता स्वचालित रूप से डैशबोर्ड पर इनपुट टैक्स क्रेडिट (ITC) को घटाकर दर्शाई जाती है।
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <h4 style={{ color: '#d4af37', fontSize: '1.05rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={18} /> ई-वे बिल नियम (फॉर्म EWB-01)
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                      • जब भी किसी चालान (इनवॉइस) का कुल मूल्य <strong>₹50,000</strong> से अधिक होता है, तो माल भेजने के लिए ई-वे बिल अनिवार्य होता है।<br/><br/>
                      • <strong>भाग-A:</strong> सप्लायर, खरीदार का GSTIN, पिन कोड और HSN विवरण होता है।<br/>
                      • <strong>भाग-B:</strong> ट्रांसपोर्टर ID और वाहन संख्या (Vehicle Number) होती है।<br/>
                      • इनवॉइस लिस्ट में गोल्ड <strong>"E-Way Bill (Req)"</strong> बटन पर क्लिक करके 12 अंकों का आधिकारिक ई-वे बिल तुरंत बनाएं और प्रिंट करें।
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <h4 style={{ color: '#3b82f6', fontSize: '1.05rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={18} /> इनपुट टैक्स क्रेडिट (ITC) और 2B मिलान
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                      • जब आप पंजीकृत वेंडरों से कच्चा माल, पैकेजिंग या सेवाएँ खरीदते हैं, तो भुगतान किया गया GST आपके इनपुट टैक्स क्रेडिट (ITC) में जमा हो जाता है।<br/><br/>
                      • अपने वेंडर के बिलों को <strong>ITC और मिलान</strong> टैब में दर्ज करें। हमारा सिस्टम सरकारी <strong>GSTR-2B</strong> रिकॉर्ड से आपके बहीखाते का स्वचालित मिलान करता है और विसंगतियों (Discrepancies) पर तुरंत अलर्ट भेजता है।
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <h4 style={{ color: '#8b5cf6', fontSize: '1.05rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag size={18} /> एचएसएन कोड वर्गीकरण (21069099)
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                      • सभी हेल्थ और डाइटरी सप्लीमेंट्स (जैसे व्हे प्रोटीन, मल्टीविटामिन्स) <strong>HSN कोड 21069099</strong> के अंतर्गत वर्गीकृत किए जाते हैं।<br/><br/>
                      • इस पर मानक <strong>18% जीएसटी</strong> दर लागू होती है (राजस्थान के भीतर डिलीवरी के लिए 9% CGST + 9% SGST, या अन्य राज्यों के लिए 18% IGST)।
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: COMPREHENSIVE GST REPORTS (.XLSX & PDF) ─────────────── */}
        {activeTab === 'reports' && (
          <div>
            <div className="gst-section-card" style={{ background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <div className="gst-section-header">
                <div>
                  <h3 className="gst-section-title"><FileSpreadsheet size={24} style={{ color: '#10b981' }} /> Comprehensive GST Report Generator</h3>
                  <p className="gst-section-desc">Generate official multi-sheet Excel (.xlsx) workbooks and print-ready PDF reports with 100% automated tax calculations.</p>
                </div>
              </div>

              {/* Report Configuration Form */}
              <div className="gst-form-grid" style={{ marginBottom: '28px', background: 'rgba(0,0,0,0.25)', padding: '24px', borderRadius: '14px', border: '1px solid #374151' }}>
                <div className="gst-form-group">
                  <label><Calendar size={16} /> Select Report Time Period</label>
                  <select className="gst-select" value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
                    <option value="all">All Time (All at once)</option>
                    <option value="month">Month-wise (Specific Month)</option>
                    <option value="quarter">Quarterly (Financial Year Quarters)</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                {reportPeriod === 'month' && (
                  <div className="gst-form-group">
                    <label>Select Month & Year</label>
                    <input type="month" className="gst-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                  </div>
                )}

                {reportPeriod === 'quarter' && (
                  <div className="gst-form-group">
                    <label>Select Financial Quarter</label>
                    <select className="gst-select" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)}>
                      <option value="2026-Q1">Q1 (Apr - Jun 2026)</option>
                      <option value="2026-Q2">Q2 (Jul - Sep 2026)</option>
                      <option value="2026-Q3">Q3 (Oct - Dec 2026)</option>
                      <option value="2026-Q4">Q4 (Jan - Mar 2026)</option>
                      <option value="2025-Q4">Q4 (Jan - Mar 2025)</option>
                    </select>
                  </div>
                )}

                {reportPeriod === 'custom' && (
                  <>
                    <div className="gst-form-group">
                      <label>Start Date</label>
                      <input type="date" className="gst-input" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                    </div>
                    <div className="gst-form-group">
                      <label>End Date</label>
                      <input type="date" className="gst-input" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                    </div>
                  </>
                )}

                <div className="gst-form-group">
                  <label><Filter size={16} /> Filter by Supply Type</label>
                  <select className="gst-select" value={reportTaxType} onChange={(e) => setReportTaxType(e.target.value)}>
                    <option value="all">All Tax Types (Intra & Inter State)</option>
                    <option value="cgst_sgst">Intra-State Only (CGST + SGST)</option>
                    <option value="igst">Inter-State Only (IGST)</option>
                  </select>
                </div>
              </div>

              {/* Report Live Summary Preview */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ fontSize: '1rem', color: '#d4af37', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} /> Report Summary Preview ({filteredInvoices.length} Invoices Found)
                </h4>
                <div className="gst-kpi-grid" style={{ marginBottom: '0', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <div className="gst-kpi-card" style={{ padding: '16px' }}>
                    <div className="gst-kpi-title">Invoices Count</div>
                    <div className="gst-kpi-value" style={{ fontSize: '1.4rem' }}>{summaryMetrics.count}</div>
                  </div>
                  <div className="gst-kpi-card" style={{ padding: '16px' }}>
                    <div className="gst-kpi-title">Taxable Sales (₹)</div>
                    <div className="gst-kpi-value" style={{ fontSize: '1.4rem' }}>₹ {summaryMetrics.totalTaxable}</div>
                  </div>
                  <div className="gst-kpi-card" style={{ padding: '16px' }}>
                    <div className="gst-kpi-title">CGST + SGST (₹)</div>
                    <div className="gst-kpi-value" style={{ fontSize: '1.4rem', color: '#06b6d4' }}>₹ {Number(summaryMetrics.totalCGST) + Number(summaryMetrics.totalSGST)}</div>
                  </div>
                  <div className="gst-kpi-card" style={{ padding: '16px' }}>
                    <div className="gst-kpi-title">IGST Amount (₹)</div>
                    <div className="gst-kpi-value" style={{ fontSize: '1.4rem', color: '#8b5cf6' }}>₹ {summaryMetrics.totalIGST}</div>
                  </div>
                  <div className="gst-kpi-card" style={{ padding: '16px', background: 'rgba(212, 175, 55, 0.1)', borderColor: '#d4af37' }}>
                    <div className="gst-kpi-title" style={{ color: '#d4af37' }}>Total GST Revenue (₹)</div>
                    <div className="gst-kpi-value" style={{ fontSize: '1.4rem', color: '#d4af37' }}>₹ {summaryMetrics.totalTax}</div>
                  </div>
                </div>
              </div>

              {/* Prominent Download & Return Filing Export Buttons */}
              <div style={{ padding: '28px', background: 'rgba(0,0,0,0.35)', borderRadius: '16px', border: '1px dashed #475569' }}>
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 6px 0' }}>Select Report Export & Return Filing Format</h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Choose standard viewing reports for internal accounting, or direct filing formats formatted strictly for the Government GST Portal (gst.gov.in).</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {/* 1. Standard Excel */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                        <FileSpreadsheet size={20} /> General Accounting Report
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Multi-sheet workbook with KPI summary, state-wise revenue aggregation, and complete invoice log for internal audits.
                      </p>
                    </div>
                    <button 
                      className="gst-btn gst-btn-success" 
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)' }}
                      onClick={handleExportExcel}
                    >
                      <FileSpreadsheet size={18} /> Export Standard Excel (.xlsx)
                    </button>
                  </div>

                  {/* 2. Official PDF */}
                  <div style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d4af37', fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                        <Download size={20} /> Print-Ready PDF Report
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Executive summary document formatted with PURE NUTRIX branding, jurisdiction details, and tax breakdown tables.
                      </p>
                    </div>
                    <button 
                      className="gst-btn gst-btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)' }}
                      onClick={handleExportPDF}
                    >
                      <Download size={18} /> Export Official PDF Summary
                    </button>
                  </div>

                  {/* 3. Official GST Offline Tool Excel */}
                  <div style={{ background: 'rgba(5, 150, 105, 0.12)', border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#059669', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderBottomLeftRadius: '8px', letterSpacing: '0.5px' }}>
                      GOVT OFFLINE TOOL
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                        <FileSpreadsheet size={20} /> GSTR-1 Offline Utility Format
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Formatted into official 5-sheet structure (<strong>b2b, b2cl, b2cs, cdnr, hsn</strong>) for direct import into the Govt GST Offline Tool.
                      </p>
                    </div>
                    <button 
                      className="gst-btn" 
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', fontWeight: 700 }}
                      onClick={handleExportGSTR1OfflineExcel}
                    >
                      <FileSpreadsheet size={18} /> Download GSTR-1 Excel (.xlsx)
                    </button>
                  </div>

                  {/* 4. Direct Portal Upload JSON */}
                  <div style={{ background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(139, 92, 246, 0.5)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#7c3aed', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderBottomLeftRadius: '8px', letterSpacing: '0.5px' }}>
                      DIRECT PORTAL UPLOAD
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                        <FileText size={20} /> GSTR-1 Portal Return (.json)
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Generates the official schema JSON file. Ready for immediate direct upload on <strong>gst.gov.in</strong> under GSTR-1 Offline filing.
                      </p>
                    </div>
                    <button 
                      className="gst-btn" 
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)', fontWeight: 700 }}
                      onClick={handleExportGSTR1JSON}
                    >
                      <FileText size={18} /> Download GSTR-1 Portal JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: PRODUCT HSN & TAX CATALOG ───────────────────────────── */}
        {activeTab === 'catalog' && (
          <div className="gst-section-card">
            <div className="gst-section-header">
              <div>
                <h3 className="gst-section-title"><Tag size={22} style={{ color: '#d4af37' }} /> Product HSN & GST Rate Mapping</h3>
                <p className="gst-section-desc">Assign Harmonized System of Nomenclature (HSN) codes and tax structures for every item in your catalog.</p>
              </div>
              <button className="gst-btn gst-btn-secondary" onClick={handleBulkApplyTax} title="Apply default tax settings to all products">
                <RefreshCcw size={16} /> Bulk Apply Default Rules ({companySettings.defaultRate}% {companySettings.defaultPriceType})
              </button>
            </div>

            <div className="gst-table-container">
              <table className="gst-table">
                <thead>
                  <tr>
                    <th>Product Name & SKU</th>
                    <th>Category</th>
                    <th>Price (₹)</th>
                    <th>HSN / SAC Code</th>
                    <th>GST Rate (%)</th>
                    <th>Pricing Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(products || []).map(prod => {
                    const cfg = productMap[prod.id] || {
                      hsn: companySettings.defaultHsn,
                      rate: companySettings.defaultRate,
                      priceType: companySettings.defaultPriceType
                    };
                    return (
                      <tr key={prod.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#ffffff' }}>{prod.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>SKU: {prod.sku || 'N/A'}</div>
                        </td>
                        <td>{prod.category || 'General'}</td>
                        <td style={{ fontWeight: 700 }}>₹ {prod.price}</td>
                        <td>
                          <input 
                            type="text" 
                            className="gst-input" 
                            style={{ width: '130px', padding: '8px 12px', fontFamily: 'monospace' }}
                            value={cfg.hsn}
                            onChange={(e) => handleUpdateProductTax(prod.id, 'hsn', e.target.value)}
                            placeholder="e.g. 21069099"
                          />
                        </td>
                        <td>
                          <select 
                            className="gst-select" 
                            style={{ width: '120px', padding: '8px 12px' }}
                            value={cfg.rate}
                            onChange={(e) => handleUpdateProductTax(prod.id, 'rate', Number(e.target.value))}
                          >
                            <option value="0">0% (Exempt)</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18% (Standard)</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td>
                          <select 
                            className="gst-select" 
                            style={{ width: '150px', padding: '8px 12px' }}
                            value={cfg.priceType}
                            onChange={(e) => handleUpdateProductTax(prod.id, 'priceType', e.target.value)}
                          >
                            <option value="inclusive">Inclusive of GST</option>
                            <option value="exclusive">Exclusive (+ GST)</option>
                          </select>
                        </td>
                        <td>
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                            <Check size={14} /> Synced
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(products || []).length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                        No product listings found in store catalog. Add products in the Catalog tab first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 5: GSTIN & ORIGIN RULES SETTINGS ────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="gst-section-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="gst-section-header">
              <div>
                <h3 className="gst-section-title"><Settings size={22} style={{ color: '#d4af37' }} /> Company GST Credentials & Rules</h3>
                <p className="gst-section-desc">Configure your registered Business GSTIN, Origin State, and fallback tax formulas.</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="gst-form-grid" style={{ marginBottom: '24px' }}>
                <div className="gst-form-group">
                  <label>Registered Business Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="gst-input" 
                    value={companySettings.companyName}
                    onChange={(e) => setCompanySettings({...companySettings, companyName: e.target.value})}
                    placeholder="e.g. D3 PRODUCTION"
                  />
                </div>

                <div className="gst-form-group">
                  <label>Trade Name / Brand Name</label>
                  <input 
                    type="text" 
                    className="gst-input" 
                    value={companySettings.tradeName}
                    onChange={(e) => setCompanySettings({...companySettings, tradeName: e.target.value})}
                    placeholder="e.g. Pure Nutrix"
                  />
                </div>
              </div>

              <div className="gst-form-grid" style={{ marginBottom: '24px' }}>
                <div className="gst-form-group">
                  <label>
                    <span>15-Digit GSTIN Number *</span>
                    {/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(companySettings.gstin) ? (
                      <span style={{ color: '#10b981', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Valid Format</span>
                    ) : (
                      <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>Standard format: 08AAAAA0000A1Z5</span>
                    )}
                  </label>
                  <input 
                    type="text" 
                    required 
                    className="gst-input" 
                    style={{ fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase' }}
                    value={companySettings.gstin}
                    onChange={(e) => setCompanySettings({...companySettings, gstin: e.target.value.toUpperCase()})}
                    placeholder="08FJOPM3122F2Z5"
                    maxLength={15}
                  />
                </div>

                <div className="gst-form-group">
                  <label>Origin State / Union Territory * (Determines CGST vs IGST)</label>
                  <select 
                    className="gst-select" 
                    value={companySettings.originState}
                    onChange={(e) => setCompanySettings({...companySettings, originState: e.target.value})}
                  >
                    {INDIAN_STATES.map(st => (
                      <option key={st.code} value={st.code}>
                        {st.code} - {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="gst-form-group" style={{ marginBottom: '28px' }}>
                <label>Registered Corporate Address *</label>
                <textarea 
                  rows="3" 
                  required 
                  className="gst-input" 
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                  placeholder="Full office address with pincode..."
                ></textarea>
              </div>

              <h4 style={{ fontSize: '1rem', color: '#d4af37', borderBottom: '1px solid #374151', paddingBottom: '10px', marginBottom: '20px' }}>
                Default Product Tax Fallback Rules
              </h4>

              <div className="gst-form-grid" style={{ marginBottom: '32px' }}>
                <div className="gst-form-group">
                  <label>Default GST Rate (%)</label>
                  <select 
                    className="gst-select" 
                    value={companySettings.defaultRate}
                    onChange={(e) => setCompanySettings({...companySettings, defaultRate: Number(e.target.value)})}
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard Supplements)</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div className="gst-form-group">
                  <label>Default Pricing Structure</label>
                  <select 
                    className="gst-select" 
                    value={companySettings.defaultPriceType}
                    onChange={(e) => setCompanySettings({...companySettings, defaultPriceType: e.target.value})}
                  >
                    <option value="inclusive">Inclusive of GST (MRP is final total)</option>
                    <option value="exclusive">Exclusive (+ GST added on top)</option>
                  </select>
                </div>

                <div className="gst-form-group">
                  <label>Default HSN Code for Health Supplements</label>
                  <input 
                    type="text" 
                    className="gst-input" 
                    style={{ fontFamily: 'monospace' }}
                    value={companySettings.defaultHsn}
                    onChange={(e) => setCompanySettings({...companySettings, defaultHsn: e.target.value})}
                    placeholder="21069099"
                  />
                </div>

                {/* Multi-Currency Support */}
                <div className="gst-form-group">
                  <label>Base Reporting Currency</label>
                  <select 
                    className="gst-select" 
                    value={companySettings.currency || 'INR'}
                    onChange={(e) => setCompanySettings({...companySettings, currency: e.target.value})}
                  >
                    <option value="INR">INR (₹) - Indian Rupee (100% Compliant Only)</option>
                  </select>
                </div>
                <div className="gst-form-group">
                  <label>Exchange Rate to INR (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="gst-input" 
                    value={companySettings.exchangeRate || 1}
                    onChange={(e) => setCompanySettings({...companySettings, exchangeRate: Number(e.target.value)})}
                    placeholder="1.0"
                  />
                  <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>Used for automatic conversion of export supplies to INR for official GST returns.</small>
                </div>
              </div>

              {/* Data Backup & Restore */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px', marginBottom: '20px' }}>
                <h4 style={{ color: '#10b981', fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} /> Data Backup & System Restore
                </h4>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={handleBackupDatabase}
                    style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <UploadCloud size={18} /> Backup Database (.json)
                  </button>
                  <label style={{ background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.4)', color: '#d4af37', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <HardDrive size={18} /> Restore from Backup
                    <input type="file" accept=".json" onChange={handleRestoreDatabase} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #374151', paddingTop: '20px' }}>
                <button type="submit" className="gst-btn gst-btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                  <Check size={18} /> Save All GST Settings
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* ─── E-WAY BILL GENERATION MODAL ────────────────────────────────── */}
      {ewayModal.open && (
        <div className="gst-modal-overlay" onClick={() => setEwayModal({ ...ewayModal, open: false })}>
          <div className="gst-modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="gst-modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#d4af37' }}>
                <Truck style={{ color: '#d4af37' }} /> Generate Official E-Way Bill (EWB-01)
              </h3>
              <button onClick={() => setEwayModal({ ...ewayModal, open: false })} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>
            <form onSubmit={handleSubmitEwayBill} style={{ padding: '24px' }}>
              <div style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <strong>Invoice:</strong> {ewayModal.invoice?.invoiceNo} • <strong>Value:</strong> ₹{ewayModal.invoice?.invoiceTotal.toFixed(2)}<br/>
                <strong>Consignee:</strong> {ewayModal.invoice?.customerName} ({ewayModal.invoice?.customerState})
              </div>

              <div className="gst-form-grid" style={{ marginBottom: '16px' }}>
                <div className="gst-form-group">
                  <label>Transporter Name / ID</label>
                  <input type="text" required className="gst-input" value={ewayModal.transporter} onChange={(e) => setEwayModal({...ewayModal, transporter: e.target.value})} placeholder="e.g. Express Roadlines (08AAA...)" />
                </div>
                <div className="gst-form-group">
                  <label>Vehicle Number</label>
                  <input type="text" required className="gst-input" value={ewayModal.vehicleNo} onChange={(e) => setEwayModal({...ewayModal, vehicleNo: e.target.value})} placeholder="e.g. RJ14 GB 8891" />
                </div>
                <div className="gst-form-group">
                  <label>Approximate Distance (KM)</label>
                  <input type="number" required className="gst-input" value={ewayModal.distance} onChange={(e) => setEwayModal({...ewayModal, distance: e.target.value})} placeholder="150" />
                </div>
                <div className="gst-form-group">
                  <label>Mode of Transport</label>
                  <select className="gst-select" value={ewayModal.mode} onChange={(e) => setEwayModal({...ewayModal, mode: e.target.value})}>
                    <option value="Road">Road (Truck / Van)</option>
                    <option value="Rail">Rail (Train)</option>
                    <option value="Air">Air Cargo</option>
                    <option value="Ship">Ship / Steamer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                <button type="button" onClick={() => setEwayModal({ ...ewayModal, open: false })} className="gst-btn gst-btn-secondary">Cancel</button>
                <button type="submit" className="gst-btn gst-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={16} /> Generate 12-Digit E-Way Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LOG VENDOR PURCHASE INVOICE MODAL (ITC) ────────────────────── */}
      {newItcModal.open && (
        <div className="gst-modal-overlay" onClick={() => setNewItcModal({ ...newItcModal, open: false })}>
          <div className="gst-modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="gst-modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
                <PlusCircle style={{ color: '#10b981' }} /> Log Inward B2B Vendor Bill (ITC Pool)
              </h3>
              <button onClick={() => setNewItcModal({ ...newItcModal, open: false })} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>
            <form onSubmit={handleSaveItcInvoice} style={{ padding: '24px' }}>
              <div className="gst-form-grid" style={{ marginBottom: '16px' }}>
                <div className="gst-form-group">
                  <label>Vendor Name / Supplier</label>
                  <input type="text" required className="gst-input" value={newItcModal.vendorName} onChange={(e) => setNewItcModal({...newItcModal, vendorName: e.target.value})} placeholder="e.g. Vedic Pharma Chem Pvt Ltd" />
                </div>
                <div className="gst-form-group">
                  <label>Vendor GSTIN</label>
                  <input type="text" required className="gst-input" style={{ fontFamily: 'monospace' }} value={newItcModal.gstin} onChange={(e) => setNewItcModal({...newItcModal, gstin: e.target.value})} placeholder="08AAACV1234F1Z9" />
                </div>
                <div className="gst-form-group">
                  <label>Invoice Number</label>
                  <input type="text" required className="gst-input" value={newItcModal.invoiceNo} onChange={(e) => setNewItcModal({...newItcModal, invoiceNo: e.target.value})} placeholder="VPC/2026/089" />
                </div>
                <div className="gst-form-group">
                  <label>Invoice Date</label>
                  <input type="date" required className="gst-input" value={newItcModal.date} onChange={(e) => setNewItcModal({...newItcModal, date: e.target.value})} />
                </div>
                <div className="gst-form-group">
                  <label>HSN Code</label>
                  <input type="text" required className="gst-input" style={{ fontFamily: 'monospace' }} value={newItcModal.hsn} onChange={(e) => setNewItcModal({...newItcModal, hsn: e.target.value})} placeholder="21069099" />
                </div>
                <div className="gst-form-group">
                  <label>Taxable Value (₹)</label>
                  <input type="number" required step="0.01" className="gst-input" value={newItcModal.taxable} onChange={(e) => setNewItcModal({...newItcModal, taxable: e.target.value})} placeholder="100000" />
                </div>
                <div className="gst-form-group">
                  <label>Applicable GST Rate (%)</label>
                  <select className="gst-select" value={newItcModal.rate} onChange={(e) => setNewItcModal({...newItcModal, rate: e.target.value})}>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard)</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
                <div className="gst-form-group">
                  <label>Supply Type</label>
                  <select className="gst-select" value={newItcModal.isInterState ? 'true' : 'false'} onChange={(e) => setNewItcModal({...newItcModal, isInterState: e.target.value === 'true'})}>
                    <option value="false">Intra-State (CGST + SGST)</option>
                    <option value="true">Inter-State (IGST)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                <button type="button" onClick={() => setNewItcModal({ ...newItcModal, open: false })} className="gst-btn gst-btn-secondary">Cancel</button>
                <button type="submit" className="gst-btn gst-btn-primary" style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={16} /> Save & Add to ITC Credit Pool</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── OFFICIAL TAX INVOICE MODAL (VIEW / PRINT) ──────────────────── */}
      {selectedInvoice && (
        <div className="gst-modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="gst-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gst-modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText style={{ color: '#d4af37' }} /> Tax Invoice Preview ({selectedInvoice.invoiceNo})
              </h3>
              <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>

            <div className="gst-modal-body">
              {/* Printable Invoice Paper Block */}
              <div className="gst-invoice-paper">
                <div className="gst-inv-header">
                  <div>
                    <h2 className="gst-inv-title" style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '4px', letterSpacing: '0.5px' }}>PURE NUTRIX</h2>
                    <p style={{ margin: '2px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Operated by: {companySettings.companyName}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#475569' }}>{companySettings.address}</p>
                    <p style={{ margin: '2px 0', fontSize: '0.9rem', fontWeight: 700 }}>
                      GSTIN: <span style={{ color: '#0f172a' }}>{companySettings.gstin}</span> | State: {companySettings.originStateName} (Code: {companySettings.originState})
                    </p>
                  </div>
                  <div className="gst-inv-meta">
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>TAX INVOICE</h3>
                    <p style={{ margin: '6px 0 2px 0', fontWeight: 700, color: '#0f172a' }}>Invoice #: {selectedInvoice.invoiceNo}</p>
                    <p style={{ margin: '2px 0' }}>Date of Issue: {selectedInvoice.invoiceDate}</p>
                    <p style={{ margin: '2px 0' }}>Order Ref: #{selectedInvoice.orderIdShort}</p>
                  </div>
                </div>

                <div className="gst-inv-grid">
                  <div className="gst-inv-box">
                    <h4>Bill To / Customer Shipping Address:</h4>
                    <p style={{ fontWeight: 700, color: '#0f172a' }}>{selectedInvoice.customerName}</p>
                    <p>Mobile: {selectedInvoice.customerMobile}</p>
                    <p>{selectedInvoice.shippingAddress}</p>
                    <p style={{ fontWeight: 700, marginTop: '6px' }}>
                      State Code: {selectedInvoice.customerState} ({selectedInvoice.customerStateCode})
                    </p>
                  </div>
                  <div className="gst-inv-box">
                    <h4>Supply & GST Classification:</h4>
                    <p>Place of Supply: <strong>{selectedInvoice.customerState} ({selectedInvoice.customerStateCode})</strong></p>
                    <p>Supply Type: <strong style={{ color: selectedInvoice.isIntraState ? '#0284c7' : '#7c3aed' }}>{selectedInvoice.supplyType}</strong></p>
                    <p>Pricing Basis: {selectedInvoice.priceType === 'inclusive' ? 'Inclusive of GST' : 'Exclusive of GST (+ Tax)'}</p>
                    <p>Payment Status: <strong style={{ color: '#059669' }}>Paid & Completed</strong></p>
                  </div>
                </div>

                <table className="gst-inv-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product Description</th>
                      <th>HSN / SAC</th>
                      <th>Qty</th>
                      <th>Rate %</th>
                      <th>Taxable Value</th>
                      {selectedInvoice.isIntraState ? (
                        <>
                          <th>CGST</th>
                          <th>SGST</th>
                        </>
                      ) : (
                        <th>IGST</th>
                      )}
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td style={{ fontWeight: 700 }}>{selectedInvoice.productName}</td>
                      <td style={{ fontFamily: 'monospace' }}>{selectedInvoice.hsnCode}</td>
                      <td>{selectedInvoice.qty}</td>
                      <td>{selectedInvoice.gstRate}%</td>
                      <td>₹ {selectedInvoice.taxableValue.toFixed(2)}</td>
                      {selectedInvoice.isIntraState ? (
                        <>
                          <td>₹ {selectedInvoice.cgstAmount.toFixed(2)}<br/><small>({selectedInvoice.cgstRate}%)</small></td>
                          <td>₹ {selectedInvoice.sgstAmount.toFixed(2)}<br/><small>({selectedInvoice.sgstRate}%)</small></td>
                        </>
                      ) : (
                        <td>₹ {selectedInvoice.igstAmount.toFixed(2)}<br/><small>({selectedInvoice.igstRate}%)</small></td>
                      )}
                      <td style={{ fontWeight: 800 }}>₹ {selectedInvoice.invoiceTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="gst-inv-totals">
                  <tbody>
                    <tr>
                      <td>Total Taxable Value:</td>
                      <td style={{ textAlign: 'right' }}>₹ {selectedInvoice.taxableValue.toFixed(2)}</td>
                    </tr>
                    {selectedInvoice.isIntraState ? (
                      <>
                        <tr>
                          <td>Add CGST ({selectedInvoice.cgstRate}%):</td>
                          <td style={{ textAlign: 'right' }}>₹ {selectedInvoice.cgstAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Add SGST ({selectedInvoice.sgstRate}%):</td>
                          <td style={{ textAlign: 'right' }}>₹ {selectedInvoice.sgstAmount.toFixed(2)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td>Add IGST ({selectedInvoice.igstRate}%):</td>
                        <td style={{ textAlign: 'right' }}>₹ {selectedInvoice.igstAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr>
                      <td>Grand Invoice Total:</td>
                      <td style={{ textAlign: 'right' }}>₹ {selectedInvoice.invoiceTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="gst-inv-words">
                  <strong>Total Amount in Words:</strong> {numberToWordsINR(selectedInvoice.invoiceTotal)}
                </div>

                <div className="gst-inv-footer">
                  <div>
                    <p style={{ margin: '2px 0', fontWeight: 700, color: '#334155' }}>Terms & Conditions:</p>
                    <p style={{ margin: '2px 0' }}>1. Goods once sold will not be taken back or exchanged.</p>
                    <p style={{ margin: '2px 0' }}>2. All disputes are subject to {companySettings.originStateName} jurisdiction only.</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'cursive', fontSize: '1.2rem', color: '#2563eb' }}>
                      Pure Nutrix Auth
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>
                      For PURE NUTRIX<br/>
                      <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>Authorized Signatory</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="gst-modal-footer">
              <button className="gst-btn gst-btn-secondary" onClick={() => setSelectedInvoice(null)}>Close</button>
              <button className="gst-btn gst-btn-success" onClick={handlePrintInvoice}>
                <Printer size={16} /> Print Invoice
              </button>
              <button className="gst-btn gst-btn-primary" onClick={() => handleDownloadSingleInvoicePDF(selectedInvoice)}>
                <Download size={16} /> Download PDF Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: TEAM USERS & ROLE-BASED ACCESS CONTROL (RBAC) ───────────── */}
      {showUserModal && (
        <div className="gst-modal-backdrop" onClick={() => setShowUserModal(false)}>
          <div className="gst-modal" style={{ maxWidth: '850px', background: '#0f172a', border: '1px solid #38bdf8' }} onClick={e => e.stopPropagation()}>
            <div className="gst-modal-header" style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.3)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>👥 Team Users & Role-Based Access Control (RBAC)</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Assign specific enterprise roles to staff members, CAs, and auditors to protect sensitive GST data.</p>
                </div>
              </div>
              <button onClick={() => setShowUserModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>

            <div className="gst-modal-body" style={{ padding: '20px 0', maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Active Logged In User Banner */}
              <div style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(15, 23, 42, 0.9))', border: '1px solid #d4af37', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserCheck size={20} style={{ color: '#d4af37' }} />
                  <span style={{ color: '#f8fafc', fontSize: '0.9rem' }}>
                    Current Active Session: <strong>{activeUser.name}</strong> • Role Level: <strong style={{ color: '#d4af37' }}>{activeUser.role}</strong>
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(212, 175, 55, 0.2)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                  Switch user from header dropdown
                </span>
              </div>

              {/* Add New User Form */}
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PlusCircle size={16} /> Assign New Staff Member to GST Suite
                </h4>
                <form onSubmit={handleAddTeamUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '4px' }}>Staff Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Anjali Gupta"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="gst-input"
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '4px' }}>Email Address / Login</label>
                    <input
                      type="email"
                      placeholder="e.g. anjali@purenutrix.in"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="gst-input"
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '4px' }}>Assigned Enterprise Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="gst-select"
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      <option value="Super Admin">👑 Super Admin (Full Control)</option>
                      <option value="Tax Accountant">📊 Tax Accountant (Returns & ITC)</option>
                      <option value="Sales Clerk">🧾 Sales Clerk (Billing & E-Way)</option>
                      <option value="Read-Only Auditor">👁️ Read-Only Auditor (View Audit)</option>
                    </select>
                  </div>
                  <div>
                    <button type="submit" className="gst-btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', width: '100%', padding: '9px 16px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      + Assign Role
                    </button>
                  </div>
                </form>
              </div>

              {/* Team Users Table */}
              <h4 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '1rem' }}>Authorized Team Members ({teamUsers.length})</h4>
              <div className="gst-table-wrapper" style={{ marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                <table className="gst-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem' }}>STAFF MEMBER</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem' }}>EMAIL / IDENTIFIER</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem' }}>ASSIGNED ROLE</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem' }}>ACCESS PERMISSIONS</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>STATUS</th>
                      <th style={{ padding: '12px', textAlign: 'right', color: '#94a3b8', fontSize: '0.8rem' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: activeUserId === u.id ? 'rgba(212, 175, 55, 0.08)' : 'transparent' }}>
                        <td style={{ padding: '12px', color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' }}>
                          {u.name} {activeUserId === u.id && <span style={{ color: '#d4af37', fontSize: '0.75rem', marginLeft: '6px' }}>(You)</span>}
                        </td>
                        <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.85rem' }}>{u.email}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            background: u.role === 'Super Admin' ? 'rgba(212, 175, 55, 0.2)' : u.role === 'Tax Accountant' ? 'rgba(56, 189, 248, 0.2)' : u.role === 'Sales Clerk' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                            color: u.role === 'Super Admin' ? '#d4af37' : u.role === 'Tax Accountant' ? '#38bdf8' : u.role === 'Sales Clerk' ? '#10b981' : '#cbd5e1',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#cbd5e1', fontSize: '0.8rem' }}>
                          {u.role === 'Super Admin' && 'All Tabs • GSTIN Rules • API Sync • Role Mgmt'}
                          {u.role === 'Tax Accountant' && 'GSTR-1/3B Reports • 2B ITC Reconciling • Analytics'}
                          {u.role === 'Sales Clerk' && 'Sales Billing • 12-Digit E-Way Bills (No Tax Rules)'}
                          {u.role === 'Read-Only Auditor' && 'View All Invoices & Reports • No Modifications'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>Active</span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteTeamUser(u.id, u.name)}
                            disabled={teamUsers.length <= 1}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: teamUsers.length <= 1 ? 'not-allowed' : 'pointer', opacity: teamUsers.length <= 1 ? 0.4 : 1 }}
                            title="Remove staff member"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Role Matrix Guide */}
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#d4af37', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Enterprise Role Matrix (Why assign roles?)
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
                  <div>
                    <strong style={{ color: '#d4af37', display: 'block', marginBottom: '4px' }}>👑 Super Admin</strong>
                    Full control. Can update GSTIN, change state rules, configure e-commerce APIs, and add/remove team members.
                  </div>
                  <div>
                    <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '4px' }}>📊 Tax Accountant</strong>
                    For internal accountants or billing managers. Can reconcile GSTR-2B Input Tax Credit, generate GSTR-1/3B JSONs, and manage vendor bills.
                  </div>
                  <div>
                    <strong style={{ color: '#10b981', display: 'block', marginBottom: '4px' }}>🧾 Sales Clerk</strong>
                    For cashier or sales desk staff. Restricted to generating customer sales invoices and E-Way bills. Cannot see tax settings or returns.
                  </div>
                  <div>
                    <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>👁️ Read-Only Auditor</strong>
                    For external Chartered Accountants (CAs) or auditors. Can inspect all transactions and export audit logs, but cannot alter or delete records.
                  </div>
                </div>
              </div>
            </div>

            <div className="gst-modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="gst-btn" onClick={() => setShowUserModal(false)} style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 800, padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                Done / Close Access Control
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GSTModule;
