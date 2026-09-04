import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';
import { SyncStatusBar } from '../components/SyncStatusBar';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard',  label: 'Dashboard',  icon: '◈' },
  { to: '/app/payments',   label: 'Payments',   icon: '₹' },
  { to: '/app/students',   label: 'Students',   icon: '🧑‍🎓' },
  { to: '/app/batches',    label: 'Batches',    icon: '🗂️' },
  { to: '/app/receipts',   label: 'Receipts',   icon: '🧾' },
  { to: '/app/reports',    label: 'Reports',    icon: '📊' },
  { to: '/app/settings',   label: 'Settings',   icon: '⚙️' },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSignOut() {
    signOut();
    navigate('/', { replace: true });
  }

  const sidebarContent = (
    <nav
      style={{
        width: 240,
        height: '100%',
        backgroundColor: 'var(--color-ink)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: 8,
        overflowY: 'auto',
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div style={{ padding: '0 8px 24px' }}>
        <Logo size={32} variant="full" dark={true} />
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 'var(--radius-btn)',
            textDecoration: 'none',
            color: isActive ? 'var(--color-ink)' : 'rgba(255,255,255,0.65)',
            backgroundColor: isActive ? 'var(--color-canvas)' : 'transparent',
            fontWeight: isActive ? 600 : 450,
            fontSize: 15,
            transition: 'background-color 0.12s ease, color 0.12s ease',
          })}
        >
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />

      {/* Sync status */}
      <div style={{ marginBottom: 8 }}>
        <SyncStatusBar sidebar />
      </div>

      {/* User section */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {user?.photoUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
            <img
              src={user.photoUrl}
              alt={user.displayName || 'User'}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: 'var(--color-white)', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.displayName || 'User'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </p>
            </div>
          </div>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '0 4px' }}>
            {user?.email || 'Signed in'}
          </p>
        )}
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 'var(--radius-btn)',
            color: 'rgba(255,255,255,0.6)',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            textAlign: 'left',
            transition: 'border-color 0.12s ease, color 0.12s ease',
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', backgroundColor: 'var(--color-canvas)' }}>
      {/* Desktop sidebar */}
      <div
        className="sidebar-desktop"
        style={{ flexShrink: 0, position: 'sticky', top: 0, height: '100dvh' }}
      >
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 199,
            }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 200,
              width: 240,
            }}
          >
            {sidebarContent}
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        <div
          className="topbar-mobile"
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--color-ink)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Logo size={28} variant="full" dark={true} />
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              color: 'var(--color-white)',
              fontSize: 20,
              lineHeight: 1,
            }}
            aria-label="Open navigation menu"
          >
            ☰
          </button>
        </div>

        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .topbar-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
