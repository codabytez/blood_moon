import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import type { GameSettings } from '../../convex/_shared'
import {
  getSoundEnabled,
  getSoundVolume,
  setSoundEnabled,
  setSoundVolume,
} from '../lib/sounds'

const SPECIAL_ROLES: { key: string; label: string; desc: string }[] = [
  { key: 'seer', label: 'Seer', desc: 'Investigates one player per night' },
  { key: 'doctor', label: 'Doctor', desc: 'Protects one player per night' },
  {
    key: 'hunter',
    label: 'Hunter',
    desc: 'Gets a revenge shot when eliminated',
  },
  {
    key: 'mason',
    label: 'Mason ×2',
    desc: 'Two confirmed villagers who know each other',
  },
  {
    key: 'lycan',
    label: 'Lycan',
    desc: 'Villager who appears as Mafia to the Seer',
  },
  {
    key: 'apprenticeSeer',
    label: 'Apprentice Seer',
    desc: 'Inherits Seer powers if the Seer dies',
  },
  { key: 'prince', label: 'Prince', desc: 'Immune to day-vote eliminations' },
  {
    key: 'beholder',
    label: 'Beholder',
    desc: "Learns the Seer's identity at game start",
  },
  {
    key: 'bodyguard',
    label: 'Bodyguard',
    desc: 'Blocks the Mafia kill; cannot repeat same target',
  },
  {
    key: 'spellcaster',
    label: 'Spellcaster',
    desc: 'Silences one player — they cannot vote next day',
  },
  {
    key: 'fortuneTeller',
    label: 'Fortune Teller',
    desc: "Learns a player's exact role",
  },
  {
    key: 'toughGuy',
    label: 'Tough Guy',
    desc: 'Survives first Mafia attack; dies the following night',
  },
  {
    key: 'cursed',
    label: 'Cursed',
    desc: 'If targeted by Mafia, becomes Mafia instead of dying',
  },
  {
    key: 'priest',
    label: 'Priest',
    desc: 'Protects one player on Night 1 only',
  },
  {
    key: 'playerInspector',
    label: 'Player Inspector',
    desc: 'Learns if a player is Suspicious or Clear',
  },
  {
    key: 'king',
    label: 'King',
    desc: 'Vote counts ×2; gets revenge shot when eliminated',
  },
  {
    key: 'diseased',
    label: 'Diseased',
    desc: 'Mafia cannot kill the night after eliminating this role',
  },
  {
    key: 'pacifist',
    label: 'Pacifist',
    desc: 'Cannot vote to eliminate anyone',
  },
  {
    key: 'amuletOfProtection',
    label: 'Amulet of Protection',
    desc: 'One-time protection item; becomes Villager after use',
  },
  {
    key: 'villageIdiot',
    label: 'Village Idiot',
    desc: 'No special powers — cosmetic role only',
  },
]

type Props = {
  gameId: Id<'games'>
  sessionId: string
  isHost: boolean
  settings: GameSettings
  playerCount: number
  isOpen: boolean
  onClose: () => void
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec > 0 ? `${sec}s` : ''}`.trim() : `${sec}s`
}

export default function SettingsPanel({
  gameId,
  sessionId,
  isHost,
  settings,
  playerCount,
  isOpen,
  onClose,
}: Props) {
  const [local, setLocal] = useState<GameSettings>({ ...settings })
  const [saving, setSaving] = useState(false)
  const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled)
  const [soundVolume, setSoundVolumeState] = useState(getSoundVolume)
  const updateSettings = useMutation(api.games.updateSettings)

  // Reset local state whenever the modal opens
  useEffect(() => {
    if (isOpen) setLocal({ ...settings })
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape (treat as discard)
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleDiscard()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const isDirty = JSON.stringify(local) !== JSON.stringify(settings)

  async function handleSave() {
    if (!isHost) return
    setSaving(true)
    try {
      await updateSettings({
        gameId,
        sessionId,
        settings: local as Parameters<typeof updateSettings>[0]['settings'],
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setLocal({ ...settings })
    onClose()
  }

  const useCustomRoles = local.customRoles !== undefined
  const customRoles = local.customRoles ?? []

  function toggleRole(key: string) {
    const hasMason = customRoles.includes('mason')
    if (key === 'mason') {
      setLocal(prev => ({
        ...prev,
        customRoles: hasMason
          ? customRoles.filter(r => r !== 'mason')
          : [...customRoles, 'mason'],
      }))
    } else {
      const has = customRoles.includes(key)
      setLocal(prev => ({
        ...prev,
        customRoles: has
          ? customRoles.filter(r => r !== key)
          : [...customRoles, key],
      }))
    }
  }

  const mafiaCount =
    playerCount >= 25
      ? 6
      : playerCount >= 20
        ? 5
        : playerCount >= 15
          ? 4
          : playerCount >= 10
            ? 3
            : playerCount >= 7
              ? 2
              : 1
  const specialSlots = Math.max(0, playerCount - mafiaCount - 1)
  const selectedSlots = customRoles.reduce(
    (acc, r) => acc + (r === 'mason' ? 2 : 1),
    0
  )

  function handleSoundEnabledToggle() {
    const next = !soundEnabled
    setSoundEnabledState(next)
    setSoundEnabled(next)
  }

  function handleVolumeChange(v: number) {
    setSoundVolumeState(v)
    setSoundVolume(v)
  }

  if (!isOpen) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) handleDiscard()
      }}
    >
      {/*
       * Panel: flex column, overflow hidden — the card itself never scrolls.
       * Only the content region between header and footer scrolls.
       */}
      <div
        className="animate-fade-in-scale"
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          border: '1px solid var(--border-accent)',
          borderRadius: 14,
          boxShadow: 'var(--glow)',
          overflow: 'hidden', // panel itself does NOT scroll
        }}
      >
        {/* ── Header (never scrolls) ──────────────────── */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <div>
            <p
              className="font-heading"
              style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}
            >
              Game Settings
            </p>
            {isDirty && !saving && (
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.72rem',
                  color: 'var(--accent)',
                }}
              >
                Unsaved changes
              </p>
            )}
            {saving && (
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.72rem',
                  color: 'var(--text3)',
                }}
              >
                Saving...
              </p>
            )}
          </div>
          <button
            onClick={handleDiscard}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* ── Scrollable content ─────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Timers */}
          <SectionHeading>Timers</SectionHeading>

          <SliderRow
            label="Night phase"
            desc="Time for all night actions"
            value={local.nightSeconds}
            min={30}
            max={600}
            step={15}
            disabled={!isHost}
            onChange={v => setLocal(prev => ({ ...prev, nightSeconds: v }))}
          />
          <SliderRow
            label="Day discussion"
            desc="Time to discuss before voting opens"
            value={local.daySeconds}
            min={30}
            max={600}
            step={15}
            disabled={!isHost}
            onChange={v => setLocal(prev => ({ ...prev, daySeconds: v }))}
          />
          <SliderRow
            label="Hunter / King revenge"
            desc="Time for the eliminated Hunter or King to choose a target"
            value={local.hunterSeconds}
            min={15}
            max={180}
            step={15}
            disabled={!isHost}
            onChange={v => setLocal(prev => ({ ...prev, hunterSeconds: v }))}
          />

          {/* Gameplay */}
          <SectionHeading style={{ marginTop: 20 }}>Gameplay</SectionHeading>

          <ToggleRow
            label="Reveal role on death"
            desc="Show eliminated player's role in the announcement"
            value={local.revealRoleOnDeath}
            disabled={!isHost}
            onChange={v =>
              setLocal(prev => ({ ...prev, revealRoleOnDeath: v }))
            }
          />
          <ToggleRow
            label="Skip role reveal screen"
            desc="Skip the animated role card at game start"
            value={local.skipRoleReveal}
            disabled={!isHost}
            onChange={v => setLocal(prev => ({ ...prev, skipRoleReveal: v }))}
          />
          <ToggleRow
            label="Dead players can chat"
            desc="Eliminated players can still send messages during the day"
            value={local.deadCanChat}
            disabled={!isHost}
            onChange={v => setLocal(prev => ({ ...prev, deadCanChat: v }))}
          />
          <ToggleRow
            label="Mafia sees teammates"
            desc="Mafia members know who the other Mafia players are"
            value={local.mafiaSeesTeam}
            disabled={!isHost}
            onChange={v => setLocal(prev => ({ ...prev, mafiaSeesTeam: v }))}
          />
          <ToggleRow
            label="Timer visible to all"
            desc="All players see the phase countdown, not just the host"
            value={local.timerVisibleToAll}
            disabled={!isHost}
            onChange={v =>
              setLocal(prev => ({ ...prev, timerVisibleToAll: v }))
            }
            noBorder
          />

          {/* Role Selection */}
          <SectionHeading style={{ marginTop: 20 }}>
            Role Selection
          </SectionHeading>

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: 'var(--text)',
                  }}
                >
                  {useCustomRoles
                    ? 'Custom selection'
                    : 'Auto-assign by player count'}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    color: 'var(--text3)',
                  }}
                >
                  {useCustomRoles
                    ? specialSlots === 0
                      ? 'Role slots unlock as more players join'
                      : `${selectedSlots}/${specialSlots} special role slots used`
                    : 'Roles scale automatically as more players join'}
                </p>
              </div>
              {isHost && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setLocal(prev => ({
                      ...prev,
                      customRoles: useCustomRoles ? undefined : [],
                    }))
                  }
                  style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                >
                  {useCustomRoles ? 'Reset to auto' : 'Customize'}
                </button>
              )}
            </div>

            {useCustomRoles && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  padding: 10,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                {SPECIAL_ROLES.map(role => {
                  const selected = customRoles.includes(role.key)
                  const wouldExceed =
                    !selected &&
                    selectedSlots + (role.key === 'mason' ? 2 : 1) >
                      specialSlots
                  return (
                    <button
                      key={role.key}
                      title={role.desc}
                      disabled={!isHost || (!selected && wouldExceed)}
                      onClick={() => toggleRole(role.key)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 99,
                        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        background: selected
                          ? 'rgba(220,38,38,0.12)'
                          : 'transparent',
                        color: selected ? 'var(--accent)' : 'var(--text2)',
                        fontSize: '0.78rem',
                        cursor:
                          !isHost || (!selected && wouldExceed)
                            ? 'default'
                            : 'pointer',
                        opacity: !selected && wouldExceed ? 0.4 : 1,
                        transition: 'all 0.15s',
                        fontFamily: 'Cinzel, serif',
                      }}
                    >
                      {role.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sound */}
          <SectionHeading style={{ marginTop: 20 }}>Sound</SectionHeading>

          <ToggleRow
            label="Sound effects"
            desc="Play audio cues for phase changes, votes, and eliminations"
            value={soundEnabled}
            onChange={handleSoundEnabledToggle}
            noBorder={!soundEnabled}
          />

          {soundEnabled && (
            <div
              style={{
                padding: '10px 0 12px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: 'var(--text)',
                    fontWeight: 500,
                  }}
                >
                  Volume
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: 'var(--text2)',
                    fontFamily: 'Cinzel, serif',
                  }}
                >
                  {Math.round(soundVolume * 100)}%
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={soundVolume}
                onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent)',
                  cursor: 'pointer',
                }}
              />
            </div>
          )}
        </div>

        {/* ── Footer (never scrolls) ──────────────────── */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            gap: 10,
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={handleDiscard}
            disabled={saving}
          >
            Discard
          </button>
          {isHost && (
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          )}
          {!isHost && (
            <p
              style={{
                flex: 2,
                margin: 0,
                fontSize: '0.75rem',
                color: 'var(--text3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Only the host can change game settings.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeading({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <p
      className="font-heading"
      style={{
        margin: '0 0 8px',
        fontSize: '0.72rem',
        color: 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        ...style,
      }}
    >
      {children}
    </p>
  )
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  disabled,
  noBorder,
}: {
  label: string
  desc?: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  noBorder?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: noBorder ? 'none' : '1px solid var(--border)',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--text)',
            fontWeight: 500,
          }}
        >
          {label}
        </p>
        {desc && (
          <p
            style={{
              margin: '1px 0 0',
              fontSize: '0.72rem',
              color: 'var(--text3)',
            }}
          >
            {desc}
          </p>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        aria-pressed={value}
        style={{
          flexShrink: 0,
          width: 44,
          height: 24,
          borderRadius: 12,
          background: value ? 'var(--accent)' : 'rgba(100,100,120,0.4)',
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          padding: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  )
}

function SliderRow({
  label,
  desc,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  label: string
  desc?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  disabled?: boolean
}) {
  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 6,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: 'var(--text)',
              fontWeight: 500,
            }}
          >
            {label}
          </p>
          {desc && (
            <p
              style={{
                margin: '1px 0 0',
                fontSize: '0.72rem',
                color: 'var(--text3)',
              }}
            >
              {desc}
            </p>
          )}
        </div>
        <span
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.88rem',
            color: 'var(--accent)',
            flexShrink: 0,
            marginLeft: 8,
            minWidth: 52,
            textAlign: 'right',
          }}
        >
          {fmtSec(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => !disabled && onChange(parseInt(e.target.value, 10))}
        style={{
          width: '100%',
          accentColor: 'var(--accent)',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 2,
        }}
      >
        <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>
          {fmtSec(min)}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>
          {fmtSec(max)}
        </span>
      </div>
    </div>
  )
}
