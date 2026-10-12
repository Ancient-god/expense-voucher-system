import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = axios.create({ baseURL: API });

const statuses = ['Draft', 'Submitted', 'Approved', 'Rejected'];
const categories = [
  'Travel & Logistics',
  'Food & Hospitality',
  'Accommodation & Lodging',
  'Office Supplies',
  'Hardware & Accessories',
  'Cloud & Internet',
  'Conference & Training',
  'Miscellaneous',
];

const blank = () => ({
  voucherDate: new Date().toISOString().slice(0, 10),
  expenseDate: new Date().toISOString().slice(0, 10),
  department: '',
  title: '',
  category: 'Travel & Logistics',
  description: '',
  amount: '',
});

const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function exportToCSV(items) {
  if (!items || !items.length) {
    alert('No records available to export.');
    return;
  }
  const headers = ['Voucher No', 'Department', 'Expense Title', 'Category', 'Amount (INR)', 'Status', 'Expense Date', 'Voucher Date', 'Rejection Reason'];
  const rows = items.map((v) => [
    `"${v.voucherNumber || ''}"`,
    `"${v.department || ''}"`,
    `"${(v.title || v.expenseTitle || '').replace(/"/g, '""')}"`,
    `"${v.category || ''}"`,
    `"${v.amount || 0}"`,
    `"${v.status || ''}"`,
    `"${v.expenseDate ? new Date(v.expenseDate).toLocaleDateString() : ''}"`,
    `"${v.voucherDate ? new Date(v.voucherDate).toLocaleDateString() : ''}"`,
    `"${(v.rejectionReason || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Voucher_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexvoucher-session') || localStorage.getItem('evms-session') || 'null');
    } catch {
      return null;
    }
  });

  const [mode, setMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
  });

  const [notice, setNotice] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const request = useCallback(
    (config) =>
      api({
        ...config,
        headers: {
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
          ...(config.headers || {}),
        },
      }),
    [session]
  );

  const message = (text, type = 'success') => setNotice({ text, type });

  const logout = () => {
    localStorage.removeItem('nexvoucher-session');
    localStorage.removeItem('evms-session');
    setSession(null);
    setNotice({ text: '', type: '' });
  };

  const authenticate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice({ text: '', type: '' });
    try {
      const { data } = await api.post(`/auth/${mode}`, authForm);
      const next = { token: data.token, user: data.user };
      localStorage.setItem('nexvoucher-session', JSON.stringify(next));
      setSession(next);
    } catch (err) {
      message(err.response?.data?.message || 'Unable to sign in', 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!session?.token) return;
    request({ method: 'get', url: '/auth/me' })
      .then(({ data }) => {
        const next = { ...session, user: data.user };
        setSession(next);
        localStorage.setItem('nexvoucher-session', JSON.stringify(next));
      })
      .catch(logout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session?.token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-header-row">
            <div className="brand-mark">NV</div>
            <div>
              <div className="eyebrow">Enterprise Suite</div>
              <h1 style={{ margin: 0 }}>NexVoucher</h1>
            </div>
          </div>
          <p className="muted">
            Automated corporate expense settlement, approval workflow, and ledger verification portal.
          </p>
          {notice.text && (
            <div className={`notice ${notice.type}`}>
              {notice.text}
            </div>
          )}
          <form onSubmit={authenticate} className="auth-form-stack">
            {mode === 'register' && (
              <>
                <Field
                  label="Full Name"
                  placeholder="e.g. prathvi raj shingle"
                  value={authForm.name}
                  onChange={(v) => setAuthForm({ ...authForm, name: v })}
                  required
                />
                <Field
                  label="Department"
                  placeholder="e.g. Engineering / Finance"
                  value={authForm.department}
                  onChange={(v) => setAuthForm({ ...authForm, department: v })}
                  required
                />
              </>
            )}
            <Field
              label="Corporate Email"
              type="email"
              placeholder="user@enterprise.com"
              value={authForm.email}
              onChange={(v) => setAuthForm({ ...authForm, email: v })}
              required
            />
            <Field
              label="Password"
              type="password"
              placeholder="••••••••"
              value={authForm.password}
              onChange={(v) => setAuthForm({ ...authForm, password: v })}
              required
              minLength={8}
            />
            <button className="primary full" disabled={busy}>
              {busy ? 'Verifying Credentials…' : mode === 'login' ? 'Sign In to Workspace' : 'Create Employee Account'}
            </button>
          </form>
          <div className="auth-footer">
            {mode === 'login' ? "Need employee access?" : 'Existing account?'}{' '}
            <button
              className="link-button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setNotice({ text: '', type: '' });
              }}
            >
              {mode === 'login' ? 'Register Now' : 'Sign In'}
            </button>
          </div>
          <div className="system-credit">
            Developed & Managed by <strong>prathvi raj shingle</strong>
          </div>
        </section>
      </main>
    );
  }

  const role = session?.user?.role;

  if (!role) {
    logout();
    return null;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark small">NV</div>
          <div className="brand-text-col">
            <div className="brand-title-row">
              <span className="brand-title">NexVoucher Enterprise</span>
              <span className="brand-badge">v2.4</span>
            </div>
            <span className="brand-subtitle">
              Portal Developer: <strong>prathvi raj shingle</strong>
            </span>
          </div>
        </div>
        <div className="user-area">
          <div className="user-meta-card">
            <div className="avatar-circle">{session.user.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className="user-text-info">
              <span className="user-name">{session.user.name}</span>
              <span className="user-role-dept">
                {roleLabel(role)} {session.user.department ? `· ${session.user.department}` : ''}
              </span>
            </div>
          </div>
          <button className="secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>
      <main className="page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Enterprise Console</p>
            <h1>
              {role === 'employee'
                ? 'Expense Claim Portfolio'
                : role === 'director'
                ? 'Executive Approvals Desk'
                : 'Treasury & Audit Ledger'}
            </h1>
            <p className="muted">
              {role === 'employee'
                ? 'Submit corporate expenditures, track director sanctioning, and manage receipts.'
                : role === 'director'
                ? 'Examine submitted reimbursement requests, verify signatures, and issue approval decisions.'
                : 'Audit organization-wide claims, check dual-signatures, and export ledger records.'}
            </p>
          </div>
          <span className={`role-pill role-${role}`}>{roleLabel(role)} Console</span>
        </div>
        {notice.text && (
          <div className={`notice ${notice.type}`}>
            <span>{notice.text}</span>
            <button onClick={() => setNotice({ text: '', type: '' })}>×</button>
          </div>
        )}
        {role === 'employee' ? (
          <Employee request={request} message={message} />
        ) : role === 'director' ? (
          <Director request={request} message={message} />
        ) : (
          <Accounts request={request} message={message} />
        )}
      </main>
      <footer>
        <div>
          NexVoucher Enterprise Management System · Proprietary Internal Audit System
        </div>
        <div>
          System Lead: <span className="footer-author">prathvi raj shingle</span>
        </div>
      </footer>
    </div>
  );
}

function roleLabel(role) {
  return role === 'director' ? 'Executive Director' : role === 'accounts' ? 'Finance & Accounts' : 'Staff Employee';
}

function Field({ label, value, onChange, type = 'text', required = false, minLength, placeholder }) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
      />
    </label>
  );
}

function VoucherForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...blank(), ...initial });
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="voucher-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="form-grid">
        <Field
          label="Voucher Issue Date"
          type="date"
          value={form.voucherDate?.slice(0, 10)}
          onChange={(v) => set('voucherDate', v)}
          required
        />
        <Field
          label="Expense Incurred Date"
          type="date"
          value={form.expenseDate?.slice(0, 10)}
          onChange={(v) => set('expenseDate', v)}
          required
        />
        <Field
          label="Cost Center / Department"
          value={form.department}
          onChange={(v) => set('department', v)}
          placeholder="e.g. Research & Development"
          required
        />
        <Field
          label="Expenditure Title"
          value={form.title}
          onChange={(v) => set('title', v)}
          required
          placeholder="e.g. Q3 Regional Partner Summit Travel"
        />
        <label className="field">
          <span>Expense Classification Category *</span>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} required>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <Field
          label="Claim Amount (INR ₹)"
          type="number"
          value={form.amount}
          onChange={(v) => set('amount', v)}
          placeholder="0.00"
          required
        />
        <label className="field full-span">
          <span>Business Justification & Narrative</span>
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Explain detailed business context, vendors, or invoice numbers..."
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={saving}>
          {saving ? 'Registering Draft…' : 'Save as Draft'}
        </button>
      </div>
    </form>
  );
}

function Employee({ request, message }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await request({ method: 'get', url: '/vouchers/my' });
      setItems(data);
    } catch (e) {
      message(e.response?.data?.message || 'Could not load vouchers', 'error');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: items.length,
      draft: items.filter((v) => v.status === 'Draft').length,
      submitted: items.filter((v) => v.status === 'Submitted').length,
      approved: items.filter((v) => v.status === 'Approved').length,
      rejected: items.filter((v) => v.status === 'Rejected').length,
      claimed: items.reduce((sum, v) => sum + Number(v.amount || 0), 0),
    }),
    [items]
  );

  const visible = selected === 'all' ? items : items.filter((v) => v.status === selected);

  const save = async (form) => {
    setSaving(true);
    try {
      const payload = {
        department: form.department?.trim(),
        expenseTitle: (form.expenseTitle ?? form.title ?? '').trim(),
        category: form.category,
        description: form.description || '',
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        voucherDate: form.voucherDate || new Date().toISOString().slice(0, 10),
      };

      if (!payload.department || !payload.expenseTitle || !payload.category || !payload.expenseDate || !Number.isFinite(payload.amount) || payload.amount <= 0) {
        message('Please fill in all mandatory fields with valid values.', 'error');
        return;
      }

      if (editing) {
        await request({ method: 'put', url: `/vouchers/${editing._id}`, data: payload });
      } else {
        await request({ method: 'post', url: '/vouchers', data: payload });
      }

      message(editing ? 'Voucher draft updated' : 'New draft registered successfully');
      setEditing(null);
      setShowForm(false);
      await load();
    } catch (e) {
      message(e.response?.data?.message || 'Could not save voucher', 'error');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (voucher, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('signature', file);
    try {
      await request({
        method: 'post',
        url: `/vouchers/${voucher._id}/employee-signature`,
        data: fd,
      });
      message('Employee digital signature recorded');
      await load();
    } catch (e) {
      message(e.response?.data?.message || 'Signature upload failed', 'error');
    }
  };

  const submit = async (voucher) => {
    try {
      await request({ method: 'patch', url: `/vouchers/${voucher._id}/submit` });
      message('Voucher submitted to Executive Director for sanctioning');
      await load();
    } catch (e) {
      message(e.response?.data?.message || 'Could not submit voucher', 'error');
    }
  };

  const remove = async (voucher) => {
    if (!window.confirm(`Permanently remove draft ${voucher.voucherNumber}?`)) return;
    try {
      await request({ method: 'delete', url: `/vouchers/${voucher._id}` });
      message('Draft deleted');
      await load();
    } catch (e) {
      message(e.response?.data?.message || 'Could not delete voucher', 'error');
    }
  };

  return (
    <>
      <Stats
        cards={[
          ['Total Claims Filed', stats.total],
          ['Drafts Pending', stats.draft],
          ['In Director Review', stats.submitted],
          ['Sanctioned Approved', stats.approved],
          ['Declined / Rejected', stats.rejected],
          ['Total Aggregate Claim', money(stats.claimed)],
        ]}
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{editing ? 'Modify Draft Claim' : showForm ? 'New Expenditure Claim' : 'My Claim Portfolio'}</h2>
            <p className="muted">Filtered to your employee account.</p>
          </div>
          <div className="panel-actions-row">
            {!showForm && !editing && (
              <>
                <button className="secondary" onClick={() => exportToCSV(items)}>
                  📥 Export CSV
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                >
                  + New Claim
                </button>
              </>
            )}
          </div>
        </div>
        {showForm || editing ? (
          <VoucherForm
            key={editing ? editing._id : 'new'}
            initial={editing || blank()}
            onSave={save}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            saving={saving}
          />
        ) : (
          <>
            <div className="toolbar">
              <label className="field compact">
                <span>Filter by Status</span>
                <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="all">All Statuses ({items.length})</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button className="secondary" onClick={load}>
                🔄 Refresh
              </button>
            </div>
            {loading ? (
              <p className="empty">Fetching employee records…</p>
            ) : visible.length === 0 ? (
              <p className="empty">No expense vouchers found in this category.</p>
            ) : (
              <VoucherTable
                items={visible}
                employee
                onEdit={(v) => {
                  setEditing(v);
                  setShowForm(false);
                }}
                onDelete={remove}
                onUpload={upload}
                onSubmit={submit}
              />
            )}
          </>
        )}
      </section>
    </>
  );
}

function Director({ request, message }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    employeeName: '',
    department: '',
    category: '',
    voucherNumber: '',
    from: '',
    to: '',
    minAmount: '',
    maxAmount: '',
    sort: 'createdAt',
  });
  const [reasons, setReasons] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, val]) => val !== ''));
      const { data } = await request({
        method: 'get',
        url: '/vouchers/director/all',
        params,
      });
      setItems(data);
    } catch (e) {
      message(e.response?.data?.message || 'Could not load vouchers', 'error');
    } finally {
      setLoading(false);
    }
  }, [request, filters, message]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toDateString();
  const pending = items.filter((v) => v.status === 'Submitted');
  const approvedToday = items.filter(
    (v) => v.status === 'Approved' && new Date(v.approvalDate || v.updatedAt).toDateString() === today
  );
  const rejectedToday = items.filter(
    (v) => v.status === 'Rejected' && new Date(v.updatedAt).toDateString() === today
  );

  const upload = async (voucher, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('signature', file);
    try {
      await request({
        method: 'post',
        url: `/vouchers/${voucher._id}/director-signature`,
        data: fd,
      });
      message('Director executive endorsement signature affixed');
      await load();
    } catch (e) {
      message(e.response?.data?.message || 'Signature upload failed', 'error');
    }
  };

  const decide = async (voucher, decision) => {
    try {
      if (decision === 'reject' && !reasons[voucher._id]?.trim()) {
        message('Please provide a mandatory justification reason to reject.', 'error');
        return;
      }
      await request({
        method: 'patch',
        url: `/vouchers/${voucher._id}/${decision}`,
        data: decision === 'reject' ? { rejectionReason: reasons[voucher._id] } : {},
      });
      message(decision === 'approve' ? 'Claim approved and sanctioned' : 'Claim formally rejected');
      await load();
    } catch (e) {
      message(e.response?.data?.message || 'Could not update voucher', 'error');
    }
  };

  return (
    <>
      <Stats
        cards={[
          ['Awaiting Sanction', pending.length],
          ['Approved Today', approvedToday.length],
          ['Declined Today', rejectedToday.length],
          ['Pending Exposure', money(pending.reduce((sum, v) => sum + Number(v.amount || 0), 0))],
        ]}
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Executive Review Queue</h2>
            <p className="muted">Review employee claims and affix official approval decisions.</p>
          </div>
          <div className="panel-actions-row">
            <button className="secondary" onClick={() => exportToCSV(items)}>
              📥 Export CSV
            </button>
            <button className="secondary" onClick={load}>
              🔄 Refresh
            </button>
          </div>
        </div>
        <Filters filters={filters} setFilters={setFilters} />
        {loading ? (
          <p className="empty">Loading submitted records…</p>
        ) : (
          <VoucherTable
            items={items}
            director
            onUpload={upload}
            onDecide={decide}
            reasons={reasons}
            setReasons={setReasons}
          />
        )}
      </section>
    </>
  );
}

function Accounts({ request, message }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    employeeName: '',
    department: '',
    category: '',
    voucherNumber: '',
    from: '',
    to: '',
    minAmount: '',
    maxAmount: '',
    sort: 'createdAt',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, val]) => val !== ''));
      const { data } = await request({
        method: 'get',
        url: '/vouchers/accounts/all',
        params,
      });
      setItems(data);
    } catch (e) {
      message(e.response?.data?.message || 'Could not load vouchers', 'error');
    } finally {
      setLoading(false);
    }
  }, [request, filters, message]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = {
    total: items.length,
    pending: items.filter((v) => v.status === 'Submitted').length,
    approved: items.filter((v) => v.status === 'Approved').length,
    rejected: items.filter((v) => v.status === 'Rejected').length,
    approvedAmount: items
      .filter((v) => v.status === 'Approved')
      .reduce((sum, v) => sum + Number(v.amount || 0), 0),
  };

  return (
    <>
      <Stats
        cards={[
          ['Total Registry Vouchers', stats.total],
          ['Awaiting Sanction', stats.pending],
          ['Approved for Disbursement', stats.approved],
          ['Declined Claims', stats.rejected],
          ['Total Approved Funds', money(stats.approvedAmount)],
        ]}
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Master Ledger & Compliance Verification</h2>
            <p className="muted">Audit digital endorsements and disburse sanctioned funds.</p>
          </div>
          <div className="panel-actions-row">
            <button className="primary" onClick={() => exportToCSV(items)}>
              📥 Export Ledger to CSV
            </button>
            <button className="secondary" onClick={load}>
              🔄 Refresh
            </button>
          </div>
        </div>
        <Filters filters={filters} setFilters={setFilters} />
        {loading ? (
          <p className="empty">Gathering ledger records…</p>
        ) : (
          <VoucherTable items={items} accounts />
        )}
      </section>
    </>
  );
}

function Stats({ cards }) {
  return (
    <div className="stats-grid">
      {cards.map(([label, value]) => (
        <div className="stat-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function Filters({ filters, setFilters }) {
  const update = (k, v) => setFilters((prev) => ({ ...prev, [k]: v }));
  const clearFilters = () =>
    setFilters({
      status: '',
      employeeName: '',
      department: '',
      category: '',
      voucherNumber: '',
      from: '',
      to: '',
      minAmount: '',
      maxAmount: '',
      sort: 'createdAt',
    });

  return (
    <div className="filters">
      <Field
        label="Voucher ID #"
        value={filters.voucherNumber}
        onChange={(v) => update('voucherNumber', v)}
        placeholder="e.g. VCH-2026..."
      />
      <Field
        label="Employee Name"
        value={filters.employeeName}
        onChange={(v) => update('employeeName', v)}
        placeholder="Filter by name..."
      />
      <Field
        label="Department"
        value={filters.department}
        onChange={(v) => update('department', v)}
        placeholder="Department..."
      />
      <label className="field">
        <span>Category</span>
        <select value={filters.category} onChange={(e) => update('category', e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Status</span>
        <select value={filters.status} onChange={(e) => update('status', e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <Field label="Incurred From" type="date" value={filters.from} onChange={(v) => update('from', v)} />
      <Field label="Incurred To" type="date" value={filters.to} onChange={(v) => update('to', v)} />
      <Field label="Min Amount (₹)" type="number" value={filters.minAmount} onChange={(v) => update('minAmount', v)} />
      <Field label="Max Amount (₹)" type="number" value={filters.maxAmount} onChange={(v) => update('maxAmount', v)} />
      <label className="field">
        <span>Order By</span>
        <select value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
          <option value="createdAt">Date Created (Newest)</option>
          <option value="expenseDate">Expense Date</option>
          <option value="amount">Amount (Highest)</option>
          <option value="status">Status</option>
          <option value="voucherNumber">Voucher Number</option>
        </select>
      </label>
      <button type="button" className="secondary filter-reset" onClick={clearFilters}>
        Reset Filters
      </button>
    </div>
  );
}

function Status({ status }) {
  return <span className={`status status-${String(status).toLowerCase()}`}>{status}</span>;
}

function Signature({ src, label }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const SERVER_URL = API_URL.replace(/\/api\/?$/, '');
  const imageUrl = src ? `${SERVER_URL}/${String(src).replace(/^\/+/, '')}` : '';

  return (
    <div className="signature">
      <span>{label}:</span>
      {imageUrl ? (
        <a href={imageUrl} target="_blank" rel="noreferrer" title="Click to view full signature">
          <img
            src={imageUrl}
            alt={`${label} signature`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </a>
      ) : (
        <small style={{ color: '#64748b' }}>None</small>
      )}
    </div>
  );
}

function VoucherTable({
  items,
  employee = false,
  director = false,
  accounts = false,
  onEdit,
  onDelete,
  onUpload,
  onSubmit,
  onDecide,
  reasons,
  setReasons,
}) {
  if (!items.length) {
    return <p className="empty">No vouchers match the query.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference ID</th>
            <th>Employee & Dept</th>
            <th>Expenditure Details</th>
            <th>Claim Value</th>
            <th>Dual Endorsements</th>
            <th>Status / Audit Note</th>
            {(employee || director) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v._id}>
              <td>
                <span className="voucher-id-pill">{v.voucherNumber}</span>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Issued: {date(v.voucherDate)}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Incurred: {date(v.expenseDate)}
                </div>
              </td>
              <td>
                <strong style={{ color: '#f1f5f9' }}>{v.employee?.name || 'Current User'}</strong>
                <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{v.department}</div>
                {v.employee?.email && (
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{v.employee.email}</div>
                )}
              </td>
              <td>
                <strong style={{ color: '#e2e8f0' }}>{v.title || v.expenseTitle}</strong>
                <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>{v.category}</div>
                {v.description && (
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px', maxWidth: '240px' }}>
                    {v.description}
                  </div>
                )}
              </td>
              <td>
                <span className="amount-display">{money(v.amount)}</span>
              </td>
              <td>
                <div className="signature-list">
                  <Signature src={v.employeeSignature} label="Emp" />
                  <Signature src={v.directorSignature} label="Dir" />
                </div>
                {director && v.status === 'Submitted' && (
                  <label className="upload-control">
                    ✍ Upload Director Signature
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        onUpload(v, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </td>
              <td>
                <Status status={v.status} />
                {v.approvalDate && (
                  <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>
                    Sanctioned: {date(v.approvalDate)}
                  </div>
                )}
                {v.rejectionReason && (
                  <div style={{ fontSize: '11.5px', color: '#f87171', marginTop: '4px', maxWidth: '200px' }}>
                    <strong>Note:</strong> {v.rejectionReason}
                  </div>
                )}
              </td>
              {(employee || director) && (
                <td className="actions-cell">
                  {employee && v.status === 'Draft' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button className="secondary tiny-button" onClick={() => onEdit(v)}>
                        ✏ Edit
                      </button>
                      <button className="danger tiny-button" onClick={() => onDelete(v)}>
                        🗑 Delete
                      </button>
                      <label className="upload-control">
                        {v.employeeSignature ? '🔄 Change Signature' : '✍ Sign Digitally'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            onUpload(v, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        className="primary tiny-button"
                        disabled={!v.employeeSignature}
                        onClick={() => onSubmit(v)}
                        title={!v.employeeSignature ? 'Sign digitally first' : 'Submit to Director'}
                      >
                        Submit
                      </button>
                    </div>
                  )}
                  {director && v.status === 'Submitted' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        rows="2"
                        placeholder="Rejection justification reason..."
                        value={reasons[v._id] || ''}
                        onChange={(e) =>
                          setReasons((prev) => ({
                            ...prev,
                            [v._id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        className="success-btn tiny-button"
                        disabled={!v.directorSignature}
                        onClick={() => onDecide(v, 'approve')}
                      >
                        ✔ Approve
                      </button>
                      <button
                        className="danger tiny-button"
                        onClick={() => onDecide(v, 'reject')}
                      >
                        ✖ Reject
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;