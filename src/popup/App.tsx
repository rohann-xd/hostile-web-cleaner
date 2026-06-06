import { useEffect, useState } from 'react'
import {
  MessageType,
  sendMessage,
  type DebugLogsResponse,
  type GetSettingsResponse,
  type SessionBlocksResponse,
  type TabStatusResponse,
} from '@/core/messaging'
import './index.css'

const isDevBuild = import.meta.env.DEV

export default function App() {
  const [enabled, setEnabled] = useState(true)
  const [debug, setDebug] = useState(false)
  const [tabActive, setTabActive] = useState(false)
  const [hostname, setHostname] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [logCount, setLogCount] = useState(0)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [blockedDomains, setBlockedDomains] = useState<string[]>([])
  const [sessionBlockStatus, setSessionBlockStatus] = useState<string | null>(null)

  useEffect(() => {
    async function loadState() {
      try {
        const [settingsRes, tabRes, blocksRes] = await Promise.all([
          sendMessage<GetSettingsResponse>({ type: MessageType.GET_SETTINGS }),
          sendMessage<TabStatusResponse>({ type: MessageType.GET_TAB_STATUS }),
          sendMessage<SessionBlocksResponse>({ type: MessageType.GET_SESSION_BLOCKS }),
        ])

        setEnabled(settingsRes.settings.enabled)
        setDebug(settingsRes.settings.debug)
        setTabActive(tabRes.active)
        setHostname(tabRes.hostname)
        setBlockedDomains(blocksRes.domains)

        if (isDevBuild || settingsRes.settings.debug) {
          const logsRes = await sendMessage<DebugLogsResponse>({
            type: MessageType.GET_DEBUG_LOGS,
          })
          setLogCount(logsRes.logs.length)
        }
      } finally {
        setLoading(false)
      }
    }

    void loadState()
  }, [])

  async function handleToggle() {
    const next = !enabled
    setEnabled(next)
    await sendMessage({
      type: MessageType.SET_ENABLED,
      payload: { enabled: next },
    })
  }

  async function handleDebugToggle() {
    const next = !debug
    setDebug(next)
    await sendMessage({
      type: MessageType.SET_DEBUG,
      payload: { debug: next },
    })
    if (next) {
      const logsRes = await sendMessage<DebugLogsResponse>({
        type: MessageType.GET_DEBUG_LOGS,
      })
      setLogCount(logsRes.logs.length)
    }
  }

  async function handleCopyLogs() {
    setCopyStatus(null)
    try {
      const res = await sendMessage<DebugLogsResponse>({
        type: MessageType.GET_DEBUG_LOGS,
      })
      setLogCount(res.logs.length)
      await navigator.clipboard.writeText(res.exportText)
      setCopyStatus(`Copied ${res.logs.length} entries`)
    } catch {
      setCopyStatus('Copy failed — try again')
    }
  }

  async function handleClearLogs() {
    await sendMessage({ type: MessageType.CLEAR_DEBUG_LOGS })
    setLogCount(0)
    setCopyStatus('Logs cleared')
  }

  async function handleClearSessionBlocks() {
    setSessionBlockStatus(null)
    await sendMessage({ type: MessageType.CLEAR_SESSION_BLOCKS })
    setBlockedDomains([])
    setSessionBlockStatus('Session blocks cleared')
  }

  if (loading) {
    return (
      <div className="popup">
        <p className="status">Loading…</p>
      </div>
    )
  }

  return (
    <div className="popup">
      <header className="header">
        <h1 className="title">Hostile Web Cleaner</h1>
        <p className="tagline">Website Experience Repair</p>
      </header>

      <section className="toggle-section">
        <label className="toggle-label">
          <span>Protection enabled</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            className={`toggle ${enabled ? 'toggle--on' : ''}`}
            onClick={handleToggle}
          >
            <span className="toggle-knob" />
          </button>
        </label>
      </section>

      <section className="status-section">
        <p className="status">
          Active on this tab: <strong>{tabActive && enabled ? 'Yes' : 'No'}</strong>
        </p>
        {hostname && <p className="hostname">{hostname}</p>}
      </section>

      <section className="session-section">
        <p className="session-label">Blocked domains (this session)</p>
        {blockedDomains.length > 0 ? (
          <ul className="session-domains">
            {blockedDomains.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        ) : (
          <p className="session-empty">None — use “Block domain” on a popup to add one.</p>
        )}
        <button
          type="button"
          className="btn-ghost btn-full"
          disabled={blockedDomains.length === 0}
          onClick={handleClearSessionBlocks}
        >
          Clear session blocks
        </button>
        {sessionBlockStatus && <p className="debug-meta">{sessionBlockStatus}</p>}
      </section>

      <section className="debug-section">
        {isDevBuild && (
          <>
            <p className="session-label">Dev logger (npm run dev)</p>
            <p className="debug-hint">
              Run Phase 1 + 2 tests, then copy the report below. On a test page you can also
              run <code>__HWC__.copyReport()</code> in the console.
            </p>
            <div className="debug-actions">
              <button type="button" className="btn-secondary" onClick={handleCopyLogs}>
                Copy dev report
              </button>
              <button type="button" className="btn-ghost" onClick={handleClearLogs}>
                Clear
              </button>
            </div>
            <p className="debug-meta">
              {logCount} log {logCount === 1 ? 'entry' : 'entries'}
              {copyStatus ? ` · ${copyStatus}` : ''}
            </p>
          </>
        )}

        <label className="toggle-label">
          <span>Debug mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={debug}
            className={`toggle ${debug ? 'toggle--on' : ''}`}
            onClick={handleDebugToggle}
          >
            <span className="toggle-knob" />
          </button>
        </label>
        {debug && !isDevBuild && (
          <>
            <p className="debug-hint">
              Reload the problem page after enabling. Reproduce the leak, then copy logs
              below. Look for <strong>tab_created_UNTRACKED</strong>.
            </p>
            <div className="debug-actions">
              <button type="button" className="btn-secondary" onClick={handleCopyLogs}>
                Copy debug logs
              </button>
              <button type="button" className="btn-ghost" onClick={handleClearLogs}>
                Clear
              </button>
            </div>
            <p className="debug-meta">
              {logCount} log {logCount === 1 ? 'entry' : 'entries'}
              {copyStatus ? ` · ${copyStatus}` : ''}
            </p>
          </>
        )}
      </section>

      <footer className="footer">
        <a
          href="https://github.com/your-username/hostile-web-cleaner"
          target="_blank"
          rel="noreferrer"
        >
          View on GitHub
        </a>
      </footer>
    </div>
  )
}
