import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  DIFFICULTIES,
  evaluateGuess,
  generateSecretNumber,
  type Difficulty,
} from './game'
import { loadBestRecords, saveBestRecord } from './records'
import './App.css'

type Language = 'bm' | 'en'
type Theme = 'dark' | 'light'
type FontSize = 'normal' | 'large' | 'larger'
type FeedbackState =
  | { kind: 'opening' | 'invalid' }
  | { kind: 'too-low' | 'too-high'; value: number }
  | { kind: 'won'; attempts: number }

const BEST_RECORDS_KEY = 'tenomtu-best-records'
const numberFormatters: Record<Language, Intl.NumberFormat> = {
  bm: new Intl.NumberFormat('ms-MY'),
  en: new Intl.NumberFormat('en-US'),
}

const difficultyNames: Record<Language, Record<Difficulty['id'], string>> = {
  bm: {
    easy: 'Senang',
    medium: 'Sederhana',
    hard: 'Susah',
    evil: 'Kejam',
    monster: 'Monster',
    impossible: 'Mustahil',
  },
  en: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    evil: 'Evil',
    monster: 'Monster',
    impossible: 'Impossible',
  },
}

const copy = {
  bm: {
    chooseLevel: 'Pilih tahap',
    makeGuess: 'Cuba teka nombor',
    finished: 'Nombor ditemui',
    startGame: 'MULA TEKA',
    changeDifficulty: 'TUKAR TAHAP',
    feedbackPrompt: 'Ada maklum balas?',
    feedbackLink: 'Hantar e-mel kepada kami',
    switchToLight: 'Tukar ke tema cerah',
    switchToDark: 'Tukar ke tema gelap',
    textSize: 'Saiz teks',
    smallText: 'Saiz teks kecil',
    mediumText: 'Saiz teks sederhana',
    largeText: 'Saiz teks besar',
    introFirst: 'Anda Power?',
    introAccent: 'Cuba tembak!',
    intro: 'Pilih satu nombor. Tembak dengan sekali cubaan!',
    range: 'Julat nombor',
    to: 'hingga',
    difficulty: 'TAHAP KESUKARAN',
    best: 'REKOD TERBAIK',
    bestNone: 'Belum ada lagi — cipta rekod!',
    guesses: 'TEKAAN',
    yourGuess: 'CUBA TEKA',
    placeholder: 'Masukkan nombor...',
    guess: 'TEKA',
    tooLow: 'terlalu rendah! Cuba nombor yang lebih besar.',
    tooHigh: 'terlalu tinggi! Cuba nombor yang lebih kecil.',
    won: 'Yes! Kena tepat dalam',
    guessSingular: 'cubaan!',
    guessPlural: 'cubaan!',
    invalid: 'Masukkan nombor bulat dari 1 hingga',
    opening: 'Cuba teka nombor rahsia!',
    victoryTitle: 'Hebat, tepat sekali!',
    victoryNewBest: 'Rekod baharu! Memang hebat!',
    victoryRecord: 'Rekod terbaik',
    victoryNext: 'Nak cuba tahap mana pula?',
    startNext: 'JOM, MULA!',
    language: 'Bahasa',
    saveUnavailable: 'Rekod tidak dapat disimpan dalam pelayar ini.',
  },
  en: {
    chooseLevel: 'Choose a level',
    makeGuess: 'Take your guess',
    finished: 'Number found',
    startGame: 'LET’S PLAY',
    changeDifficulty: 'CHANGE LEVEL',
    feedbackPrompt: 'Got feedback?',
    feedbackLink: 'Email us',
    switchToLight: 'Switch to light theme',
    switchToDark: 'Switch to dark theme',
    textSize: 'Text size',
    smallText: 'Small text size',
    mediumText: 'Medium text size',
    largeText: 'Large text size',
    introFirst: 'Feeling lucky?',
    introAccent: 'Take a shot!',
    intro: "Picked a number. Hit it in one go!",
    range: 'Range',
    to: 'to',
    difficulty: 'DIFFICULTY',
    best: 'BEST RECORD',
    bestNone: 'Not yet — set the first record!',
    guesses: 'GUESSES',
    yourGuess: 'YOUR GUESS',
    placeholder: 'Pick a number...',
    guess: 'GUESS',
    tooLow: 'is a little low. Go higher!',
    tooHigh: 'is a little high. Go lower!',
    won: 'Nice! You got it in',
    guessSingular: 'guess.',
    guessPlural: 'guesses.',
    invalid: 'Pick a whole number from 1 to',
    opening: 'Take a guess!',
    victoryTitle: 'Brilliant—you got it!',
    victoryNewBest: 'New personal best! Look at you go!',
    victoryRecord: 'Best record',
    victoryNext: 'What level are you taking on next?',
    startNext: "LET'S GO!",
    language: 'Language',
    saveUnavailable: 'This browser could not save your record.',
  },
} as const

function getFeedbackMessage(
  state: FeedbackState,
  text: (typeof copy)[Language],
  formatter: Intl.NumberFormat,
  max: number,
): string {
  switch (state.kind) {
    case 'opening':
      return text.opening
    case 'invalid':
      return `${text.invalid} ${formatter.format(max)}.`
    case 'too-low':
      return `${formatter.format(state.value)} ${text.tooLow}`
    case 'too-high':
      return `${formatter.format(state.value)} ${text.tooHigh}`
    case 'won':
      return `${text.won} ${state.attempts} ${state.attempts === 1 ? text.guessSingular : text.guessPlural}`
  }
}

function formatGuessInput(input: string, caretPosition: number) {
  const digits = input.replace(/\D/g, '')
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const digitsBeforeCaret = input.slice(0, caretPosition).replace(/\D/g, '').length
  let nextCaretPosition = 0
  let digitsSeen = 0

  while (nextCaretPosition < formatted.length && digitsSeen < digitsBeforeCaret) {
    if (/\d/.test(formatted[nextCaretPosition])) digitsSeen += 1
    nextCaretPosition += 1
  }

  return { formatted, caretPosition: nextCaretPosition }
}

function App() {
  const [language, setLanguage] = useState<Language>('bm')
  const [theme, setTheme] = useState<Theme>(() => (
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  ))
  const [fontSize, setFontSize] = useState<FontSize>('normal')
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0])
  const [gameStarted, setGameStarted] = useState(false)
  const [nextDifficulty, setNextDifficulty] = useState<Difficulty['id']>(
    DIFFICULTIES[0].id,
  )
  const [secret, setSecret] = useState(0)
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [won, setWon] = useState(false)
  const [isNewBest, setIsNewBest] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [bestRecords, setBestRecords] = useState<
    Partial<Record<Difficulty['id'], number>>
  >({})
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({
    kind: 'opening',
  })
  const dialogRef = useRef<HTMLDialogElement>(null)
  const guessInputRef = useRef<HTMLInputElement>(null)
  const pendingGuessCaretRef = useRef<number | null>(null)
  const manualThemeRef = useRef(false)
  const text = copy[language]
  const formatter = numberFormatters[language]
  const bestRecord = bestRecords[difficulty.id]
  const feedback = getFeedbackMessage(
    feedbackState,
    text,
    formatter,
    difficulty.max,
  )

  useEffect(() => {
    try {
      setBestRecords(loadBestRecords(window.localStorage, BEST_RECORDS_KEY))
    } catch {
      setStorageAvailable(false)
    }
  }, [])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: light)')
    const syncTheme = () => {
      if (!manualThemeRef.current) {
        setTheme(preference.matches ? 'light' : 'dark')
      }
    }

    preference.addEventListener('change', syncTheme)
    return () => preference.removeEventListener('change', syncTheme)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (won && !dialog.open) dialog.showModal()
    if (!won && dialog.open) dialog.close()
  }, [won])

  useEffect(() => {
    document.documentElement.lang = language === 'bm' ? 'ms' : 'en'
  }, [language])

  useLayoutEffect(() => {
    const input = guessInputRef.current
    const caretPosition = pendingGuessCaretRef.current
    if (input && caretPosition !== null) {
      input.setSelectionRange(caretPosition, caretPosition)
      pendingGuessCaretRef.current = null
    }
  }, [guess])

  useEffect(() => {
    document.body.dataset.theme = theme
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )
    if (themeColor) {
      themeColor.content = theme === 'dark' ? '#061423' : '#f4f8fa'
    }
  }, [theme])

  function startNewGame(next: Difficulty = difficulty) {
    setDifficulty(next)
    setNextDifficulty(next.id)
    setSecret(generateSecretNumber(next.max))
    setGameStarted(true)
    setGuess('')
    setAttempts(0)
    setWon(false)
    setIsNewBest(false)
    setFeedbackState({ kind: 'opening' })
  }

  function submitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (won) return

    const digits = guess.replace(/,/g, '')
    const value = Number(digits)
    if (
      !/^\d+$/.test(digits.trim()) ||
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > difficulty.max
    ) {
      setFeedbackState({ kind: 'invalid' })
      return
    }

    const result = evaluateGuess(value, secret)
    const totalAttempts = attempts + 1
    setAttempts(totalAttempts)

    if (result === 'correct') {
      setWon(true)
      setFeedbackState({ kind: 'won', attempts: totalAttempts })

      try {
        const record = saveBestRecord(
          window.localStorage,
          BEST_RECORDS_KEY,
          difficulty.id,
          totalAttempts,
        )
        setBestRecords(record.records)
        setIsNewBest(record.isNewBest)
      } catch {
        setStorageAvailable(false)
        setIsNewBest(false)
      }

      setNextDifficulty(difficulty.id)
    } else if (result === 'too-low') {
      setFeedbackState({ kind: 'too-low', value })
    } else {
      setFeedbackState({ kind: 'too-high', value })
    }

    setGuess('')
  }

  function startSelectedDifficulty() {
    const selected = DIFFICULTIES.find(({ id }) => id === nextDifficulty)
    if (selected) startNewGame(selected)
  }

  return (
    <main
      className={`page-shell${gameStarted ? ' is-playing' : ''}`}
      data-theme={theme}
      data-font-size={fontSize}
    >
      <header className="topbar">
        <a className="brand" href="/" aria-label="Tenomtu">
          <span className="brand-name">Tenomtu</span>
        </a>
        <div className="topbar-actions">
          <div className="font-size-control" role="group" aria-label={text.textSize}>
            {([
              ['normal', 'small'],
              ['large', 'medium'],
              ['larger', 'large'],
            ] as const).map(([size, label]) => {
              const ariaLabel = label === 'small'
                ? text.smallText
                : label === 'medium'
                  ? text.mediumText
                  : text.largeText
              return (
                <button
                  aria-label={ariaLabel}
                  aria-pressed={fontSize === size}
                  className={`font-size-option font-size-option--${label}`}
                  key={size}
                  onClick={() => setFontSize(size)}
                  type="button"
                >
                  A
                </button>
              )
            })}
          </div>
          <button
            aria-label={theme === 'dark' ? text.switchToLight : text.switchToDark}
            className="theme-toggle"
            onClick={() => {
              manualThemeRef.current = true
              setTheme((current) => current === 'dark' ? 'light' : 'dark')
            }}
            type="button"
          >
            {theme === 'dark' ? (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" />
              </svg>
            )}
          </button>
          <div className="language-toggle" aria-label={text.language}>
            <button
              aria-pressed={language === 'bm'}
              onClick={() => setLanguage('bm')}
              type="button"
            >
              BM
            </button>
            <button
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
              type="button"
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <section
        className={`game-layout${gameStarted ? ' is-playing' : ''}`}
        aria-labelledby="game-title"
      >
        {!gameStarted && (
          <div className="intro">
            <h1 id="game-title">
              {text.introFirst}<br />
              <span>{text.introAccent}</span>
            </h1>
            <p className="intro-copy">{text.intro}</p>
          </div>
        )}
        <div className="game-card">
          {!gameStarted ? (
            <div className="game-step">
              <h2>{text.chooseLevel}</h2>
              <label className="field-label" htmlFor="difficulty-select">
                {text.difficulty}
              </label>
              <div className="select-wrap">
                <select
                  aria-label={text.difficulty}
                  id="difficulty-select"
                  onChange={(event) => {
                    const selected = DIFFICULTIES.find(
                      ({ id }) => id === event.target.value,
                    )
                    if (selected) setDifficulty(selected)
                  }}
                  value={difficulty.id}
                >
                  {DIFFICULTIES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {difficultyNames[language][option.id]} (1 {text.to} {formatter.format(option.max)})
                    </option>
                  ))}
                </select>
              </div>
              <p className="range-note">
                {text.range}: <strong>1 {text.to} {formatter.format(difficulty.max)}</strong>
              </p>
              <div className="best-record">
                <span className="best-record-label">{text.best}</span>
                <span className="best-record-value">
                  {bestRecord
                    ? `${bestRecord} ${bestRecord === 1 ? text.guessSingular : text.guessPlural}`
                    : text.bestNone}
                </span>
              </div>
              <button
                className="primary-button"
                onClick={() => startNewGame()}
                type="button"
              >
                {text.startGame}
              </button>
            </div>
          ) : (
            <div className="game-step">
              <h1 id="game-title">{won ? text.finished : text.makeGuess}</h1>
              <p className="step-description">
                <strong>{difficultyNames[language][difficulty.id]}</strong>
                <br />
                {text.range}: <strong>1 {text.to} {formatter.format(difficulty.max)}</strong>
              </p>
              <form className="guess-form" onSubmit={submitGuess} noValidate>
                <label className="field-label" htmlFor="guess-input">
                  {text.yourGuess}
                </label>
                <input
                  autoComplete="off"
                  autoFocus
                  id="guess-input"
                  inputMode="numeric"
                  name="guess"
                  onChange={(event) => {
                    const { formatted, caretPosition } = formatGuessInput(
                      event.currentTarget.value,
                      event.currentTarget.selectionStart ?? event.currentTarget.value.length,
                    )
                    pendingGuessCaretRef.current = caretPosition
                    setGuess(formatted)
                  }}
                  placeholder={text.placeholder}
                  ref={guessInputRef}
                  type="text"
                  value={guess}
                  disabled={won}
                  aria-describedby="guess-feedback"
                />
                <p className="feedback" id="guess-feedback" role="status" aria-live="polite">
                  {feedback}
                </p>
                <p className="attempt-count">
                  <strong>{attempts}</strong> {text.guesses}
                </p>
                <button className="primary-button" type="submit" disabled={won}>
                  {text.guess}
                </button>
              </form>
              {!storageAvailable && (
                <p className="storage-warning" role="status">{text.saveUnavailable}</p>
              )}
              <button
                className="text-button"
                onClick={() => {
                  setGameStarted(false)
                  setAttempts(0)
                  setGuess('')
                  setFeedbackState({ kind: 'opening' })
                }}
                type="button"
              >
                {text.changeDifficulty}
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="page-footer">
        <span>{text.feedbackPrompt}</span>
        <a href="mailto:owlrizqilabs@gmail.com?subject=Tenomtu%20feedback">
          {text.feedbackLink} · owlrizqilabs@gmail.com
        </a>
      </footer>

      <dialog
        aria-describedby="victory-score"
        aria-labelledby="victory-title"
        className="victory-dialog"
        onCancel={(event) => event.preventDefault()}
        ref={dialogRef}
      >
        <div className="dialog-content">
          <h2 id="victory-title">{text.finished}</h2>
          <p className="dialog-congratulations">{text.victoryTitle}</p>
          <p className="dialog-score" id="victory-score">{feedback}</p>
          <p className="dialog-record">
            {isNewBest && <span className="new-record">{text.victoryNewBest}</span>}
            <span>{text.victoryRecord}: </span>
            <strong>
              {bestRecord
                ? `${bestRecord} ${bestRecord === 1 ? text.guessSingular : text.guessPlural}`
                : text.bestNone}
            </strong>
          </p>
          <div className="dialog-divider" />
          <label htmlFor="next-difficulty">{text.victoryNext}</label>
          <div className="select-wrap dialog-select-wrap">
            <select
              aria-label={text.victoryNext}
              id="next-difficulty"
              onChange={(event) => {
                const selected = DIFFICULTIES.find(
                  ({ id }) => id === event.target.value,
                )
                if (selected) setNextDifficulty(selected.id)
              }}
              value={nextDifficulty}
            >
              {DIFFICULTIES.map((option) => (
                <option key={option.id} value={option.id}>
                  {difficultyNames[language][option.id]} (1 {text.to} {formatter.format(option.max)})
                </option>
              ))}
            </select>
          </div>
          <button
            className="primary-button"
            onClick={startSelectedDifficulty}
            type="button"
          >
            {text.startNext}
          </button>
        </div>
      </dialog>
    </main>
  )
}

export default App
