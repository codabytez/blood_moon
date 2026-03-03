import type { CSSProperties } from 'react'

function avatarPalette(name: string) {
  const hash = name
    .split('')
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0)
  const hue = (hash * 47) % 360
  return {
    bg: `hsl(${hue},42%,20%)`,
    border: `hsl(${hue},42%,36%)`,
    text: `hsl(${hue},60%,72%)`,
  }
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

type Props = {
  name: string
  size?: number
  dead?: boolean
  style?: CSSProperties
}

export default function PlayerAvatar({
  name,
  size = 32,
  dead = false,
  style,
}: Props) {
  const palette = avatarPalette(name)
  const fontSize = Math.round(size * 0.38)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: dead ? '#1c1c1c' : palette.bg,
        border: `1.5px solid ${dead ? '#333' : palette.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: dead ? '#555' : palette.text,
        flexShrink: 0,
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '-0.02em',
        userSelect: 'none',
        filter: dead ? 'grayscale(1)' : 'none',
        opacity: dead ? 0.55 : 1,
        ...style,
      }}
    >
      {initials(name)}
    </div>
  )
}
