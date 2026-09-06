interface LogoProps {
  size?: number;
  variant?: 'icon' | 'full';
  dark?: boolean;
  className?: string;
}

export function Logo({ size = 32, variant = 'full', dark = false, className }: LogoProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        flexShrink: 0,
        textDecoration: 'none',
        lineHeight: 1,
      }}
    >
      <img
        src="/logo-64.png"
        alt="FeeLedger"
        width={size}
        height={size}
        style={{
          objectFit: 'contain',
          borderRadius: Math.round(size * 0.2),
          flexShrink: 0,
          display: 'block',
          verticalAlign: 'middle',
        }}
      />
      {variant === 'full' && (
        <span
          style={{
            fontWeight: 700,
            fontSize: Math.round(size * 0.56),
            letterSpacing: '-0.02em',
            color: dark ? 'var(--color-white)' : 'var(--color-ink)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          FeeLedger
        </span>
      )}
    </div>
  );
}
