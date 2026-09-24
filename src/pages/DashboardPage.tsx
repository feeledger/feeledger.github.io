import { useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  useDashboardStats, useRecentPayments, usePayments,
  useStudents, useAllBatches, useSettings, useAcademicYears,
} from '../hooks/useDB';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { Icons } from '../components/Icons';
import { Spinner, EmptyState } from '../components/ui/index';
import { formatYtdLabel, normalizeYtdAnchor } from '../utils/ytd';
import { calculateFeeDue } from '../utils/fees';
import type { Payment } from '../types';

function fmt(n: number, cur = 'INR') {
  const s = cur === 'INR' ? '₹' : cur;
  if (n >= 100000) return `${s}${(n/100000).toFixed(1)}L`;
  if (n >= 1000)   return `${s}${(n/1000).toFixed(1)}K`;
  return `${s}${n.toLocaleString('en-IN')}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
  // Full payment set — only used to recompute the KPI cards below when an
  // academic year filter is active; the unfiltered view keeps using `stats`
  // from useDashboardStats() exactly as before.
  const { data: allPayments                       } = usePayments();

  const [filterYear, setFilterYear] = useState('');
  const [editingYtd, setEditingYtd] = useState(false);
  const [ytdDraft, setYtdDraft] = useState('');
  const [ytdPopoverPos, setYtdPopoverPos] = useState({ top: 0, left: 0, width: 0 });
  const ytdEditBtnRef = useRef<HTMLButtonElement>(null);

  const currency = settings?.defaultCurrency ?? 'INR';
  const bizName  = settings?.business.businessName;

  const ytdAnchor = normalizeYtdAnchor(settings?.ytdStartMonthDay);
  const ytdLabel  = stats ? formatYtdLabel(stats.ytdStartDate) : '';

  const openYtdEditor = () => {
    // Pre-fill the date input with this year's occurrence of the current anchor
    const [mm, dd] = ytdAnchor.split('-');
    const thisYear = new Date().getFullYear();
    setYtdDraft(`${thisYear}-${mm}-${dd}`);

    // Position the popover relative to the whole YTD card (its parent), not
    // just the small edit button, so it lines up with the card's left edge.
    const card = ytdEditBtnRef.current?.closest('.dashboard-stat') as HTMLElement | null;
    const rect = (card ?? ytdEditBtnRef.current)?.getBoundingClientRect();
    if (rect) {
      setYtdPopoverPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
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

  // Batch IDs belonging to the selected academic year (null when "All years").
  const yearBatchIds = useMemo(() => {
    if (!filterYear) return null;
    return new Set((batches ?? []).filter(b => b.academicYearId === filterYear).map(b => b.id));
  }, [batches, filterYear]);

  // Payments belonging to the selected academic year's batches. Precise when
  // a payment carries its own batchId; for older/legacy payments that were
  // saved without one (e.g. recorded before the member had a batch, or the
  // batch selector only appears for members in more than one batch), fall
  // back to the paying member's own current active-batch year — the same
  // membership test "Active Members" already uses — so those payments still
  // show up under the year the member actually belongs to.
  const yearFilteredPayments = useMemo(() => {
    if (!yearBatchIds) return null;
    const memberIdsInYear = new Set(
      (students ?? [])
        .filter(s => s.batchMemberships.some(m => m.status === 'active' && yearBatchIds.has(m.batchId)))
        .map(s => s.id)
    );
    return (allPayments ?? []).filter(p =>
      p.batchId ? yearBatchIds.has(p.batchId) : memberIdsInYear.has(p.studentId)
    );
  }, [allPayments, yearBatchIds, students]);

  // Recomputed KPI stats for the selected academic year. null when "All
  // years" is selected, in which case the cards fall back to `stats` from
  // useDashboardStats() unchanged.
  const filteredStats = useMemo(() => {
    if (!yearFilteredPayments || !yearBatchIds) return null;

    const totalCollection = yearFilteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const paymentCount = yearFilteredPayments.length;

    const ytdStartDate = stats?.ytdStartDate ?? '';
    const ytdCollection = yearFilteredPayments
      .filter(p => p.paymentDate >= ytdStartDate)
      .reduce((sum, p) => sum + p.amount, 0);

    const collectionByMode: Record<string, number> = {};
    for (const p of yearFilteredPayments) {
      collectionByMode[p.paymentMode] = (collectionByMode[p.paymentMode] ?? 0) + p.amount;
    }

    // Active members with an active membership in any batch under this year.
    const memberIds = new Set<string>();
    for (const s of students ?? []) {
      if (s.batchMemberships.some(m => m.status === 'active' && yearBatchIds.has(m.batchId))) {
        memberIds.add(s.id);
      }
    }

    return {
      totalCollection, paymentCount, ytdCollection, collectionByMode,
      studentCount: memberIds.size,
    };
  }, [yearFilteredPayments, yearBatchIds, students, stats?.ytdStartDate]);

  // Payments grouped by member — used to work out what each active member
  // still owes, without a separate query per member (same pattern as the
  // "Active + Has Due" filter on the Members page).
  const paymentsByStudent = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of allPayments ?? []) {
      const arr = map.get(p.studentId);
      if (arr) arr.push(p);
      else map.set(p.studentId, [p]);
    }
    return map;
  }, [allPayments]);

  // "Active" members for due-calculation purposes: not archived, and their
  // student_status field is 'active' (the same definition the Members page
  // uses for "Active + Has Due"). Scoped to the selected academic year's
  // batches when a year filter is active.
  const activeMembersForDue = useMemo(() => {
    let list = (students ?? []).filter(s => String(s.values['student_status'] ?? 'active') === 'active');
    if (yearBatchIds) {
      list = list.filter(s => s.batchMemberships.some(m => m.status === 'active' && yearBatchIds.has(m.batchId)));
    }
    return list;
  }, [students, yearBatchIds]);

  // Sum of what's still outstanding across all active members — each
  // member's due is fee_amount + fee_type + fee_frequency weighed against
  // what they've actually paid (see utils/fees.ts calculateFeeDue).
  const dueToReceive = useMemo(() => {
    return activeMembersForDue.reduce((sum, s) => {
      const { totalDue } = calculateFeeDue(s, paymentsByStudent.get(s.id) ?? []);
      return sum + totalDue;
    }, 0);
  }, [activeMembersForDue, paymentsByStudent]);

  // Recent payments for the selected academic year. Derived from the full
  // filtered payment set (sorted by date) rather than filtering the
  // already-limited "recent 8", so older batches still show their most
  // recent payments instead of coming up empty.
  const filteredRecent = useMemo(() => {
    if (!yearFilteredPayments) return recent ?? [];
    return [...yearFilteredPayments]
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
      .slice(0, 8);
  }, [yearFilteredPayments, recent]);

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
            {/* YTD card — editable start date */}
            <div className="dashboard-stat" style={{ position: 'relative', cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-slate)' }}>
                  Year to Date
                </p>
                <button
                  ref={ytdEditBtnRef}
                  onClick={openYtdEditor}
                  title="Change YTD start date"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4, display: 'flex' }}
                >
                  <Icons.edit size={14} color="var(--color-ink)" />
                </button>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--color-ink)' }}>
                {fmt(filteredStats?.ytdCollection ?? stats?.ytdCollection ?? 0, currency)}
              </p>
              <p style={{ fontSize: 12, marginTop: 6, color: 'var(--color-slate)' }}>{ytdLabel}</p>
            </div>

            {/*
              Rendered via a portal directly into document.body — the YTD
              card above has backdrop-filter, which creates its own CSS
              stacking context and traps any absolutely-positioned child
              behind LATER sibling cards that also use backdrop-filter
              (By Payment Mode, Recent Payments, etc), no matter how high
              the child's own z-index is set. A portal sidesteps this
              entirely by rendering outside that stacking context.
            */}
            {editingYtd && createPortal(
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                  onClick={() => setEditingYtd(false)}
                />
                <div style={{
                  position: 'fixed',
                  top: ytdPopoverPos.top,
                  left: ytdPopoverPos.left,
                  zIndex: 1000,
                  background: 'var(--color-white)', borderRadius: 14,
                  border: '1px solid var(--color-dust)', boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                  padding: 14, width: Math.max(ytdPopoverPos.width, 220),
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
              </>,
              document.body
            )}

            <StatCard label="Due to Receive" value={fmt(dueToReceive, currency)}
              sub="from active members" icon={<Icons.alertCircle size={18} />} onClick={() => navigate('/app/students')} />
            <StatCard label="Active Members" value={String(filteredStats?.studentCount ?? stats?.studentCount ?? 0)}
              sub="in database" icon={<Icons.students size={18} />} onClick={() => navigate('/app/students')} />
            <StatCard label="Active Batches" value={String(activeBatches.length)}
              sub="running now" icon={<Icons.batches size={18} />} onClick={() => navigate('/app/batches')} />
          </div>

          {/* Bottom section — Recent Payments spans both rows on desktop */}
          <div className="dashboard-bottom-grid">
            {/* Recent payments — tall */}
            <div className="dashboard-recent-payments-tall" style={{
              background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
              borderRadius: 20, padding: 18,
              display: 'flex', flexDirection: 'column',
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
              <div style={{ flex: 1 }}>
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
              </div>
              <button onClick={() => navigate('/app/payments?action=receive')} className="btn-primary"
                style={{ marginTop: 14, width: '100%', justifyContent: 'center', fontSize: 13, padding: '10px', borderRadius: 'var(--radius-pill)', gap: 8 }}>
                <Icons.payments size={15} color="var(--color-canvas)" />
                Receive Payment
              </button>
            </div>

            {/* By payment mode */}
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
              <ModeBreakdown
                data={filteredStats?.collectionByMode ?? stats?.collectionByMode ?? {}}
                total={filteredStats?.totalCollection ?? stats?.totalCollection ?? 0}
                currency={currency}
              />
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
