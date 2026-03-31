import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import './App.css'

const TITLE = 'SeqFind'
const FONT = "'VT323', monospace"
const DIVIDER = '─'.repeat(48)
const ENTER_LABEL = '[ ENTER ]'
const USER_LABEL = '> USERNAME:'
const PASS_LABEL = '> PASSWORD:'
const VALIDATE_LABEL = '[ VALIDATE ]'
const CHROME_TITLE = 'team@seqfind: -'
const AUTH_USERNAME = 'friedman_g'
const AUTH_PASSWORD = 'sequence'
const GET_SEQ_OUTPUT = 'TCTATGTCTGAATCTGCTTCTATGTCTATGTCTTCTGCTATGTCTGAATCTGCT'
const CODON_SCAN_OUTPUT = "['TCT', 'ATG', 'TCT', 'GAA', 'TCT', 'GCT', 'TCT', 'ATG', 'TCT', 'ATG', 'TCT', 'TCT', 'GCT', 'ATG', 'TCT', 'GAA', 'TCT', 'GCT']"
const CODON_COUNTS_OUTPUT = 'GAA: 2\nATG: 4\nGCT: 3\nTCT: 9'

const termGreen = '#a3e635'
const termDim = '#65a30d'
const termBgBlack = '#000000'

type Stage =
  | 'typing'
  | 'splash'
  | 'background'
  | 'login'
  | 'granted'
  | 'workspace'
  | 'countdown'
  | 'shutdown'
  | 'keypad'
  | 'secret'
type TerminalEntry =
  | { id: number; kind: 'command'; text: string }
  | { id: number; kind: 'processing'; label: string; progress: number }
  | { id: number; kind: 'output'; text: string }

type CluePagePhase = 'closed' | 'opening' | 'open' | 'closing'

const FUNCTION_ENTRIES = [
  'clear()',
  'codon_counts()',
  'get_seq()',
  'gc_ratio()',
  'codon_scan()',
  'find_motif()',
  'align_read()',
  'mutateView()',
  'translateSeq()',
]

const CLUE_PAGE_ANIMATION_MS = 360
const BACKGROUND_BRIEFING = [
  "Hidden deep within the research facility, Dr. Friedman's lab hums in the quiet.",
  'It has been 30 years since its abandonment after her tragic, yet mysterious death.',
  'Her pioneering research involved the creation of SeqFind, a genomic exploration software.',
  "As a forensic investigator, you've been granted limited access, to begin your investigation into her death but in order to work you'll need the correct credentials to access her notes.",
  'The username is recorded in the lab registry (and entered for you), and the password can be uncovered by examining the puzzles you have completed.',
  'Only with both will you be able to explore the secrets waiting within the lab.',
]
const PRIMARY_CLUE_LINES = [
  'Hidden within this sequenced strand, a quiet voice speaks in threes.',
  "Break it apart, and you'll hear them clearly.",
  'Those that speak most often hold the key.',
  'Count them, then order them wisely,',
  "only then will the numbers and code to life's secrets be revealed.",
]
const SECONDARY_CLUE_LINES = [
  'hfdilahfdfbnkld/fnkdfldsfk;dn',
  'Timeless Cells Timeless Glow Cells Timeless Always Timeless Glow Glow Always Always',
]
const SECONDARY_CLUE_SIGNOFF = ['Best,', 'Dr. friedslalafa']

type HelixPoint = {
  id: number
  y: number
  leftX: number
  rightX: number
  leftFront: number
  rightFront: number
  phase: number
}

function buildDnaPoints(frame: number): HelixPoint[] {
  const center = 160
  const amplitude = 56

  return Array.from({ length: 22 }, (_, idx) => {
    const phase = frame * 0.22 + idx * 0.6
    const offset = Math.sin(phase) * amplitude
    const leftFront = (Math.cos(phase) + 1) / 2
    const rightFront = 1 - leftFront

    return {
      id: idx,
      y: 18 + idx * 13,
      leftX: center - offset,
      rightX: center + offset,
      leftFront,
      rightFront,
      phase,
    }
  })
}

function buildHelixPath(points: { x: number; y: number }[]) {
  return points
    .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
}

function buildDnaParticles(points: HelixPoint[]) {
  return points.flatMap((point, idx) => {
    if (idx % 3 !== 0) return []

    return [
      {
        id: `${idx}-l`,
        x: point.leftX - 22 + Math.sin(point.phase * 1.3) * 10,
        y: point.y - 8 + Math.cos(point.phase * 0.9) * 6,
        size: 4 + point.leftFront * 3,
        opacity: 0.22 + point.leftFront * 0.45,
      },
      {
        id: `${idx}-r`,
        x: point.rightX + 18 + Math.cos(point.phase * 1.2) * 12,
        y: point.y + 10 + Math.sin(point.phase) * 6,
        size: 4 + point.rightFront * 3,
        opacity: 0.2 + point.rightFront * 0.48,
      },
    ]
  })
}

// ── Typewriter hook ───────────────────────────────────────────────────────
function useTypewriter(text: string, speed: number, active: boolean) {
  const [typed, setTyped] = useState('')
  const [done, setDone]   = useState(false)

  useEffect(() => {
    if (!active) return
    setTyped('')
    setDone(false)
    let i = 0
    const iv = setInterval(() => {
      i++
      setTyped(text.slice(0, i))
      if (i >= text.length) { clearInterval(iv); setDone(true) }
    }, speed)
    return () => clearInterval(iv)
  }, [active, speed, text])

  return { typed, done }
}

// ── Button style ──────────────────────────────────────────────────────────
const mkBtnStyle = (green: string): CSSProperties => ({
  background:    'transparent',
  border:        `1px solid ${green}`,
  color:         green,
  fontFamily:    FONT,
  fontSize:      '1.6rem',
  padding:       '0.3rem 1.4rem',
  cursor:        'pointer',
  letterSpacing: '0.15em',
  transition:    'background 0.15s, color 0.15s',
})

function TerminalFrame({
  children,
  headerText = '',
  action,
}: {
  children: ReactNode
  headerText?: string
  action?: ReactNode
}) {
  return (
    <main className="screen-shell" style={{ fontFamily: FONT }}>
      <section className="terminal-frame">
        <header className="terminal-bar">
          <div className="terminal-bar-meta">{headerText}</div>
          <div className="terminal-bar-title">{CHROME_TITLE}</div>
          <div className="terminal-actions">{action}</div>
        </header>
        <div className="terminal-body">{children}</div>
      </section>
    </main>
  )
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [stage, setStage] = useState<Stage>('typing')
  const [username, setUsername] = useState(AUTH_USERNAME)
  const [password, setPassword] = useState('')
  const [accessLine, setAccessLine] = useState('')
  const [dnaFrame, setDnaFrame] = useState(0)
  const [dnaMinutes, setDnaMinutes] = useState(0)
  const [workspaceInput, setWorkspaceInput] = useState('')
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([])
  const [sequencePipelineStep, setSequencePipelineStep] = useState(0)
  const [authError, setAuthError] = useState('')
  const [shutdownSeconds, setShutdownSeconds] = useState(30)
  const [codeInput, setCodeInput] = useState('')
  const [triesLeft, setTriesLeft] = useState(3)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [keypadMessage, setKeypadMessage] = useState('')
  const [cluePagePhase, setCluePagePhase] = useState<CluePagePhase>('closed')

  const passwordRef = useRef<HTMLInputElement>(null)
  const workspaceInputRef = useRef<HTMLInputElement>(null)
  const workspaceLogRef = useRef<HTMLDivElement>(null)
  const keypadInputRef = useRef<HTMLInputElement>(null)
  const terminalEntryIdRef = useRef(0)
  const title = useTypewriter(TITLE, 100, true)
  const divider = useTypewriter(DIVIDER, 40, title.done)
  const enter = useTypewriter(ENTER_LABEL, 60, divider.done)
  const bgTitle = useTypewriter('Background', 45, stage === 'background')
  const bgBody = useTypewriter(
    [...BACKGROUND_BRIEFING, '', 'Best of Luck,', 'Rithik Sogal'].join('\n'),
    18,
    bgTitle.done
  )
  const userLbl = useTypewriter(USER_LABEL, 55, stage === 'login')
  const usernameTyped = useTypewriter(AUTH_USERNAME, 55, userLbl.done)
  const passLbl = useTypewriter(PASS_LABEL, 55, usernameTyped.done)
  const validate = useTypewriter(VALIDATE_LABEL,  60, passLbl.done)
  const dnaTimerTW = useTypewriter(
    `uptime: ${dnaMinutes.toString().padStart(2, '0')}m`,
    35,
    stage === 'workspace' || stage === 'countdown'
  )

  useEffect(() => { if (title.done) setStage('splash') }, [title.done])

  useEffect(() => {
    if (passLbl.done) passwordRef.current?.focus()
  }, [passLbl.done])

  useEffect(() => {
    if (stage !== 'granted') return
    const msg = '> Access Granted.'
    let i = 0
    const iv = setInterval(() => {
      i++
      setAccessLine(msg.slice(0, i))
      if (i >= msg.length) clearInterval(iv)
    }, 45)
    return () => clearInterval(iv)
  }, [stage])

  useEffect(() => {
    if (accessLine !== '> Access Granted.') return
    const t = setTimeout(() => {
      setCluePagePhase('opening')
      setStage('workspace')
    }, 900)
    return () => clearTimeout(t)
  }, [accessLine])

  useEffect(() => {
    if (cluePagePhase !== 'opening' && cluePagePhase !== 'closing') return
    const timeout = window.setTimeout(() => {
      setCluePagePhase((current) => {
        if (current === 'opening') return 'open'
        if (current === 'closing') return 'closed'
        return current
      })
    }, CLUE_PAGE_ANIMATION_MS)
    return () => window.clearTimeout(timeout)
  }, [cluePagePhase])

  useEffect(() => {
    if (stage !== 'workspace' && stage !== 'countdown') return
    const iv = setInterval(() => setDnaFrame((current) => current + 1), 180)
    return () => clearInterval(iv)
  }, [stage])

  useEffect(() => {
    if (stage !== 'workspace' && stage !== 'countdown') return
    const iv = setInterval(() => setDnaMinutes((current) => current + 1), 60000)
    return () => clearInterval(iv)
  }, [stage])

  useEffect(() => {
    if (stage !== 'workspace' || cluePagePhase !== 'closed') return
    workspaceInputRef.current?.focus()
  }, [cluePagePhase, stage, terminalEntries])

  useEffect(() => {
    if (stage !== 'workspace' && stage !== 'countdown') return
    const log = workspaceLogRef.current
    if (!log) return
    log.scrollTop = log.scrollHeight
  }, [stage, terminalEntries, workspaceInput])

  useEffect(() => {
    if (stage !== 'countdown') return
    setShutdownSeconds(30)
    const iv = setInterval(() => {
      setShutdownSeconds((current) => {
        if (current <= 1) {
          clearInterval(iv)
          setStage('shutdown')
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [stage])

  useEffect(() => {
    if (stage !== 'shutdown') return
    const timeout = window.setTimeout(() => setStage('keypad'), 1400)
    return () => window.clearTimeout(timeout)
  }, [stage])

  useEffect(() => {
    if (stage !== 'keypad') return
    keypadInputRef.current?.focus()
  }, [lockoutSeconds, stage])

  useEffect(() => {
    if (stage !== 'keypad' || lockoutSeconds <= 0) return
    const iv = setInterval(() => {
      setLockoutSeconds((current) => {
        if (current <= 1) {
          clearInterval(iv)
          setTriesLeft(3)
          setKeypadMessage('Keypad restored. 3 tries left')
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [lockoutSeconds, stage])

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    const nextUser = username.trim()
    if (!nextUser || !password) return
    if (nextUser !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
      setAuthError('ACCESS DENIED: INVALID CREDENTIALS')
      return
    }

    setAuthError('')
    setUsername(nextUser)
    setAccessLine('')
    setDnaFrame(0)
    setDnaMinutes(0)
    setWorkspaceInput('')
    setTerminalEntries([])
    setSequencePipelineStep(0)
    setShutdownSeconds(30)
    setCodeInput('')
    setTriesLeft(3)
    setLockoutSeconds(0)
    setKeypadMessage('')
    setCluePagePhase('closed')
    setStage('granted')
  }

  function nextTerminalEntryId() {
    terminalEntryIdRef.current += 1
    return terminalEntryIdRef.current
  }

  function toggleCluePage() {
    setCluePagePhase((current) => {
      if (current === 'closed' || current === 'closing') return 'opening'
      return 'closing'
    })
  }

  function startLockout() {
    setLockoutSeconds(30)
    setKeypadMessage('Access Denied 0 tries left')
  }

  function handleCodeSubmit() {
    if (lockoutSeconds > 0) return
    if (codeInput.length !== 4) {
      setKeypadMessage('Enter 4-digit code')
      return
    }
    if (codeInput === '9342') {
      setKeypadMessage('')
      setStage('secret')
      return
    }

    const remaining = triesLeft - 1
    setCodeInput('')
    setTriesLeft(Math.max(remaining, 0))

    if (remaining <= 0) {
      startLockout()
      return
    }

    setKeypadMessage(`Access Denied ${remaining} tries left`)
  }

  function handleKeypadDigit(digit: string) {
    if (lockoutSeconds > 0) return
    setCodeInput((current) => (current.length >= 4 ? current : `${current}${digit}`))
  }

  function handleKeypadBackspace() {
    if (lockoutSeconds > 0) return
    setCodeInput((current) => current.slice(0, -1))
  }

  function handleWorkspaceSubmit() {
    const command = workspaceInput.trim()
    if (!command) return

    const commandEntryId = nextTerminalEntryId()
    const commandEntry: TerminalEntry = {
      id: commandEntryId,
      kind: 'command',
      text: `> ${username}-seq_files % ${command}`,
    }

    setWorkspaceInput('')

    if (command === 'clear()') {
      setTerminalEntries([])
      return
    }

    const processedOutputs: Record<string, string> = {
      'get_seq()': GET_SEQ_OUTPUT,
      'codon_scan()': CODON_SCAN_OUTPUT,
      'codon_counts()': CODON_COUNTS_OUTPUT,
    }
    const requiredPipelineSteps: Record<string, number> = {
      'get_seq()': 0,
      'codon_scan()': 1,
      'codon_counts()': 2,
    }
    const nextPipelineSteps: Record<string, number> = {
      'get_seq()': 1,
      'codon_scan()': 2,
      'codon_counts()': 3,
    }

    if (processedOutputs[command]) {
      if (sequencePipelineStep < requiredPipelineSteps[command]) {
        setTerminalEntries((current) => [
          ...current,
          commandEntry,
          { id: nextTerminalEntryId(), kind: 'output', text: 'MODULE ERROR MODULE ERROR MODULE NOT FOUND' },
        ])
        return
      }

      const processingEntryId = nextTerminalEntryId()
      setTerminalEntries((current) => [
        ...current,
        commandEntry,
        { id: processingEntryId, kind: 'processing', label: 'Processing', progress: 0 },
      ])

      let progress = 0
      const iv = setInterval(() => {
        progress += 5

        if (progress >= 100) {
          clearInterval(iv)
          setSequencePipelineStep((current) => Math.max(current, nextPipelineSteps[command]))
          setTerminalEntries((current) =>
            current.map((entry) =>
              entry.id === processingEntryId
                ? { id: processingEntryId, kind: 'output', text: processedOutputs[command] }
                : entry
            )
          )
          if (command === 'codon_counts()') {
            window.setTimeout(() => {
              setShutdownSeconds(30)
              setCodeInput('')
              setTriesLeft(3)
              setLockoutSeconds(0)
              setKeypadMessage('')
              setStage('countdown')
            }, 400)
          }
          return
        }

        setTerminalEntries((current) =>
          current.map((entry) =>
            entry.id === processingEntryId && entry.kind === 'processing'
              ? { ...entry, progress }
              : entry
          )
        )
      }, 60)

      return
    }

    const errorCommands = new Set([
      'gc_ratio()',
      'align_read()',
      'find_motif()',
      'mutateView()',
      'translateSeq()',
    ])

    if (errorCommands.has(command)) {
      setTerminalEntries((current) => [
        ...current,
        commandEntry,
        { id: nextTerminalEntryId(), kind: 'output', text: 'MODULE ERROR MODULE ERROR MODULE NOT FOUND' },
      ])
      return
    }

    setTerminalEntries((current) => [
      ...current,
      commandEntry,
      { id: nextTerminalEntryId(), kind: 'output', text: 'error: unknown function' },
    ])
  }

  const inputStyle: CSSProperties = {
    background: 'transparent', border: 'none', outline: 'none',
    color: termGreen, fontFamily: FONT, fontSize: '1.8rem',
    caretColor: termGreen, width: '320px', letterSpacing: '0.05em',
  }

  const workspaceInputStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: termGreen,
    fontFamily: FONT,
    fontSize: '1.65rem',
    caretColor: termGreen,
    flex: 1,
    minWidth: '140px',
    letterSpacing: '0.05em',
  }

  const dividerProgress = DIVIDER.length === 0 ? 0 : divider.typed.length / DIVIDER.length

  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
  const cluePageVisible = cluePagePhase !== 'closed'
  const secretConfetti = Array.from({ length: 30 }, (_, idx) => ({
    id: idx,
    glyph: ['+', '*', '#', ']', '[', '0', '1'][idx % 7],
    left: `${4 + ((idx * 11) % 92)}%`,
    delay: `${(idx % 10) * 0.18}s`,
    duration: `${4.4 + (idx % 6) * 0.45}s`,
  }))

  function TermBtn({ onClick, type = 'button', disabled = false, children }: {
    onClick?: () => void; type?: 'button' | 'submit'
    disabled?: boolean;   children: ReactNode
  }) {
    return (
      <button
        type={type} onClick={onClick} disabled={disabled}
        style={{ ...mkBtnStyle(termGreen), cursor: disabled ? 'default' : 'pointer' }}
        onMouseEnter={e => {
          if (disabled) return
          ;(e.currentTarget as HTMLButtonElement).style.background = termGreen
          ;(e.currentTarget as HTMLButtonElement).style.color      = termBgBlack
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLButtonElement).style.color      = termGreen
        }}
      >
        {children}
      </button>
    )
  }

  if (stage === 'workspace' || stage === 'countdown') {
    return (
      <>
        <div className="crt-vignette" />
        <div className="crt-overlay" />
        <TerminalFrame
          headerText={`${username}-seq_files %`}
          action={
            <button type="button" className="terminal-back-btn" onClick={toggleCluePage}>
              Back to Clues
            </button>
          }
        >
          <div className="workspace-screen">
            <section className="workspace-pane workspace-prompt-pane">
              <div className="workspace-pane-title">Command Prompt</div>
              <div ref={workspaceLogRef} className="workspace-prompt-log">
                <div className="prompt-line">
                  <span style={{ color: termGreen }}>{`> ${username}-seq_files %`}</span>
                </div>
                <div className="workspace-output-line">session boot complete</div>
                <div className="workspace-output-line">modules loaded: seq_package</div>
                <div className="workspace-output-line">status: awaiting input</div>
                {stage === 'countdown' && (
                  <div className="workspace-countdown-line">
                    shutdown sequence engaged: screen collapse in {shutdownSeconds}s
                  </div>
                )}
                {terminalEntries.map((entry) => {
                  if (entry.kind === 'command') {
                    return (
                      <div key={entry.id} className="prompt-line">
                        <span style={{ color: termGreen }}>{entry.text}</span>
                      </div>
                    )
                  }

                  if (entry.kind === 'processing') {
                    return (
                      <div key={entry.id} className="workspace-processing-line">
                        <span className="workspace-processing-label">{entry.label}</span>
                        <div className="workspace-processing-bar">
                          {Array.from({ length: 20 }).map((_, idx) => (
                            <span
                              key={idx}
                              className={`workspace-processing-segment${entry.progress >= ((idx + 1) / 20) * 100 ? ' active' : ''}`}
                            />
                          ))}
                        </div>
                        <span className="workspace-processing-percent">{Math.round(entry.progress)}%</span>
                      </div>
                    )
                  }

                  return (
                    <div key={entry.id} className="workspace-output-line">
                      {entry.text}
                    </div>
                  )
                })}
                {stage === 'workspace' ? (
                  <div className="prompt-line">
                    <span style={{ color: termGreen }}>{`> ${username}-seq_files %`}</span>
                    <input
                      ref={workspaceInputRef}
                      type="text"
                      value={workspaceInput}
                      onChange={(event) => setWorkspaceInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return
                        event.preventDefault()
                        handleWorkspaceSubmit()
                      }}
                      style={workspaceInputStyle}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div className="workspace-output-line workspace-output-line-dim">
                    prompt locked: awaiting terminal shutdown
                  </div>
                )}
              </div>
            </section>

            <div className="workspace-side">
              <section className="workspace-pane workspace-dictionary-pane">
                <div className="workspace-pane-title">Function Dictionary</div>
                <div className="dictionary-list">
                  {FUNCTION_ENTRIES.map((name) => (
                    <div key={name} className="dictionary-entry">
                      <div className="dictionary-name">{name}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="workspace-pane workspace-dna-pane">
                <div className="workspace-pane-title workspace-pane-title-split">
                  <span>DNA Live Feed</span>
                  <span>
                    {dnaTimerTW.typed}
                    {dnaTimerTW.typed.length < `uptime: ${dnaMinutes.toString().padStart(2, '0')}m`.length && (
                      <span className="cursor-blink">█</span>
                    )}
                  </span>
                </div>
                <div className="dna-grid">
                  <svg className="dna-svg" viewBox="0 0 320 320" aria-hidden="true">
                    <defs>
                      <linearGradient id="dnaLeftGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#dffcff" />
                        <stop offset="45%" stopColor="#8be7ff" />
                        <stop offset="100%" stopColor="#2f8fab" />
                      </linearGradient>
                      <linearGradient id="dnaRightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffe7ef" />
                        <stop offset="45%" stopColor="#ff9fb9" />
                        <stop offset="100%" stopColor="#b64d72" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const points = buildDnaPoints(dnaFrame)
                      const leftPath = buildHelixPath(points.map((point) => ({ x: point.leftX, y: point.y })))
                      const rightPath = buildHelixPath(points.map((point) => ({ x: point.rightX, y: point.y })))
                      const particles = buildDnaParticles(points)

                      return (
                        <>
                          <path className="dna-strand dna-strand-shadow" d={leftPath} />
                          <path className="dna-strand dna-strand-shadow" d={rightPath} />
                          <path className="dna-strand" d={leftPath} stroke="url(#dnaLeftGradient)" />
                          <path className="dna-strand" d={rightPath} stroke="url(#dnaRightGradient)" />

                          {points.map((point) => (
                            <line
                              key={`rung-${point.id}`}
                              className="dna-rung-line"
                              x1={point.leftX}
                              y1={point.y}
                              x2={point.rightX}
                              y2={point.y}
                              opacity={0.16 + Math.max(point.leftFront, point.rightFront) * 0.6}
                            />
                          ))}

                          {points.map((point) => (
                            <g key={`nodes-${point.id}`}>
                              <ellipse
                                className="dna-node-shape dna-node-left-shape"
                                cx={point.leftX}
                                cy={point.y}
                                rx={6 + point.leftFront * 4}
                                ry={7 + point.leftFront * 5}
                                opacity={0.35 + point.leftFront * 0.65}
                              />
                              <ellipse
                                className="dna-node-shape dna-node-right-shape"
                                cx={point.rightX}
                                cy={point.y}
                                rx={6 + point.rightFront * 4}
                                ry={7 + point.rightFront * 5}
                                opacity={0.35 + point.rightFront * 0.65}
                              />
                            </g>
                          ))}

                          {particles.map((particle) => (
                            <circle
                              key={particle.id}
                              className="dna-particle-shape"
                              cx={particle.x}
                              cy={particle.y}
                              r={particle.size}
                              opacity={particle.opacity}
                            />
                          ))}
                        </>
                      )
                    })()}
                  </svg>
                </div>
                <div className="dna-status">
                  <span>signal: locked</span>
                  <span>helix drift: active</span>
                </div>
              </section>
            </div>
          </div>
          {cluePageVisible && (
            <section
              className={`clue-page-overlay clue-page-overlay--${cluePagePhase}`}
              role="button"
              tabIndex={0}
              aria-label="Close lab notes"
              onClick={toggleCluePage}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                toggleCluePage()
              }}
            >
              <div className="clue-page-shell">
                <section className="workspace-pane clue-page-pane">
                  <div className="workspace-pane-title">Lab Notes</div>
                  <div className="clue-page-copy">
                    <div className="clue-page-stamp">03/27/2089</div>
                    <div className="clue-page-heading">Laboratory Notes</div>
                    <div className="clue-page-time">3:04 AM</div>
                    {PRIMARY_CLUE_LINES.map((line) => (
                      <div key={line} className="clue-page-line">
                        {line}
                      </div>
                    ))}
                    <div className="clue-page-signoff">Sincerely, Dr. Friedman</div>

                    <div className="clue-page-section-divider" />

                    <div className="clue-page-stamp">03/27/2089</div>
                    <div className="clue-page-time">6:00 AM</div>
                    {SECONDARY_CLUE_LINES.map((line) => (
                      <div key={line} className="clue-page-line">{line}</div>
                    ))}
                    <div className="clue-page-signoff">
                      {SECONDARY_CLUE_SIGNOFF.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>

                    <div className="clue-page-hint">click anywhere to reopen the workspace</div>
                  </div>
                </section>
              </div>
            </section>
          )}
        </TerminalFrame>
      </>
    )
  }

  if (stage === 'shutdown') {
    return (
      <>
        <div className="crt-vignette" />
        <div className="crt-overlay" />
        <main className="screen-shell" style={{ fontFamily: FONT }}>
          <section className="poweroff-screen">
            <div className="poweroff-beam" />
            <div className="poweroff-core" />
          </section>
        </main>
      </>
    )
  }

  if (stage === 'keypad') {
    return (
      <>
        <div className="crt-vignette" />
        <div className="crt-overlay" />
        <TerminalFrame headerText="vault://code-gate">
          <div className="keypad-screen">
            <div className="keypad-title">Code Verification Required</div>
            <div className="keypad-subtitle">
              {lockoutSeconds > 0
                ? `keypad disabled: ${lockoutSeconds}s until retry`
                : `${triesLeft} tries available`}
            </div>
            <div className="keypad-codebar-wrap">
              <input
                ref={keypadInputRef}
                className="keypad-codebar"
                type="text"
                inputMode="numeric"
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  handleCodeSubmit()
                }}
                disabled={lockoutSeconds > 0}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="keypad-board">
              {keypadDigits.slice(0, 9).map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="keypad-digit"
                  disabled={lockoutSeconds > 0}
                  onClick={() => handleKeypadDigit(digit)}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                className="keypad-digit keypad-digit-action"
                disabled={lockoutSeconds > 0}
                onClick={handleKeypadBackspace}
              >
                DEL
              </button>
              <button
                type="button"
                className="keypad-digit"
                disabled={lockoutSeconds > 0}
                onClick={() => handleKeypadDigit(keypadDigits[9])}
              >
                {keypadDigits[9]}
              </button>
              <button
                type="button"
                className="keypad-digit keypad-digit-action"
                disabled={lockoutSeconds > 0}
                onClick={handleCodeSubmit}
              >
                ENT
              </button>
            </div>
            <div className={`keypad-status${lockoutSeconds > 0 ? ' locked' : ''}`}>
              {keypadMessage || 'Awaiting 4-digit override'}
            </div>
          </div>
        </TerminalFrame>
      </>
    )
  }

  if (stage === 'secret') {
    return (
      <>
        <div className="crt-vignette" />
        <div className="crt-overlay" />
        <main className="screen-shell" style={{ fontFamily: FONT }}>
          <section className="secret-screen">
            <div className="secret-confetti" aria-hidden="true">
              {secretConfetti.map((piece) => (
                <span
                  key={piece.id}
                  className="secret-confetti-piece"
                  style={{
                    left: piece.left,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                  }}
                >
                  {piece.glyph}
                </span>
              ))}
            </div>
            <div className="secret-banner-wrap">
              <div className="secret-banner">Top Secret Access Granted</div>
            </div>
          </section>
        </main>
      </>
    )
  }

  // ── LOGIN / SPLASH / GRANTED ──────────────────────────────────────────
  return (
    <>
      <div className="crt-vignette" />
      <div className="crt-overlay" />
      <TerminalFrame headerText={stage === 'login' ? 'auth://credential-gate' : 'boot://seqfind'}>
        <div className="auth-stage">
          <div
            style={{
              maxWidth: stage === 'background' ? '1020px' : '800px',
              width: '100%',
              fontSize: '1.8rem',
              textAlign: 'center',
            }}
          >
            <h1 className="crt-glow" style={{
              color: termGreen, fontSize: 'clamp(2.8rem, 7vw, 5rem)',
              fontWeight: 700, letterSpacing: '0.04em', margin: 0, lineHeight: 1.1,
            }}>
              {title.typed}
              {!title.done && <span className="cursor-blink" style={{ color: termGreen }}>█</span>}
            </h1>

            {title.done && (
              <div className="splash-divider" style={{ color: termDim }}>
                <span
                  className="splash-divider-line"
                  style={{ transform: `scaleX(${dividerProgress})` }}
                />
              </div>
            )}

            {stage === 'splash' && divider.done && (
              <div>
                <TermBtn disabled={!enter.done} onClick={enter.done ? () => setStage('background') : undefined}>
                  {enter.typed}
                  {!enter.done && <span className="cursor-blink" style={{ marginLeft: '2px' }}>█</span>}
                </TermBtn>
              </div>
            )}

            {stage === 'background' && (
              <section
                className="background-briefing"
                role="button"
                tabIndex={0}
                aria-label="Continue to login"
                onClick={() => setStage('login')}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  setStage('login')
                }}
              >
                <section className="workspace-pane clue-page-pane background-briefing-pane">
                  <div className="workspace-pane-title">
                    {bgTitle.typed}
                    {!bgTitle.done && <span className="cursor-blink">█</span>}
                  </div>
                  <div className="clue-page-copy background-briefing-copy">
                    {bgTitle.done && bgBody.typed.split('\n').map((line, idx, arr) => {
                      const isLast = idx === arr.length - 1
                      return (
                        <div
                          key={idx}
                          className="clue-page-line background-briefing-line"
                        >
                          {line}
                          {isLast && !bgBody.done && (
                            <span className="cursor-blink">█</span>
                          )}
                        </div>
                      )
                    })}
                    {bgBody.done && (
                      <div className="clue-page-hint">click anywhere to continue to login</div>
                    )}
                  </div>
                </section>
              </section>
            )}

            {stage === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'inline-block', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ color: termGreen, marginRight: '0.75rem', letterSpacing: '0.1em' }}>
                    {userLbl.typed}
                  </span>
                  {!userLbl.done
                    ? <span className="cursor-blink">█</span>
                    : !usernameTyped.done
                      ? (
                        <span
                          style={{ ...inputStyle, display: 'inline-block', width: 'auto', minWidth: `${AUTH_USERNAME.length}ch` }}
                        >
                          {usernameTyped.typed}
                          <span className="cursor-blink">█</span>
                        </span>
                      )
                      : <input
                        type="text"
                        value={username}
                        style={inputStyle}
                        readOnly
                        aria-readonly="true"
                        autoComplete="off"
                        spellCheck={false}
                      />
                  }
                </div>

                {usernameTyped.done && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                    <span style={{ color: termGreen, marginRight: '0.75rem', letterSpacing: '0.1em' }}>
                      {passLbl.typed}
                    </span>
                    {!passLbl.done
                      ? <span className="cursor-blink">█</span>
                      : <input
                          ref={passwordRef}
                          type="password"
                          value={password}
                          onChange={e => {
                            setPassword(e.target.value)
                            if (authError) setAuthError('')
                          }}
                          style={inputStyle}
                          autoComplete="current-password"
                        />
                    }
                  </div>
                )}

                {passLbl.done && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <TermBtn type="submit" disabled={!validate.done}>
                        {validate.typed}
                        {!validate.done && <span className="cursor-blink" style={{ marginLeft: '2px' }}>█</span>}
                      </TermBtn>
                    </div>
                    {authError && (
                      <p style={{
                        color: '#dfffad',
                        fontSize: '1.45rem',
                        letterSpacing: '0.08em',
                        margin: '1rem 0 0',
                        textAlign: 'center',
                      }}>
                        {authError}
                      </p>
                    )}
                  </>
                )}
              </form>
            )}

            {stage === 'granted' && (
              <p style={{ color: termGreen, fontSize: '1.8rem', letterSpacing: '0.05em', margin: 0 }}>
                {accessLine}
                {accessLine.length < '> Access Granted.'.length && (
                  <span className="cursor-blink">█</span>
                )}
              </p>
            )}
          </div>
        </div>
      </TerminalFrame>
    </>
  )
}
