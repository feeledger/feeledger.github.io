import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDashboardStats,
  useRecentPayments,
  useStudents,
  useAllBatches,
  useSettings,
} from '../hooks/useDB';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { Spinner, EmptyState } from '../components/ui/index';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : currency;
  if (amount >= 100000)
    return `${symbol}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

function fmtFull(amount: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function monthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', {
    month: 'short', year: '2-digit',
  });
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: accent ? 'var(--color-ink)' : 'var(--color-white)',
        border: `1px solid ${accent ? 'transparent' : 'var(--color-dust)'}`,
        borderRadius: 20,
        padding: '20px 22px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseOver={e => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)';
        }
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: accent ? 'rgba(255,255,255,0.5)' : 'var(--color-slate)',
        marginBottom: 8,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em',
        color: accent ? 'var(--color-canvas)' : 'var(--color-ink)',
        lineHeight: 1,
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: 12, marginTop: 6,
          color: accent ? 'rgba(255,255,255,0.4)' : 'var(--color-slate)',
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function BarChart({
  data,
  currency,
}: {
  data: { month: string; amount: number }[];
  currency: string;
}) {
  const max = Math.max(...data.map(d => d.amount), 1);
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 6,
      height: 120, padding: '0 4px',
    }}>
      {data.map(({ month, amount }) => {
        const pct    = (amount / max) * 100;
        const isNow  = month === currentMonth;
        return (
          <div
            key={month}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            title={`${monthLabel(month)}: ${fmtFull(amount, currency)}`}
          >
            <div style={{
              width: '100%', borderRadius: 4,
              background: isNow ? 'var(--color-ink)' : 'var(--color-dust)',
              height: `${Math.max(pct, 2)}%`,
              transition: 'height 0.3s ease',
              minHeight: 3,
            }} />
            <p style={{
              fontSize: 9, color: isNow ? 'var(--color-ink)' : 'var(--color-dust)',
              fontWeight: isNow ? 700 : 400,
              textAlign: 'center', whiteSpace: 'nowrap',
              transform: 'rotate(-35deg)', transformOrigin: 'top center',
              marginTop: 4,
            }}>
              {monthLabel(month)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Payment mode donut (simple pill list) ─────────────────────────────────────

function ModeBreakdown({
  data,
  total,
  currency,
}: {
  data: Record<string, number>;
  total: number;
  currency: string;
}) {
  const entries = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  if (entries.length === 0) return (
    <p style={{ fontSize: 13, color: 'var(--color-dust)' }}>No payments yet</p>
  );

  const COLOURS = [
    'var(--color-ink)', 'var(--color-signal-light)', 'var(--color-slate)',
    '#3860BE', '#9A3A0A', '#D1CDC7',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map(([mode, amount], i) => {
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
        return (
          <div key={mode}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', marginBottom: 4,
            }}>
              <span style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500, textTransform: 'capitalize' }}>
                {mode.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-slate)' }}>
                {fmtFull(amount, currency)} <span style={{ color: 'var(--color-dust)' }}>({pct}%)</span>
              </span>
            </div>
            <div style={{
              height: 6, borderRadius: 3,
              background: 'var(--color-canvas)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${pct}%`,
                background: COLOURS[i % COLOURS.length],
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recent payment row ────────────────────────────────────────────────────────

function RecentPaymentRow({
  studentName,
  amount,
  mode,
  date,
  currency,
}: {
  studentName: string;
  amount: number;
  mode: string;
  date: string;
  currency: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--color-dust)',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: 'var(--color-canvas)',
        border: '1px solid var(--color-dust)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: 'var(--color-ink)',
      }}>
        {studentName.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {studentName}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>
          {fmtDate(date)} · {mode.replace('_', ' ')}
        </p>
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)', flexShrink: 0 }}>
        {fmtFull(amount, currency)}
      </p>
    </div>
  );
}

// ── Batch breakdown row ────────────────────────────────────────────────────────

function BatchRow({
  name, memberCount, onClick,
}: {
  name: string; memberCount: number; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 0', borderBottom: '1px solid var(--color-dust)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>🗂️</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{name}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--color-slate)' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
        <span style={{ color: 'var(--color-dust)', fontSize: 16 }}>›</span>
      </div>
    </div>
  );
}

// ── Main DashboardPage ────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: stats,    loading: loadingStats    } = useDashboardStats();
  const { data: recent,   loading: loadingRecent   } = useRecentPayments(8);
  const { data: students                            } = useStudents();
  const { data: batches                            } = useAllBatches();
  const { data: settings                           } = useSettings();

  const currency = settings?.defaultCurrency ?? 'INR';
  const bizName  = settings?.business.businessName;

  const now        = new Date();
  const monthName  = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Active batches with member count
  const activeBatches = useMemo(() =>
    (batches ?? [])
      .filter(b => b.status === 'active')
      .map(batch => {
        const memberCount = (students ?? []).filter(s =>
          s.batchMemberships.some(m => m.batchId === batch.id && m.status === 'active')
        ).length;
        return { batch, memberCount };
      })
      .sort((a, b) => b.memberCount - a.memberCount),
    [batches, students]
  );

  // Student name lookup
  const studentName = (studentId: string) =>
    String(students?.find(s => s.id === studentId)?.values['student_name'] ?? 'Unknown');

  const isLoading = loadingStats || loadingRecent;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh' }}>
        <Spinner size={36} />
      </div>
    );
  }

  const hasData = (stats?.paymentCount ?? 0) > 0 || (stats?.studentCount ?? 0) > 0;

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Overview</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>
            {bizName ? `${bizName}` : 'Dashboard'}
          </h1>
          <div style={{ flexShrink: 0, maxWidth: 280, width: '100%' }}>
            <SyncStatusBar />
          </div>
        </div>
      </div>

      {!hasData ? (
        /* ── Empty state ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,240px),1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { emoji: '🧑‍🎓', title: 'Add your first member', hint: 'Go to Members → Add Member', path: '/app/students' },
            { emoji: '🗂️',  title: 'Create a batch',       hint: 'Go to Batches → New Batch',  path: '/app/batches' },
            { emoji: '💸',   title: 'Record a payment',    hint: 'Go to Payments → Receive',   path: '/app/payments' },
          ].map(card => (
            <div
              key={card.title}
              onClick={() => navigate(card.path)}
              style={{
                background: 'var(--color-white)', border: '1px solid var(--color-dust)',
                borderRadius: 20, padding: '24px 20px', cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseOver={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'}
              onMouseOut={e  => (e.currentTarget as HTMLDivElement).style.transform = 'none'}
            >
              <p style={{ fontSize: 28, marginBottom: 10 }}>{card.emoji}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4 }}>{card.title}</p>
              <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>{card.hint}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,160px),1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard
              label="Total Collection"
              value={fmt(stats?.totalCollection ?? 0, currency)}
              sub={`${stats?.paymentCount ?? 0} payments`}
              accent
              onClick={() => navigate('/app/payments')}
            />
            <StatCard
              label={monthName}
              value={fmt(stats?.monthlyCollection ?? 0, currency)}
              sub="This month"
              onClick={() => navigate('/app/payments')}
            />
            <StatCard
              label="Active Members"
              value={String(stats?.studentCount ?? 0)}
              sub="in your database"
              onClick={() => navigate('/app/students')}
            />
            <StatCard
              label="Active Batches"
              value={String(activeBatches.length)}
              sub="running now"
              onClick={() => navigate('/app/batches')}
            />
          </div>

          {/* ── Charts row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px),1fr))', gap: 16, marginBottom: 20 }}>

            {/* Monthly bar chart */}
            <div style={{
              background: 'var(--color-white)', border: '1px solid var(--color-dust)',
              borderRadius: 20, padding: '20px 20px 28px',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Monthly Collection
              </p>
              {(stats?.monthlyBreakdown ?? []).length < 2 ? (
                <p style={{ fontSize: 13, color: 'var(--color-dust)', padding: '20px 0' }}>
                  Not enough data yet. Payments will appear here month by month.
                </p>
              ) : (
                <BarChart data={stats!.monthlyBreakdown} currency={currency} />
              )}
            </div>

            {/* Payment mode breakdown */}
            <div style={{
              background: 'var(--color-white)', border: '1px solid var(--color-dust)',
              borderRadius: 20, padding: '20px',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                By Payment Mode
              </p>
              <ModeBreakdown
                data={stats?.collectionByMode ?? {}}
                total={stats?.totalCollection ?? 0}
                currency={currency}
              />
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px),1fr))', gap: 16 }}>

            {/* Recent payments */}
            <div style={{
              background: 'var(--color-white)', border: '1px solid var(--color-dust)',
              borderRadius: 20, padding: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recent Payments
                </p>
                <button
                  onClick={() => navigate('/app/payments')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-link)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                >
                  View all →
                </button>
              </div>
              {(recent ?? []).length === 0 ? (
                <EmptyState emoji="💸" title="No payments yet" body="Record your first payment to see it here." />
              ) : (
                <div>
                  {(recent ?? []).map((p, i) => (
                    <div key={p.id} style={{ borderBottom: i < (recent ?? []).length - 1 ? '1px solid var(--color-dust)' : 'none' }}>
                      <RecentPaymentRow
                        studentName={studentName(p.studentId)}
                        amount={p.amount}
                        mode={p.paymentMode}
                        date={p.paymentDate}
                        currency={currency}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/app/payments')}
                    className="btn-primary"
                    style={{ marginTop: 16, width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px', borderRadius: 'var(--radius-pill)' }}
                  >
                    💸 Receive Payment
                  </button>
                </div>
              )}
            </div>

            {/* Active batches */}
            <div style={{
              background: 'var(--color-white)', border: '1px solid var(--color-dust)',
              borderRadius: 20, padding: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Active Batches
                </p>
                <button
                  onClick={() => navigate('/app/batches')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-link)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                >
                  View all →
                </button>
              </div>
              {activeBatches.length === 0 ? (
                <EmptyState emoji="🗂️" title="No batches yet"
                  action={<button className="btn-secondary" onClick={() => navigate('/app/batches')} style={{ fontSize: 13, padding: '8px 16px' }}>Create batch</button>} />
              ) : (
                activeBatches.slice(0, 6).map(({ batch, memberCount }) => (
                  <BatchRow
                    key={batch.id}
                    name={batch.name}
                    memberCount={memberCount}
                    onClick={() => navigate('/app/batches')}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
