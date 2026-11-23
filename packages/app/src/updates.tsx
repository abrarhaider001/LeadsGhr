import { useEffect, useState } from 'react'

/** Mirrors `UpdateState` in apps/desktop/src/main.ts. */
export type UpdateState = {
  status:
    | 'unsupported'
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  version?: string
  percent?: number
  message?: string
  checkedAt?: number
}

type UpdatesBridge = {
  getAppVersion(): Promise<string>
  getUpdateStatus(): Promise<UpdateState>
  checkForUpdates(): Promise<UpdateState>
  installUpdate(): Promise<UpdateState>
  onUpdateStatus(callback: (state: UpdateState) => void): () => void
}
const updatesBridge = () =>
  (window as Window & { leadsGhrDesktop?: Partial<UpdatesBridge> }).leadsGhrDesktop

/** The installed LeadsGhr version, or '' outside the desktop app. */
export function useAppVersion(): string {
  const [version, setVersion] = useState('')
  useEffect(() => {
    let active = true
    void updatesBridge()
      ?.getAppVersion?.()
      .then(
        (value) => {
          if (active) setVersion(value)
        },
        () => undefined,
      )
    return () => {
      active = false
    }
  }, [])
  return version
}

/** Live update state from the desktop app. */
export function useUpdateState(): UpdateState {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  useEffect(() => {
    const api = updatesBridge()
    let active = true
    void api?.getUpdateStatus?.().then(
      (value) => {
        if (active) setState(value)
      },
      () => undefined,
    )
    const stop = api?.onUpdateStatus?.((value) => {
      if (active) setState(value)
    })
    return () => {
      active = false
      stop?.()
    }
  }, [])
  return state
}

const installUpdate = () => {
  void updatesBridge()
    ?.installUpdate?.()
    .catch(() => undefined)
}

/**
 * Banner above every page when a new version is available, downloading, or ready.
 * "Later" hides it until the state changes (it reappears for the next version or step).
 */
export function UpdateBanner({ state }: { state: UpdateState }) {
  const [dismissed, setDismissed] = useState('')
  const key = `${state.status}:${state.version ?? ''}`
  if (!['available', 'downloading', 'downloaded'].includes(state.status) || dismissed === key)
    return null
  const version = state.version ? `LeadsGhr ${state.version}` : 'A new version of LeadsGhr'
  const percent = Math.max(0, Math.min(100, state.percent ?? 0))
  return (
    <div className="la-settings-notice la-update-banner" role="status">
      <span className="la-settings-notice-icon" aria-hidden="true">
        ↑
      </span>
      <div className="la-settings-notice-text">
        {state.status === 'available' && (
          <>
            <strong>{version} is available</strong>
            <span>
              Update now to download it and restart into the new version. Your data and settings are
              kept.
            </span>
          </>
        )}
        {state.status === 'downloading' && (
          <>
            <strong>
              Downloading {version}… {percent}%
            </strong>
            <span
              className="la-update-progress"
              role="progressbar"
              aria-label="Update download"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span style={{ transform: `scaleX(${percent / 100})` }} />
            </span>
          </>
        )}
        {state.status === 'downloaded' && (
          <>
            <strong>Update ready: {version}</strong>
            <span>
              Restart now to finish updating, or it installs the next time you close LeadsGhr.
            </span>
          </>
        )}
      </div>
      {state.status === 'available' && (
        <button type="button" className="primary" onClick={installUpdate}>
          Update now
        </button>
      )}
      {state.status === 'downloaded' && (
        <button type="button" className="primary" onClick={installUpdate}>
          Restart now
        </button>
      )}
      {state.status !== 'downloading' && (
        <button type="button" onClick={() => setDismissed(key)}>
          Later
        </button>
      )}
    </div>
  )
}

function describeStatus(state: UpdateState): string {
  const when = state.checkedAt
    ? ` Last checked ${new Date(state.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
    : ''
  switch (state.status) {
    case 'unsupported':
      return state.message ?? 'Updates work in the installed app.'
    case 'checking':
      return 'Checking for updates…'
    case 'available':
      return `LeadsGhr ${state.version ?? ''} is available.${when}`
    case 'downloading':
      return `Downloading LeadsGhr ${state.version ?? ''}… ${state.percent ?? 0}%`
    case 'downloaded':
      return `LeadsGhr ${state.version ?? ''} is ready. Restart to finish updating.`
    case 'not-available':
      return `You have the latest version.${when}`
    case 'error':
      return state.message ?? 'Could not check for updates.'
    default:
      return 'LeadsGhr checks for updates when it starts and every four hours.'
  }
}

/** Settings → Preferences → Updates: version, status, and Check for updates. */
export function UpdatesPanel({ state }: { state: UpdateState }) {
  const version = useAppVersion()
  const busy = state.status === 'checking' || state.status === 'downloading'
  return (
    <section className="la-profile-preference-group">
      <div>
        <h2>Version</h2>
        <p>
          LeadsGhr checks GitHub Releases for a new version when it starts and every four hours.
        </p>
      </div>
      <div className="la-profile-option-list">
        <div className="la-profile-option la-update-status">
          <span>
            <strong>LeadsGhr {version || '—'}</strong>
            <small role="status">{describeStatus(state)}</small>
          </span>
          {state.status === 'available' && (
            <button type="button" className="primary" onClick={installUpdate}>
              Update now
            </button>
          )}
          {state.status === 'downloaded' && (
            <button type="button" className="primary" onClick={installUpdate}>
              Restart now
            </button>
          )}
          {state.status !== 'available' && state.status !== 'downloaded' && (
            <button
              type="button"
              disabled={busy || state.status === 'unsupported'}
              onClick={() => {
                void updatesBridge()
                  ?.checkForUpdates?.()
                  .catch(() => undefined)
              }}
            >
              {state.status === 'checking' ? 'Checking…' : 'Check for updates'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
