import { useEffect, useState } from 'react'
import {
  DATA_FOLDER_PATH,
  connectDataFolder,
  dataFolderState,
  type DataFolderState,
} from './data-folder'
import { migrateLegacyData } from './storage'

const STATUS: Record<DataFolderState, string> = {
  connected: 'Connected. Templates and preferences are saved in this folder.',
  'needs-permission':
    'Chosen before. Chrome asks for permission again on the next save, or select Allow access now.',
  'not-connected':
    'Not chosen yet. Choose the folder once so the Mailer can save templates and preferences there.',
}

/** Settings section: the folder on this computer where the Mailer saves its data. */
export function DataFolderPanel() {
  const [state, setState] = useState<DataFolderState>('not-connected')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void dataFolderState().then(setState)
  }, [])

  async function connect() {
    setBusy(true)
    setMessage('')
    try {
      await connectDataFolder()
      const moved = await migrateLegacyData()
      setState(await dataFolderState())
      if (moved)
        setMessage(
          `Moved ${moved} template${moved === 1 ? '' : 's'} from Chrome storage into the data folder.`,
        )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="data-folder-title">
      <div className="section-head">
        <div>
          <h2 id="data-folder-title">Data folder</h2>
          <p className="muted">
            Saved templates and preferences are stored as files in <code>{DATA_FOLDER_PATH}</code>,
            so clearing Chrome's data or rebuilding the extension does not remove them.
          </p>
        </div>
        <button
          type="button"
          className={state === 'connected' ? 'secondary' : ''}
          disabled={busy}
          onClick={() => void connect()}
        >
          {state === 'connected'
            ? 'Choose again'
            : state === 'needs-permission'
              ? 'Allow access'
              : 'Choose folder'}
        </button>
      </div>
      <p className={`folder-status ${state}`}>{STATUS[state]}</p>
      {message && <p role="status">{message}</p>}
    </section>
  )
}
