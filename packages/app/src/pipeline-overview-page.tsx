import { useEffect, useRef, useState } from 'react'
import type { CrawlRunSummary, PipelineProvider, SearchCriteria } from '@leadsghr/schemas'
import { Button, Icon, Input, Label } from '@leadsghr/ui'
import { PipelineProviderIcon } from './pipeline-provider-icon'
import { MdOutlineDeleteOutline } from 'react-icons/md'
import type { PipelineDraft } from './pipeline-draft'

const empty: SearchCriteria = { nicheKeywordEdits: {}, customNiches: [], selectedNiches: [], selectedStates: [], selectedLocations: [] }
const providers: { id: PipelineProvider; label: string; available: boolean }[] = [
  { id: 'google-maps', label: 'Google Maps', available: true },
  { id: 'google', label: 'Google', available: false },
  { id: 'facebook', label: 'Facebook', available: false },
  { id: 'linkedin', label: 'LinkedIn', available: false },
]
type CriteriaBridge = { loadSearchCriteria(): Promise<SearchCriteria | null> }
const bridge = () => (window as Window & { leadsGhrDesktop?: CriteriaBridge }).leadsGhrDesktop

const stages = [
  { title: 'Find businesses', detail: 'Search the selected niche and locations for public business listings.', icon: 'search' as const },
  { title: 'Build the URL queue', detail: 'Save unique website links, with contact pages first.', icon: 'pipeline' as const },
  { title: 'Crawl public pages', detail: 'Fetch the next page while the current page is inspected for emails.', icon: 'spider' as const },
  { title: 'Filter emails', detail: 'Remove invalid, placeholder, and duplicate addresses from the extracted emails.', icon: 'mailCheck' as const },
  { title: 'Export results', detail: 'Save the business list and filtered emails to a local CSV.', icon: 'exports' as const },
]

export function PipelineOverviewPage({ runs, onCreate, onResume, onDelete }: { runs: CrawlRunSummary[]; onCreate(draft: PipelineDraft, start: boolean): void; onResume(id: string): void; onDelete(id: string): void }) {
  const nameInputRef = useRef<HTMLInputElement>(null)
  const pipelines = runs.filter((run) => run.kind === 'pipeline')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<PipelineProvider | null>(null)
  const [criteria, setCriteria] = useState<SearchCriteria>(empty)
  const [reuse, setReuse] = useState({ niches: true, states: true, locations: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const allExisting = reuse.niches && reuse.states && reuse.locations
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => nameInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [open])
  async function openDrawer() { setProvider(null); setOpen(true); setError(''); setLoading(true); try { const saved = await bridge()?.loadSearchCriteria() ?? empty; setCriteria(saved); setReuse({ niches: saved.selectedNiches.length > 0, states: saved.selectedStates.length > 0, locations: saved.selectedStates.length > 0 && saved.selectedLocations.length > 0 }) } catch { setCriteria(empty); setReuse({ niches: false, states: false, locations: false }); setError('Could not load saved selections. Choose new ones to continue.') } finally { setLoading(false) } }
  function submit() {
    if (!name.trim() || provider !== 'google-maps') return
    if (reuse.niches && !criteria.selectedNiches.length || reuse.states && !criteria.selectedStates.length || reuse.locations && !criteria.selectedLocations.length) { setError('A checked section has no saved choices. Uncheck it to choose new values.'); return }
    if (allExisting && (!criteria.selectedNiches.length || !criteria.selectedStates.length || !criteria.selectedLocations.length)) { setError('Select saved niches, states, and locations first, or uncheck the missing section to choose it now.'); return }
    const draft: PipelineDraft = { name: name.trim(), provider, criteria: { ...criteria, selectedNiches: reuse.niches ? criteria.selectedNiches : [], selectedStates: reuse.states ? criteria.selectedStates : [], selectedLocations: reuse.locations ? criteria.selectedLocations : [] }, reuse }
    setOpen(false)
    onCreate(draft, allExisting)
  }
  return <div className="la-pipeline-home">
    <section className="la-pipeline-toolbar"><Button type="button" onClick={() => void openDrawer()}><Icon name="add" size={16}/> Create pipeline</Button></section>
    <div className="la-pipeline-stage-grid">{stages.map((stage, index) => <div className="la-pipeline-stage" key={stage.title}><span className="la-pipeline-stage-icon"><Icon name={stage.icon} size={23}/></span><span className="la-pipeline-stage-number">0{index + 1}</span><h3>{stage.title}</h3><p>{stage.detail}</p></div>)}</div>
    {pipelines.length > 0 && <section className="la-pipeline-resume"><div className="la-section-heading"><div><h2>Saved pipelines</h2><p>Resume unfinished work or delete a previous pipeline.</p></div></div><div className="la-pipeline-resume-list">{pipelines.map((run) => <div key={run.id}><span><strong>{run.name}</strong><small>{run.provider === 'google-maps' ? 'Google Maps' : run.provider} · {run.status} · {run.nextQueryIndex}/{run.totalQueries} searches</small>{run.error && <small className="la-pipeline-run-note" title={run.error}>{run.error.length > 140 ? `${run.error.slice(0, 140)}...` : run.error}</small>}</span><span className="la-pipeline-row-actions">{run.status !== 'completed' && <Button type="button" variant="secondary" disabled={run.status === 'running'} onClick={() => onResume(run.id)}><Icon name="resume" size={16}/> Resume</Button>}<button type="button" className="la-pipeline-delete-button" title="Delete pipeline" aria-label={`Delete ${run.name} pipeline`} disabled={run.status === 'running'} onClick={() => onDelete(run.id)}><MdOutlineDeleteOutline size={19} aria-hidden="true"/></button></span></div>)}</div></section>}
    {open && <div className="la-niche-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}><aside className="la-niche-panel la-pipeline-drawer" role="dialog" aria-modal="true" aria-labelledby="la-pipeline-drawer-title"><div className="la-niche-panel-heading"><div><h2 id="la-pipeline-drawer-title">Add pipeline</h2><p>Name your pipeline, choose a source, and decide which saved selections to reuse.</p></div><button type="button" className="la-niche-panel-close" aria-label="Close add pipeline panel" onClick={() => setOpen(false)}>&times;</button></div>
      <Label htmlFor="la-new-pipeline-name">Pipeline name</Label><Input ref={nameInputRef} id="la-new-pipeline-name" type="text" maxLength={100} value={name} onChange={(event) => setName(event.currentTarget.value)} onClick={(event) => event.currentTarget.focus()} placeholder="e.g. Texas HVAC contractors" />
      <fieldset className="la-pipeline-drawer-providers"><legend>Search platform</legend><div>{providers.map((item) => <button key={item.id} type="button" aria-pressed={provider === item.id} onClick={() => setProvider(item.id)}><PipelineProviderIcon provider={item.id}/><span className="la-pipeline-provider-copy"><strong>{item.label}</strong><small>{item.available ? 'Available' : 'Planned'}</small></span></button>)}</div></fieldset>
      {provider && provider !== 'google-maps' && <p className="la-pipeline-provider-note">This platform cannot start an automated public crawl yet.</p>}
      <div className="la-pipeline-drawer-reuse"><h3>Use existing selections</h3><p>Uncheck a section to choose new values after adding the pipeline.</p>{([['niches', 'Niches', criteria.selectedNiches.length], ['states', 'States', criteria.selectedStates.length], ['locations', 'Locations', criteria.selectedLocations.length]] as const).map(([key, label, count]) => <label key={key}><span><strong>{label}</strong><small>{loading ? 'Loading...' : `${count} selected`}</small></span><input type="checkbox" checked={reuse[key]} disabled={key === 'locations' && !reuse.states} onChange={(event) => setReuse((current) => key === 'states' && !event.target.checked ? { ...current, states: false, locations: false } : ({ ...current, [key]: event.target.checked }))} /></label>)}</div>
      {error && <p className="la-niche-panel-error" role="alert">{error}</p>}<Button type="button" className="la-niche-panel-submit" disabled={loading || !name.trim() || provider !== 'google-maps'} onClick={submit}>{allExisting ? 'Start pipeline' : 'Add pipeline'}</Button>
    </aside></div>}
  </div>
}
