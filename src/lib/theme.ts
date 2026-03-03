export function getClockTheme(): 'day' | 'night' {
  const h = new Date().getHours()
  return h >= 7 && h < 19 ? 'day' : 'night'
}

export function applyTheme(theme: 'day' | 'night') {
  document.documentElement.setAttribute('data-theme', theme)
}
