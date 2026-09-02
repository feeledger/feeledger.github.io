/**
 * FeeLedger logo component.
 * Uses the actual logo PNG from /public/logo-64.png for nav/sidebar,
 * and the larger logo.png for splash/onboarding contexts.
 */

interface LogoProps {
  size?: number;
  variant?: 'icon' | 'full';   // icon = logo only, full = logo + wordmark
  dark?: boolean;               // true when on dark (ink) background
  className?: string;
}

export function Logo({ size = 32, variant = 'full', dark = false, className }: LogoProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        textDecoration: 'none',
      }}
    >
      <img
        src="/logo-64.png"
        alt="FeeLedger"
        width={size}
        height={size}
        style={{
          objectFit: 'contain',
          borderRadius: size * 0.2,   // subtle rounding proportional to size
          flexShrink: 0,
          display: 'block',
        }}
      />
      {variant === 'full' && (
        <span
          style={{
            fontWeight: 700,
            fontSize: size * 0.56,
            letterSpacing: '-0.02em',
            color: dark ? 'var(--color-white)' : 'var(--color-ink)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          FeeLedger
        </span>
      )}
    </div>
  );
}
