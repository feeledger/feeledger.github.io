import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { Icons } from '../components/Icons';

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard',  Icon: Icons.dashboard  },
  { to: '/app/payments',  label: 'Payments',   Icon: Icons.payments   },
  { to: '/app/students',  label: 'Members',    Icon: Icons.students   },
  { to: '/app/batches',   label: 'Batches',    Icon: Icons.batches    },
  { to: '/app/receipts',  label: 'Receipts',   Icon: Icons.receipts   },
  { to: '/app/reports',   label: 'Reports',    Icon: Icons.reports    },
  { to: '/app/settings',  label: 'Settings',   Icon: Icons.settings   },
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
        padding: '20px 14px',
        gap: 4,
        overflowY: 'auto',
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div style={{ padding: '0 6px 20px' }}>
        <Logo size={30} variant="full" dark={true} />
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setSidebarOpen(false)}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '10px 12px',
            borderRadius: 12,
            textDecoration: 'none',
            color: isActive ? 'var(--color-ink)' : 'rgba(255,255,255,0.6)',
            backgroundColor: isActive ? 'var(--color-canvas)' : 'transparent',
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            transition: 'background-color 0.12s ease, color 0.12s ease',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={17} color={isActive ? 'var(--color-ink)' : 'rgba(255,255,255,0.6)'} />
              {label}
            </>
          )}
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />

      {/* Sync status */}
      <div style={{ marginBottom: 6 }}>
        <SyncStatusBar sidebar />
      </div>

      {/* User section */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingTop: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {user?.photoUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
            <img
              src={user.photoUrl}
              alt={user.displayName ?? 'User'}
              style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--color-white)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.displayName ?? 'User'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </p>
            </div>
          </div>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '0 4px' }}>
            {user?.email ?? 'Signed in'}
          </p>
        )}
        <button
          onClick={handleSignOut}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: 'rgba(255,255,255,0.55)',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            textAlign: 'left',
            transition: 'border-color 0.12s, color 0.12s',
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
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
      <div className="sidebar-desktop" style={{ flexShrink: 0, position: 'sticky', top: 0, height: '100dvh' }}>
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 199 }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 200, width: 240 }}>
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
            padding: '0 16px',
            height: 56,
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
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              color: 'var(--color-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Open navigation menu"
          >
            <Icons.menu size={20} color="white" />
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
