import type { CSSProperties, ReactNode } from 'react'

type IconProps = {
  size?: number
  color?: string
  style?: CSSProperties
}

// Shared wrapper — all icons are square viewBox 0 0 24 24, stroke-based
function Svg({
  size = 20,
  color = 'currentColor',
  style,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {children}
    </svg>
  )
}

export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  )
}

export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Svg>
  )
}

export function IconSkull(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="10" r="6" />
      <path d="M8 16v2h8v-2" />
      <line x1="10" y1="13" x2="10" y2="16" />
      <line x1="14" y1="13" x2="14" y2="16" />
      <circle
        cx="9.5"
        cy="9.5"
        r="1"
        fill={p.color ?? 'currentColor'}
        stroke="none"
      />
      <circle
        cx="14.5"
        cy="9.5"
        r="1"
        fill={p.color ?? 'currentColor'}
        stroke="none"
      />
    </Svg>
  )
}

export function IconCrown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17l3-8 4 5 2-9 2 9 4-5 3 8H3z" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </Svg>
  )
}

export function IconEye(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function IconSword(p: IconProps) {
  return (
    <Svg {...p}>
      <line x1="5" y1="19" x2="17" y2="7" />
      <path d="M14 4l6 6-10 10-3-3 1-1-3-3 1-1-2-3 2-2 3 2 1-1z" />
      <line x1="3" y1="21" x2="6" y2="18" />
    </Svg>
  )
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  )
}

export function IconHourglass(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </Svg>
  )
}

export function IconCrosshair(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </Svg>
  )
}

export function IconChat(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  )
}

export function IconGamepad(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <path d="M6 12h4" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle
        cx="16"
        cy="10.5"
        r="1"
        fill={p.color ?? 'currentColor'}
        stroke="none"
      />
      <circle
        cx="18.5"
        cy="13"
        r="1"
        fill={p.color ?? 'currentColor'}
        stroke="none"
      />
    </Svg>
  )
}

export function IconBallot(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="15" x2="13" y2="15" />
      <polyline points="3 9 6 12 3 15" />
    </Svg>
  )
}

export function IconShield(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  )
}

export function IconLogIn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </Svg>
  )
}

export function IconWarning(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  )
}
