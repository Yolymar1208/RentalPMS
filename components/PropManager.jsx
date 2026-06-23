"use client";
import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://lykhisfpiupivljmrvwm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2hpc2ZwaXVwaXZsam1ydndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDQ0MDgsImV4cCI6MjA5NjM4MDQwOH0.L4Xx-JxCgpCP2A6tB1VbYonBZnUdN9p7eNlf7vflhfU";
const SESSION_KEY = "propmanager_user";
const OWNER_NAME  = "by Yoly";
const APP_NAME = "EULA";
const APP_SUB  = "RentalPMS";

// ─── API ─────────────────────────────────────────────────────────────────────
const api = async (table, method = "GET", body = null, query = "") => {
  try {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    };
    if (method === "POST") headers["Prefer"] = "return=representation";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    if (method === "DELETE" || method === "PATCH") return { ok: res.ok };
    if (!res.ok) { console.error("API error", table, res.status); return { data: [], ok: false }; }
    const data = await res.json();
    return { data: Array.isArray(data) ? data : [], ok: true };
  } catch (err) {
    console.error("API fetch error", table, err);
    return { data: [], ok: false };
  }
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmtCurrency = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—";
const today = () => new Date().toISOString().split("T")[0];
const uid   = (p) => p + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();

const mapProperty = (r) => ({ id: r.id, name: r.name, building: r.building, unit: r.unit, floor: r.floor, parking: r.parking, status: r.status });
const mapTenant   = (r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, govId: r.gov_id, propertyId: r.property_id, leaseStart: r.lease_start, leaseEnd: r.lease_end, deposit: r.deposit, advance: r.advance, monthlyRent: r.monthly_rent, dues: r.dues, parking: r.parking });
const mapCharge   = (r) => ({ id: r.id, tenantId: r.tenant_id, period: r.period, type: r.type, amount: r.amount, date: r.date, remarks: r.remarks });
const mapPayment  = (r) => ({ id: r.id, tenantId: r.tenant_id, date: r.date, amount: r.amount, method: r.method, reference: r.reference, notes: r.notes });
const toDBProperty = (p, uid) => ({ id: p.id, user_id: uid, name: p.name, building: p.building, unit: p.unit, floor: p.floor, parking: p.parking, status: p.status });
const toDBTenant   = (t, uid) => ({ id: t.id, user_id: uid, name: t.name, phone: t.phone, email: t.email, gov_id: t.govId, property_id: t.propertyId, lease_start: t.leaseStart, lease_end: t.leaseEnd, deposit: t.deposit, advance: t.advance, monthly_rent: t.monthlyRent, dues: t.dues, parking: t.parking });
const toDBCharge   = (c, uid) => ({ id: c.id, user_id: uid, tenant_id: c.tenantId, period: c.period, type: c.type, amount: c.amount, date: c.date, remarks: c.remarks });
const toDBPayment  = (p, uid) => ({ id: p.id, user_id: uid, tenant_id: p.tenantId, date: p.date, amount: p.amount, method: p.method, reference: p.reference, notes: p.notes });

function getTenantBalance(tenantId, charges, payments) {
  const c = charges.filter(x => x.tenantId === tenantId).reduce((s, x) => s + Number(x.amount), 0);
  const p = payments.filter(x => x.tenantId === tenantId).reduce((s, x) => s + Number(x.amount), 0);
  return c - p;
}
function getLedger(tenantId, charges, payments) {
  const entries = [
    ...charges.filter(c => c.tenantId === tenantId).map(c => ({ date: c.date, desc: `${c.type} — ${c.remarks}`, debit: Number(c.amount), credit: 0 })),
    ...payments.filter(p => p.tenantId === tenantId).map(p => ({ date: p.date, desc: `Payment — ${p.method} ${p.reference}`, debit: 0, credit: Number(p.amount) })),
  ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  let bal = 0;
  return entries.map(e => { bal += e.debit - e.credit; return { ...e, balance: bal }; });
}

const DOC_STYLES = `
    body{font-family:'Helvetica Neue',Arial,sans-serif;padding:32px;color:#1e293b;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0}
    td{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px}
    .right{text-align:right}.bold{font-weight:700}
    .total-row td{background:#f8fafc;font-weight:700;border-top:2px solid #e2e8f0}
    .green{background:#d1fae5;color:#065f46}.red{background:#fee2e2;color:#991b1b}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #4338ca}
    .logo-wrap{display:flex;align-items:center;gap:10px}
    .logo-icon{width:44px;height:44px;flex-shrink:0}
    .logo-text{font-size:26px;font-weight:900;color:#4338ca;letter-spacing:-1px;line-height:1}
    .logo-sub{font-size:11px;color:#a5b4fc;font-weight:600;margin-top:1px}
    .doc-title{font-size:12px;color:#64748b;margin-top:3px}
    .no-print{display:none}
    @media print{body{padding:16px}.no-print{display:none!important}}
`;

function buildDocHTML(html, title) {
  return "<!DOCTYPE html><html><head><title>" + title + "</title><style>" + DOC_STYLES + "</style></head><body>" + html + "</body></html>";
}

function printHTML(html, title) {
  const w = window.open("", "_blank");
  w.document.write(buildDocHTML(html, title || "Report"));
  w.document.close();
  setTimeout(() => w.print(), 400);
}

function downloadHTML(html, filename) {
  const fullHtml = buildDocHTML(html, filename || "Report");
  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (filename || "report") + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Shared print header — hotel SVG + EULA name (plain string concat, safe inside template literals)
function PRINT_HEADER(docTitle, dateStr) {
  return '<div class="header"><div class="logo-wrap">'
    + '<svg class="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<rect width="40" height="40" rx="10" fill="#4338ca"/>'
    + '<rect x="13" y="10" width="14" height="22" fill="white" opacity="0.95"/>'
    + '<rect x="6" y="16" width="8" height="16" fill="white" opacity="0.75"/>'
    + '<rect x="26" y="16" width="8" height="16" fill="white" opacity="0.75"/>'
    + '<polygon points="20,4 27,10 13,10" fill="white" opacity="0.9"/>'
    + '<rect x="16" y="13" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>'
    + '<rect x="21" y="13" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>'
    + '<rect x="16" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>'
    + '<rect x="21" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>'
    + '<rect x="8" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>'
    + '<rect x="8" y="25" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>'
    + '<rect x="29" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>'
    + '<rect x="29" y="25" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>'
    + '<rect x="17.5" y="26" width="5" height="6" rx="2.5" fill="#4338ca" opacity="0.8"/>'
    + '<line x1="20" y1="4" x2="20" y2="1" stroke="white" stroke-width="1" opacity="0.8"/>'
    + '<polygon points="20,1 23,2.5 20,4" fill="#fbbf24"/>'
    + '</svg>'
    + '<div>'
    + '<div style="display:flex;align-items:baseline;gap:6px">'
    + '<span class="logo-text">EULA</span>'
    + '<span class="logo-sub">&mdash; RentalPMS</span>'
    + '</div>'
    + '<div class="doc-title">' + docTitle + '</div>'
    + '</div></div>'
    + '<div style="text-align:right;font-size:11px;color:#64748b">' + dateStr + '</div>'
    + '</div>';
}

// ─── HOTEL LOGO SVG ──────────────────────────────────────────────────────────
const HotelLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Building base */}
    <rect width="40" height="40" rx="10" fill="#4338ca"/>
    {/* Main tower */}
    <rect x="13" y="10" width="14" height="22" fill="white" opacity="0.95"/>
    {/* Left wing */}
    <rect x="6" y="16" width="8" height="16" fill="white" opacity="0.75"/>
    {/* Right wing */}
    <rect x="26" y="16" width="8" height="16" fill="white" opacity="0.75"/>
    {/* Roof peak center */}
    <polygon points="20,4 27,10 13,10" fill="white" opacity="0.9"/>
    {/* Windows center tower - row 1 */}
    <rect x="16" y="13" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>
    <rect x="21" y="13" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>
    {/* Windows center tower - row 2 */}
    <rect x="16" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>
    <rect x="21" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>
    {/* Windows left wing */}
    <rect x="8" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>
    <rect x="8" y="25" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>
    {/* Windows right wing */}
    <rect x="29" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>
    <rect x="29" y="25" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>
    {/* Door */}
    <rect x="17.5" y="26" width="5" height="6" rx="2.5" fill="#4338ca" opacity="0.8"/>
    {/* Flag on top */}
    <line x1="20" y1="4" x2="20" y2="1" stroke="white" strokeWidth="1" opacity="0.8"/>
    <polygon points="20,1 23,2.5 20,4" fill="#fbbf24"/>
  </svg>
);

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, className = "" }) => {
  const icons = {
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    building: "M1 22h22 M3 22V6l9-4 9 4v16 M9 22V12h6v10 M9 6h.01 M15 6h.01 M9 10h.01 M15 10h.01",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M16 3.13a4 4 0 0 1 0 7.75",
    receipt: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    plus: "M12 5v14 M5 12h14",
    trash: "M3 6h18 M8 6V4h8v2 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    search: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
    x: "M18 6L6 18 M6 6l12 12",
    alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0-3.42 0z M12 9v4 M12 17h.01",
    calendar: "M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18",
    trending: "M23 6l-9.5 9.5-5-5L1 18",
    wallet: "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
    lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
    refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    eyeoff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94 M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19 M1 1l22 22",
  };
  const d = icons[name] || "";
  const parts = d.split(" M ").map((p, i) => i === 0 ? p : "M " + p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {parts.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
};

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = { Occupied: "bg-emerald-100 text-emerald-700 border border-emerald-200", Vacant: "bg-amber-100 text-amber-700 border border-amber-200", Reserved: "bg-blue-100 text-blue-700 border border-blue-200", "Under Maintenance": "bg-red-100 text-red-700 border border-red-200" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-600"}`}>{status}</span>;
};
const AppModal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
        <h2 className="font-bold text-slate-800 text-base">{title}</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><Icon name="x" size={18} /></button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);
const Card = ({ children, className = "" }) => <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>{children}</div>;
const StatCard = ({ label, value, icon, color, sub }) => {
  const tints = {
    indigo:  { bg: "bg-gradient-to-br from-white to-indigo-50",  border: "border-indigo-100", chip: "bg-indigo-100 text-indigo-600" },
    emerald: { bg: "bg-gradient-to-br from-white to-emerald-50", border: "border-emerald-100", chip: "bg-emerald-100 text-emerald-700" },
    rose:    { bg: "bg-gradient-to-br from-white to-rose-50",    border: "border-rose-100", chip: "bg-rose-100 text-rose-600" },
    blue:    { bg: "bg-gradient-to-br from-white to-blue-50",    border: "border-blue-100", chip: "bg-blue-100 text-blue-600" },
  };
  const t = tints[color] || tints.indigo;
  return (
    <div className={`rounded-[18px] p-3.5 border shadow-sm ${t.bg} ${t.border}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${t.chip}`}><Icon name={icon} size={17} /></div>
      <p className="text-xs text-slate-500 font-medium mt-2.5">{label}</p>
      <p className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight truncate">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{sub}</p>}
    </div>
  );
};
const Field = ({ label, children }) => (
  <div className="mb-3">
    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);
const Input = (props) => <input {...props} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50" />;
const AppSelect = ({ children, ...props }) => <select {...props} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50">{children}</select>;
const Textarea = (props) => <textarea {...props} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 min-h-[80px]" />;
const OwnerWatermark = () => <p className="text-xs text-slate-200 font-semibold tracking-widest text-right mt-1 mb-3 uppercase select-none">EULA RentalPMS</p>;

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "", gcashRef: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(""); };

  const handleSignIn = async () => {
    if (!form.email || !form.password) return setError("Please fill in all fields.");
    setLoading(true);
    try {
      const { data, ok } = await api("app_users", "GET", null, `?email=eq.${encodeURIComponent(form.email.toLowerCase())}&select=*`);
      if (!ok || !data || data.length === 0) { setError("No account found with that email."); return; }
      const user = data[0];
      if (user.password !== form.password) { setError("Incorrect password."); return; }
      const userData = { id: user.id, name: user.name, email: user.email, inviteCode: user.invite_code };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      onLogin(userData);
    } catch { setError("Connection error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleSignUp = async () => {
    if (!form.name || !form.email || !form.password || !form.code) return setError("Please fill in all fields.");
    if (!form.gcashRef.trim()) return setError("Please enter your GCash reference number.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const { data: codes, ok: cok } = await api("invite_codes", "GET", null, `?code=eq.${encodeURIComponent(form.code.toUpperCase())}&select=*`);
      if (!cok || !codes || codes.length === 0) { setError("Invalid invite code."); return; }
      if (codes[0].used_by) { setError("This invite code has already been used."); return; }
      const { data: existing } = await api("app_users", "GET", null, `?email=eq.${encodeURIComponent(form.email.toLowerCase())}&select=id`);
      if (existing && existing.length > 0) { setError("An account with this email already exists."); return; }
      const userId = uid("USR");
      const { ok } = await api("app_users", "POST", [{ id: userId, name: form.name, email: form.email.toLowerCase(), password: form.password, invite_code: form.code.toUpperCase(), gcash_ref: form.gcashRef.trim() }]);
      if (!ok) { setError("Something went wrong. Please try again."); return; }
      await api("invite_codes", "PATCH", { used_by: form.email.toLowerCase(), used_at: new Date().toISOString() }, `?code=eq.${encodeURIComponent(form.code.toUpperCase())}`);
      const userData = { id: userId, name: form.name, email: form.email.toLowerCase(), inviteCode: form.code.toUpperCase() };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      onLogin(userData);
    } catch { setError("Connection error. Please try again."); }
    finally { setLoading(false); }
  };

  const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5";
  const inputCls = "w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-colors";
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Indigo gradient band with curved bottom */}
      <div className="bg-gradient-to-b from-indigo-800 via-indigo-600 to-indigo-500 rounded-b-[38px] px-7 pt-16 pb-14 flex flex-col items-center text-white shadow-[0_22px_44px_-22px_rgba(67,56,202,0.6)]">
        {/* Hotel logo with translucent white background to read on indigo */}
        <svg width="62" height="62" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.16)"/>
          <rect x="13" y="10" width="14" height="22" fill="white" opacity="0.95"/>
          <rect x="6" y="16" width="8" height="16" fill="white" opacity="0.75"/>
          <rect x="26" y="16" width="8" height="16" fill="white" opacity="0.75"/>
          <polygon points="20,4 27,10 13,10" fill="white" opacity="0.9"/>
          <rect x="16" y="13" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>
          <rect x="21" y="13" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>
          <rect x="16" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>
          <rect x="21" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.7"/>
          <rect x="8" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>
          <rect x="8" y="25" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>
          <rect x="29" y="19" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>
          <rect x="29" y="25" width="3" height="3" rx="0.5" fill="#4338ca" opacity="0.5"/>
          <rect x="17.5" y="26" width="5" height="6" rx="2.5" fill="#4338ca" opacity="0.8"/>
          <line x1="20" y1="4" x2="20" y2="1" stroke="white" strokeWidth="1" opacity="0.8"/>
          <polygon points="20,1 23,2.5 20,4" fill="#fbbf24"/>
        </svg>
        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-3xl font-extrabold tracking-tight">{APP_NAME}</span>
          <span className="text-[13px] text-white/60 font-medium">—{APP_SUB}</span>
        </div>
        <p className="text-xs text-white/70 mt-2">Rental Property Management</p>
      </div>

      {/* Auth card — overlaps the band */}
      <div className="px-5 -mt-9 pb-8">
        <div className="bg-white rounded-[26px] shadow-2xl border border-slate-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button onClick={() => { setMode("signin"); setError(""); }} className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === "signin" ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-600/[0.04]" : "text-slate-400 hover:text-slate-600"}`}>Sign In</button>
            <button onClick={() => { setMode("signup"); setError(""); }} className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === "signup" ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-600/[0.04]" : "text-slate-400 hover:text-slate-600"}`}>Sign Up</button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-3.5">
            {mode === "signup" && (
              <div>
                <label className={labelCls}>Full Name</label>
                <div className="relative">
                  <Icon name="user" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" className={inputCls} />
                </div>
              </div>
            )}
            <div>
              <label className={labelCls}>Email</label>
              <div className="relative">
                <Icon name="user" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@email.com" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <Icon name="lock" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} onKeyDown={e => e.key === "Enter" && (mode === "signin" ? handleSignIn() : handleSignUp())} placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"} className={inputCls + " pr-11"} />
                <button onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><Icon name={showPw ? "eyeoff" : "eye"} size={16} /></button>
              </div>
            </div>
            {mode === "signup" && (
              <>
                {/* ── STEP 1: PAY VIA GCASH ── */}
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-black">G</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">Step 1 — Pay via GCash</p>
                      <p className="text-[11px] text-slate-500">Send payment to get your invite code</p>
                    </div>
                  </div>

                  {/* GCash number */}
                  <div className="bg-white rounded-xl p-3 border border-blue-100 flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">GCash Number</p>
                      <p className="text-[17px] font-extrabold text-slate-800 tracking-tight mt-0.5">0905 405 8556</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Yoly G. · EULA RentalPMS</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Amount</p>
                      <p className="text-[17px] font-extrabold text-blue-600 tracking-tight mt-0.5">₱1999</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">one-time</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    After sending payment, screenshot your GCash confirmation. You will receive your invite code via SMS or chat. Then proceed to Step 2 and 3 below.
                  </p>
                </div>

                {/* ── STEP 2: GCASH REFERENCE NUMBER ── */}
                <div>
                  <label className={labelCls}>Step 2 — GCash Reference No.</label>
                  <div className="relative">
                    <Icon name="receipt" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.gcashRef}
                      onChange={e => set("gcashRef", e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 1234567890123"
                      maxLength={20}
                      className={inputCls + " font-mono tracking-wider"}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Found in your GCash app under Send Money → Transaction Details.</p>
                </div>

                {/* ── STEP 3: INVITE CODE ── */}
                <div>
                  <label className={labelCls}>Step 3 — Invite Code</label>
                  <div className="relative">
                    <Icon name="key" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="PROP-XXXX-YOLY" className={inputCls + " font-mono tracking-widest"} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Sent to you by Yoly after payment is verified.</p>
                </div>
              </>
            )}
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl px-3.5 py-3 flex items-center gap-2">
                <Icon name="alert" size={14} className="text-rose-600 flex-shrink-0" />
                <p className="text-xs text-rose-700 font-semibold">{error}</p>
              </div>
            )}
            <button
              onClick={mode === "signin" ? handleSignIn : handleSignUp}
              disabled={loading}
              className="w-full bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-2xl py-3.5 text-sm font-bold hover:from-indigo-700 hover:to-indigo-600 transition-all disabled:opacity-60 mt-1 shadow-[0_10px_22px_-10px_rgba(67,56,202,0.7)] active:scale-[0.98]"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
            {mode === "signin" && (
              <div className="text-center pt-1">
                <span className="text-[13px] text-indigo-600 font-semibold">Forgot password?</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">EULA RentalPMS · Private access only</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch {}
    setAuthChecked(true);
  }, []);

  const handleLogout = () => { sessionStorage.removeItem(SESSION_KEY); setCurrentUser(null); };

  if (!authChecked) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse"><HotelLogo size={56} /></div>
    </div>
  );

  if (!currentUser) return <AuthScreen onLogin={setCurrentUser} />;
  return <MainApp currentUser={currentUser} onLogout={handleLogout} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER BY UNIT MODAL — standalone component so hooks work correctly
// ═══════════════════════════════════════════════════════════════════════════════
function LedgerByUnitModal({ onClose, properties, tenants, charges, payments }) {
  const [lUnit,     setLUnit]     = useState("all");
  const [lDateFrom, setLDateFrom] = useState(() => today().slice(0, 7) + "-01");
  const [lDateTo,   setLDateTo]   = useState(() => today());

  const filteredTenants = lUnit === "all" ? tenants : tenants.filter(t => t.propertyId === lUnit);
  const previewCharged  = filteredTenants.reduce((s, t) =>
    s + charges.filter(c => c.tenantId === t.id && c.date >= lDateFrom && c.date <= lDateTo).reduce((a, c) => a + Number(c.amount), 0), 0);
  const previewPaid     = filteredTenants.reduce((s, t) =>
    s + payments.filter(p => p.tenantId === t.id && p.date >= lDateFrom && p.date <= lDateTo).reduce((a, p) => a + Number(p.amount), 0), 0);

  const buildRangeLedgerHtml = () => {
    if (filteredTenants.length === 0) return null;
    const propLabel = lUnit === "all" ? "All Units" : (properties.find(p => p.id === lUnit)?.name || "");
    const dateLabel = fmtDate(lDateFrom) + " — " + fmtDate(lDateTo);
    let body = "";
    let grandCharged = 0, grandPaid = 0;

    filteredTenants.forEach(t => {
      const prop        = properties.find(p => p.id === t.propertyId);
      const tCharges    = charges.filter(c  => c.tenantId === t.id && (c.date||"")  >= lDateFrom && (c.date||"")  <= lDateTo).sort((a, b) => (a.date||"").localeCompare(b.date||""));
      const tPayments   = payments.filter(p => p.tenantId === t.id && (p.date||"") >= lDateFrom && (p.date||"") <= lDateTo).sort((a, b) => (a.date||"").localeCompare(b.date||""));
      const prevCharges  = charges.filter(c  => c.tenantId === t.id && (c.date||"")  < lDateFrom);
      const prevPayments = payments.filter(p => p.tenantId === t.id && (p.date||"") < lDateFrom);
      const prevBal  = prevCharges.reduce((s, c) => s + Number(c.amount), 0) - prevPayments.reduce((s, p) => s + Number(p.amount), 0);
      const charged  = tCharges.reduce((s, c)  => s + Number(c.amount), 0);
      const paid     = tPayments.reduce((s, p) => s + Number(p.amount), 0);
      grandCharged  += charged;
      grandPaid     += paid;

      const entries = [
        ...(prevBal !== 0 ? [{ date: lDateFrom, desc: "Balance brought forward", debit: prevBal > 0 ? prevBal : 0, credit: prevBal < 0 ? Math.abs(prevBal) : 0, isBF: true }] : []),
        ...tCharges.map(c  => ({ date: c.date, desc: c.remarks || c.type, debit: Number(c.amount), credit: 0 })),
        ...tPayments.map(p => ({ date: p.date, desc: "Payment — " + p.method + (p.reference ? " " + p.reference : ""), debit: 0, credit: Number(p.amount) })),
      ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

      let runBal = prevBal;
      const rows = entries.map(e => {
        runBal += e.debit - e.credit;
        const fmt = n => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
        const dStr = e.date ? new Date(e.date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "";
        return "<tr" + (e.isBF ? ' style="background:#f8fafc;font-style:italic"' : "") + ">"
          + "<td>" + dStr + "</td>"
          + "<td>" + e.desc + "</td>"
          + "<td class='right' style='color:#dc2626'>" + (e.debit  ? fmt(e.debit)  : "—") + "</td>"
          + "<td class='right' style='color:#16a34a'>" + (e.credit ? fmt(e.credit) : "—") + "</td>"
          + "<td class='right bold' style='color:" + (runBal > 0 ? "#dc2626" : "#16a34a") + "'>" + fmt(runBal) + "</td>"
          + "</tr>";
      }).join("");

      const fmt = n => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
      const endBal = prevBal + charged - paid;
      body += "<h3 style='margin:20px 0 6px;font-size:13px;color:#1e293b'>"
        + t.name + " &mdash; " + (prop ? prop.name : "&mdash;") + "</h3>"
        + "<table><thead><tr><th>Date</th><th>Description</th><th class='right'>Charges</th><th class='right'>Payments</th><th class='right'>Balance</th></tr></thead>"
        + "<tbody>" + (rows || "<tr><td colspan='5' style='color:#94a3b8;text-align:center'>No transactions in this range</td></tr>") + "</tbody>"
        + "<tr class='total-row'><td colspan='2'>Totals for period</td>"
        + "<td class='right'>" + fmt(charged) + "</td>"
        + "<td class='right'>" + fmt(paid) + "</td>"
        + "<td class='right' style='color:" + (endBal > 0 ? "#dc2626" : "#16a34a") + "'>" + fmt(endBal) + "</td>"
        + "</tr></table>";
    });

    const fmt = n => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
    const summary = "<div style='margin-top:24px;padding:14px;background:#f8fafc;border-radius:8px;display:flex;gap:32px'>"
      + "<div><div style='font-size:11px;color:#64748b'>Total Charged</div><div style='font-size:16px;font-weight:800;color:#dc2626'>" + fmt(grandCharged) + "</div></div>"
      + "<div><div style='font-size:11px;color:#64748b'>Total Collected</div><div style='font-size:16px;font-weight:800;color:#16a34a'>" + fmt(grandPaid) + "</div></div>"
      + "<div><div style='font-size:11px;color:#64748b'>Net Outstanding</div><div style='font-size:16px;font-weight:800;color:#4338ca'>" + fmt(grandCharged - grandPaid) + "</div></div>"
      + "</div>";

    const title    = propLabel + " Ledger " + dateLabel;
    const html     = PRINT_HEADER(title, "Generated: " + new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })) + body + summary;
    const filename = "Ledger-" + (lUnit === "all" ? "All" : lUnit) + "-" + lDateFrom + "-to-" + lDateTo;
    return { html, title, filename };
  };

  const handlePrint = () => {
    const r = buildRangeLedgerHtml();
    if (r) { printHTML(r.html, r.title); onClose(); }
    else alert("No tenants found for the selected filters.");
  };

  const handleDownload = () => {
    const r = buildRangeLedgerHtml();
    if (r) { downloadHTML(r.html, r.filename); onClose(); }
    else alert("No tenants found for the selected filters.");
  };

  return (
    <AppModal title="Ledger by Unit" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Select Unit">
          <AppSelect value={lUnit} onChange={e => setLUnit(e.target.value)}>
            <option value="all">All Units</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </AppSelect>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date From">
            <Input type="date" value={lDateFrom} onChange={e => setLDateFrom(e.target.value)} />
          </Field>
          <Field label="Date To">
            <Input type="date" value={lDateTo} onChange={e => setLDateTo(e.target.value)} />
          </Field>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-xs text-slate-400">Tenants</p><p className="text-sm font-bold text-slate-700">{filteredTenants.length}</p></div>
          <div><p className="text-xs text-slate-400">Charged</p><p className="text-sm font-bold text-rose-600">{fmtCurrency(previewCharged)}</p></div>
          <div><p className="text-xs text-slate-400">Collected</p><p className="text-sm font-bold text-emerald-600">{fmtCurrency(previewPaid)}</p></div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-indigo-700">
            <Icon name="receipt" size={15} /> Print
          </button>
          <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 border-2 border-emerald-200 text-emerald-700 rounded-xl py-3 text-sm font-bold hover:bg-emerald-50">
            <Icon name="download" size={15} /> Download
          </button>
        </div>
      </div>
    </AppModal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
function MainApp({ currentUser, onLogout }) {
  const userId = currentUser.id;
  const userQ  = `&user_id=eq.${userId}`;  // filter all queries by this user

  const [tab, setTab] = useState("dashboard");
  const [properties, setProperties] = useState([]);
  const [tenants,    setTenants]    = useState([]);
  const [charges,    setCharges]    = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [syncing,    setSyncing]    = useState(false);
  const [modal,      setModal]      = useState(null);
  const closeModal = () => setModal(null);

  const [payForm, setPayForm] = useState({ tenantId: "", date: today(), amount: "", method: "Cash", reference: "", notes: "" });
  const [tForm,   setTForm]   = useState({});
  const [pForm,   setPForm]   = useState({});
  const [cForm,   setCForm]   = useState({ tenantId: "", period: today().slice(0, 7), type: "Rent", amount: "", date: today(), remarks: "" });
  const [resetPwd,   setResetPwd]   = useState("");
  const [resetErr,   setResetErr]   = useState(false);
  const [soaModal,   setSoaModal]   = useState(null); // { tenant }
  const [soaPeriod,  setSoaPeriod]  = useState(today().slice(0, 7));

  // ── LOAD (only this user's data) ──
  const loadAll = async () => {
    setLoading(true);
    try {
      const [pr, tr, cr, pmr] = await Promise.all([
        api("properties", "GET", null, `?select=*&user_id=eq.${userId}&order=id`),
        api("tenants",    "GET", null, `?select=*&user_id=eq.${userId}&order=id`),
        api("charges",    "GET", null, `?select=*&user_id=eq.${userId}&order=date.desc`),
        api("payments",   "GET", null, `?select=*&user_id=eq.${userId}&order=date.desc`),
      ]);
      if (pr.data)  setProperties(pr.data.map(mapProperty));
      if (tr.data)  setTenants(tr.data.map(mapTenant));
      if (cr.data)  setCharges(cr.data.map(mapCharge));
      if (pmr.data) setPayments(pmr.data.map(mapPayment));
    } catch (err) { console.error("loadAll error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // ── SAVE PAYMENT ──
  const savePayment = async () => {
    if (!payForm.tenantId || !payForm.amount) return alert("Fill required fields");
    const p = { id: uid("PMT"), ...payForm, amount: parseFloat(payForm.amount) };
    setSyncing(true);
    await api("payments", "POST", [toDBPayment(p, userId)]);
    setPayments(prev => [p, ...prev]);
    setPayForm({ tenantId: "", date: today(), amount: "", method: "Cash", reference: "", notes: "" });
    setSyncing(false); closeModal();
  };

  // ── SAVE TENANT ──
  const saveTenant = async () => {
    if (!tForm.name || !tForm.propertyId) return alert("Fill required fields");
    setSyncing(true);
    if (tForm.id) {
      await api("tenants", "PATCH", toDBTenant(tForm, userId), `?id=eq.${tForm.id}${userQ}`);
      setTenants(prev => prev.map(t => t.id === tForm.id ? tForm : t));
    } else {
      const t = { id: uid("T"), monthlyRent: 0, dues: 0, parking: 0, deposit: 0, advance: 0, ...tForm };
      await api("tenants", "POST", [toDBTenant(t, userId)]);
      await api("properties", "PATCH", { status: "Occupied" }, `?id=eq.${t.propertyId}${userQ}`);
      setTenants(prev => [t, ...prev]);
      setProperties(prev => prev.map(p => p.id === t.propertyId ? { ...p, status: "Occupied" } : p));
    }
    setSyncing(false); closeModal();
  };

  // ── SAVE PROPERTY ──
  const saveProperty = async () => {
    if (!pForm.name || !pForm.unit) return alert("Fill required fields");
    setSyncing(true);
    if (pForm.id) {
      await api("properties", "PATCH", toDBProperty(pForm, userId), `?id=eq.${pForm.id}${userQ}`);
      setProperties(prev => prev.map(p => p.id === pForm.id ? pForm : p));
    } else {
      const prop = { id: uid("P"), status: "Vacant", ...pForm };
      await api("properties", "POST", [toDBProperty(prop, userId)]);
      setProperties(prev => [prop, ...prev]);
    }
    setSyncing(false); closeModal();
  };

  // ── SAVE CHARGE ──
  const saveCharge = async () => {
    if (!cForm.tenantId || !cForm.amount) return alert("Fill required fields");
    const c = { id: uid("C"), ...cForm, amount: parseFloat(cForm.amount) };
    setSyncing(true);
    await api("charges", "POST", [toDBCharge(c, userId)]);
    setCharges(prev => [c, ...prev]);
    setCForm({ tenantId: "", period: today().slice(0, 7), type: "Rent", amount: "", date: today(), remarks: "" });
    setSyncing(false); closeModal();
  };

  // ── GENERATE BILLING ──
  const generateMonthlyBilling = async (period) => {
    const existing = charges.filter(c => c.period === period);
    const newC = [];
    tenants.forEach(t => {
      const prop = properties.find(p => p.id === t.propertyId);
      if (!prop || prop.status !== "Occupied") return;
      if (existing.find(c => c.tenantId === t.id && c.type === "Rent")) return;
      if (t.monthlyRent > 0) newC.push({ id: uid("C"), tenantId: t.id, period, type: "Rent",    amount: t.monthlyRent, date: period + "-01", remarks: `${period} Monthly Rent` });
      if (t.dues > 0)        newC.push({ id: uid("C"), tenantId: t.id, period, type: "Dues",    amount: t.dues,        date: period + "-01", remarks: `${period} Association Dues` });
      if (t.parking > 0)     newC.push({ id: uid("C"), tenantId: t.id, period, type: "Parking", amount: t.parking,     date: period + "-01", remarks: `${period} Parking Fee` });
    });
    if (newC.length === 0) return alert("Billing already generated or no occupied units.");
    setSyncing(true);
    await api("charges", "POST", newC.map(c => toDBCharge(c, userId)));
    setCharges(prev => [...prev, ...newC]);
    setSyncing(false);
    alert(`Generated ${newC.length} charge records for ${period}.`);
  };

  // ── RESET — password is user's own invite code ──
  const handleReset = async () => {
    if (resetPwd.toUpperCase() !== (currentUser.inviteCode || "").toUpperCase()) {
      setResetErr(true); setResetPwd(""); return;
    }
    setSyncing(true);
    await api("payments",   "DELETE", null, `?user_id=eq.${userId}`);
    await api("charges",    "DELETE", null, `?user_id=eq.${userId}`);
    await api("tenants",    "DELETE", null, `?user_id=eq.${userId}`);
    await api("properties", "DELETE", null, `?user_id=eq.${userId}`);
    setProperties([]); setTenants([]); setCharges([]); setPayments([]);
    setResetPwd(""); setResetErr(false); setSyncing(false); closeModal();
  };

  // ── PRINT ──
    const printSOA = (tenant) => { printHTML(buildSOAHtml(tenant), "SOA — " + tenant.name); };
  // ── MONTHLY SOA ──
  const buildMonthlySoaHtml = (tenant, period) => {
    const prop = properties.find(p => p.id === tenant.propertyId);
    const currentCharges = charges.filter(c => c.tenantId === tenant.id && c.period === period).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const currentTotal   = currentCharges.reduce((s, c) => s + Number(c.amount), 0);
    const currentPayments = payments.filter(p => p.tenantId === tenant.id && (p.date || "").slice(0, 7) === period).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const currentPaid    = currentPayments.reduce((s, p) => s + Number(p.amount), 0);
    const prevCharges    = charges.filter(c => c.tenantId === tenant.id && (c.period || "") < period);
    const prevPayments   = payments.filter(p => p.tenantId === tenant.id && (p.date || "").slice(0, 7) < period);
    const prevBalance    = prevCharges.reduce((s, c) => s + Number(c.amount), 0) - prevPayments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining      = currentTotal + prevBalance - currentPaid;
    const [year, mon]    = period.split("-");
    const monthName      = new Date(Number(year), Number(mon) - 1, 1).toLocaleString("en-PH", { month: "long", year: "numeric" });
    const chargeRows = currentCharges.map(ch => "<tr><td>" + fmtDate(ch.date) + "</td><td>" + (ch.remarks || ch.type) + "</td><td class='right'>" + fmtCurrency(ch.amount) + "</td></tr>").join("");
    const payRows    = currentPayments.map(p  => "<tr><td>" + fmtDate(p.date)  + "</td><td>Payment — " + p.method + (p.reference ? " " + p.reference : "") + "</td><td class='right' style='color:#065f46'>(" + fmtCurrency(p.amount) + ")</td></tr>").join("");
    let prevSection = "";
    if (prevBalance > 0) {
      prevSection = "<p style='font-weight:700;font-size:13px;margin-top:20px;margin-bottom:6px;color:#92400e'>Previous Unpaid Balance</p>"
        + "<table><thead><tr><th>Description</th><th class='right'>Amount</th></tr></thead><tbody>"
        + "<tr style='background:#fefce8'><td style='color:#92400e'>Unpaid balance from previous months (since " + fmtDate(tenant.leaseStart) + ")</td>"
        + "<td class='right bold' style='color:#92400e'>" + fmtCurrency(prevBalance) + "</td></tr></tbody></table>";
    } else if (prevBalance < 0) {
      prevSection = "<p style='font-weight:700;font-size:13px;margin-top:20px;margin-bottom:6px;color:#065f46'>Previous Credit Balance</p>"
        + "<table><thead><tr><th>Description</th><th class='right'>Amount</th></tr></thead><tbody>"
        + "<tr style='background:#f0fdf4'><td style='color:#065f46'>Credit from previous overpayments</td>"
        + "<td class='right bold' style='color:#065f46'>(" + fmtCurrency(Math.abs(prevBalance)) + ")</td></tr></tbody></table>";
    }
    const prevSummaryRow = prevBalance > 0
      ? "<tr><td style='padding:10px 14px;color:#92400e;font-weight:600'>Previous Unpaid Balance</td><td class='right bold' style='padding:10px 14px;color:#92400e'>+ " + fmtCurrency(prevBalance) + "</td></tr>"
      : prevBalance < 0
      ? "<tr><td style='padding:10px 14px;color:#065f46;font-weight:600'>Previous Credit</td><td class='right bold' style='padding:10px 14px;color:#065f46'>(" + fmtCurrency(Math.abs(prevBalance)) + ")</td></tr>"
      : "";
    const amountDueBg    = remaining > 0 ? "#fff7ed" : "#f0fdf4";
    const amountDueColor = remaining > 0 ? "#c2410c" : "#065f46";
    const chargeRowsFinal = chargeRows || "<tr><td colspan='3' style='color:#94a3b8;text-align:center'>No charges for this period</td></tr>";
    const payRowsFinal    = payRows    || "<tr><td colspan='3' style='color:#94a3b8;text-align:center'>No payments received this month</td></tr>";
    const html = PRINT_HEADER("Monthly Statement of Account &mdash; " + monthName, "Generated: " + fmtDate(today()))
      + "<table style='margin-bottom:20px;border:none'>"
      + "<tr><td style='border:none;padding:3px 0;width:50%'><b>Tenant:</b> " + tenant.name + "</td><td style='border:none;padding:3px 0'><b>Unit:</b> " + (prop ? prop.name : "—") + "</td></tr>"
      + "<tr><td style='border:none;padding:3px 0'><b>Phone:</b> " + (tenant.phone || "—") + "</td><td style='border:none;padding:3px 0'><b>Lease End:</b> " + fmtDate(tenant.leaseEnd) + "</td></tr>"
      + "</table>"
      + "<p style='font-weight:700;font-size:13px;margin-bottom:6px;color:#1e293b'>Current Month Charges &mdash; " + monthName + "</p>"
      + "<table><thead><tr><th>Date</th><th>Description</th><th class='right'>Amount</th></tr></thead>"
      + "<tbody>" + chargeRowsFinal + "</tbody>"
      + "<tr class='total-row'><td colspan='2'>Total Current Charges</td><td class='right'>" + fmtCurrency(currentTotal) + "</td></tr></table>"
      + prevSection
      + "<p style='font-weight:700;font-size:13px;margin-top:20px;margin-bottom:6px;color:#1e293b'>Payments Received &mdash; " + monthName + "</p>"
      + "<table><thead><tr><th>Date</th><th>Reference</th><th class='right'>Amount</th></tr></thead>"
      + "<tbody>" + payRowsFinal + "</tbody>"
      + "<tr class='total-row'><td colspan='2'>Total Payments This Month</td><td class='right' style='color:#065f46'>" + fmtCurrency(currentPaid) + "</td></tr></table>"
      + "<table style='margin-top:20px;border:2px solid #e2e8f0;border-radius:8px'>"
      + "<tr style='background:#f8fafc'><td style='padding:10px 14px;font-weight:700'>Current Month Charges</td><td class='right bold' style='padding:10px 14px'>" + fmtCurrency(currentTotal) + "</td></tr>"
      + prevSummaryRow
      + "<tr><td style='padding:10px 14px;color:#065f46;font-weight:600'>Less: Payments This Month</td><td class='right bold' style='padding:10px 14px;color:#065f46'>- " + fmtCurrency(currentPaid) + "</td></tr>"
      + "<tr style='background:" + amountDueBg + ";border-top:2px solid #e2e8f0'><td style='padding:12px 14px;font-size:15px;font-weight:800;color:" + amountDueColor + "'>AMOUNT DUE</td>"
      + "<td class='right' style='padding:12px 14px;font-size:18px;font-weight:800;color:" + amountDueColor + "'>" + fmtCurrency(remaining) + "</td></tr>"
      + "</table>"
      + "<p style='margin-top:28px;font-size:10px;color:#94a3b8;text-align:center'>Please pay on or before the due date. Thank you!</p>";
    return { html, filename: "Monthly-SOA-" + tenant.name.replace(/ /g, "-") + "-" + period };
  };

  const printMonthlySoa = (tenant, period) => {
    const result = buildMonthlySoaHtml(tenant, period);
    if (result) printHTML(result.html, "Monthly SOA — " + tenant.name);
  };

;

  // ── SOA HTML builder (reusable for print AND download) ──
  const buildSOAHtml = (tenant) => {
    const ledger = getLedger(tenant.id, charges, payments);
    const prop = properties.find(p => p.id === tenant.propertyId);
    const balance = getTenantBalance(tenant.id, charges, payments);
    const rows = ledger.map(e =>
      "<tr><td>" + fmtDate(e.date) + "</td><td>" + e.desc + "</td>"
      + "<td class='right'>" + (e.debit ? fmtCurrency(e.debit) : "—") + "</td>"
      + "<td class='right'>" + (e.credit ? fmtCurrency(e.credit) : "—") + "</td>"
      + "<td class='right bold'>" + fmtCurrency(e.balance) + "</td></tr>"
    ).join("");
    return PRINT_HEADER("Statement of Account", "Generated: " + fmtDate(today()))
      + "<table style='margin-bottom:16px;border:none'>"
      + "<tr><td style='border:none;padding:2px 0'><b>Tenant:</b> " + tenant.name + "</td><td style='border:none;padding:2px 0'><b>Unit:</b> " + (prop ? prop.name : "—") + "</td></tr>"
      + "<tr><td style='border:none;padding:2px 0'><b>Email:</b> " + (tenant.email||"—") + "</td><td style='border:none;padding:2px 0'><b>Lease End:</b> " + fmtDate(tenant.leaseEnd) + "</td></tr>"
      + "</table>"
      + "<table><thead><tr><th>Date</th><th>Description</th><th class='right'>Debit</th><th class='right'>Credit</th><th class='right'>Balance</th></tr></thead>"
      + "<tbody>" + (rows || "<tr><td colspan='5' style='color:#94a3b8;text-align:center'>No transactions</td></tr>") + "</tbody>"
      + "<tr class='total-row'><td colspan='3'></td><td class='right'>Outstanding:</td><td class='right'>" + fmtCurrency(balance) + "</td></tr></table>";
  };

  const printReceipt = (payment) => {
    const tenant = tenants.find(t => t.id === payment.tenantId);
    const prop = properties.find(p => p.id === tenant?.propertyId);
    const balance = getTenantBalance(payment.tenantId, charges, payments);
    const notesHtml = payment.notes ? '<p style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:12px"><b>Notes:</b> ' + payment.notes + '</p>' : '';
    const balClass = balance > 0 ? "red" : "green";
    const receiptBody = PRINT_HEADER("Official Receipt", "<b>OR#:</b> " + payment.id + "<br><span style='color:#64748b;font-size:11px'>" + fmtDate(payment.date) + "</span>")
      + '<table style="border:none">'
      + '<tr><td style="border:none;padding:4px 0;width:50%"><b>Received from:</b><br>' + (tenant?.name || "—") + '</td>'
      + '<td style="border:none;padding:4px 0"><b>Unit:</b><br>' + (prop?.name || "—") + '</td></tr>'
      + '<tr><td style="border:none;padding:4px 0"><b>Amount Paid:</b><br><span style="font-size:22px;font-weight:800;color:#4f46e5">' + fmtCurrency(payment.amount) + '</span></td>'
      + '<td style="border:none;padding:4px 0"><b>Method:</b><br>' + payment.method + '</td></tr>'
      + '<tr><td style="border:none;padding:4px 0"><b>Reference:</b><br>' + (payment.reference || "—") + '</td>'
      + '<td style="border:none;padding:4px 0"><b>Remaining Balance:</b><br><span class="bold ' + balClass + '">' + fmtCurrency(balance) + '</span></td></tr>'
      + '</table>' + notesHtml
      + '<p style="margin-top:32px;font-size:10px;color:#94a3b8;text-align:center">This is an official receipt. Thank you for your payment.</p>';
    printHTML(receiptBody, "Receipt — " + payment.id);
  };
  const printIncomeReport = () => {
    const byMonth = {};
    payments.forEach(p => { const m = p.date?.slice(0, 7); if (m) byMonth[m] = (byMonth[m] || 0) + Number(p.amount); });
    const months = Object.keys(byMonth).sort().reverse();
    const rows = months.map(m => `<tr><td>${m}</td><td class="right">${fmtCurrency(byMonth[m])}</td></tr>`).join("");
    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    const incomeHtml = PRINT_HEADER("Monthly Income Report", "As of " + fmtDate(today()))
      + '<table><thead><tr><th>Period</th><th class="right">Collected</th></tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '<tr class="total-row"><td>Total</td><td class="right">' + fmtCurrency(total) + '</td></tr></table>';
    printHTML(incomeHtml, "Income Report");
  };

  // ── MONTHLY LEDGER (all tenants or single unit) ──
  const buildMonthlyLedgerHTML = (period, filteredTenants) => {
    const [yr, mo] = period.split("-");
    const monthLabel = new Date(Number(yr), Number(mo) - 1, 1).toLocaleString("en-PH", { month: "long", year: "numeric" });
    let body = "";
    let grandTotal = 0;
    let grandPaid = 0;

    filteredTenants.forEach(t => {
      const prop = properties.find(p => p.id === t.propertyId);
      const monthCharges  = charges.filter(c => c.tenantId === t.id && c.period === period).sort((a, b) => (a.date||"").localeCompare(b.date||""));
      const monthPayments = payments.filter(p => p.tenantId === t.id && (p.date||"").slice(0,7) === period).sort((a, b) => (a.date||"").localeCompare(b.date||""));
      const prevCharges   = charges.filter(c => c.tenantId === t.id && (c.period||"") < period);
      const prevPayments  = payments.filter(p => p.tenantId === t.id && (p.date||"").slice(0,7) < period);
      const prevBal = prevCharges.reduce((s,c)=>s+Number(c.amount),0) - prevPayments.reduce((s,p)=>s+Number(p.amount),0);
      const charged = monthCharges.reduce((s,c)=>s+Number(c.amount),0);
      const paid    = monthPayments.reduce((s,p)=>s+Number(p.amount),0);
      const balance = prevBal + charged - paid;
      grandTotal += charged; grandPaid += paid;

      const entryRows = [
        ...(prevBal !== 0 ? [{ date: period+"-01", desc: "Balance brought forward", debit: prevBal > 0 ? prevBal : 0, credit: prevBal < 0 ? Math.abs(prevBal) : 0, isBF: true }] : []),
        ...monthCharges.map(c => ({ date: c.date, desc: c.remarks || c.type, debit: Number(c.amount), credit: 0 })),
        ...monthPayments.map(p => ({ date: p.date, desc: "Payment — " + p.method + (p.reference ? " " + p.reference : ""), debit: 0, credit: Number(p.amount) })),
      ].sort((a, b) => (a.date||"").localeCompare(b.date||""));

      let runBal = prevBal;
      const rows = entryRows.map(e => {
        runBal += e.debit - e.credit;
        return "<tr" + (e.isBF ? ' style="background:#f8fafc;font-style:italic"' : "") + ">"
          + "<td>" + (e.date ? new Date(e.date).toLocaleDateString("en-PH",{month:"short",day:"numeric"}) : "") + "</td>"
          + "<td>" + e.desc + "</td>"
          + "<td class='right' style='color:#dc2626'>" + (e.debit ? "₱" + Number(e.debit).toLocaleString("en-PH",{minimumFractionDigits:2}) : "—") + "</td>"
          + "<td class='right' style='color:#16a34a'>" + (e.credit ? "₱" + Number(e.credit).toLocaleString("en-PH",{minimumFractionDigits:2}) : "—") + "</td>"
          + "<td class='right bold' style='color:" + (runBal > 0 ? "#dc2626" : "#16a34a") + "'>₱" + Number(runBal).toLocaleString("en-PH",{minimumFractionDigits:2}) + "</td>"
          + "</tr>";
      }).join("");

      body += "<h3 style='margin:20px 0 6px;font-size:13px;color:#1e293b'>"
        + t.name + " &mdash; " + (prop ? prop.name : "—")
        + "</h3>"
        + "<table><thead><tr><th>Date</th><th>Description</th><th class='right'>Charges</th><th class='right'>Payments</th><th class='right'>Balance</th></tr></thead>"
        + "<tbody>" + (rows || "<tr><td colspan='5' style='color:#94a3b8;text-align:center'>No transactions this month</td></tr>") + "</tbody>"
        + "<tr class='total-row'>"
        + "<td colspan='2'>Totals</td>"
        + "<td class='right'>₱" + Number(charged).toLocaleString("en-PH",{minimumFractionDigits:2}) + "</td>"
        + "<td class='right'>₱" + Number(paid).toLocaleString("en-PH",{minimumFractionDigits:2}) + "</td>"
        + "<td class='right' style='color:" + (balance>0?"#dc2626":"#16a34a") + "'>₱" + Number(balance).toLocaleString("en-PH",{minimumFractionDigits:2}) + "</td>"
        + "</tr></table>";
    });

    return { body, grandTotal, grandPaid, monthLabel };
  };

  const printMonthlyLedger = (period, filterPropertyId) => {
    const filtered = filterPropertyId
      ? tenants.filter(t => t.propertyId === filterPropertyId)
      : tenants;
    if (filtered.length === 0) return alert("No tenants found.");
    const prop = filterPropertyId ? properties.find(p => p.id === filterPropertyId) : null;
    const { body, grandTotal, grandPaid, monthLabel } = buildMonthlyLedgerHTML(period, filtered);
    const title = (prop ? prop.name + " — " : "All Units — ") + "Monthly Ledger " + monthLabel;
    const summary = "<div style='margin-top:24px;padding:14px;background:#f8fafc;border-radius:8px;display:flex;gap:32px'>"
      + "<div><div style='font-size:11px;color:#64748b'>Total Charged</div><div style='font-size:16px;font-weight:800;color:#dc2626'>₱" + Number(grandTotal).toLocaleString("en-PH",{minimumFractionDigits:2}) + "</div></div>"
      + "<div><div style='font-size:11px;color:#64748b'>Total Collected</div><div style='font-size:16px;font-weight:800;color:#16a34a'>₱" + Number(grandPaid).toLocaleString("en-PH",{minimumFractionDigits:2}) + "</div></div>"
      + "<div><div style='font-size:11px;color:#64748b'>Net Outstanding</div><div style='font-size:16px;font-weight:800;color:#4338ca'>₱" + Number(grandTotal - grandPaid).toLocaleString("en-PH",{minimumFractionDigits:2}) + "</div></div>"
      + "</div>";
    const html = PRINT_HEADER(title, "As of " + new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})) + body + summary;
    return { html, title };
  };

  const SyncBar = () => syncing ? <div className="fixed top-14 left-0 right-0 z-50 bg-indigo-600 text-white text-xs font-semibold text-center py-1.5">Saving…</div> : null;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="animate-pulse"><HotelLogo size={56} /></div>
      <div className="flex items-baseline gap-1.5"><span className="font-black text-slate-700 text-xl">{APP_NAME}</span><span className="text-slate-300 text-xs">—{APP_SUB}</span></div>
      <p className="text-sm text-slate-400">Loading your data…</p>
    </div>
  );

  // ── VIEWS ──
  const DashboardView = () => {
    const occupied = properties.filter(p => p.status === "Occupied").length;
    const vacant   = properties.filter(p => p.status === "Vacant").length;
    const monthlyRev  = tenants.reduce((s, t) => s + Number(t.monthlyRent) + Number(t.dues) + Number(t.parking), 0);
    const outstanding = tenants.reduce((s, t) => s + Math.max(0, getTenantBalance(t.id, charges, payments)), 0);
    const recentPay   = [...payments].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
    const expiringLeases = tenants.filter(t => { const d = (new Date(t.leaseEnd) - new Date()) / 86400000; return d > 0 && d < 90; });
    return (
      <div className="space-y-4">
        {/* PREMIUM HERO — gradient card with revenue front and center */}
        <div className="relative rounded-3xl p-5 text-white shadow-[0_16px_30px_-12px_rgba(67,56,202,0.55)] bg-gradient-to-br from-indigo-800 via-indigo-600 to-indigo-500 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Hotel logo on translucent bg */}
              <div className="w-8 h-8 rounded-xl bg-white/[0.16] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                  <rect x="13" y="10" width="14" height="22" fill="white" opacity="0.95"/>
                  <rect x="6" y="16" width="8" height="16" fill="white" opacity="0.75"/>
                  <rect x="26" y="16" width="8" height="16" fill="white" opacity="0.75"/>
                  <polygon points="20,4 27,10 13,10" fill="white" opacity="0.9"/>
                  <rect x="17.5" y="26" width="5" height="6" rx="2.5" fill="#4338ca" opacity="0.85"/>
                  <line x1="20" y1="4" x2="20" y2="1" stroke="white" strokeWidth="1.2" opacity="0.8"/>
                  <polygon points="20,1 23,2.5 20,4" fill="#fbbf24"/>
                </svg>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold tracking-tight">{APP_NAME}</span>
                <span className="text-[11px] text-white/60 font-medium">—{APP_SUB}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/[0.18] flex items-center justify-center text-sm font-bold">
              {(currentUser.name || "?").charAt(0).toUpperCase()}
            </div>
          </div>
          <p className="text-sm text-white/80 mt-4">Good day, {currentUser.name.split(" ")[0]}</p>
          <p className="text-xs text-white/55 font-medium mt-2.5">Monthly revenue</p>
          <p className="text-[34px] font-extrabold tracking-tight leading-none mt-0.5">{fmtCurrency(monthlyRev).split(".")[0]}<span className="text-[17px] text-white/55">.{(fmtCurrency(monthlyRev).split(".")[1] || "00")}</span></p>
          <div className="flex gap-2 mt-4">
            <span className="text-[11px] font-semibold bg-white/[0.18] px-2.5 py-1 rounded-full">{occupied} of {properties.length} occupied</span>
            <span className="text-[11px] font-semibold bg-white/[0.18] px-2.5 py-1 rounded-full">{monthlyRev > 0 ? Math.round((monthlyRev - outstanding) / monthlyRev * 100) : 0}% collected</span>
          </div>
        </div>

        {/* STAT CARDS — 2×2 grid with gradient tints + icon chips */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total units"     value={properties.length}                                  icon="building" color="indigo" />
          <StatCard label="Occupied"        value={<>{occupied} <span className="text-[13px] text-slate-400 font-semibold">/ {vacant} vacant</span></>} icon="users" color="emerald" />
          <StatCard label="Outstanding"     value={fmtCurrency(outstanding)}                           icon="alert"    color="rose" />
          <StatCard label="Collection rate" value={monthlyRev > 0 ? Math.round((monthlyRev - outstanding) / monthlyRev * 100) + "%" : "—"} icon="trending" color="blue" />
        </div>

        {/* QUICK ACTIONS — decluttered to 4 focused buttons */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Quick actions</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => setModal({ type: "payment" })} className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-2xl px-4 py-3 text-sm font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-[0_8px_18px_-10px_rgba(67,56,202,0.55)]"><Icon name="wallet" size={16} /> Record payment</button>
            <button onClick={() => setModal({ type: "charge" })}  className="flex items-center justify-center gap-2 bg-slate-900 text-white rounded-2xl px-4 py-3 text-sm font-bold hover:bg-slate-800 active:scale-[0.98] transition-all"><Icon name="plus" size={16} /> Add charge</button>
            <button onClick={() => { const p = prompt("Period (YYYY-MM):"); if (!p) return; const r = printMonthlyLedger(p, null); if (r) printHTML(r.html, r.title); }} className="flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 rounded-2xl px-4 py-3 text-sm font-bold hover:bg-slate-50 active:scale-[0.98] transition-all"><Icon name="list" size={16} /> Monthly ledger</button>
            <button onClick={() => setModal({ type: "ledgerByUnit" })} className="flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 rounded-2xl px-4 py-3 text-sm font-bold hover:bg-slate-50 active:scale-[0.98] transition-all"><Icon name="building" size={16} /> Ledger by unit</button>
          </div>
          {/* Secondary actions — small, muted, tucked under */}
          <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
            <button onClick={loadAll} className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold hover:text-slate-700"><Icon name="refresh" size={13} /> Refresh</button>
            <button onClick={() => { setResetPwd(""); setResetErr(false); setModal({ type: "reset" }); }} className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold hover:text-rose-600 ml-auto"><Icon name="trash" size={13} /> Reset data</button>
          </div>
        </div>

        {/* RECENT PAYMENTS — premium list with emerald amounts */}
        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100">
          <div className="p-4 pb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">Recent payments</p>
            <button onClick={() => setTab("payments")} className="text-xs text-indigo-600 font-bold">See all</button>
          </div>
          {recentPay.length === 0 && <p className="px-4 pb-4 text-sm text-slate-400 text-center">No payments yet.</p>}
          {recentPay.map((p, i) => { const t = tenants.find(t => t.id === p.tenantId); return (
            <div key={p.id} className={`flex items-center justify-between px-4 py-3 ${i < recentPay.length - 1 ? "border-b border-slate-100" : "pb-4"}`}>
              <div>
                <p className="text-sm font-bold text-slate-800">{t?.name || "—"}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmtDate(p.date)} · {p.method}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-emerald-600">+{fmtCurrency(p.amount)}</p>
                <button onClick={() => printReceipt(p)} className="text-[11px] text-indigo-500 font-semibold hover:underline mt-0.5">Receipt</button>
              </div>
            </div>
          ); })}
        </div>

        {/* EXPIRING LEASES — amber-tinted card */}
        {expiringLeases.length > 0 && (
          <div className="rounded-[20px] bg-gradient-to-br from-amber-50 to-white border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center"><Icon name="alert" size={14} /></div>
              <p className="text-sm font-bold text-slate-800">Expiring leases</p>
            </div>
            {expiringLeases.map((t, i) => { const days = Math.ceil((new Date(t.leaseEnd) - new Date()) / 86400000); return (
              <div key={t.id} className={`flex items-center justify-between py-2 ${i < expiringLeases.length - 1 ? "border-b border-amber-100" : ""}`}>
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Expires {fmtDate(t.leaseEnd)}</p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${days < 30 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{days}d left</span>
              </div>
            ); })}
          </div>
        )}
      </div>
    );
  };

  const TenantsView = () => {
    const [search, setSearch] = useState("");
    const [viewTenant, setViewTenant] = useState(null);
    const filtered = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || (t.email || "").toLowerCase().includes(search.toLowerCase()));
    if (viewTenant) {
      const t = viewTenant; const prop = properties.find(p => p.id === t.propertyId); const balance = getTenantBalance(t.id, charges, payments); const ledger = getLedger(t.id, charges, payments);
      return (
        <div className="space-y-4">
          <OwnerWatermark />
          <button onClick={() => setViewTenant(null)} className="text-sm text-indigo-600 font-semibold">← Back</button>
          <Card className="p-4">
            <div className="flex items-start justify-between mb-3"><div><h2 className="text-lg font-bold text-slate-800">{t.name}</h2><p className="text-sm text-slate-500">{prop?.name}</p></div><span className={`text-sm font-bold px-3 py-1 rounded-full ${balance > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{balance > 0 ? "Owes " : "Credit "}{fmtCurrency(Math.abs(balance))}</span></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-400">Phone</span><br /><span className="font-medium">{t.phone}</span></div>
              <div><span className="text-slate-400">Email</span><br /><span className="font-medium">{t.email}</span></div>
              <div><span className="text-slate-400">Lease Start</span><br /><span className="font-medium">{fmtDate(t.leaseStart)}</span></div>
              <div><span className="text-slate-400">Lease End</span><br /><span className="font-medium">{fmtDate(t.leaseEnd)}</span></div>
              <div><span className="text-slate-400">Monthly Rent</span><br /><span className="font-medium">{fmtCurrency(t.monthlyRent)}</span></div>
              <div><span className="text-slate-400">Deposit</span><br /><span className="font-medium">{fmtCurrency(t.deposit)}</span></div>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={() => printSOA(t)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold min-w-[100px]"><Icon name="receipt" size={14} /> Print SOA</button>
              <button onClick={() => downloadHTML(buildSOAHtml(t), "SOA-" + t.name.replace(/ /g,"-"))} className="flex-1 flex items-center justify-center gap-2 border-2 border-indigo-200 text-indigo-700 rounded-xl py-2.5 text-sm font-semibold min-w-[110px]"><Icon name="download" size={14} /> Download SOA</button>
              <button onClick={() => { setModal({ type: "payment" }); setPayForm(f => ({ ...f, tenantId: t.id })); }} className="flex-1 flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-semibold min-w-[100px]"><Icon name="wallet" size={14} /> Payment</button>
            </div>
          </Card>
          <Card>
            <div className="p-4 border-b border-slate-100"><p className="font-semibold text-slate-800 text-sm">Ledger</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50"><th className="text-left p-3 text-slate-500">Date</th><th className="text-left p-3 text-slate-500">Description</th><th className="text-right p-3 text-slate-500">Debit</th><th className="text-right p-3 text-slate-500">Credit</th><th className="text-right p-3 text-slate-500">Balance</th></tr></thead>
                <tbody>
                  {ledger.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-slate-400">No entries yet.</td></tr>}
                  {ledger.map((e, i) => (<tr key={i} className="border-t border-slate-50"><td className="p-3 text-slate-600">{fmtDate(e.date)}</td><td className="p-3 text-slate-800 font-medium">{e.desc}</td><td className="p-3 text-right text-rose-600">{e.debit ? fmtCurrency(e.debit) : "—"}</td><td className="p-3 text-right text-emerald-600">{e.credit ? fmtCurrency(e.credit) : "—"}</td><td className={`p-3 text-right font-bold ${e.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmtCurrency(e.balance)}</td></tr>))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      );
    }
    const owesCount = tenants.filter(t => getTenantBalance(t.id, charges, payments) > 0).length;
    return (
      <div className="space-y-4">
        <OwnerWatermark />
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Tenants</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{tenants.length} tenants{owesCount > 0 ? ` · ${owesCount} owes` : ""}</p>
          </div>
          <button onClick={() => { setTForm({}); setModal({ type: "tenant" }); }} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-[13px] px-3.5 py-2.5 text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-[0_8px_18px_-10px_rgba(67,56,202,0.55)]">
            <Icon name="plus" size={15} /> Add
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants…" className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Tenant cards — avatar tiles + semantic balance */}
        <div className="space-y-3">
          {tenants.length === 0 && (
            <div className="rounded-[20px] bg-white border border-dashed border-slate-200 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3"><Icon name="users" size={22} /></div>
              <p className="text-sm font-bold text-slate-700">No tenants yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your first tenant to start tracking rent and payments.</p>
            </div>
          )}
          {filtered.map(t => {
            const prop = properties.find(p => p.id === t.propertyId);
            const balance = getTenantBalance(t.id, charges, payments);
            const initials = (t.name || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
            const daysToLease = t.leaseEnd ? Math.ceil((new Date(t.leaseEnd) - new Date()) / 86400000) : null;
            const balColor   = balance > 0 ? "text-rose-600" : balance < 0 ? "text-emerald-600" : "text-slate-600";
            const balLabel   = balance > 0 ? "due" : balance < 0 ? "credit" : "settled";
            return (
              <div key={t.id} className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100">
                {/* Top row: avatar + name + balance */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-[15px] bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-800 truncate leading-tight">{t.name}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5 truncate">{prop?.name || "—"} · {t.phone || "—"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-extrabold ${balColor} tracking-tight`}>{fmtCurrency(Math.abs(balance))}</p>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{balLabel}</p>
                  </div>
                </div>

                {/* Meta row: lease end with icon */}
                {t.leaseEnd && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                    <Icon name="calendar" size={12} className="text-slate-400" />
                    <span>Lease ends {fmtDate(t.leaseEnd)}</span>
                    {daysToLease !== null && daysToLease > 0 && daysToLease < 365 && (
                      <span className="text-slate-400">· {daysToLease}d left</span>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-slate-100 mt-3 pt-3" />

                {/* Action row */}
                <div className="flex gap-2">
                  <button onClick={() => setViewTenant(t)} className="flex-1 text-[13px] text-indigo-700 font-bold bg-indigo-50 rounded-xl py-2 hover:bg-indigo-100 active:scale-[0.98] transition-all">View</button>
                  <button onClick={() => { setTForm({ ...t }); setModal({ type: "tenant" }); }} className="flex-1 text-[13px] text-slate-700 font-bold border border-slate-200 rounded-xl py-2 hover:bg-slate-50 active:scale-[0.98] transition-all">Edit</button>
                  <button onClick={() => printSOA(t)} className="flex-1 text-[13px] text-slate-700 font-bold border border-slate-200 rounded-xl py-2 hover:bg-slate-50 active:scale-[0.98] transition-all">SOA</button>
                  <button onClick={() => { setSoaModal({ tenant: t }); setSoaPeriod(today().slice(0, 7)); }} className="text-[13px] text-emerald-700 font-bold bg-emerald-50 rounded-xl py-2 px-3 hover:bg-emerald-100 active:scale-[0.98] transition-all whitespace-nowrap" style={{ flex: "1.4" }}>Monthly SOA</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const PropertiesView = () => {
    const [filter, setFilter] = useState("All");
    const filtered = filter === "All" ? properties : properties.filter(p => p.status === filter);
    const occupiedCount = properties.filter(p => p.status === "Occupied").length;
    return (
      <div className="space-y-4">
        <OwnerWatermark />
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Properties</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{properties.length} units · {occupiedCount} occupied</p>
          </div>
          <button onClick={() => { setPForm({}); setModal({ type: "property" }); }} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-[13px] px-3.5 py-2.5 text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-[0_8px_18px_-10px_rgba(67,56,202,0.55)]">
            <Icon name="plus" size={15} /> Add
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {["All","Occupied","Vacant","Reserved","Under Maintenance"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === s
                  ? "bg-indigo-600 text-white shadow-[0_6px_14px_-8px_rgba(67,56,202,0.7)]"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >{s}</button>
          ))}
        </div>

        {/* Property cards */}
        <div className="grid gap-3">
          {properties.length === 0 && (
            <div className="rounded-[20px] bg-white border border-dashed border-slate-200 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3"><Icon name="building" size={22} /></div>
              <p className="text-sm font-bold text-slate-700">No units yet</p>
              <p className="text-xs text-slate-400 mt-1">Add a unit to start tracking its tenants and rent.</p>
            </div>
          )}
          {filtered.map(p => {
            const tenant = tenants.find(t => t.propertyId === p.id);
            return (
              <div key={p.id} className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100">
                {/* Top row: icon + name + status */}
                <div className="flex items-start gap-3">
                  <div className="w-[42px] h-[42px] rounded-[13px] bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Icon name="building" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-800 leading-tight">{p.name}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">{p.building} · Unit {p.unit}{p.floor ? ` · ${p.floor} sqm` : ""}</p>
                    {p.parking && <p className="text-[11px] text-slate-400 mt-0.5">Parking: {p.parking}</p>}
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                {/* Tenant sub-block (occupied) */}
                {tenant && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mt-3">
                    <p className="text-[13px] font-bold text-slate-800">{tenant.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Lease ends {fmtDate(tenant.leaseEnd)} · <span className="text-slate-700 font-semibold">{fmtCurrency(tenant.monthlyRent)}/mo</span></p>
                  </div>
                )}

                {/* Vacant empty-state */}
                {!tenant && p.status === "Vacant" && (
                  <div className="border border-dashed border-amber-200 bg-amber-50 rounded-2xl p-3 mt-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><Icon name="plus" size={14} /></div>
                    <p className="text-xs text-amber-700 font-semibold leading-snug">No tenant assigned — add one to start billing</p>
                  </div>
                )}

                {/* Edit button */}
                <button onClick={() => { setPForm({ ...p }); setModal({ type: "property" }); }} className="mt-3 w-full text-[13px] text-slate-700 font-bold border border-slate-200 rounded-xl py-2 hover:bg-slate-50 active:scale-[0.98] transition-all">
                  Edit unit
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const PaymentsView = () => {
    const [search, setSearch] = useState("");
    const [editPay, setEditPay] = useState(null);
    const filtered = [...payments].sort((a, b) => (b.date || "").localeCompare(a.date || "")).filter(p => { const t = tenants.find(t => t.id === p.tenantId); return (t?.name || "").toLowerCase().includes(search.toLowerCase()) || (p.reference || "").toLowerCase().includes(search.toLowerCase()); });

    const updatePayment = async () => {
      if (!editPay.amount) return alert("Amount is required");
      setSyncing(true);
      await api("payments", "PATCH", toDBPayment(editPay, userId), `?id=eq.${editPay.id}&user_id=eq.${userId}`);
      setPayments(prev => prev.map(p => p.id === editPay.id ? editPay : p));
      setEditPay(null); setSyncing(false);
    };

    const deletePayment = async (p) => {
      if (!confirm(`Delete this payment of ${fmtCurrency(p.amount)}? This cannot be undone.`)) return;
      setSyncing(true);
      await api("payments", "DELETE", null, `?id=eq.${p.id}&user_id=eq.${userId}`);
      setPayments(prev => prev.filter(x => x.id !== p.id));
      setSyncing(false);
    };

    // Collected this current month
    const currentMonth = today().slice(0, 7);
    const monthPayments = payments.filter(p => (p.date || "").slice(0, 7) === currentMonth);
    const monthCollected = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
    const monthLabel = new Date().toLocaleString("en-PH", { month: "long" });

    return (
      <div className="space-y-4">
        <OwnerWatermark />
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Payments</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{payments.length} transactions</p>
          </div>
          <button onClick={() => setModal({ type: "payment" })} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-[13px] px-3.5 py-2.5 text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-[0_8px_18px_-10px_rgba(67,56,202,0.55)]">
            <Icon name="plus" size={15} /> Record
          </button>
        </div>

        {/* Premium summary strip — gradient with collected number front and center */}
        <div className="rounded-[18px] p-4 text-white bg-gradient-to-br from-indigo-800 to-indigo-500 shadow-[0_12px_26px_-14px_rgba(67,56,202,0.6)] flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/65">Collected in {monthLabel}</p>
            <p className="text-[26px] font-extrabold tracking-tight leading-tight mt-1">{fmtCurrency(monthCollected)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold leading-none">{monthPayments.length}</p>
            <p className="text-[11px] text-white/70 font-semibold mt-1">payments</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by tenant or reference…" className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Payment cards */}
        <div className="space-y-3">
          {payments.length === 0 && (
            <div className="rounded-[20px] bg-white border border-dashed border-slate-200 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3"><Icon name="wallet" size={22} /></div>
              <p className="text-sm font-bold text-slate-700">No payments yet</p>
              <p className="text-xs text-slate-400 mt-1">Record a payment to see it appear here.</p>
            </div>
          )}
          {filtered.map(p => {
            const t = tenants.find(t => t.id === p.tenantId);
            return (
              <div key={p.id} className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100">
                {/* Top row: wallet chip + tenant + amount */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-[15px] bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Icon name="wallet" size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-800 truncate leading-tight">{t?.name || "—"}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">{fmtDate(p.date)} · {p.method}</p>
                    {p.reference && <p className="text-[11px] text-slate-400 mt-0.5">Ref: <span className="text-slate-500 font-mono">{p.reference}</span></p>}
                    {p.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{p.notes}</p>}
                  </div>
                  <p className="text-lg font-extrabold text-emerald-600 tracking-tight flex-shrink-0">+{fmtCurrency(p.amount)}</p>
                </div>

                {/* Action row */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => printReceipt(p)} className="flex-1 text-[13px] text-indigo-700 font-bold bg-indigo-50 rounded-xl py-2 hover:bg-indigo-100 active:scale-[0.98] transition-all">Receipt</button>
                  <button onClick={() => setEditPay({ ...p })} className="flex-1 text-[13px] text-slate-700 font-bold border border-slate-200 rounded-xl py-2 hover:bg-slate-50 active:scale-[0.98] transition-all">Edit</button>
                  <button onClick={() => deletePayment(p)} className="flex-1 text-[13px] text-rose-600 font-bold border border-rose-200 rounded-xl py-2 hover:bg-rose-50 active:scale-[0.98] transition-all">Delete</button>
                </div>
              </div>
            );
          })}
        </div>

        {editPay && (
          <AppModal title="Edit Payment" onClose={() => setEditPay(null)}>
            <Field label="Tenant"><div className="text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl px-3 py-2.5">{tenants.find(t => t.id === editPay.tenantId)?.name || "—"}</div></Field>
            <Field label="Date *"><Input type="date" value={editPay.date || ""} onChange={e => setEditPay(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Amount *"><Input type="number" value={editPay.amount || ""} onChange={e => setEditPay(f => ({ ...f, amount: parseFloat(e.target.value) }))} /></Field>
            <Field label="Method"><AppSelect value={editPay.method || "Cash"} onChange={e => setEditPay(f => ({ ...f, method: e.target.value }))}>{["Cash","Bank Transfer","GCash","Maya","Cheque","Other"].map(m => <option key={m}>{m}</option>)}</AppSelect></Field>
            <Field label="Reference"><Input value={editPay.reference || ""} onChange={e => setEditPay(f => ({ ...f, reference: e.target.value }))} /></Field>
            <Field label="Notes"><Textarea value={editPay.notes || ""} onChange={e => setEditPay(f => ({ ...f, notes: e.target.value }))} /></Field>
            <button onClick={updatePayment} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold mt-2 hover:bg-indigo-700">Save Changes</button>
          </AppModal>
        )}
      </div>
    );
  };

  const ChargesView = () => {
    const [search, setSearch] = useState("");
    const [editCharge, setEditCharge] = useState(null);
    const filtered = [...charges].sort((a, b) => (b.date || "").localeCompare(a.date || "")).filter(c => { const t = tenants.find(t => t.id === c.tenantId); return (t?.name || "").toLowerCase().includes(search.toLowerCase()) || (c.type || "").toLowerCase().includes(search.toLowerCase()); });

    const updateCharge = async () => {
      if (!editCharge.amount) return alert("Amount is required");
      setSyncing(true);
      await api("charges", "PATCH", toDBCharge(editCharge, userId), `?id=eq.${editCharge.id}&user_id=eq.${userId}`);
      setCharges(prev => prev.map(c => c.id === editCharge.id ? editCharge : c));
      setEditCharge(null); setSyncing(false);
    };

    const deleteCharge = async (ch) => {
      if (!confirm(`Delete this ${ch.type} charge of ${fmtCurrency(ch.amount)}? This cannot be undone.`)) return;
      setSyncing(true);
      await api("charges", "DELETE", null, `?id=eq.${ch.id}&user_id=eq.${userId}`);
      setCharges(prev => prev.filter(x => x.id !== ch.id));
      setSyncing(false);
    };

    return (
      <div className="space-y-4">
        <OwnerWatermark />
        <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-800">Charges</h1><p className="text-sm text-slate-500">{charges.length} records</p></div><button onClick={() => setModal({ type: "charge" })} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Icon name="plus" size={16} /> Add</button></div>
        <div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" /></div>
        <div className="space-y-2">
          {charges.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No charges yet.</p>}
          {filtered.map(ch => { const t = tenants.find(t => t.id === ch.tenantId); return (
            <Card key={ch.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold text-slate-800 truncate">{t?.name || "—"}</p><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{ch.type}</span></div><p className="text-xs text-slate-500">{fmtDate(ch.date)} · {ch.period}</p><p className="text-xs text-slate-400 italic">{ch.remarks}</p></div>
                <p className="text-base font-bold text-rose-600 ml-2 flex-shrink-0">{fmtCurrency(ch.amount)}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditCharge({ ...ch })} className="flex-1 text-xs text-indigo-600 font-semibold border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50">Edit</button>
                <button onClick={() => deleteCharge(ch)} className="flex-1 text-xs text-rose-500 font-semibold border border-rose-200 rounded-lg py-1.5 hover:bg-rose-50">Delete</button>
              </div>
            </Card>
          ); })}
        </div>

        {editCharge && (
          <AppModal title="Edit Charge" onClose={() => setEditCharge(null)}>
            <Field label="Tenant"><div className="text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl px-3 py-2.5">{tenants.find(t => t.id === editCharge.tenantId)?.name || "—"}</div></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Period"><Input type="month" value={editCharge.period || ""} onChange={e => setEditCharge(f => ({ ...f, period: e.target.value }))} /></Field>
              <Field label="Date"><Input type="date" value={editCharge.date || ""} onChange={e => setEditCharge(f => ({ ...f, date: e.target.value }))} /></Field>
            </div>
            <Field label="Type"><AppSelect value={editCharge.type || "Rent"} onChange={e => setEditCharge(f => ({ ...f, type: e.target.value }))}>{["Rent","Dues","Parking","Utility","Penalty","Other"].map(t => <option key={t}>{t}</option>)}</AppSelect></Field>
            <Field label="Amount *"><Input type="number" value={editCharge.amount || ""} onChange={e => setEditCharge(f => ({ ...f, amount: parseFloat(e.target.value) }))} /></Field>
            <Field label="Remarks"><Input value={editCharge.remarks || ""} onChange={e => setEditCharge(f => ({ ...f, remarks: e.target.value }))} /></Field>
            <button onClick={updateCharge} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold mt-2 hover:bg-indigo-700">Save Changes</button>
          </AppModal>
        )}
      </div>
    );
  };

  const ReportsView = () => {
    const [incomeUnit,   setIncomeUnit]   = useState("all");
    const [ledgerPeriod, setLedgerPeriod] = useState(today().slice(0, 7));
    const [ledgerUnit,   setLedgerUnit]   = useState("all");

    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalBilled    = charges.reduce((s, c) => s + Number(c.amount), 0);
    const outstanding    = tenants.reduce((s, t) => s + Math.max(0, getTenantBalance(t.id, charges, payments)), 0);
    const byMethod = payments.reduce((acc, p) => { acc[p.method] = (acc[p.method] || 0) + Number(p.amount); return acc; }, {});

    // ── Outstanding HTML builder ──
    const buildOutstandingHtml = () => {
      const rows = tenants.map(t => {
        const b = getTenantBalance(t.id, charges, payments);
        const prop = properties.find(p => p.id === t.propertyId);
        return "<tr><td>" + t.name + "</td><td>" + (prop ? prop.name : "—") + "</td>"
          + "<td class='right bold " + (b > 0 ? "red" : "green") + "'>" + fmtCurrency(b) + "</td></tr>";
      }).join("");
      return PRINT_HEADER("Outstanding Balances Report", fmtDate(today()))
        + "<table><thead><tr><th>Tenant</th><th>Unit</th><th class='right'>Balance</th></tr></thead>"
        + "<tbody>" + rows + "</tbody>"
        + "<tr class='total-row'><td colspan='2'>Total Outstanding</td><td class='right'>" + fmtCurrency(outstanding) + "</td></tr></table>";
    };

    // ── Income Report HTML builder ──
    const buildIncomeHtml = () => {
      const filteredPayments = incomeUnit === "all"
        ? payments
        : payments.filter(p => { const t = tenants.find(t => t.id === p.tenantId); return t && t.propertyId === incomeUnit; });
      const byMonth = {};
      filteredPayments.forEach(p => { const m = (p.date||"").slice(0,7); if (m) byMonth[m] = (byMonth[m]||0) + Number(p.amount); });
      const months = Object.keys(byMonth).sort().reverse();
      const rows = months.map(m => "<tr><td>" + m + "</td><td class='right'>" + fmtCurrency(byMonth[m]) + "</td></tr>").join("");
      const total = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
      const unitLabel = incomeUnit === "all" ? "All Units" : (properties.find(p => p.id === incomeUnit)?.name || "");
      return PRINT_HEADER("Monthly Income Report &mdash; " + unitLabel, "As of " + fmtDate(today()))
        + "<table><thead><tr><th>Period</th><th class='right'>Collected</th></tr></thead>"
        + "<tbody>" + (rows || "<tr><td colspan='2' style='color:#94a3b8;text-align:center'>No payments found</td></tr>") + "</tbody>"
        + "<tr class='total-row'><td>Total</td><td class='right'>" + fmtCurrency(total) + "</td></tr></table>";
    };

    const PrintDownloadBtns = ({ buildHtml, filename, color = "indigo" }) => {
      const colors = { indigo: "text-indigo-600 border-indigo-200 hover:bg-indigo-50", emerald: "text-emerald-700 border-emerald-200 hover:bg-emerald-50", rose: "text-rose-600 border-rose-200 hover:bg-rose-50", amber: "text-amber-700 border-amber-200 hover:bg-amber-50" };
      return (
        <div className="flex gap-2 mt-2">
          <button onClick={() => printHTML(buildHtml(), filename)} className={"flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-semibold " + colors[color]}>
            <Icon name="receipt" size={13} /> Print
          </button>
          <button onClick={() => downloadHTML(buildHtml(), filename)} className={"flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-semibold " + colors[color]}>
            <Icon name="download" size={13} /> Download
          </button>
        </div>
      );
    };

    // 6-month revenue trend for chart
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k = d.toISOString().slice(0, 7);
      const lbl = d.toLocaleString("en-PH", { month: "short" });
      const sum = payments.filter(p => (p.date || "").slice(0, 7) === k).reduce((s, p) => s + Number(p.amount), 0);
      last6Months.push({ key: k, label: lbl, value: sum });
    }
    const maxMonth = Math.max(...last6Months.map(m => m.value), 1);
    const collectionPct = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
    const currentYear   = new Date().getFullYear();

    return (
      <div className="space-y-4">
        <OwnerWatermark />
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Reports</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Financial summary · YTD</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-[13px] px-3 py-2 text-[13px] font-bold text-slate-700">
            <Icon name="calendar" size={13} className="text-slate-400" /> {currentYear}
          </div>
        </div>

        {/* ── DARK COLLECTIONS PANEL — executive moment ── */}
        <div className="bg-slate-900 rounded-[22px] p-5 text-white shadow-[0_14px_30px_-14px_rgba(15,23,42,0.6)]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">Collected YTD</p>
            <p className="text-sm font-extrabold text-emerald-400 tracking-tight">{collectionPct}%</p>
          </div>
          <p className="text-[32px] font-extrabold tracking-tight leading-none mt-2">
            {fmtCurrency(totalCollected).split(".")[0]}
            <span className="text-[15px] text-white/45 font-bold ml-1">/ {fmtCurrency(totalBilled).split(".")[0]}</span>
          </p>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/[0.12] mt-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all"
              style={{ width: collectionPct + "%" }}
            />
          </div>

          {/* 3-column footer */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.08]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Billed</p>
              <p className="text-sm font-extrabold mt-1 tracking-tight">{fmtCurrency(totalBilled).replace(".00", "")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Collected</p>
              <p className="text-sm font-extrabold mt-1 tracking-tight text-emerald-400">{fmtCurrency(totalCollected).replace(".00", "")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Outstanding</p>
              <p className="text-sm font-extrabold mt-1 tracking-tight text-rose-400">{fmtCurrency(outstanding).replace(".00", "")}</p>
            </div>
          </div>
        </div>

        {/* ── 6-MONTH REVENUE BAR CHART ── */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-800">Revenue · last 6 months</p>
            <Icon name="trending" size={14} className="text-slate-400" />
          </div>
          <div className="flex items-end justify-between gap-2 h-28">
            {last6Months.map((m, i) => {
              const isLast = i === last6Months.length - 1;
              const pct = maxMonth ? Math.max(8, (m.value / maxMonth) * 100) : 8;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-full rounded-t-lg ${isLast ? "bg-indigo-600" : "bg-indigo-100"} transition-all`}
                    style={{ height: pct + "%" }}
                    title={fmtCurrency(m.value)}
                  />
                  <p className={`text-[10px] font-bold mt-1.5 ${isLast ? "text-indigo-700" : "text-slate-400"}`}>{m.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PAYMENTS BY METHOD ── */}
        {Object.keys(byMethod).length > 0 && (
          <div className="bg-white rounded-[20px] shadow-sm border border-slate-100">
            <div className="p-4 pb-3"><p className="text-sm font-bold text-slate-800">Payments by method</p></div>
            {Object.entries(byMethod).map(([m, v], i, arr) => (
              <div key={m} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-slate-100" : "pb-4"}`}>
                <p className="text-[13px] text-slate-700 font-semibold">{m}</p>
                <p className="text-[13px] font-extrabold text-slate-800">{fmtCurrency(v)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── TENANT BALANCES ── */}
        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100">
          <div className="p-4 pb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">Tenant balances</p>
            <p className="text-xs text-slate-400 font-semibold">{tenants.length}</p>
          </div>
          {tenants.length === 0 && <p className="px-4 pb-4 text-sm text-slate-400 text-center">No tenants.</p>}
          {tenants.map((t, i, arr) => {
            const balance = getTenantBalance(t.id, charges, payments);
            const prop = properties.find(p => p.id === t.propertyId);
            const balColor = balance > 0 ? "text-rose-600" : balance < 0 ? "text-emerald-600" : "text-slate-600";
            return (
              <div key={t.id} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">{t.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{prop?.name || "—"}</p>
                </div>
                <p className={`text-[13px] font-extrabold tracking-tight ${balColor}`}>{fmtCurrency(balance)}</p>
              </div>
            );
          })}
          <div className="p-4 pt-3 flex gap-2 border-t border-slate-100">
            <button onClick={() => printHTML(buildOutstandingHtml(), "Outstanding-Balances")} className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 rounded-xl py-2 text-[13px] font-bold hover:bg-slate-50 active:scale-[0.98] transition-all">
              <Icon name="receipt" size={13} /> Print
            </button>
            <button onClick={() => downloadHTML(buildOutstandingHtml(), "Outstanding-Balances")} className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 rounded-xl py-2 text-[13px] font-bold hover:bg-slate-50 active:scale-[0.98] transition-all">
              <Icon name="download" size={13} /> Download
            </button>
          </div>
        </div>

        {/* ── INCOME REPORT — form-as-data-block style ── */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Income report</p>
          <div className="mb-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Filter by unit</label>
            <AppSelect value={incomeUnit} onChange={e => setIncomeUnit(e.target.value)}>
              <option value="all">All Units</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </AppSelect>
          </div>
          <div className="flex gap-2">
            <button onClick={() => printHTML(buildIncomeHtml(), "Income-Report")} className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white rounded-xl py-2.5 text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-[0_8px_18px_-10px_rgba(67,56,202,0.55)]">
              <Icon name="receipt" size={13} /> Print
            </button>
            <button onClick={() => downloadHTML(buildIncomeHtml(), "Income-Report-" + (incomeUnit === "all" ? "All" : (properties.find(p=>p.id===incomeUnit)?.unit||incomeUnit)))} className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-xl py-2.5 text-[13px] font-bold hover:bg-indigo-100 active:scale-[0.98] transition-all">
              <Icon name="download" size={13} /> Download
            </button>
          </div>
        </div>

        {/* ── MONTHLY LEDGER ── */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Monthly ledger</p>
          <div className="space-y-2.5 mb-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Period</label>
              <Input type="month" value={ledgerPeriod} onChange={e => setLedgerPeriod(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Filter by unit</label>
              <AppSelect value={ledgerUnit} onChange={e => setLedgerUnit(e.target.value)}>
                <option value="all">All Units</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </AppSelect>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { const r = printMonthlyLedger(ledgerPeriod, ledgerUnit === "all" ? null : ledgerUnit); if (r) printHTML(r.html, r.title); }} className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white rounded-xl py-2.5 text-[13px] font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-[0_8px_18px_-10px_rgba(67,56,202,0.55)]">
              <Icon name="receipt" size={13} /> Print
            </button>
            <button onClick={() => { const r = printMonthlyLedger(ledgerPeriod, ledgerUnit === "all" ? null : ledgerUnit); if (r) downloadHTML(r.html, "Monthly-Ledger-" + ledgerPeriod); }} className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-xl py-2.5 text-[13px] font-bold hover:bg-indigo-100 active:scale-[0.98] transition-all">
              <Icon name="download" size={13} /> Download
            </button>
          </div>
        </div>

        {/* ── SOA per tenant ── */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Statement of Account</p>
          <div className="space-y-2">
            {tenants.length === 0 && <p className="text-sm text-slate-400 text-center py-2">No tenants yet.</p>}
            {tenants.map(t => {
              const prop = properties.find(p => p.id === t.propertyId);
              const balance = getTenantBalance(t.id, charges, payments);
              return (
                <div key={t.id} className="border border-slate-200 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">{t.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{prop?.name}</p>
                    </div>
                    <span className={"text-[11px] font-bold px-2.5 py-0.5 rounded-full " + (balance > 0 ? "bg-rose-100 text-rose-700" : balance < 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                      {fmtCurrency(Math.abs(balance))}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => printSOA(t)} className="flex-1 flex items-center justify-center gap-1.5 border border-emerald-200 text-emerald-700 rounded-xl py-1.5 text-xs font-bold hover:bg-emerald-50 active:scale-[0.98] transition-all">
                      <Icon name="receipt" size={12} /> Print
                    </button>
                    <button onClick={() => { const soaHtml2 = buildSOAHtml(t); downloadHTML(soaHtml2, "SOA-" + t.name.replace(/ /g,"-")); }} className="flex-1 flex items-center justify-center gap-1.5 border border-emerald-200 text-emerald-700 rounded-xl py-1.5 text-xs font-bold hover:bg-emerald-50 active:scale-[0.98] transition-all">
                      <Icon name="download" size={12} /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const navItems = [
    { id: "dashboard",  label: "Home",     icon: "home" },
    { id: "tenants",    label: "Tenants",  icon: "users" },
    { id: "properties", label: "Units",    icon: "building" },
    { id: "payments",   label: "Payments", icon: "wallet" },
    { id: "charges",    label: "Charges",  icon: "receipt" },
    { id: "reports",    label: "Reports",  icon: "trending" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SyncBar />
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <HotelLogo size={32} />
            <div className="flex items-baseline gap-1.5"><span className="font-black text-slate-800 text-base leading-none tracking-tight">{APP_NAME}</span><span className="text-slate-300 text-xs font-medium leading-none">—{APP_SUB}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
            <button onClick={() => setModal({ type: "payment" })} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-3 py-2 text-sm font-semibold"><Icon name="plus" size={14} /> Payment</button>
            <button onClick={onLogout} title="Sign out" className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {tab === "dashboard"   && <DashboardView />}
        {tab === "tenants"     && <TenantsView />}
        {tab === "properties"  && <PropertiesView />}
        {tab === "payments"    && <PaymentsView />}
        {tab === "charges"     && <ChargesView />}
        {tab === "reports"     && <ReportsView />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-100 shadow-lg">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors active:scale-[0.96] ${tab === n.id ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Icon name={n.icon} size={21} />
              <span className={`text-[10px] ${tab === n.id ? "font-bold" : "font-semibold"}`}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {modal?.type === "payment" && (
        <AppModal title="Record Payment" onClose={closeModal}>
          <Field label="Tenant *"><AppSelect value={payForm.tenantId} onChange={e => setPayForm(f => ({ ...f, tenantId: e.target.value }))}><option value="">Select tenant…</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</AppSelect></Field>
          {payForm.tenantId && <div className="bg-indigo-50 rounded-xl p-3 mb-3 text-sm"><span className="text-indigo-700 font-semibold">Balance Due: </span><span className="font-bold text-indigo-800">{fmtCurrency(getTenantBalance(payForm.tenantId, charges, payments))}</span></div>}
          <Field label="Date *"><Input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="Amount *"><Input type="number" placeholder="0.00" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Method"><AppSelect value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>{["Cash","Bank Transfer","GCash","Maya","Cheque","Other"].map(m => <option key={m}>{m}</option>)}</AppSelect></Field>
          <Field label="Reference"><Input placeholder="e.g. BT-2025060101" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} /></Field>
          <Field label="Notes"><Textarea value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} /></Field>
          <button onClick={savePayment} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold mt-2 hover:bg-indigo-700">Save Payment</button>
        </AppModal>
      )}
      {modal?.type === "tenant" && (
        <AppModal title={tForm.id ? "Edit Tenant" : "Add Tenant"} onClose={closeModal}>
          <Field label="Full Name *"><Input value={tForm.name || ""} onChange={e => setTForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Phone"><Input value={tForm.phone || ""} onChange={e => setTForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Email"><Input type="email" value={tForm.email || ""} onChange={e => setTForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Gov't ID"><Input value={tForm.govId || ""} onChange={e => setTForm(f => ({ ...f, govId: e.target.value }))} /></Field>
          <Field label="Unit *"><AppSelect value={tForm.propertyId || ""} onChange={e => setTForm(f => ({ ...f, propertyId: e.target.value }))}><option value="">Select unit…</option>{properties.filter(p => p.status !== "Occupied" || p.id === tForm.propertyId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</AppSelect></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Lease Start"><Input type="date" value={tForm.leaseStart || ""} onChange={e => setTForm(f => ({ ...f, leaseStart: e.target.value }))} /></Field>
            <Field label="Lease End"><Input type="date" value={tForm.leaseEnd || ""} onChange={e => setTForm(f => ({ ...f, leaseEnd: e.target.value }))} /></Field>
            <Field label="Monthly Rent"><Input type="number" value={tForm.monthlyRent || ""} onChange={e => setTForm(f => ({ ...f, monthlyRent: +e.target.value }))} /></Field>
            <Field label="Assoc. Dues"><Input type="number" value={tForm.dues || ""} onChange={e => setTForm(f => ({ ...f, dues: +e.target.value }))} /></Field>
            <Field label="Parking Fee"><Input type="number" value={tForm.parking || ""} onChange={e => setTForm(f => ({ ...f, parking: +e.target.value }))} /></Field>
            <Field label="Security Deposit"><Input type="number" value={tForm.deposit || ""} onChange={e => setTForm(f => ({ ...f, deposit: +e.target.value }))} /></Field>
          </div>
          <button onClick={saveTenant} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold mt-2 hover:bg-indigo-700">{tForm.id ? "Update" : "Add Tenant"}</button>
        </AppModal>
      )}
      {modal?.type === "property" && (
        <AppModal title={pForm.id ? "Edit Unit" : "Add Unit"} onClose={closeModal}>
          <Field label="Property Name *"><Input value={pForm.name || ""} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Building"><Input value={pForm.building || ""} onChange={e => setPForm(f => ({ ...f, building: e.target.value }))} /></Field>
            <Field label="Unit Number *"><Input value={pForm.unit || ""} onChange={e => setPForm(f => ({ ...f, unit: e.target.value }))} /></Field>
            <Field label="Floor Area (sqm)"><Input type="number" value={pForm.floor || ""} onChange={e => setPForm(f => ({ ...f, floor: +e.target.value }))} /></Field>
            <Field label="Parking Slot"><Input value={pForm.parking || ""} onChange={e => setPForm(f => ({ ...f, parking: e.target.value }))} /></Field>
          </div>
          <Field label="Status"><AppSelect value={pForm.status || "Vacant"} onChange={e => setPForm(f => ({ ...f, status: e.target.value }))}>{["Vacant","Occupied","Reserved","Under Maintenance"].map(s => <option key={s}>{s}</option>)}</AppSelect></Field>
          <button onClick={saveProperty} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold mt-2 hover:bg-indigo-700">{pForm.id ? "Update" : "Add Unit"}</button>
        </AppModal>
      )}
      {modal?.type === "charge" && (
        <AppModal title="Add Charge" onClose={closeModal}>
          <Field label="Tenant *"><AppSelect value={cForm.tenantId} onChange={e => setCForm(f => ({ ...f, tenantId: e.target.value }))}><option value="">Select tenant…</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</AppSelect></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Period"><Input type="month" value={cForm.period} onChange={e => setCForm(f => ({ ...f, period: e.target.value }))} /></Field>
            <Field label="Date"><Input type="date" value={cForm.date} onChange={e => setCForm(f => ({ ...f, date: e.target.value }))} /></Field>
          </div>
          <Field label="Type"><AppSelect value={cForm.type} onChange={e => setCForm(f => ({ ...f, type: e.target.value }))}>{["Rent","Dues","Parking","Utility","Penalty","Other"].map(t => <option key={t}>{t}</option>)}</AppSelect></Field>
          <Field label="Amount *"><Input type="number" placeholder="0.00" value={cForm.amount} onChange={e => setCForm(f => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Remarks"><Input value={cForm.remarks} onChange={e => setCForm(f => ({ ...f, remarks: e.target.value }))} /></Field>
          <button onClick={saveCharge} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold mt-2 hover:bg-indigo-700">Add Charge</button>
        </AppModal>
      )}
      {modal?.type === "ledgerByUnit" && (
        <LedgerByUnitModal
          onClose={closeModal}
          properties={properties}
          tenants={tenants}
          charges={charges}
          payments={payments}
        />
      )}

      {modal?.type === "reset" && (
        <AppModal title="Reset All Data" onClose={closeModal}>
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center"><Icon name="trash" size={28} className="text-rose-500" /></div>
            <div><p className="font-bold text-slate-800">This will erase your data.</p><p className="text-sm text-slate-500 mt-1">Enter your invite code to confirm. This cannot be undone.</p></div>
          </div>
          <div className="mt-4">
            <Field label="Your Invite Code">
              <div className="relative"><Icon name="key" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={resetPwd} onChange={e => { setResetPwd(e.target.value.toUpperCase()); setResetErr(false); }} onKeyDown={e => e.key === "Enter" && handleReset()} placeholder="PROP-XXXX-YOLY" className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-slate-50 font-mono tracking-widest ${resetErr ? "border-rose-400 focus:ring-rose-300" : "border-slate-200 focus:ring-indigo-400"}`} /></div>
              {resetErr && <p className="text-xs text-rose-500 mt-1 font-semibold">Incorrect code. Try again.</p>}
            </Field>
            <button onClick={handleReset} className="w-full bg-rose-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-rose-700">Delete All My Data</button>
            <button onClick={closeModal} className="w-full mt-2 border-2 border-slate-200 text-slate-600 rounded-xl py-3 text-sm font-bold hover:bg-slate-50">Cancel</button>
          </div>
        </AppModal>
      )}

      {/* ── MONTHLY SOA MODAL ── */}
      {soaModal && (
        <AppModal title={`Monthly SOA — ${soaModal.tenant.name}`} onClose={() => setSoaModal(null)}>
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">How this works</p>
              <p className="text-xs text-emerald-600">Shows current month charges first, then any unpaid balance carried over from previous months.</p>
            </div>

            <Field label="Billing Period (Month)">
              <Input type="month" value={soaPeriod} onChange={e => setSoaPeriod(e.target.value)} />
            </Field>

            {/* Preview */}
            {(() => {
              const t = soaModal.tenant;
              const period = soaPeriod;
              const currentCharges = charges.filter(c => c.tenantId === t.id && c.period === period).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
              const currentTotal   = currentCharges.reduce((s, c) => s + Number(c.amount), 0);
              const currentPaid    = payments.filter(p => p.tenantId === t.id && (p.date || "").slice(0, 7) === period).reduce((s, p) => s + Number(p.amount), 0);
              const prevCharges    = charges.filter(c => c.tenantId === t.id && (c.period || "") < period);
              const prevPayments   = payments.filter(p => p.tenantId === t.id && (p.date || "").slice(0, 7) < period);
              const prevBalance    = prevCharges.reduce((s, c) => s + Number(c.amount), 0) - prevPayments.reduce((s, p) => s + Number(p.amount), 0);
              const totalDue       = currentTotal + prevBalance - currentPaid;
              const [yr, mo]       = period.split("-");
              const monthLabel     = new Date(Number(yr), Number(mo) - 1, 1).toLocaleString("en-PH", { month: "long", year: "numeric" });
              return (
                <div className="space-y-3">
                  {/* Current charges */}
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Current Month — {monthLabel}</p>
                    <div className="bg-slate-50 rounded-xl overflow-hidden">
                      {currentCharges.length === 0
                        ? <p className="text-xs text-slate-400 text-center py-3">No charges for this period</p>
                        : currentCharges.map(ch => (
                          <div key={ch.id} className="flex justify-between px-3 py-2 border-b border-slate-100 last:border-0">
                            <span className="text-xs text-slate-700">{ch.remarks || ch.type}</span>
                            <span className="text-xs font-semibold text-rose-600">{fmtCurrency(ch.amount)}</span>
                          </div>
                        ))
                      }
                      <div className="flex justify-between px-3 py-2 bg-slate-100">
                        <span className="text-xs font-bold text-slate-700">Subtotal</span>
                        <span className="text-xs font-bold text-slate-800">{fmtCurrency(currentTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Previous balance */}
                  {prevBalance !== 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{color: prevBalance > 0 ? "#92400e" : "#065f46"}}>
                        {prevBalance > 0 ? "Previous Unpaid Balance" : "Previous Credit Balance"}
                      </p>
                      <div className={`rounded-xl px-3 py-2.5 flex justify-between items-center ${prevBalance > 0 ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200"}`}>
                        <span className="text-xs font-medium" style={{color: prevBalance > 0 ? "#92400e" : "#065f46"}}>
                          {prevBalance > 0 ? "Unpaid from previous months" : "Credit from overpayments"}
                        </span>
                        <span className="text-xs font-bold" style={{color: prevBalance > 0 ? "#92400e" : "#065f46"}}>
                          {prevBalance > 0 ? "+" : ""}{fmtCurrency(prevBalance)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Payments this month */}
                  {currentPaid > 0 && (
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Payments This Month</p>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 flex justify-between">
                        <span className="text-xs text-emerald-700 font-medium">Amount received</span>
                        <span className="text-xs font-bold text-emerald-700">- {fmtCurrency(currentPaid)}</span>
                      </div>
                    </div>
                  )}

                  {/* Total due */}
                  <div className={`rounded-xl p-4 ${totalDue > 0 ? "bg-rose-50 border-2 border-rose-200" : "bg-emerald-50 border-2 border-emerald-200"}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-black uppercase tracking-wide ${totalDue > 0 ? "text-rose-700" : "text-emerald-700"}`}>Amount Due</span>
                      <span className={`text-xl font-black ${totalDue > 0 ? "text-rose-700" : "text-emerald-700"}`}>{fmtCurrency(totalDue)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <button onClick={() => { printMonthlySoa(soaModal.tenant, soaPeriod); }} className="flex-1 bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2">
                <Icon name="receipt" size={16} /> Print
              </button>
              <button onClick={() => { const r2 = buildMonthlySoaHtml(soaModal.tenant, soaPeriod); if(r2) downloadHTML(r2.html, r2.filename); }} className="flex-1 border-2 border-emerald-200 text-emerald-700 rounded-xl py-3 text-sm font-bold hover:bg-emerald-50 flex items-center justify-center gap-2">
                <Icon name="download" size={16} /> Download
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
