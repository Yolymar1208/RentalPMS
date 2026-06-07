"use client";
import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://lykhisfpiupivljmrvwm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2hpc2ZwaXVwaXZsam1ydndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDQ0MDgsImV4cCI6MjA5NjM4MDQwOH0.L4Xx-JxCgpCP2A6tB1VbYonBZnUdN9p7eNlf7vflhfU";

const api = async (table, method = "GET", body = null, query = "") => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : undefined,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === "DELETE" || method === "PATCH") return { ok: res.ok };
  const data = await res.json();
  return { data, ok: res.ok };
};

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const OWNER_NAME = "by Yoly";
const RESET_PASSWORD = "Terminus8@";
const SESSION_KEY = "propmanager_user";

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtCurrency = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—";
const today = () => new Date().toISOString().split("T")[0];
const uid = (p) => p + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();

const mapProperty = (r) => ({ id: r.id, name: r.name, building: r.building, unit: r.unit, floor: r.floor, parking: r.parking, status: r.status });
const mapTenant   = (r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, govId: r.gov_id, propertyId: r.property_id, leaseStart: r.lease_start, leaseEnd: r.lease_end, deposit: r.deposit, advance: r.advance, monthlyRent: r.monthly_rent, dues: r.dues, parking: r.parking });
const mapCharge   = (r) => ({ id: r.id, tenantId: r.tenant_id, period: r.period, type: r.type, amount: r.amount, date: r.date, remarks: r.remarks });
const mapPayment  = (r) => ({ id: r.id, tenantId: r.tenant_id, date: r.date, amount: r.amount, method: r.method, reference: r.reference, notes: r.notes });
const toDBProperty = (p) => ({ id: p.id, name: p.name, building: p.building, unit: p.unit, floor: p.floor, parking: p.parking, status: p.status });
const toDBTenant   = (t) => ({ id: t.id, name: t.name, phone: t.phone, email: t.email, gov_id: t.govId, property_id: t.propertyId, lease_start: t.leaseStart, lease_end: t.leaseEnd, deposit: t.deposit, advance: t.advance, monthly_rent: t.monthlyRent, dues: t.dues, parking: t.parking });
const toDBCharge   = (c) => ({ id: c.id, tenant_id: c.tenantId, period: c.period, type: c.type, amount: c.amount, date: c.date, remarks: c.remarks });
const toDBPayment  = (p) => ({ id: p.id, tenant_id: p.tenantId, date: p.date, amount: p.amount, method: p.method, reference: p.reference, notes: p.notes });

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

function printHTML(html, title = "Report") {
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:'Helvetica Neue',Arial,sans-serif;padding:32px;color:#1e293b;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0}
    td{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px}
    .right{text-align:right}.bold{font-weight:700}
    .total-row td{background:#f8fafc;font-weight:700;border-top:2px solid #e2e8f0}
    .green{background:#d1fae5;color:#065f46}.red{background:#fee2e2;color:#991b1b}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0}
    .logo{font-size:20px;font-weight:800;color:#4f46e5}.owner{font-size:11px;color:#a5b4fc;margin-top:2px}
    @media print{body{padding:16px}}
  </style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

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
  const colors = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", rose: "bg-rose-50 text-rose-600", blue: "bg-blue-50 text-blue-600" };
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}><Icon name={icon} size={20} /></div>
      <div className="min-w-0"><p className="text-xs text-slate-500 font-medium">{label}</p><p className="text-lg font-bold text-slate-800 truncate">{value}</p>{sub && <p className="text-xs text-slate-400">{sub}</p>}</div>
    </Card>
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
const OwnerWatermark = () => <p className="text-xs text-slate-300 font-semibold tracking-widest text-right mt-1 mb-3 uppercase select-none">{OWNER_NAME}</p>;

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SCREENS
// ═══════════════════════════════════════════════════════════════════════════════
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(""); };

  const handleSignIn = async () => {
    if (!form.email || !form.password) return setError("Please fill in all fields.");
    setLoading(true);
    const { data } = await api("app_users", "GET", null, `?email=eq.${encodeURIComponent(form.email.toLowerCase())}&select=*`);
    if (!data || data.length === 0) { setError("No account found with that email."); setLoading(false); return; }
    const user = data[0];
    if (user.password !== form.password) { setError("Incorrect password."); setLoading(false); return; }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
    onLogin({ id: user.id, name: user.name, email: user.email });
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!form.name || !form.email || !form.password || !form.code) return setError("Please fill in all fields.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    // Check invite code exists and is unused
    const { data: codes } = await api("invite_codes", "GET", null, `?code=eq.${encodeURIComponent(form.code.toUpperCase())}&select=*`);
    if (!codes || codes.length === 0) { setError("Invalid invite code."); setLoading(false); return; }
    if (codes[0].used_by) { setError("This invite code has already been used."); setLoading(false); return; }
    // Check email not already registered
    const { data: existing } = await api("app_users", "GET", null, `?email=eq.${encodeURIComponent(form.email.toLowerCase())}&select=id`);
    if (existing && existing.length > 0) { setError("An account with this email already exists."); setLoading(false); return; }
    // Create user
    const userId = uid("USR");
    const { data: newUser, ok } = await api("app_users", "POST", [{ id: userId, name: form.name, email: form.email.toLowerCase(), password: form.password, invite_code: form.code.toUpperCase() }]);
    if (!ok) { setError("Something went wrong. Please try again."); setLoading(false); return; }
    // Mark code as used
    await api("invite_codes", "PATCH", { used_by: form.email.toLowerCase(), used_at: new Date().toISOString() }, `?code=eq.${encodeURIComponent(form.code.toUpperCase())}`);
    const user = { id: userId, name: form.name, email: form.email.toLowerCase() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    onLogin(user);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <span className="text-white text-3xl font-bold">P</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">PropManager</h1>
          <p className="text-sm text-indigo-400 font-semibold tracking-widest uppercase mt-0.5">{OWNER_NAME}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button onClick={() => { setMode("signin"); setError(""); }} className={`flex-1 py-3.5 text-sm font-bold transition-colors ${mode === "signin" ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" : "text-slate-400 hover:text-slate-600"}`}>Sign In</button>
            <button onClick={() => { setMode("signup"); setError(""); }} className={`flex-1 py-3.5 text-sm font-bold transition-colors ${mode === "signup" ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" : "text-slate-400 hover:text-slate-600"}`}>Sign Up</button>
          </div>

          <div className="p-6 space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <Icon name="user" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Email</label>
              <div className="relative">
                <Icon name="user" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@email.com" className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Icon name="lock" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} onKeyDown={e => e.key === "Enter" && (mode === "signin" ? handleSignIn() : handleSignUp())} placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"} className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50" />
                <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name={showPw ? "eyeoff" : "eye"} size={15} /></button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Invite Code</label>
                <div className="relative">
                  <Icon name="key" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="PROP-XXXX-YOLY" className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 font-mono tracking-widest" />
                </div>
                <p className="text-xs text-slate-400 mt-1">You need an invite code from Yoly to sign up.</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <Icon name="alert" size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={mode === "signin" ? handleSignIn : handleSignUp}
              disabled={loading}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">PropManager · Private Access Only</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setCurrentUser(JSON.parse(saved));
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  };

  if (!authChecked) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center animate-pulse">
        <span className="text-white text-xl font-bold">P</span>
      </div>
    </div>
  );

  if (!currentUser) return <AuthScreen onLogin={setCurrentUser} />;

  return <MainApp currentUser={currentUser} onLogout={handleLogout} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP (after login)
// ═══════════════════════════════════════════════════════════════════════════════
function MainApp({ currentUser, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  const [payForm, setPayForm] = useState({ tenantId: "", date: today(), amount: "", method: "Cash", reference: "", notes: "" });
  const [tForm, setTForm] = useState({});
  const [pForm, setPForm] = useState({});
  const [cForm, setCForm] = useState({ tenantId: "", period: today().slice(0, 7), type: "Rent", amount: "", date: today(), remarks: "" });
  const [resetPwd, setResetPwd] = useState("");
  const [resetErr, setResetErr] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [pr, tr, cr, pmr] = await Promise.all([
      api("properties", "GET", null, "?select=*&order=id"),
      api("tenants",    "GET", null, "?select=*&order=id"),
      api("charges",    "GET", null, "?select=*&order=date.desc"),
      api("payments",   "GET", null, "?select=*&order=date.desc"),
    ]);
    if (pr.data)  setProperties(pr.data.map(mapProperty));
    if (tr.data)  setTenants(tr.data.map(mapTenant));
    if (cr.data)  setCharges(cr.data.map(mapCharge));
    if (pmr.data) setPayments(pmr.data.map(mapPayment));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const savePayment = async () => {
    if (!payForm.tenantId || !payForm.amount) return alert("Fill required fields");
    const p = { id: uid("PMT"), ...payForm, amount: parseFloat(payForm.amount) };
    setSyncing(true);
    await api("payments", "POST", [toDBPayment(p)]);
    setPayments(prev => [p, ...prev]);
    setPayForm({ tenantId: "", date: today(), amount: "", method: "Cash", reference: "", notes: "" });
    setSyncing(false); closeModal();
  };

  const saveTenant = async () => {
    if (!tForm.name || !tForm.propertyId) return alert("Fill required fields");
    setSyncing(true);
    if (tForm.id) {
      await api("tenants", "PATCH", toDBTenant(tForm), `?id=eq.${tForm.id}`);
      setTenants(prev => prev.map(t => t.id === tForm.id ? tForm : t));
    } else {
      const t = { id: uid("T"), monthlyRent: 0, dues: 0, parking: 0, deposit: 0, advance: 0, ...tForm };
      await api("tenants", "POST", [toDBTenant(t)]);
      await api("properties", "PATCH", { status: "Occupied" }, `?id=eq.${t.propertyId}`);
      setTenants(prev => [t, ...prev]);
      setProperties(prev => prev.map(p => p.id === t.propertyId ? { ...p, status: "Occupied" } : p));
    }
    setSyncing(false); closeModal();
  };

  const saveProperty = async () => {
    if (!pForm.name || !pForm.unit) return alert("Fill required fields");
    setSyncing(true);
    if (pForm.id) {
      await api("properties", "PATCH", toDBProperty(pForm), `?id=eq.${pForm.id}`);
      setProperties(prev => prev.map(p => p.id === pForm.id ? pForm : p));
    } else {
      const prop = { id: uid("P"), status: "Vacant", ...pForm };
      await api("properties", "POST", [toDBProperty(prop)]);
      setProperties(prev => [prop, ...prev]);
    }
    setSyncing(false); closeModal();
  };

  const saveCharge = async () => {
    if (!cForm.tenantId || !cForm.amount) return alert("Fill required fields");
    const c = { id: uid("C"), ...cForm, amount: parseFloat(cForm.amount) };
    setSyncing(true);
    await api("charges", "POST", [toDBCharge(c)]);
    setCharges(prev => [c, ...prev]);
    setCForm({ tenantId: "", period: today().slice(0, 7), type: "Rent", amount: "", date: today(), remarks: "" });
    setSyncing(false); closeModal();
  };

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
    await api("charges", "POST", newC.map(toDBCharge));
    setCharges(prev => [...prev, ...newC]);
    setSyncing(false);
    alert(`Generated ${newC.length} charge records for ${period}.`);
  };

  const handleReset = async () => {
    if (resetPwd !== RESET_PASSWORD) { setResetErr(true); setResetPwd(""); return; }
    setSyncing(true);
    await api("payments",   "DELETE", null, "?id=neq.null");
    await api("charges",    "DELETE", null, "?id=neq.null");
    await api("tenants",    "DELETE", null, "?id=neq.null");
    await api("properties", "DELETE", null, "?id=neq.null");
    setProperties([]); setTenants([]); setCharges([]); setPayments([]);
    setResetPwd(""); setResetErr(false); setSyncing(false); closeModal();
  };

  const printSOA = (tenant) => {
    const ledger = getLedger(tenant.id, charges, payments);
    const prop = properties.find(p => p.id === tenant.propertyId);
    const balance = getTenantBalance(tenant.id, charges, payments);
    const rows = ledger.map(e => `<tr><td>${fmtDate(e.date)}</td><td>${e.desc}</td><td class="right">${e.debit ? fmtCurrency(e.debit) : "—"}</td><td class="right">${e.credit ? fmtCurrency(e.credit) : "—"}</td><td class="right bold">${fmtCurrency(e.balance)}</td></tr>`).join("");
    printHTML(`<div class="header"><div><div class="logo">🏢 PropManager</div><div class="owner">${OWNER_NAME}</div><p style="color:#64748b;font-size:12px;margin-top:4px">Statement of Account</p></div><div style="text-align:right;font-size:11px;color:#64748b">Generated: ${fmtDate(today())}</div></div><table style="margin-bottom:16px;border:none"><tr><td style="border:none;padding:2px 0"><b>Tenant:</b> ${tenant.name}</td><td style="border:none;padding:2px 0"><b>Unit:</b> ${prop?.name || "—"}</td></tr><tr><td style="border:none;padding:2px 0"><b>Email:</b> ${tenant.email}</td><td style="border:none;padding:2px 0"><b>Lease End:</b> ${fmtDate(tenant.leaseEnd)}</td></tr></table><table><thead><tr><th>Date</th><th>Description</th><th class="right">Debit</th><th class="right">Credit</th><th class="right">Balance</th></tr></thead><tbody>${rows}</tbody><tr class="total-row"><td colspan="3"></td><td class="right">Outstanding:</td><td class="right">${fmtCurrency(balance)}</td></tr></table>`, `SOA — ${tenant.name}`);
  };

  const printReceipt = (payment) => {
    const tenant = tenants.find(t => t.id === payment.tenantId);
    const prop = properties.find(p => p.id === tenant?.propertyId);
    const balance = getTenantBalance(payment.tenantId, charges, payments);
    printHTML(`<div class="header"><div><div class="logo">🏢 PropManager</div><div class="owner">${OWNER_NAME}</div><p style="color:#64748b;font-size:12px;margin-top:4px">Official Receipt</p></div><div style="text-align:right"><b>OR#:</b> ${payment.id}<br><span style="color:#64748b;font-size:11px">${fmtDate(payment.date)}</span></div></div><table style="border:none"><tr><td style="border:none;padding:4px 0;width:50%"><b>Received from:</b><br>${tenant?.name || "—"}</td><td style="border:none;padding:4px 0"><b>Unit:</b><br>${prop?.name || "—"}</td></tr><tr><td style="border:none;padding:4px 0"><b>Amount Paid:</b><br><span style="font-size:22px;font-weight:800;color:#4f46e5">${fmtCurrency(payment.amount)}</span></td><td style="border:none;padding:4px 0"><b>Method:</b><br>${payment.method}</td></tr><tr><td style="border:none;padding:4px 0"><b>Reference:</b><br>${payment.reference || "—"}</td><td style="border:none;padding:4px 0"><b>Remaining Balance:</b><br><span class="bold ${balance > 0 ? "red" : "green"}">${fmtCurrency(balance)}</span></td></tr></table>${payment.notes ? `<p style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:12px"><b>Notes:</b> ${payment.notes}</p>` : ""}<p style="margin-top:32px;font-size:10px;color:#94a3b8;text-align:center">This is an official receipt. Thank you for your payment.</p>`, `Receipt — ${payment.id}`);
  };

  const printIncomeReport = () => {
    const byMonth = {};
    payments.forEach(p => { const m = p.date?.slice(0, 7); if (m) byMonth[m] = (byMonth[m] || 0) + Number(p.amount); });
    const months = Object.keys(byMonth).sort().reverse();
    const rows = months.map(m => `<tr><td>${m}</td><td class="right">${fmtCurrency(byMonth[m])}</td></tr>`).join("");
    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    printHTML(`<div class="header"><div><div class="logo">🏢 PropManager</div><div class="owner">${OWNER_NAME}</div><p style="color:#64748b;font-size:12px;margin-top:4px">Income Report</p></div><div style="font-size:11px;color:#64748b">As of ${fmtDate(today())}</div></div><table><thead><tr><th>Period</th><th class="right">Collected</th></tr></thead><tbody>${rows}</tbody><tr class="total-row"><td>Total</td><td class="right">${fmtCurrency(total)}</td></tr></table>`, "Income Report");
  };

  const SyncBar = () => syncing ? (
    <div className="fixed top-14 left-0 right-0 z-50 bg-indigo-600 text-white text-xs font-semibold text-center py-1.5">Saving…</div>
  ) : null;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center animate-pulse"><span className="text-white text-2xl font-bold">P</span></div>
      <p className="text-sm text-slate-400">Loading your data…</p>
    </div>
  );

  // ── VIEWS ──
  const DashboardView = () => {
    const occupied = properties.filter(p => p.status === "Occupied").length;
    const vacant = properties.filter(p => p.status === "Vacant").length;
    const monthlyRev = tenants.reduce((s, t) => s + Number(t.monthlyRent) + Number(t.dues) + Number(t.parking), 0);
    const outstanding = tenants.reduce((s, t) => s + Math.max(0, getTenantBalance(t.id, charges, payments)), 0);
    const recentPay = [...payments].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
    const expiringLeases = tenants.filter(t => { const d = (new Date(t.leaseEnd) - new Date()) / 86400000; return d > 0 && d < 90; });
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl px-5 py-4 shadow-md">
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-0.5">{OWNER_NAME}</p>
          <h1 className="text-white text-xl font-bold">Dashboard</h1>
          <p className="text-indigo-200 text-sm">Welcome, {currentUser.name.split(" ")[0]}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Units"     value={properties.length}        icon="building" color="indigo" />
          <StatCard label="Occupied"        value={occupied}                 icon="users"    color="emerald" sub={`${vacant} vacant`} />
          <StatCard label="Monthly Revenue" value={fmtCurrency(monthlyRev)}  icon="trending" color="blue" />
          <StatCard label="Outstanding"     value={fmtCurrency(outstanding)} icon="alert"    color="rose" />
        </div>
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setModal({ type: "payment" })} className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-indigo-700"><Icon name="wallet" size={16} /> Record Payment</button>
            <button onClick={() => setModal({ type: "charge" })}  className="flex items-center gap-2 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-900"><Icon name="plus" size={16} /> Add Charge</button>
            <button onClick={() => { const p = prompt("Billing period (YYYY-MM):"); if (p) generateMonthlyBilling(p); }} className="flex items-center gap-2 border-2 border-indigo-200 text-indigo-700 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-indigo-50"><Icon name="calendar" size={16} /> Generate Billing</button>
            <button onClick={printIncomeReport} className="flex items-center gap-2 border-2 border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-50"><Icon name="download" size={16} /> Income Report</button>
            <button onClick={loadAll} className="flex items-center justify-center gap-2 border-2 border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50"><Icon name="refresh" size={15} /> Refresh</button>
            <button onClick={() => { setResetPwd(""); setResetErr(false); setModal({ type: "reset" }); }} className="flex items-center justify-center gap-2 border-2 border-rose-200 text-rose-400 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-rose-50"><Icon name="trash" size={15} /> Reset Data</button>
          </div>
        </Card>
        <Card>
          <div className="p-4 border-b border-slate-100"><p className="font-semibold text-slate-800 text-sm">Recent Payments</p></div>
          {recentPay.length === 0 && <p className="p-4 text-sm text-slate-400 text-center">No payments yet.</p>}
          {recentPay.map(p => { const t = tenants.find(t => t.id === p.tenantId); return (
            <div key={p.id} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0">
              <div><p className="text-sm font-semibold text-slate-800">{t?.name || "—"}</p><p className="text-xs text-slate-400">{fmtDate(p.date)} · {p.method}</p></div>
              <div className="text-right"><p className="text-sm font-bold text-emerald-600">{fmtCurrency(p.amount)}</p><button onClick={() => printReceipt(p)} className="text-xs text-indigo-500 hover:underline">Receipt</button></div>
            </div>
          ); })}
        </Card>
        {expiringLeases.length > 0 && (
          <Card>
            <div className="p-4 border-b border-slate-100 flex items-center gap-2"><Icon name="alert" size={16} className="text-amber-500" /><p className="font-semibold text-slate-800 text-sm">Expiring Leases</p></div>
            {expiringLeases.map(t => { const days = Math.ceil((new Date(t.leaseEnd) - new Date()) / 86400000); return (
              <div key={t.id} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0">
                <div><p className="text-sm font-semibold text-slate-800">{t.name}</p><p className="text-xs text-slate-400">Expires {fmtDate(t.leaseEnd)}</p></div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${days < 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{days}d left</span>
              </div>
            ); })}
          </Card>
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
            <div className="flex gap-2 mt-4">
              <button onClick={() => printSOA(t)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold"><Icon name="download" size={14} /> Print SOA</button>
              <button onClick={() => { setModal({ type: "payment" }); setPayForm(f => ({ ...f, tenantId: t.id })); }} className="flex-1 flex items-center justify-center gap-2 border-2 border-indigo-200 text-indigo-700 rounded-xl py-2.5 text-sm font-semibold"><Icon name="wallet" size={14} /> Payment</button>
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
    return (
      <div className="space-y-4">
        <OwnerWatermark />
        <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-800">Tenants</h1><p className="text-sm text-slate-500">{tenants.length} tenants</p></div><button onClick={() => { setTForm({}); setModal({ type: "tenant" }); }} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Icon name="plus" size={16} /> Add</button></div>
        <div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants…" className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" /></div>
        <div className="space-y-2">
          {tenants.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No tenants yet.</p>}
          {filtered.map(t => { const prop = properties.find(p => p.id === t.propertyId); const balance = getTenantBalance(t.id, charges, payments); return (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between"><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 truncate">{t.name}</p><p className="text-xs text-slate-500 mt-0.5">{prop?.name} · {t.phone}</p><p className="text-xs text-slate-400">Lease ends {fmtDate(t.leaseEnd)}</p></div><div className="text-right ml-2"><p className={`text-sm font-bold ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmtCurrency(Math.abs(balance))}</p><p className="text-xs text-slate-400">{balance > 0 ? "due" : "credit"}</p></div></div>
              <div className="flex gap-2 mt-3"><button onClick={() => setViewTenant(t)} className="flex-1 text-xs text-indigo-600 font-semibold border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50">View</button><button onClick={() => { setTForm({ ...t }); setModal({ type: "tenant" }); }} className="flex-1 text-xs text-slate-600 font-semibold border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50">Edit</button><button onClick={() => printSOA(t)} className="flex-1 text-xs text-slate-600 font-semibold border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50">SOA</button></div>
            </Card>
          ); })}
        </div>
      </div>
    );
  };

  const PropertiesView = () => {
    const [filter, setFilter] = useState("All");
    const filtered = filter === "All" ? properties : properties.filter(p => p.status === filter);
    return (
      <div className="space-y-4">
        <OwnerWatermark />
        <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-800">Properties</h1><p className="text-sm text-slate-500">{properties.length} units</p></div><button onClick={() => { setPForm({}); setModal({ type: "property" }); }} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Icon name="plus" size={16} /> Add</button></div>
        <div className="flex gap-2 overflow-x-auto pb-1">{["All","Occupied","Vacant","Reserved","Under Maintenance"].map(s => <button key={s} onClick={() => setFilter(s)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${filter === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{s}</button>)}</div>
        <div className="grid gap-3">
          {properties.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No units yet.</p>}
          {filtered.map(p => { const tenant = tenants.find(t => t.propertyId === p.id); return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between mb-2"><div><p className="font-semibold text-slate-800">{p.name}</p><p className="text-xs text-slate-500">{p.building} · Unit {p.unit} · {p.floor} sqm</p>{p.parking && <p className="text-xs text-slate-400">Parking: {p.parking}</p>}</div><StatusBadge status={p.status} /></div>
              {tenant && <div className="bg-slate-50 rounded-xl p-3 mt-2"><p className="text-xs font-semibold text-slate-700">{tenant.name}</p><p className="text-xs text-slate-500">Lease ends {fmtDate(tenant.leaseEnd)} · {fmtCurrency(tenant.monthlyRent)}/mo</p></div>}
              <button onClick={() => { setPForm({ ...p }); setModal({ type: "property" }); }} className="mt-3 w-full text-xs text-slate-600 font-semibold border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50">Edit</button>
            </Card>
          ); })}
        </div>
      </div>
    );
  };

  const PaymentsView = () => {
    const [search, setSearch] = useState("");
    const filtered = [...payments].sort((a, b) => (b.date || "").localeCompare(a.date || "")).filter(p => { const t = tenants.find(t => t.id === p.tenantId); return (t?.name || "").toLowerCase().includes(search.toLowerCase()) || (p.reference || "").toLowerCase().includes(search.toLowerCase()); });
    return (
      <div className="space-y-4">
        <OwnerWatermark />
        <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-800">Payments</h1><p className="text-sm text-slate-500">{payments.length} transactions</p></div><button onClick={() => setModal({ type: "payment" })} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Icon name="plus" size={16} /> Record</button></div>
        <div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" /></div>
        <div className="space-y-2">
          {payments.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No payments yet.</p>}
          {filtered.map(p => { const t = tenants.find(t => t.id === p.tenantId); return (
            <Card key={p.id} className="p-4"><div className="flex items-start justify-between"><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 truncate">{t?.name || "—"}</p><p className="text-xs text-slate-500">{fmtDate(p.date)} · {p.method}</p>{p.reference && <p className="text-xs text-slate-400">Ref: {p.reference}</p>}{p.notes && <p className="text-xs text-slate-400 italic">{p.notes}</p>}</div><div className="text-right ml-2 flex-shrink-0"><p className="text-base font-bold text-emerald-600">{fmtCurrency(p.amount)}</p><button onClick={() => printReceipt(p)} className="text-xs text-indigo-500 hover:underline">Print OR</button></div></div></Card>
          ); })}
        </div>
      </div>
    );
  };

  const ChargesView = () => {
    const [search, setSearch] = useState("");
    const filtered = [...charges].sort((a, b) => (b.date || "").localeCompare(a.date || "")).filter(c => { const t = tenants.find(t => t.id === c.tenantId); return (t?.name || "").toLowerCase().includes(search.toLowerCase()) || (c.type || "").toLowerCase().includes(search.toLowerCase()); });
    return (
      <div className="space-y-4">
        <OwnerWatermark />
        <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-800">Charges</h1><p className="text-sm text-slate-500">{charges.length} records</p></div><button onClick={() => setModal({ type: "charge" })} className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Icon name="plus" size={16} /> Add</button></div>
        <div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" /></div>
        <div className="space-y-2">
          {charges.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No charges yet.</p>}
          {filtered.map(c => { const t = tenants.find(t => t.id === c.tenantId); return (
            <Card key={c.id} className="p-4"><div className="flex items-start justify-between"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold text-slate-800 truncate">{t?.name || "—"}</p><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex-shrink-0">{c.type}</span></div><p className="text-xs text-slate-500">{fmtDate(c.date)} · {c.period}</p><p className="text-xs text-slate-400 italic">{c.remarks}</p></div><p className="text-base font-bold text-rose-600 ml-2">{fmtCurrency(c.amount)}</p></div></Card>
          ); })}
        </div>
      </div>
    );
  };

  const ReportsView = () => {
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalBilled = charges.reduce((s, c) => s + Number(c.amount), 0);
    const outstanding = tenants.reduce((s, t) => s + Math.max(0, getTenantBalance(t.id, charges, payments)), 0);
    const byMethod = payments.reduce((acc, p) => { acc[p.method] = (acc[p.method] || 0) + Number(p.amount); return acc; }, {});
    const printOutstanding = () => {
      const rows = tenants.map(t => { const b = getTenantBalance(t.id, charges, payments); const prop = properties.find(p => p.id === t.propertyId); return `<tr><td>${t.name}</td><td>${prop?.name || "—"}</td><td class="right bold ${b > 0 ? "red" : "green"}">${fmtCurrency(b)}</td></tr>`; }).join("");
      printHTML(`<div class="header"><div><div class="logo">🏢 PropManager</div><div class="owner">${OWNER_NAME}</div><p style="color:#64748b;font-size:12px;margin-top:4px">Outstanding Balances</p></div><div style="font-size:11px;color:#64748b">${fmtDate(today())}</div></div><table><thead><tr><th>Tenant</th><th>Unit</th><th class="right">Balance</th></tr></thead><tbody>${rows}</tbody><tr class="total-row"><td colspan="2">Total Outstanding</td><td class="right">${fmtCurrency(outstanding)}</td></tr></table>`, "Outstanding Balances");
    };
    return (
      <div className="space-y-4">
        <OwnerWatermark />
        <div><h1 className="text-xl font-bold text-slate-800">Reports</h1><p className="text-sm text-slate-500">Financial summary</p></div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Collected" value={fmtCurrency(totalCollected)} icon="wallet"   color="emerald" />
          <StatCard label="Total Billed"    value={fmtCurrency(totalBilled)}    icon="receipt"  color="blue" />
          <StatCard label="Outstanding"     value={fmtCurrency(outstanding)}    icon="alert"    color="rose" />
          <StatCard label="Collection Rate" value={totalBilled ? Math.round(totalCollected / totalBilled * 100) + "%" : "—"} icon="trending" color="indigo" />
        </div>
        <Card>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between"><p className="font-semibold text-slate-800 text-sm">Tenant Balances</p><button onClick={printOutstanding} className="text-xs text-indigo-600 font-semibold flex items-center gap-1"><Icon name="download" size={12} /> Print</button></div>
          {tenants.length === 0 && <p className="p-4 text-sm text-slate-400 text-center">No tenants.</p>}
          {tenants.map(t => { const balance = getTenantBalance(t.id, charges, payments); const prop = properties.find(p => p.id === t.propertyId); return (<div key={t.id} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0"><div><p className="text-sm font-semibold text-slate-800">{t.name}</p><p className="text-xs text-slate-400">{prop?.name}</p></div><p className={`text-sm font-bold ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmtCurrency(balance)}</p></div>); })}
        </Card>
        <Card>
          <div className="p-4 border-b border-slate-100"><p className="font-semibold text-slate-800 text-sm">Payments by Method</p></div>
          {Object.keys(byMethod).length === 0 && <p className="p-4 text-sm text-slate-400 text-center">No payments yet.</p>}
          {Object.entries(byMethod).map(([m, v]) => (<div key={m} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0"><p className="text-sm text-slate-700 font-medium">{m}</p><p className="text-sm font-bold text-slate-800">{fmtCurrency(v)}</p></div>))}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Export</p>
          <div className="space-y-2">
            <button onClick={printIncomeReport} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 w-full"><div className="p-2 bg-indigo-50 rounded-lg"><Icon name="trending" size={16} className="text-indigo-600" /></div> Monthly Income Report</button>
            <button onClick={printOutstanding} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 w-full"><div className="p-2 bg-rose-50 rounded-lg"><Icon name="alert" size={16} className="text-rose-600" /></div> Outstanding Balances</button>
            {tenants.map(t => (<button key={t.id} onClick={() => printSOA(t)} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 w-full"><div className="p-2 bg-emerald-50 rounded-lg"><Icon name="receipt" size={16} className="text-emerald-600" /></div> SOA — {t.name}</button>))}
          </div>
        </Card>
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
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center"><span className="text-white text-sm font-bold">P</span></div>
            <div><span className="font-bold text-slate-800 text-sm leading-none">PropManager</span><p className="text-[10px] text-indigo-400 font-semibold leading-none">{OWNER_NAME}</p></div>
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

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-lg">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(n => (<button key={n.id} onClick={() => setTab(n.id)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${tab === n.id ? "text-indigo-600" : "text-slate-400"}`}><Icon name={n.icon} size={tab === n.id ? 22 : 20} /><span className="text-[10px] font-semibold">{n.label}</span></button>))}
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

      {modal?.type === "reset" && (
        <AppModal title="Reset All Data" onClose={closeModal}>
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center"><Icon name="trash" size={28} className="text-rose-500" /></div>
            <div><p className="font-bold text-slate-800">This will erase everything.</p><p className="text-sm text-slate-500 mt-1">All data in Supabase will be permanently deleted.</p></div>
          </div>
          <div className="mt-4">
            <Field label="Password">
              <div className="relative"><Icon name="lock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" value={resetPwd} onChange={e => { setResetPwd(e.target.value); setResetErr(false); }} onKeyDown={e => e.key === "Enter" && handleReset()} placeholder="Enter password…" className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-slate-50 ${resetErr ? "border-rose-400 focus:ring-rose-300" : "border-slate-200 focus:ring-indigo-400"}`} /></div>
              {resetErr && <p className="text-xs text-rose-500 mt-1 font-semibold">Incorrect password.</p>}
            </Field>
            <button onClick={handleReset} className="w-full bg-rose-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-rose-700">Delete All Data</button>
            <button onClick={closeModal} className="w-full mt-2 border-2 border-slate-200 text-slate-600 rounded-xl py-3 text-sm font-bold hover:bg-slate-50">Cancel</button>
          </div>
        </AppModal>
      )}
    </div>
  );
}
