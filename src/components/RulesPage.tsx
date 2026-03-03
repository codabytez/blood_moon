type Props = {
  onClose: () => void
}

const ROLES = [
  {
    emoji: '😈',
    label: 'Mafia',
    cls: 'badge-mafia',
    team: 'Mafia',
    desc: 'Blend in. Lie boldly. Each night, the Mafia secretly chooses one player to eliminate. Win by equalling or outnumbering the Village.',
  },
  {
    emoji: '🏡',
    label: 'Villager',
    cls: 'badge-villager',
    team: 'Village',
    desc: 'No special power — just your wits. Debate, accuse, and vote out the Mafia before they get you.',
  },
  {
    emoji: '🔮',
    label: 'Seer',
    cls: 'badge-seer',
    team: 'Village',
    desc: 'Each night, investigate one player to learn if they are Mafia. Use your knowledge carefully — the Mafia will silence you if they suspect.',
  },
  {
    emoji: '💉',
    label: 'Doctor',
    cls: 'badge-doctor',
    team: 'Village',
    desc: 'Each night, choose one player to protect. If the Mafia targets them that night, they survive. You may protect yourself.',
  },
  {
    emoji: '🏹',
    label: 'Hunter',
    cls: 'badge-hunter',
    team: 'Village',
    desc: 'No night action. But when you are eliminated — by vote or by night — you immediately choose one player to take down with you. Make it count.',
  },
  {
    emoji: '👑',
    label: 'Prince',
    cls: 'badge-prince',
    team: 'Village',
    desc: 'Day votes cannot eliminate you — you survive every vote attempt. The Mafia can still target and kill you at night.',
  },
  {
    emoji: '🐺',
    label: 'Lycan',
    cls: 'badge-lycan',
    team: 'Village',
    desc: "You fight for the Village — but the Seer's vision sees a monster in you. You appear as Mafia to any investigation. Be careful who you trust.",
  },
  {
    emoji: '🧱',
    label: 'Mason',
    cls: 'badge-mason',
    team: 'Village',
    desc: "There are always two Masons. From the very start you know each other's identities — confirmed Villagers. Work together to root out evil.",
  },
  {
    emoji: '🔭',
    label: 'Apprentice Seer',
    cls: 'badge-apprenticeSeer',
    team: 'Village',
    desc: "The Seer's gift will pass to you if they fall. Until then, wait and stay hidden. Once the Seer dies, you inherit the nightly investigation ability.",
  },
]

const PHASES = [
  {
    icon: '🌙',
    label: 'Night',
    desc: 'Everyone closes their eyes. Roles with night actions (Mafia, Seer, Doctor) act in secret. The GM narrates actions without revealing who did what.',
  },
  {
    icon: '☀️',
    label: 'Day',
    desc: 'The GM reveals who (if anyone) was killed overnight. All players discuss, debate, and accuse. The dead are silent.',
  },
  {
    icon: '🗳️',
    label: 'Voting',
    desc: "Players nominate and vote to eliminate a suspect. Majority rules. The eliminated player's role is revealed. Then night falls again.",
  },
]

export default function RulesPage({ onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        overflowY: 'auto',
        background: 'var(--bg)',
      }}
    >
      {/* Back button */}
      <button
        onClick={onClose}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(10,8,20,0.85)',
          backdropFilter: 'blur(8px)',
          border: 'none',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text2)',
          cursor: 'pointer',
          fontSize: '0.9rem',
          padding: '14px 20px',
          width: '100%',
          textAlign: 'left',
        }}
      >
        ← Back
      </button>

      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '32px 20px 64px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🌕</div>
          <h1
            className="font-title"
            style={{
              color: 'var(--moon)',
              fontSize: 'clamp(2rem, 7vw, 3rem)',
              margin: '0 0 8px',
              textShadow: '0 0 30px rgba(220,38,38,0.5)',
            }}
          >
            Blood Moon
          </h1>
          <p
            className="font-heading"
            style={{
              color: 'var(--text2)',
              fontSize: '0.9rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            How to Play
          </p>
        </div>

        {/* Win Conditions */}
        <section style={{ marginBottom: 32 }}>
          <h2
            className="font-heading"
            style={{
              color: 'var(--text2)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Win Conditions
          </h2>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <div
              className="card"
              style={{
                background: 'rgba(22,163,74,0.08)',
                borderColor: 'rgba(22,163,74,0.3)',
                padding: '20px 18px',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌅</div>
              <div
                className="font-heading"
                style={{
                  color: '#4ade80',
                  fontSize: '0.95rem',
                  marginBottom: 6,
                }}
              >
                Village Wins
              </div>
              <p
                style={{
                  color: 'var(--text2)',
                  fontSize: '0.8rem',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Eliminate all Mafia members through voting.
              </p>
            </div>
            <div
              className="card"
              style={{
                background: 'rgba(220,38,38,0.08)',
                borderColor: 'rgba(220,38,38,0.3)',
                padding: '20px 18px',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌑</div>
              <div
                className="font-heading"
                style={{
                  color: '#f87171',
                  fontSize: '0.95rem',
                  marginBottom: 6,
                }}
              >
                Mafia Wins
              </div>
              <p
                style={{
                  color: 'var(--text2)',
                  fontSize: '0.8rem',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Mafia equals or outnumbers the Village.
              </p>
            </div>
          </div>
        </section>

        {/* Game Phases */}
        <section style={{ marginBottom: 32 }}>
          <h2
            className="font-heading"
            style={{
              color: 'var(--text2)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Game Phases
          </h2>
          <div className="card" style={{ padding: '4px 0' }}>
            {PHASES.map((phase, i) => (
              <div key={phase.label}>
                {i > 0 && <div className="divider" />}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '16px 20px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>
                    {phase.icon}
                  </div>
                  <div>
                    <div
                      className="font-heading"
                      style={{ fontSize: '0.95rem', marginBottom: 4 }}
                    >
                      {phase.label}
                    </div>
                    <p
                      style={{
                        color: 'var(--text2)',
                        fontSize: '0.82rem',
                        margin: 0,
                        lineHeight: 1.55,
                      }}
                    >
                      {phase.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section style={{ marginBottom: 32 }}>
          <h2
            className="font-heading"
            style={{
              color: 'var(--text2)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Roles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ROLES.map(role => (
              <div
                key={role.label}
                className="card"
                style={{ padding: '16px 20px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{role.emoji}</span>
                  <span
                    className={`badge ${role.cls}`}
                    style={{ fontSize: '0.78rem' }}
                  >
                    {role.label}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.72rem',
                      color: role.team === 'Mafia' ? '#f87171' : '#4ade80',
                      fontFamily: 'Cinzel, serif',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {role.team}
                  </span>
                </div>
                <p
                  style={{
                    color: 'var(--text2)',
                    fontSize: '0.82rem',
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {role.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Important Rules */}
        <section>
          <h2
            className="font-heading"
            style={{
              color: 'var(--text2)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Important Rules
          </h2>
          <div className="card" style={{ padding: '4px 0' }}>
            {[
              {
                icon: '🤫',
                text: 'Dead players stay silent — no hints, reactions, or table talk.',
              },
              {
                icon: '🚫',
                text: 'No showing your role card or screen to others.',
              },
              {
                icon: '🎙️',
                text: "The GM's ruling is final. No arguing night-action results.",
              },
              {
                icon: '🔒',
                text: 'Mafia members may not reveal each other during the day.',
              },
              {
                icon: '⏱️',
                text: 'Day discussion has a time limit set by the GM before voting begins.',
              },
            ].map(({ icon, text }) => (
              <div key={text}>
                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '14px 20px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                    {icon}
                  </span>
                  <p
                    style={{
                      color: 'var(--text2)',
                      fontSize: '0.82rem',
                      margin: 0,
                      lineHeight: 1.55,
                    }}
                  >
                    {text}
                  </p>
                </div>
                <div className="divider" style={{ margin: 0 }} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
