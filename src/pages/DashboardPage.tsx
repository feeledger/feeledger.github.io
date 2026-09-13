import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDashboardStats, useRecentPayments,
  useStudents, useAllBatches, useSettings, useAcademicYears,
} from '../hooks/useDB';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { Icons } from '../components/Icons';
import { Spinner, EmptyState } from '../components/ui/index';
import { formatYtdLabel, normalizeYtdAnchor } from '../utils/ytd';

function fmt(n: number, cur = 'INR') {
  const s = cur === 'INR' ? '₹' : cur;
  if (n >= 100000) return `${s}${(n/100000).toFixed(1)}L`;
  if (n >= 1000)   return `${s}${(n/1000).toFixed(1)}K`;
  return `${s}${n.toLocaleString('en-IN')}`;
}
function fmtFull(n: number, cur = 'INR') {
  const s = cur === 'INR' ? '₹' : cur;
  return `${s}${n.toLocaleString('en-IN')}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function monthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-');
  return new Date(Number(y), Number(m)-1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, onClick, icon }: {
  label: string; value: string; sub?: string;
  accent?: boolean; onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="dashboard-stat"
      style={{
        background: accent
          ? 'linear-gradient(135deg, #1a1917 0%, #2d2c2a 100%)'
          : undefined,
        border: accent ? '1px solid rgba(255,255,255,0.08)' : undefined,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: accent ? 'rgba(255,255,255,0.45)' : 'var(--color-slate)',
        }}>
          {label}
        </p>
        {icon && <div style={{ opacity: 0.4, color: accent ? 'white' : 'var(--color-ink)' }}>{icon}</div>}
      </div>
      <p style={{
        fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1,
        color: accent ? 'var(--color-canvas)' : 'var(--color-ink)',
      }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 12, marginTop: 6, color: accent ? 'rgba(255,255,255,0.4)' : 'var(--color-slate)' }}>{sub}</p>}
    </div>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, currency }: { data: { month: string; amount: number }[]; currency: string }) {
  const max = Math.max(...data.map(d => d.amount), 1);
  const currentMonth = new Date().toISOString().slice(0, 7);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 100, paddingBottom: 2 }}>
      {data.map(({ month, amount }) => {
        const pct = (amount / max) * 100;
        const isNow = month === currentMonth;
        return (
          <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}
            title={`${monthLabel(month)}: ${fmtFull(amount, currency)}`}>
            <div style={{
              width: '100%', borderRadius: '3px 3px 0 0',
              background: isNow
                ? 'linear-gradient(180deg, #141413 0%, #3d3c3a 100%)'
                : 'var(--color-dust)',
              height: `${Math.max(pct, 3)}%`,
              minHeight: 3,
              transition: 'height 0.4s ease',
            }} />
            <p style={{
              fontSize: 8, color: isNow ? 'var(--color-ink)' : 'var(--color-dust)',
              fontWeight: isNow ? 700 : 400, textAlign: 'center',
              transform: 'rotate(-40deg)', transformOrigin: 'top center',
              marginTop: 6, whiteSpace: 'nowrap',
            }}>
              {monthLabel(month)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Mode breakdown ─────────────────────────────────────────────────────────────
function ModeBreakdown({ data, total, currency }: { data: Record<string, number>; total: number; currency: string }) {
  const entries = Object.entries(data).sort(([,a],[,b]) => b - a).slice(0, 5);
  if (!entries.length) return <p style={{ fontSize: 13, color: 'var(--color-dust)' }}>No payments yet</p>;
  const COLOURS = ['#141413','#F37338','#696969','#3860BE','#9A3A0A'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map(([mode, amount], i) => {
        const pct = total > 0 ? Math.round((amount/total)*100) : 0;
        return (
          <div key={mode}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500, textTransform: 'capitalize' }}>
                {mode.replace('_',' ')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-slate)' }}>
                {fmt(amount, currency)} <span style={{ color: 'var(--color-dust)' }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'var(--color-bone)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3, width: `${pct}%`,
                background: COLOURS[i % COLOURS.length],
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const { data: settings, patch: patchSettings         } = useSettings();
  const { data: stats,    loading: loadingStats  } = useDashboardStats(settings?.ytdStartMonthDay);
  const { data: recent,   loading: loadingRecent } = useRecentPayments(8);
  const { data: students                          } = useStudents();
  const { data: batches                           } = useAllBatches();
  const { data: academicYears                     } = useAcademicYears();

  const [filterYear, setFilterYear] = useState('');
  const [editingYtd, setEditingYtd] = useState(false);
  const [ytdDraft, setYtdDraft] = useState('');

  const currency = settings?.defaultCurrency ?? 'INR';
  const bizName  = settings?.business.businessName;

  const ytdAnchor = normalizeYtdAnchor(settings?.ytdStartMonthDay);
  const ytdLabel  = stats ? formatYtdLabel(stats.ytdStartDate) : '';

  const openYtdEditor = () => {
    // Pre-fill the date input with this year's occurrence of the current anchor
    const [mm, dd] = ytdAnchor.split('-');
    const thisYear = new Date().getFullYear();
    setYtdDraft(`${thisYear}-${mm}-${dd}`);
    setEditingYtd(true);
  };

  const saveYtdAnchor = async () => {
    if (!ytdDraft) { setEditingYtd(false); return; }
    const [, mm, dd] = ytdDraft.split('-');
    await patchSettings({ ytdStartMonthDay: `${mm}-${dd}` });
    setEditingYtd(false);
  };

  const activeBatches = useMemo(() => {
    let list = (batches ?? []).filter(b => b.status === 'active');
    if (filterYear) list = list.filter(b => b.academicYearId === filterYear);
    return list.map(batch => {
      const memberCount = (students ?? []).filter(s =>
        s.batchMemberships.some(m => m.batchId === batch.id && m.status === 'active')
      ).length;
      return { batch, memberCount };
    }).sort((a, b) => b.memberCount - a.memberCount);
  }, [batches, students, filterYear]);

  // Filter recent payments by academic year
  const filteredRecent = useMemo(() => {
    if (!filterYear || !batches) return recent ?? [];
    const batchIds = new Set(batches.filter(b => b.academicYearId === filterYear).map(b => b.id));
    return (recent ?? []).filter(p => !p.batchId || batchIds.has(p.batchId));
  }, [recent, filterYear, batches]);

  const studentName = (id: string) =>
    String(students?.find(s => s.id === id)?.values['student_name'] ?? 'Unknown');

  const sortedYears = useMemo(() =>
    [...(academicYears ?? [])].sort((a, b) => b.name.localeCompare(a.name)),
    [academicYears]
  );

  if (loadingStats || loadingRecent) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}><Spinner size={36} /></div>;
  }

  const hasData = (stats?.paymentCount ?? 0) > 0 || (stats?.studentCount ?? 0) > 0;

  return (
    <div style={{ padding: 'clamp(16px,3vw,28px)', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Overview</p>
            <h1 style={{ fontSize: 'clamp(20px,3.5vw,26px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>
              {bizName || 'Dashboard'}
            </h1>
          </div>
          <div style={{ flexShrink: 0, maxWidth: 260, width: '100%' }}>
            <SyncStatusBar />
          </div>
        </div>

        {/* Academic year filter */}
        {sortedYears.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button
              onClick={() => setFilterYear('')}
              style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${!filterYear ? 'var(--color-ink)' : 'var(--color-dust)'}`,
                background: !filterYear ? 'var(--color-ink)' : 'rgba(255,255,255,0.7)',
                color: !filterYear ? 'var(--color-canvas)' : 'var(--color-slate)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                backdropFilter: 'blur(8px)',
              }}
            >
              All years
            </button>
            {sortedYears.map(ay => (
              <button key={ay.id} onClick={() => setFilterYear(ay.id)} style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${filterYear === ay.id ? 'var(--color-ink)' : 'var(--color-dust)'}`,
                background: filterYear === ay.id ? 'var(--color-ink)' : 'rgba(255,255,255,0.7)',
                color: filterYear === ay.id ? 'var(--color-canvas)' : 'var(--color-slate)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                backdropFilter: 'blur(8px)',
              }}>
                {ay.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasData ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,220px),1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { icon: <Icons.students size={24} />, title: 'Add your first member',  hint: 'Members → Add Member',   path: '/app/students' },
            { icon: <Icons.batches  size={24} />, title: 'Create a batch',         hint: 'Batches → New Batch',    path: '/app/batches'  },
            { icon: <Icons.payments size={24} />, title: 'Record a payment',       hint: 'Payments → Receive',     path: '/app/payments' },
          ].map(card => (
            <div key={card.title} onClick={() => navigate(card.path)} className="feature-card" style={{ cursor: 'pointer', textAlign: 'center', alignItems: 'center' }}>
              <div style={{ opacity: 0.4 }}>{card.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>{card.title}</p>
              <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>{card.hint}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,155px),1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Collection" value={fmt(stats?.totalCollection ?? 0, currency)}
              sub={`${stats?.paymentCount ?? 0} payments`} accent
              icon={<Icons.rupee size={18} />} onClick={() => navigate('/app/payments')} />

            {/* YTD card — editable start date */}
            <div className="dashboard-stat" style={{ position: 'relative', cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-slate)' }}>
                  Year to Date
                </p>
                <button
                  onClick={openYtdEditor}
                  title="Change YTD start date"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4, display: 'flex' }}
                >
                  <Icons.edit size={14} color="var(--color-ink)" />
                </button>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--color-ink)' }}>
                {fmt(stats?.ytdCollection ?? 0, currency)}
              </p>
              <p style={{ fontSize: 12, marginTop: 6, color: 'var(--color-slate)' }}>{ytdLabel}</p>

              {editingYtd && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 19 }}
                    onClick={() => setEditingYtd(false)}
                  />
                  <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 20,
                  background: 'var(--color-white)', borderRadius: 14,
                  border: '1px solid var(--color-dust)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  padding: 14, minWidth: 220,
                }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>
                    YTD starts from
                  </p>
                  <input
                    type="date"
                    value={ytdDraft}
                    onChange={e => setYtdDraft(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1px solid var(--color-dust)', fontFamily: 'var(--font-sans)',
                      fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--color-dust)', marginBottom: 10, lineHeight: 1.4 }}>
                    Repeats every year on this month and day. e.g. pick April 1 for a financial-year view.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditingYtd(false)}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid var(--color-dust)', background: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--color-slate)' }}>
                      Cancel
                    </button>
                    <button onClick={saveYtdAnchor}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: 'var(--color-ink)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--color-canvas)', fontWeight: 600 }}>
                      Save
                    </button>
                  </div>
                  </div>
                </>
              )}
            </div>

            <StatCard label="Active Members" value={String(stats?.studentCount ?? 0)}
              sub="in database" icon={<Icons.students size={18} />} onClick={() => navigate('/app/students')} />
            <StatCard label="Active Batches" value={String(activeBatches.length)}
              sub="running now" icon={<Icons.batches size={18} />} onClick={() => navigate('/app/batches')} />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,280px),1fr))', gap: 14, marginBottom: 16 }}>
            <div style={{
              background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
              borderRadius: 20, padding: '18px 18px 32px',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Monthly Collection
              </p>
              {(stats?.monthlyBreakdown ?? []).length < 2
                ? <p style={{ fontSize: 13, color: 'var(--color-dust)', padding: '16px 0' }}>Not enough data yet.</p>
                : <BarChart data={stats!.monthlyBreakdown} currency={currency} />
              }
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
              borderRadius: 20, padding: 18,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                By Payment Mode
              </p>
              <ModeBreakdown data={stats?.collectionByMode ?? {}} total={stats?.totalCollection ?? 0} currency={currency} />
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,280px),1fr))', gap: 14 }}>
            {/* Recent payments */}
            <div style={{
              background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
              borderRadius: 20, padding: 18,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recent Payments
                </p>
                <button onClick={() => navigate('/app/payments')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-link)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                  View all
                </button>
              </div>
              {filteredRecent.length === 0
                ? <EmptyState emoji="💸" title="No payments yet" />
                : filteredRecent.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < filteredRecent.length - 1 ? '1px solid var(--color-dust)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--color-canvas)', border: '1px solid var(--color-dust)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>
                      {studentName(p.studentId).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentName(p.studentId)}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-slate)' }}>{fmtDate(p.paymentDate)} · {p.paymentMode}</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', flexShrink: 0 }}>{fmt(p.amount, currency)}</p>
                  </div>
                ))
              }
              <button onClick={() => navigate('/app/payments')} className="btn-primary"
                style={{ marginTop: 14, width: '100%', justifyContent: 'center', fontSize: 13, padding: '10px', borderRadius: 'var(--radius-pill)', gap: 8 }}>
                <Icons.payments size={15} color="var(--color-canvas)" />
                Receive Payment
              </button>
            </div>

            {/* Active batches */}
            <div style={{
              background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
              borderRadius: 20, padding: 18,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Active Batches
                </p>
                <button onClick={() => navigate('/app/batches')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-link)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                  View all
                </button>
              </div>
              {activeBatches.length === 0
                ? <EmptyState emoji="" title="No batches yet"
                    action={<button className="btn-secondary" onClick={() => navigate('/app/batches')} style={{ fontSize: 12, padding: '7px 14px' }}>Create batch</button>} />
                : activeBatches.slice(0, 6).map(({ batch, memberCount }) => (
                  <div key={batch.id} onClick={() => navigate('/app/batches')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--color-dust)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icons.batches size={14} color="var(--color-slate)" />
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>{batch.name}</p>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React from 'react';
