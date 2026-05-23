import { useEffect, useState } from 'react'
import {
  MessageType,
  sendMessage,
  type GetSettingsResponse,
  type TabStatusResponse,
} from '@/core/messaging'
import './index.css'

export default function App() {
  const [enabled, setEnabled] = useState(true)
  const [tabActive, setTabActive] = useState(false)
  const [hostname, setHostname] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadState() {
      try {
        const [settingsRes, tabRes] = await Promise.all([
          sendMessage<GetSettingsResponse>({ type: MessageType.GET_SETTINGS }),
          sendMessage<TabStatusResponse>({ type: MessageType.GET_TAB_STATUS }),
        ])

        setEnabled(settingsRes.settings.enabled)
        setTabActive(tabRes.active)
        setHostname(tabRes.hostname)
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
