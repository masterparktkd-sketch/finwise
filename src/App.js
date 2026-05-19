import { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmtK = (n) => {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return s + '$' + (a / 1e3).toFixed(1) + 'K';
  return s + '$' + a.toFixed(0);
};
const fmt$ = (n, d = 2) =>
  isNaN(+n)
    ? '—'
    : '$' + Math.abs(+n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n) => (isNaN(+n) ? '—' : (n >= 0 ? '+' : '') + (+n).toFixed(2) + '%');
const gainPct = (h) => (h.cost > 0 ? ((h.price - h.cost) / h.cost) * 100 : 0);

const PALETTE = ['#1d9e75','#378add','#7c3aed','#d85a30','#ba7517','#0f6e56','#2563eb','#9333ea','#b45309','#dc2626'];
const catColorMap = {};
let ci = 0;
const catColor = (cat) => {
  if (!catColorMap[cat]) catColorMap[cat] = PALETTE[ci++ % PALETTE.length];
  return catColorMap[cat];
};

// ─────────────────────────────────────────────
// TAX TABLES
// ─────────────────────────────────────────────
const BRACKETS = {
  single: [[11600,0.10],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[609350,0.35],[Infinity,0.37]],
  mfj:    [[23200,0.10],[94300,0.12],[201050,0.22],[383900,0.24],[487450,0.32],[731200,0.35],[Infinity,0.37]],
  hoh:    [[16550,0.10],[63100,0.12],[100500,0.22],[191950,0.24],[243700,0.32],[609350,0.35],[Infinity,0.37]],
};
const STD = { single: 13850, mfj: 27700, hoh: 20800 };

function calcFedTax(income, filing) {
  const br = BRACKETS[filing] || BRACKETS.mfj;
  let tax = 0, prev = 0;
  for (const [lim, rate] of br) {
    if (income > prev) tax += (Math.min(income, lim) - prev) * rate;
    prev = lim;
    if (lim >= income) break;
  }
  return Math.round(tax);
}

// ─────────────────────────────────────────────
// MONTE CARLO
// ─────────────────────────────────────────────
function monteCarlo(savings, contrib, ret, inflation, years, trials = 1000) {
  const mu = (ret - inflation) / 100;
  const sigma = 0.16;
  const res = [];
  for (let i = 0; i < trials; i++) {
    let bal = savings * 1000;
    for (let y = 0; y < years; y++) {
      const u1 = Math.random(), u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
      bal = bal * (1 + mu + sigma * z) + contrib * 1000;
    }
    res.push(bal);
  }
  res.sort((a, b) => a - b);
  const p = (pct) => res[Math.floor(trials * pct)];
  return { p10: p(0.1), p25: p(0.25), p50: p(0.5), p75: p(0.75), p90: p(0.9) };
}

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const G = {
  bg: '#f4f3ef', surf: '#fff', surf2: '#f0ede6',
  accent: '#1d9e75', am: '#0f6e56', al: '#e1f5ee',
  danger: '#d85a30', dl: '#faece7',
  warn: '#ba7517', wl: '#faeeda',
  blue: '#378add', bl: '#e6f1fb',
  ai: '#7c3aed', ail: '#f3f0ff',
  bdr: 'rgba(0,0,0,0.08)', bdr2: 'rgba(0,0,0,0.15)',
  tx: '#18181a', tx2: '#58575a', tx3: '#8a8885',
};

const S = {
  sidebar: { width: 220, background: G.surf, borderRight: `0.5px solid ${G.bdr}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
  logo: { padding: '1.1rem', borderBottom: `0.5px solid ${G.bdr}`, display: 'flex', alignItems: 'center', gap: 8 },
  logoMark: { width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#1d9e75,#0f6e56)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 },
  navSection: { padding: '0.4rem 0.8rem 0.1rem', fontSize: 10, fontWeight: 700, color: G.tx3, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '0.4rem' },
  navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '0.5rem 0.85rem', margin: '0.1rem 0.5rem', borderRadius: 6, cursor: 'pointer', color: active ? G.am : G.tx2, background: active ? G.al : 'transparent', fontWeight: active ? 700 : 500, fontSize: 13, transition: 'all 0.15s', userSelect: 'none' }),
  topbar: { height: 52, background: G.surf, borderBottom: `0.5px solid ${G.bdr}`, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 },
  content: { flex: 1, padding: '1.2rem 1.5rem 2rem', overflowY: 'auto' },
  card: { background: G.surf, border: `0.5px solid ${G.bdr}`, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.1rem', borderBottom: `0.5px solid ${G.bdr}` },
  cardBody: { padding: '1rem 1.1rem' },
  grid: (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: '1rem' }),
  btn: (v = 'primary') => ({
    height: 32, padding: '0 0.9rem', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
    background: v === 'primary' ? G.accent : v === 'danger' ? G.dl : v === 'ai' ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : G.surf2,
    color: v === 'primary' ? '#fff' : v === 'danger' ? G.danger : v === 'ai' ? '#fff' : G.tx2,
  }),
  input: { height: 34, border: `0.5px solid ${G.bdr2}`, borderRadius: 6, padding: '0 0.7rem', fontFamily: 'inherit', fontSize: 13, background: G.surf, color: G.tx, outline: 'none', width: '100%' },
  select: { height: 34, border: `0.5px solid ${G.bdr2}`, borderRadius: 6, padding: '0 0.7rem', fontFamily: 'inherit', fontSize: 13, background: G.surf, color: G.tx, outline: 'none', width: '100%', cursor: 'pointer' },
  label: { fontSize: 12, fontWeight: 600, color: G.tx2, marginBottom: 3, display: 'block' },
  tbl: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
};

// ─────────────────────────────────────────────
// TINY COMPONENTS
// ─────────────────────────────────────────────
const Btn = ({ children, variant = 'primary', sm, full, onClick, style = {} }) => (
  <button onClick={onClick} style={{ ...S.btn(variant), ...(sm ? { height: 27, padding: '0 0.6rem', fontSize: 12 } : {}), ...(full ? { width: '100%', justifyContent: 'center' } : {}), ...style }}>{children}</button>
);
const Card = ({ children, style = {} }) => <div style={{ ...S.card, ...style }}>{children}</div>;
const CardHead = ({ children }) => <div style={S.cardHead}>{children}</div>;
const CardBody = ({ children, style = {} }) => <div style={{ ...S.cardBody, ...style }}>{children}</div>;
const Label = ({ children }) => <label style={S.label}>{children}</label>;
const FGroup = ({ label, children }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><Label>{label}</Label>{children}</div>;
const Divider = () => <div style={{ height: 0.5, background: G.bdr, margin: '0.7rem 0' }} />;
const Badge = ({ children, color = G.accent, bg = G.al }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>{children}</span>
);
const Mono = ({ children, color, style = {} }) => (
  <span style={{ fontFamily: "'DM Mono', monospace", ...(color ? { color } : {}), ...style }}>{children}</span>
);

// ─────────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────────
function DonutChart({ groups, total }) {
  const r = 52, cx = 65, cy = 65, sw = 18;
  const circ = 2 * Math.PI * r;
  let off = 0;
  const segs = groups.map(([cat, val]) => {
    const dash = (val / total) * circ;
    const seg = (
      <circle key={cat} cx={cx} cy={cy} r={r} fill="none" stroke={catColor(cat)} strokeWidth={sw}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off}
        transform={`rotate(-90 ${cx} ${cy})`} />
    );
    off += dash;
    return seg;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={130} height={130} viewBox="0 0 130 130" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={G.surf2} strokeWidth={sw} />
        {segs}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 9, fontWeight: 700, fill: G.tx3, fontFamily: 'monospace' }}>
          {groups.length} cats
        </text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {groups.map(([cat, val]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: catColor(cat), flexShrink: 0 }} />
            <span style={{ flex: 1, color: G.tx2 }}>{cat}</span>
            <Mono style={{ fontSize: 12 }}>{((val / total) * 100).toFixed(1)}%</Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FIRE RING
// ─────────────────────────────────────────────
function FireRing({ score }) {
  const r = 48, cx = 60, cy = 60;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score < 30 ? G.danger : score < 70 ? G.warn : G.accent;
  return (
    <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={G.surf2} strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${filled} ${circ}`} strokeDashoffset={circ / 4}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'monospace' }}>{score}</span>
        <span style={{ fontSize: 9, color: G.tx3, fontWeight: 700, letterSpacing: '0.08em' }}>FIRE</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NAV CONFIG
// ─────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', section: 'Overview' },
  { id: 'portfolio', label: 'Portfolio', icon: '💼', section: 'Overview' },
  { id: 'retirement', label: 'Retirement', icon: '🏖', section: 'Planning' },
  { id: 'tax', label: 'Tax Planner', icon: '🧾', section: 'Planning' },
  { id: 'ai', label: 'AI Advisor', icon: '🤖', section: 'Insights', badge: 'AI' },
  { id: 'profile', label: 'Profile', icon: '👤', section: 'Settings' },
];

const PAGE_SUB = {
  dashboard: 'Overview', portfolio: 'All Holdings',
  retirement: 'Projections', tax: '2024 Federal',
  ai: 'Claude Powered', profile: 'Settings',
};

const QUICK = [
  'Analyze my portfolio', "What's my FIRE number?",
  'Tax optimization tips', 'Reduce portfolio risk',
  'Best retirement strategy', 'Diversification advice',
];

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('dashboard');
  const [holdings, setHoldings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fw_holdings') || '[]'); } catch { return []; }
  });
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fw_profile') || 'null'); } catch { return null; }
  });
  const [chat, setChat] = useState([{ role: 'ai', text: "👋 Hi! I'm your AI Financial Advisor. I can see your portfolio and profile. Ask me anything — portfolio analysis, tax tips, FIRE strategy, or retirement planning." }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [hForm, setHForm] = useState({ ticker: '', name: '', shares: '', cost: '', price: '', category: 'US Stocks' });
  const [pForm, setPForm] = useState(profile || { name: '', age: '', income: '', savings: '', fireTarget: '', otherAssets: '', filing: 'mfj' });
  const [retForm, setRetForm] = useState({ age: 30, targetAge: 65, savings: 100, contrib: 20, ret: 7, inflation: 3, spend: 60 });
  const [retResult, setRetResult] = useState(null);
  const [taxForm, setTaxForm] = useState({ income: 120000, filing: 'mfj', k401: 23000, deductions: 0, state: 5 });
  const [taxResult, setTaxResult] = useState(null);
  const chatEndRef = useRef(null);
  const nextId = useRef(200);

  useEffect(() => { localStorage.setItem('fw_holdings', JSON.stringify(holdings)); }, [holdings]);
  useEffect(() => { localStorage.setItem('fw_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const totalVal = holdings.reduce((s, h) => s + h.shares * h.price, 0);
  const netWorth = totalVal + (profile?.otherAssets || 0);
  const fireTarget = profile?.fireTarget || 0;
  const fireScore = fireTarget > 0 ? Math.min(100, Math.round((netWorth / fireTarget) * 100)) : 0;

  const addToast = (msg, type = '') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const addHolding = () => {
    const { ticker, name, shares, cost, price, category } = hForm;
    if (!ticker || !shares || !price) return addToast('Fill in ticker, shares and price.', 'error');
    setHoldings((h) => [...h, { id: nextId.current++, ticker: ticker.toUpperCase(), name: name || ticker.toUpperCase(), shares: +shares, cost: +cost || +price, price: +price, category }]);
    setShowAddModal(false);
    setHForm({ ticker: '', name: '', shares: '', cost: '', price: '', category: 'US Stocks' });
    addToast('Holding added!', 'success');
  };

  const removeHolding = (id) => { setHoldings((h) => h.filter((x) => x.id !== id)); addToast('Removed.', 'warn'); };

  const saveProfile = () => {
    const p = { ...pForm, age: +pForm.age, income: +pForm.income, savings: +pForm.savings, fireTarget: +pForm.fireTarget, otherAssets: +pForm.otherAssets };
    setProfile(p);
    addToast('Profile saved!', 'success');
  };

  const runRetirement = () => {
    const { age, targetAge, savings, contrib, ret, inflation, spend } = retForm;
    const years = Math.max(1, targetAge - age);
    const real = (ret - inflation) / 100;
    const fireNum = spend * 25 * 1000;
    let bal = savings * 1000;
    for (let y = 0; y < years; y++) bal = bal * (1 + real) + contrib * 1000;
    let fireYear = null;
    let tmp = savings * 1000;
    for (let y = 0; y <= 60; y++) { if (tmp >= fireNum) { fireYear = y; break; } tmp = tmp * (1 + real) + contrib * 1000; }
    const mc = monteCarlo(savings, contrib, ret, inflation, years);
    setRetResult({ bal, fireNum, surplus: bal - fireNum, fireYear, mc, years, age: +age });
  };

  const runTax = () => {
    const { income, filing, k401, deductions, state: statePct } = taxForm;
    const agi = Math.max(0, income - k401);
    const ded = Math.max(STD[filing] || 27700, +deductions);
    const taxable = Math.max(0, agi - ded);
    const fed = calcFedTax(taxable, filing);
    const stateTax = Math.round(agi * statePct / 100);
    const fica = Math.round(Math.min(income, 160200) * 0.0765);
    const total = fed + stateTax + fica;
    const eff = income > 0 ? (total / income) * 100 : 0;
    setTaxResult({ agi, ded, taxable, fed, stateTax, fica, total, eff, takeHome: income - total - k401, filing, income: +income });
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    setChat((c) => [...c, { role: 'user', text }]);
    setChatLoading(true);
    const ctx = `USER PROFILE: ${profile ? `${profile.name || '?'}, age ${profile.age}, income ${fmt$(profile.income)}, savings rate ${profile.income > 0 ? ((profile.savings / profile.income) * 100).toFixed(0) : 0}%, FIRE target ${fmtK(fireTarget)}` : 'Not set'}
PORTFOLIO (${holdings.length} positions, total ${fmtK(totalVal)}): ${holdings.map((h) => `${h.ticker} ${h.shares}sh@$${h.price}=${fmtK(h.shares * h.price)} [${h.category}] ${fmtPct(gainPct(h))}`).join('; ')}
Net worth: ${fmtK(netWorth)} | FIRE score: ${fireScore}/100`;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: `You are an expert AI financial advisor in the Finwise app. Use the user's real data below to give specific, personalized advice. Be concise, use **bold** for key numbers. Under 250 words unless complexity demands more.\n\n${ctx}`,
          messages: [{ role: 'user', content: text }],
        }),
      });
      const data = await res.json();
      const reply = data.content?.find((b) => b.type === 'text')?.text || "Sorry, I couldn't process that.";
      setChat((c) => [...c, { role: 'ai', text: reply }]);
    } catch {
      setChat((c) => [...c, { role: 'ai', text: '⚠️ Connection error. Please try again.' }]);
    }
    setChatLoading(false);
  };

  // ── Dashboard ──────────────────────────────
  const renderDashboard = () => {
    const totalCost = holdings.reduce((s, h) => s + h.shares * h.cost, 0);
    const totalGain = totalVal - totalCost;
    const gainP = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    const kpis = [
      { label: 'Net Worth', val: fmtK(netWorth), sub: 'Total tracked assets', color: G.accent, icon: '💰' },
      { label: 'Portfolio', val: fmtK(totalVal), sub: totalCost > 0 ? fmtPct(gainP) + ' all-time' : 'Add holdings', color: G.blue, icon: '📈' },
      { label: 'Total Gain', val: fmtK(totalGain), sub: fmtPct(gainP) + ' return', color: totalGain >= 0 ? G.accent : G.danger, icon: totalGain >= 0 ? '🟢' : '🔴' },
      { label: 'FIRE Score', val: `${fireScore}/100`, sub: fireTarget > 0 ? `Target: ${fmtK(fireTarget)}` : 'Set target in Profile', color: '#f97316', icon: '🔥' },
    ];
    const groups = Object.entries(
      holdings.reduce((m, h) => { m[h.category] = (m[h.category] || 0) + h.shares * h.price; return m; }, {})
    ).sort((a, b) => b[1] - a[1]);
    const top5 = [...holdings].sort((a, b) => b.shares * b.price - a.shares * a.price).slice(0, 5);
    return (
      <div>
        <div style={S.grid('repeat(4,1fr)')}>
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardBody>
                <div style={{ fontSize: 11.5, color: G.tx3, fontWeight: 600, marginBottom: 4 }}>{k.icon} {k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'monospace', marginBottom: 2 }}>{k.val}</div>
                <div style={{ fontSize: 11.5, color: G.tx3 }}>{k.sub}</div>
              </CardBody>
            </Card>
          ))}
        </div>
        <div style={{ ...S.grid('1fr 1fr'), marginTop: '1rem' }}>
          <Card>
            <CardHead><span style={{ fontWeight: 700, fontSize: 13 }}>Portfolio Allocation</span></CardHead>
            <CardBody>
              {holdings.length
                ? <DonutChart groups={groups} total={totalVal} />
                : <div style={{ textAlign: 'center', color: G.tx3, padding: '1.5rem 0', fontSize: 13 }}>Add holdings to see allocation</div>}
            </CardBody>
          </Card>
          <Card>
            <CardHead><span style={{ fontWeight: 700, fontSize: 13 }}>FIRE Progress</span></CardHead>
            <CardBody style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
              <FireRing score={fireScore} />
              {fireTarget > 0 ? (
                <div style={{ width: '100%' }}>
                  <div style={{ height: 7, background: G.surf2, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${fireScore}%`, background: G.accent, borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: G.tx3, marginTop: 4 }}>
                    <span>{fmtK(netWorth)} saved</span><span>{fmtK(fireTarget)} target</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: G.tx3, textAlign: 'center' }}>
                  Set FIRE target in{' '}
                  <button onClick={() => setPage('profile')} style={{ background: 'none', border: 'none', color: G.accent, cursor: 'pointer', fontWeight: 600 }}>Profile</button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
        <Card style={{ marginTop: '1rem' }}>
          <CardHead>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Holdings Summary</span>
            <Btn variant="ghost" sm onClick={() => setPage('portfolio')}>View All →</Btn>
          </CardHead>
          {top5.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.tbl}>
                <thead>
                  <tr style={{ background: G.surf2 }}>
                    {['Ticker', 'Shares', 'Price', 'Value', 'Gain/Loss'].map((h) => (
                      <th key={h} style={{ padding: '0.45rem 0.7rem', textAlign: h === 'Ticker' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: G.tx3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top5.map((h) => {
                    const val = h.shares * h.price, gp = gainPct(h), gl = (h.price - h.cost) * h.shares;
                    return (
                      <tr key={h.id} style={{ borderTop: `0.5px solid ${G.bdr}` }}>
                        <td style={{ padding: '0.55rem 0.7rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: catColor(h.ticker), flexShrink: 0 }} />
                            <strong>{h.ticker}</strong>
                            <span style={{ color: G.tx3, fontSize: 11 }}>{h.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.55rem 0.7rem' }}><Mono>{h.shares}</Mono></td>
                        <td style={{ textAlign: 'right', padding: '0.55rem 0.7rem' }}><Mono>{fmt$(h.price)}</Mono></td>
                        <td style={{ textAlign: 'right', padding: '0.55rem 0.7rem' }}><Mono style={{ fontWeight: 700 }}>{fmtK(val)}</Mono></td>
                        <td style={{ textAlign: 'right', padding: '0.55rem 0.7rem' }}>
                          <Mono color={gp >= 0 ? G.accent : G.danger}>{fmtPct(gp)}</Mono>
                          <div style={{ fontSize: 11, color: gp >= 0 ? G.accent : G.danger }}>{fmtK(gl)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: G.tx3, fontSize: 13 }}>
              No holdings yet.{' '}
              <button onClick={() => setShowAddModal(true)} style={{ background: 'none', border: 'none', color: G.accent, cursor: 'pointer', fontWeight: 600 }}>Add one</button>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // ── Portfolio ──────────────────────────────
  const renderPortfolio = () => {
    const sorted = [...holdings].sort((a, b) => b.shares * b.price - a.shares * a.price);
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Holdings</div>
            <div style={{ color: G.tx3, fontSize: 12 }}>All tracked positions</div>
          </div>
          <Btn onClick={() => setShowAddModal(true)}>+ Add Holding</Btn>
        </div>
        <Card>
          {sorted.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.tbl}>
                <thead>
                  <tr style={{ background: G.surf2 }}>
                    {['Ticker / Name', 'Category', 'Shares', 'Cost', 'Price', 'Value', 'Gain %', ''].map((h) => (
                      <th key={h} style={{ padding: '0.45rem 0.7rem', textAlign: ['Shares','Cost','Price','Value','Gain %'].includes(h) ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: G.tx3, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((h) => {
                    const val = h.shares * h.price, gp = gainPct(h), gl = (h.price - h.cost) * h.shares;
                    return (
                      <tr key={h.id} style={{ borderTop: `0.5px solid ${G.bdr}` }}>
                        <td style={{ padding: '0.55rem 0.7rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: catColor(h.ticker), flexShrink: 0 }} />
                            <strong>{h.ticker}</strong>
                            <span style={{ color: G.tx3, fontSize: 11 }}>{h.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.55rem 0.7rem' }}><Badge color={G.am} bg={G.al}>{h.category}</Badge></td>
                        {[h.shares, fmt$(h.cost), fmt$(h.price), fmtK(val)].map((v, i) => (
                          <td key={i} style={{ textAlign: 'right', padding: '0.55rem 0.7rem' }}><Mono>{v}</Mono></td>
                        ))}
                        <td style={{ textAlign: 'right', padding: '0.55rem 0.7rem' }}>
                          <Mono color={gp >= 0 ? G.accent : G.danger} style={{ fontWeight: 700 }}>{fmtPct(gp)}</Mono>
                          <div style={{ fontSize: 11, color: gp >= 0 ? G.accent : G.danger }}>{fmtK(gl)}</div>
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem' }}>
                          <button onClick={() => removeHolding(h.id)} style={{ background: G.dl, border: 'none', color: G.danger, borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: G.tx3 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <p style={{ fontSize: 13 }}>No holdings yet.</p>
              <Btn onClick={() => setShowAddModal(true)} style={{ marginTop: 12 }}>+ Add Holding</Btn>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // ── Retirement ─────────────────────────────
  const renderRetirement = () => (
    <div>
      <div style={S.grid('1fr 1fr')}>
        <Card>
          <CardHead><span style={{ fontWeight: 700, fontSize: 13 }}>Retirement Parameters</span></CardHead>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={S.grid('1fr 1fr')}>
                <FGroup label="Current Age"><input style={S.input} type="number" value={retForm.age} onChange={(e) => setRetForm((f) => ({ ...f, age: +e.target.value }))} /></FGroup>
                <FGroup label="Retirement Age"><input style={S.input} type="number" value={retForm.targetAge} onChange={(e) => setRetForm((f) => ({ ...f, targetAge: +e.target.value }))} /></FGroup>
              </div>
              <div style={S.grid('1fr 1fr')}>
                <FGroup label="Current Savings ($K)"><input style={S.input} type="number" value={retForm.savings} onChange={(e) => setRetForm((f) => ({ ...f, savings: +e.target.value }))} /></FGroup>
                <FGroup label="Annual Contrib ($K)"><input style={S.input} type="number" value={retForm.contrib} onChange={(e) => setRetForm((f) => ({ ...f, contrib: +e.target.value }))} /></FGroup>
              </div>
              <div style={S.grid('1fr 1fr')}>
                <FGroup label="Expected Return (%)"><input style={S.input} type="number" value={retForm.ret} onChange={(e) => setRetForm((f) => ({ ...f, ret: +e.target.value }))} /></FGroup>
                <FGroup label="Inflation (%)"><input style={S.input} type="number" value={retForm.inflation} onChange={(e) => setRetForm((f) => ({ ...f, inflation: +e.target.value }))} /></FGroup>
              </div>
              <FGroup label="Annual Retirement Spend ($K)"><input style={S.input} type="number" value={retForm.spend} onChange={(e) => setRetForm((f) => ({ ...f, spend: +e.target.value }))} /></FGroup>
              <Btn full onClick={runRetirement}>🧮 Run Projection</Btn>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHead><span style={{ fontWeight: 700, fontSize: 13 }}>Projection Results</span></CardHead>
          <CardBody>
            {retResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Age ' + retForm.targetAge, 'Projected Balance', fmtK(retResult.bal), G.tx, G.surf2],
                  ['FIRE', '4% Rule Target (25×)', fmtK(retResult.fireNum), retResult.surplus >= 0 ? G.am : G.danger, retResult.surplus >= 0 ? G.al : G.dl],
                  retResult.fireYear !== null ? [retResult.age + retResult.fireYear, 'Earliest FIRE Age', retResult.fireYear === 0 ? 'Now!' : `in ${retResult.fireYear} yrs`, G.accent, G.surf2] : null,
                  ['Δ', retResult.surplus >= 0 ? 'Surplus' : 'Shortfall', fmtK(Math.abs(retResult.surplus)), retResult.surplus >= 0 ? G.accent : G.danger, G.surf2],
                ].filter(Boolean).map(([yr, lbl, val, vc, bg]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.7rem', background: bg, borderRadius: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: G.accent, width: 50, flexShrink: 0 }}>{yr}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{lbl}</span>
                    <Mono color={vc} style={{ fontWeight: 700 }}>{val}</Mono>
                  </div>
                ))}
                <Divider />
                <div style={{ fontSize: 12, color: G.tx3 }}>Real return: <strong>{(retForm.ret - retForm.inflation).toFixed(1)}%</strong> over <strong>{retResult.years} years</strong></div>
              </div>
            ) : <div style={{ textAlign: 'center', color: G.tx3, padding: '2rem 0', fontSize: 13 }}>Run the projection to see results</div>}
          </CardBody>
        </Card>
      </div>
      <Card style={{ marginTop: '1rem' }}>
        <CardHead>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Monte Carlo Simulation</span>
          <Badge color={G.ai} bg={G.ail}>⚛ 1,000 trials</Badge>
        </CardHead>
        <CardBody>
          {retResult ? (() => {
            const { mc } = retResult;
            const bands = [['P90', mc.p90, '#1d9e75'], ['P75', mc.p75, '#378add'], ['P50', mc.p50, '#7c3aed'], ['P25', mc.p25, '#ba7517'], ['P10', mc.p10, '#d85a30']];
            return (
              <div>
                <p style={{ fontSize: 12, color: G.tx3, marginBottom: 12 }}>Distribution of 1,000 simulated market scenarios (σ=16% volatility).</p>
                {bands.map(([lbl, val, color]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12 }}>
                    <span style={{ width: 30, fontWeight: 700, color }}>{lbl}</span>
                    <div style={{ flex: 1, height: 16, background: G.surf2, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(4, (val / mc.p90) * 100).toFixed(1)}%`, background: color + '40', border: `1.5px solid ${color}`, borderRadius: 4 }} />
                    </div>
                    <Mono color={color} style={{ width: 70, textAlign: 'right', fontWeight: 700, fontSize: 11.5 }}>{fmtK(val)}</Mono>
                  </div>
                ))}
                <Divider />
                <div style={{ fontSize: 11.5, color: G.tx3 }}>50% chance portfolio exceeds <strong>{fmtK(mc.p50)}</strong> by age {retForm.targetAge}. Best 10%: <strong>{fmtK(mc.p90)}</strong>.</div>
              </div>
            );
          })() : <div style={{ textAlign: 'center', color: G.tx3, padding: '1.5rem 0', fontSize: 13 }}>Run projection to see simulation</div>}
        </CardBody>
      </Card>
    </div>
  );

  // ── Tax ────────────────────────────────────
  const renderTax = () => (
    <div style={S.grid('1fr 1fr')}>
      <Card>
        <CardHead><span style={{ fontWeight: 700, fontSize: 13 }}>Tax Calculator (2024)</span></CardHead>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FGroup label="Gross Income ($)"><input style={S.input} type="number" value={taxForm.income} onChange={(e) => setTaxForm((f) => ({ ...f, income: +e.target.value }))} /></FGroup>
            <FGroup label="Filing Status">
              <select style={S.select} value={taxForm.filing} onChange={(e) => setTaxForm((f) => ({ ...f, filing: e.target.value }))}>
                <option value="single">Single</option>
                <option value="mfj">Married Filing Jointly</option>
                <option value="hoh">Head of Household</option>
              </select>
            </FGroup>
            <div style={S.grid('1fr 1fr')}>
              <FGroup label="Pre-tax 401(k) ($)"><input style={S.input} type="number" value={taxForm.k401} onChange={(e) => setTaxForm((f) => ({ ...f, k401: +e.target.value }))} /></FGroup>
              <FGroup label="Other Deductions ($)"><input style={S.input} type="number" value={taxForm.deductions} onChange={(e) => setTaxForm((f) => ({ ...f, deductions: +e.target.value }))} /></FGroup>
            </div>
            <FGroup label="State Tax Rate (%)"><input style={S.input} type="number" step="0.1" value={taxForm.state} onChange={(e) => setTaxForm((f) => ({ ...f, state: +e.target.value }))} /></FGroup>
            <Btn full onClick={runTax}>🧮 Calculate Tax</Btn>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHead><span style={{ fontWeight: 700, fontSize: 13 }}>Tax Breakdown</span></CardHead>
        <CardBody>
          {taxResult ? (
            <div>
              <div style={{ background: G.al, border: `0.5px solid #a7dfcc`, borderRadius: 6, padding: '0.8rem 1rem', marginBottom: '0.8rem' }}>
                <div style={{ fontSize: 11, color: G.am, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Tax Burden</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: G.am, fontFamily: 'monospace' }}>{fmt$(taxResult.total, 0)}</div>
                <div style={{ fontSize: 12, color: G.am }}>Effective rate: {taxResult.eff.toFixed(1)}%</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.tx3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Federal Brackets</div>
              {BRACKETS[taxResult.filing].map(([lim, rate], i) => {
                const prev = i > 0 ? BRACKETS[taxResult.filing][i - 1][0] : 0;
                if (taxResult.taxable <= prev) return null;
                const taxed = Math.min(taxResult.taxable, lim) - prev;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ width: 32, fontWeight: 700, color: G.accent }}>{(rate * 100).toFixed(0)}%</span>
                    <span style={{ flex: 1, color: G.tx2 }}>${prev.toLocaleString()} – {lim === Infinity ? '∞' : '$' + lim.toLocaleString()}</span>
                    <Mono style={{ fontWeight: 600 }}>{fmt$(taxed * rate, 0)}</Mono>
                  </div>
                );
              })}
              <Divider />
              {[['AGI', fmt$(taxResult.agi, 0)], ['Deduction', `-${fmt$(taxResult.ded, 0)}`], ['Taxable', fmt$(taxResult.taxable, 0)]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span style={{ color: G.tx3 }}>{l}</span><Mono>{v}</Mono></div>
              ))}
              <Divider />
              {[['Federal Tax', fmt$(taxResult.fed, 0)], [`State Tax (~${taxForm.state}%)`, fmt$(taxResult.stateTax, 0)], ['FICA (7.65%)', fmt$(taxResult.fica, 0)]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span style={{ color: G.tx3 }}>{l}</span><Mono>{v}</Mono></div>
              ))}
              <Divider />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span>Take-Home Pay</span>
                <Mono color={G.accent} style={{ fontWeight: 700 }}>{fmt$(taxResult.takeHome, 0)}</Mono>
              </div>
            </div>
          ) : <div style={{ textAlign: 'center', color: G.tx3, padding: '2rem 0', fontSize: 13 }}>Enter income to calculate</div>}
        </CardBody>
      </Card>
    </div>
  );

  // ── AI ─────────────────────────────────────
  const renderAI = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>AI Financial Advisor</span>
            <span style={{ background: G.ail, color: G.ai, border: `0.5px solid #c4b5fd`, borderRadius: 4, fontSize: 11, fontWeight: 700, padding: '1px 6px' }}>✨ Claude</span>
          </div>
          <div style={{ color: G.tx3, fontSize: 12 }}>Ask anything about your finances</div>
        </div>
        <Btn variant="ghost" sm onClick={() => setChat([{ role: 'ai', text: 'Chat cleared. How can I help?' }])}>🗑 Clear</Btn>
      </div>
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ height: 400, overflowY: 'auto', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', gap: 2 }}>
              <div
                style={{ padding: '0.5rem 0.8rem', borderRadius: 10, fontSize: 13, lineHeight: 1.5, background: m.role === 'user' ? G.accent : G.surf2, color: m.role === 'user' ? '#fff' : G.tx, borderBottomRightRadius: m.role === 'user' ? 3 : 10, borderBottomLeftRadius: m.role === 'ai' ? 3 : 10 }}
                dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') }}
              />
              <div style={{ fontSize: 10, color: G.tx3, textAlign: m.role === 'user' ? 'right' : 'left' }}>{m.role === 'user' ? 'You' : '🤖 Finwise AI'}</div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ alignSelf: 'flex-start', background: G.surf2, borderRadius: 10, padding: '0.5rem 0.9rem', display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: G.tx3, display: 'inline-block', animation: `pulse 0.9s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0.8rem', borderTop: `0.5px solid ${G.bdr}` }}>
          <input
            style={{ ...S.input, flex: 1 }}
            placeholder="Ask about your portfolio, FIRE strategy, tax tips..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
          />
          <Btn variant="ai" onClick={sendChat} style={{ flexShrink: 0 }}>Send</Btn>
        </div>
      </Card>
      <div style={{ fontSize: 12, color: G.tx3, marginBottom: 8 }}>Quick Actions</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {QUICK.map((q) => (
          <button key={q} onClick={() => setChatInput(q)} style={{ ...S.btn('ghost'), height: 29, fontSize: 12, border: `0.5px solid ${G.bdr2}` }}>{q}</button>
        ))}
      </div>
    </div>
  );

  // ── Profile ────────────────────────────────
  const renderProfile = () => {
    const savingsRate = pForm.income > 0 ? (pForm.savings / pForm.income) * 100 : 0;
    return (
      <div style={S.grid('1fr 1fr')}>
        <Card>
          <CardHead><span style={{ fontWeight: 700, fontSize: 13 }}>Personal Information</span></CardHead>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FGroup label="Full Name"><input style={S.input} placeholder="Alex Johnson" value={pForm.name} onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))} /></FGroup>
              <div style={S.grid('1fr 1fr')}>
                <FGroup label="Age"><input style={S.input} type="number" placeholder="30" value={pForm.age} onChange={(e) => setPForm((f) => ({ ...f, age: e.target.value }))} /></FGroup>
                <FGroup label="Filing Status">
                  <select style={S.select} value={pForm.filing} onChange={(e) => setPForm((f) => ({ ...f, filing: e.target.value }))}>
                    <option value="single">Single</option>
                    <option value="mfj">Married Filing Jointly</option>
                    <option value="hoh">Head of Household</option>
                  </select>
                </FGroup>
              </div>
              <div style={S.grid('1fr 1fr')}>
                <FGroup label="Annual Income ($)"><input style={S.input} type="number" placeholder="100000" value={pForm.income} onChange={(e) => setPForm((f) => ({ ...f, income: e.target.value }))} /></FGroup>
                <FGroup label="Annual Savings ($)"><input style={S.input} type="number" placeholder="20000" value={pForm.savings} onChange={(e) => setPForm((f) => ({ ...f, savings: e.target.value }))} /></FGroup>
              </div>
              <FGroup label="FIRE Target ($)">
                <input style={S.input} type="number" placeholder="1500000" value={pForm.fireTarget} onChange={(e) => setPForm((f) => ({ ...f, fireTarget: e.target.value }))} />
                <span style={{ fontSize: 11, color: G.tx3, marginTop: 2 }}>Annual spend × 25 (4% rule)</span>
              </FGroup>
              <FGroup label="Other Assets ($)">
                <input style={S.input} type="number" placeholder="0" value={pForm.otherAssets} onChange={(e) => setPForm((f) => ({ ...f, otherAssets: e.target.value }))} />
                <span style={{ fontSize: 11, color: G.tx3, marginTop: 2 }}>Real estate equity, business value…</span>
              </FGroup>
              <Btn full onClick={saveProfile}>💾 Save Profile</Btn>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHead><span style={{ fontWeight: 700, fontSize: 13 }}>Financial Overview</span></CardHead>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['💰 Net Worth', fmtK(netWorth), G.accent],
                ['📈 Portfolio', fmtK(totalVal), G.blue],
                ['💵 Annual Income', fmtK(+pForm.income), G.accent],
                ['🏦 Savings Rate', savingsRate.toFixed(1) + '%', savingsRate >= 20 ? G.accent : G.warn],
                ['🔥 FIRE Progress', fireScore + '%', '#f97316'],
              ].map(([lbl, val, color]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.7rem', background: G.surf2, borderRadius: 6 }}>
                  <span style={{ fontSize: 13 }}>{lbl}</span>
                  <Mono color={color} style={{ fontWeight: 700, fontSize: 13 }}>{val}</Mono>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  };

  // ── MAIN RENDER ────────────────────────────
  const sections = ['Overview', 'Planning', 'Insights', 'Settings'];
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: G.bg, fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, color: G.tx }}>
      {/* SIDEBAR */}
      <nav style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoMark}>F</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>Fin<span style={{ color: G.accent }}>wise</span></div>
        </div>
        <div style={{ flex: 1, padding: '0.4rem 0', overflowY: 'auto' }}>
          {sections.map((section) => (
            <div key={section}>
              <div style={S.navSection}>{section}</div>
              {NAV.filter((n) => n.section === section).map((n) => (
                <div key={n.id} style={S.navItem(page === n.id)} onClick={() => setPage(n.id)}>
                  <span>{n.icon}</span> {n.label}
                  {n.badge && <span style={{ marginLeft: 'auto', background: G.accent, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{n.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '0.8rem', borderTop: `0.5px solid ${G.bdr}` }}>
          <div onClick={() => setPage('profile')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.6rem', borderRadius: 6, cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#378add,#1d9e75)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {(profile?.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'Set up profile'}</div>
              <div style={{ fontSize: 11, color: G.tx3 }}>{profile?.age ? `Age ${profile.age} · ${fmtK(profile.income)}/yr` : 'No data yet'}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <div style={S.topbar}>
          <div style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>
            {NAV.find((n) => n.id === page)?.icon} {NAV.find((n) => n.id === page)?.label}
            <span style={{ color: G.tx3, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{PAGE_SUB[page]}</span>
          </div>
          <button style={S.btn('ghost')} onClick={() => setShowAddModal(true)}>+ Add Holding</button>
          <button style={S.btn('ai')} onClick={() => setPage('ai')}>✨ AI Advisor</button>
        </div>
        <div style={S.content}>
          {page === 'dashboard'  && renderDashboard()}
          {page === 'portfolio'  && renderPortfolio()}
          {page === 'retirement' && renderRetirement()}
          {page === 'tax'        && renderTax()}
          {page === 'ai'         && renderAI()}
          {page === 'profile'    && renderProfile()}
        </div>
      </div>

      {/* ADD HOLDING MODAL */}
      {showAddModal && (
        <div onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: G.surf, borderRadius: 14, width: '90%', maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem', borderBottom: `0.5px solid ${G.bdr}` }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Add Holding</span>
              <button onClick={() => setShowAddModal(false)} style={{ background: G.surf2, border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: G.tx3 }}>✕</button>
            </div>
            <div style={{ padding: '1.1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={S.grid('1fr 1fr')}>
                  <FGroup label="Ticker Symbol">
                    <input style={{ ...S.input, textTransform: 'uppercase' }} placeholder="AAPL" value={hForm.ticker} onChange={(e) => setHForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))} />
                  </FGroup>
                  <FGroup label="Category">
                    <select style={S.select} value={hForm.category} onChange={(e) => setHForm((f) => ({ ...f, category: e.target.value }))}>
                      {['US Stocks','International','Bonds','ETF/Index','Crypto','Real Estate','Commodities','Cash','Other'].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </FGroup>
                </div>
                <FGroup label="Company / Fund Name"><input style={S.input} placeholder="Apple Inc." value={hForm.name} onChange={(e) => setHForm((f) => ({ ...f, name: e.target.value }))} /></FGroup>
                <div style={S.grid('1fr 1fr')}>
                  <FGroup label="Shares"><input style={S.input} type="number" placeholder="10" value={hForm.shares} onChange={(e) => setHForm((f) => ({ ...f, shares: e.target.value }))} /></FGroup>
                  <FGroup label="Cost Basis ($/share)"><input style={S.input} type="number" placeholder="150.00" value={hForm.cost} onChange={(e) => setHForm((f) => ({ ...f, cost: e.target.value }))} /></FGroup>
                </div>
                <FGroup label="Current Price ($/share)"><input style={S.input} type="number" placeholder="195.00" value={hForm.price} onChange={(e) => setHForm((f) => ({ ...f, price: e.target.value }))} /></FGroup>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0.8rem 1.1rem', borderTop: `0.5px solid ${G.bdr}` }}>
              <Btn variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Btn>
              <Btn onClick={addHolding}>+ Add</Btn>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div style={{ position: 'fixed', bottom: '1.2rem', right: '1.2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ background: t.type === 'success' ? G.am : t.type === 'error' ? G.danger : t.type === 'warn' ? G.warn : G.tx, color: '#fff', padding: '0.55rem 1rem', borderRadius: 6, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, maxWidth: 300 }}>
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warn' ? '⚠️' : 'ℹ️'} {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
