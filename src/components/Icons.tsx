/**
 * Consistent SVG icon set for FeeLedger.
 * All icons use currentColor so they inherit text color.
 * Size defaults to 20px.
 */

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

import React from 'react';

const base = (size: number, children: React.ReactNode, style?: React.CSSProperties) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, display: 'block', ...style }}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const Icons = {
  dashboard:    ({ size = 20, color, style }: IconProps = {}) =>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>,

  payments:     ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><circle cx="12" cy="12" r="9"/><path d="M12 7v2m0 6v2M9.5 9.5C9.5 8.7 10.6 8 12 8s2.5.7 2.5 1.5-1.1 1.5-2.5 1.5-2.5.7-2.5 1.5S10.6 16 12 16s2.5-.7 2.5-1.5"/></>, { color, ...style }),

  students:     ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>, { color, ...style }),

  batches:      ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M3 7h18M3 12h18M3 17h18"/><rect x="2" y="4" width="20" height="16" rx="2"/></>, { color, ...style }),

  receipts:     ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2V4a2 2 0 0 0-2-2z"/><path d="M8 8h8M8 12h6"/></>, { color, ...style }),

  reports:      ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M18 20V10M12 20V4M6 20v-6"/></>, { color, ...style }),

  settings:     ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>, { color, ...style }),

  plus:         ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M12 5v14M5 12h14"/></>, { color, ...style }),

  chevronRight: ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <path d="M9 18l6-6-6-6"/>, { color, ...style }),

  cloud:        ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></>, { color, ...style }),

  check:        ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <polyline points="20 6 9 17 4 12"/>, { color, ...style }),

  alertCircle:  ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>, { color, ...style }),

  whatsapp:     ({ size = 20, style }: IconProps = {}) =>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>,

  download:     ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>, { color, ...style }),

  syncArrows:   ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></>, { color, ...style }),

  menu:         ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>, { color, ...style }),

  arrowLeft:    ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>, { color, ...style }),

  edit:         ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>, { color, ...style }),

  trash:        ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>, { color, ...style }),

  user:         ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>, { color, ...style }),

  calendar:     ({ size = 20, color, style }: IconProps = {}) =>
    base(size, <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, { color, ...style }),

  rupee:        ({ size = 20, color, style }: IconProps = {}) =>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <path d="M6 3h12M6 8h12M15 21 6 8"/><path d="M6 13h3a4 4 0 0 0 0-5H6"/>
    </svg>,
};
