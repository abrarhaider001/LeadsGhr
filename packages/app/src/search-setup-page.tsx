import { useEffect, useMemo, useState } from 'react'
import type { PipelineProvider, SearchCriteria } from '@leadsghr/schemas'
import { CustomSelect } from './custom-select'
import { Icon } from '@leadsghr/ui'
import nicheData from '../data/niches.json'
import locationData from '../data/us-states-locations.json'
import { PipelineProviderIcon } from './pipeline-provider-icon'
import { PipelineTimeline } from './pipeline-timeline'
import type { PipelineDraft } from './pipeline-draft'

const empty: SearchCriteria = { nicheKeywordEdits: {}, customNiches: [], selectedNiches: [], selectedStates: [], selectedLocations: [] }
type CriteriaBridge = { loadSearchCriteria(): Promise<SearchCriteria | null>; saveSearchCriteria(input: SearchCriteria): Promise<SearchCriteria> }
const bridge = () => (window as Window & { leadsGhrDesktop?: CriteriaBridge }).leadsGhrDesktop
const toggle = (items: string[], value: string) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]
const pageChoices = (page: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 9) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, ...Array.from({ length: 5 }, (_, index) => Math.min(total - 1, Math.max(2, page - 2 + index)))])
  const ordered = [...pages].sort((a, b) => a - b)
  return ordered.flatMap((value, index) => index && value - ordered[index - 1] > 1 ? ['ellipsis' as const, value] : [value])
}

export function SearchSetupPage({ onSearch, iconActions = false, pipelineMode = false, pipelineDraft }: { onSearch(criteria: SearchCriteria, details?: { name: string; provider: PipelineProvider }): void; iconActions?: boolean; pipelineMode?: boolean; pipelineDraft?: PipelineDraft | null }) {
  const [pipelineName, setPipelineName] = useState(pipelineDraft?.name ?? '')
  const [provider, setProvider] = useState<PipelineProvider | null>(pipelineDraft?.provider ?? null)
  const [criteria, setCriteria] = useState<SearchCriteria>(pipelineDraft?.criteria ?? empty)
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState('')
  const [nichePanelOpen, setNichePanelOpen] = useState(false)
  const [nicheError, setNicheError] = useState('')
  const [nicheQuery, setNicheQuery] = useState('')
  const [stateQuery, setStateQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationPage, setLocationPage] = useState(1)
  const [locationsPerPage, setLocationsPerPage] = useState(50)
  const [selectionMethod, setSelectionMethod] = useState<'search' | 'pages' | 'numbers'>('search')
  const [step, setStep] = useState<'details' | 'niches' | 'states' | 'locations'>(pipelineDraft ? !pipelineDraft.reuse.niches ? 'niches' : !pipelineDraft.reuse.states ? 'states' : 'locations' : pipelineMode ? 'details' : 'niches')
  const [pageFrom, setPageFrom] = useState('1')
  const [pageTo, setPageTo] = useState('1')
  const [numberFrom, setNumberFrom] = useState('1')
  const [numberTo, setNumberTo] = useState('100')
  const [rangeMessage, setRangeMessage] = useState('')
  const [message, setMessage] = useState('')
  const niches = useMemo(() => [...nicheData.niches, ...criteria.customNiches], [criteria.customNiches])
  const visibleNiches = niches.filter((niche) => niche.toLowerCase().includes(nicheQuery.trim().toLowerCase()))
  const visibleStates = locationData.states.filter((state) => state.name.toLowerCase().includes(stateQuery.trim().toLowerCase()))
  const selectedStates = useMemo(() => locationData.states.filter((state) => criteria.selectedStates.includes(state.name)), [criteria.selectedStates])
  const locationMatches = useMemo(() => selectedStates.flatMap((state) => state.locations).filter((location) => location.toLowerCase().includes(locationQuery.trim().toLowerCase())), [selectedStates, locationQuery])
  const locationPageCount = Math.ceil(locationMatches.length / locationsPerPage)
  const currentLocationPage = Math.min(locationPage, Math.max(1, locationPageCount))
  const visibleLocations = locationMatches.slice((currentLocationPage - 1) * locationsPerPage, currentLocationPage * locationsPerPage)
  const selectedLocationSet = useMemo(() => new Set(criteria.selectedLocations), [criteria.selectedLocations])
  const allStatesSelected = criteria.selectedStates.length === locationData.states.length
  const allMatchingLocationsSelected = locationMatches.length > 0 && locationMatches.every((location) => selectedLocationSet.has(location))
  const details = pipelineMode && provider ? { name: pipelineName.trim(), provider } : undefined
  const nextAfterNiches = pipelineDraft?.reuse.states && criteria.selectedStates.length > 0 ? pipelineDraft.reuse.locations && criteria.selectedLocations.length > 0 ? 'start' : 'locations' : 'states'
  const nextAfterStates = pipelineDraft?.reuse.locations && criteria.selectedLocations.length > 0 ? 'start' : 'locations'
  const validRange = (from: string, to: string, maximum: number) => {
    const first = Number(from)
    const last = Number(to)
    return Number.isInteger(first) && Number.isInteger(last) && first >= 1 && first <= last && last <= maximum
  }

  useEffect(() => {
    let active = true
    void bridge()?.loadSearchCriteria().then((stored) => {
      if (!active) return
      if (stored && !pipelineDraft) setCriteria(pipelineMode ? { ...stored, selectedNiches: [], selectedStates: [], selectedLocations: [] } : stored)
      setReady(true)
    }).catch(() => { if (active) { setMessage('Could not load saved choices.'); setReady(true) } })
    if (!bridge()) setReady(true)
    return () => { active = false }
  }, [pipelineMode, pipelineDraft])
  useEffect(() => {
    if (!ready || !bridge()) return
    void bridge()!.saveSearchCriteria(criteria).catch(() => setMessage('Could not save choices.'))
  }, [criteria, ready])
  useEffect(() => {
    if (!nichePanelOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setNichePanelOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nichePanelOpen])

  function addNiches() {
    const lines = draft.split(/[,\r\n]+/).map((line) => line.trim()).filter(Boolean)
    if (!lines.length) return
    if (lines.some((line) => line.length > 120)) { setNicheError('Each niche must be 120 characters or fewer.'); return }
    const known = new Set(niches.map((value) => value.toLocaleLowerCase()))
    const added: string[] = []
    for (const line of lines) {
      if (known.has(line.toLocaleLowerCase())) continue
      known.add(line.toLocaleLowerCase())
      added.push(line)
    }
    if (criteria.customNiches.length + added.length > 500 || new Set([...criteria.selectedNiches, ...added]).size > 500) { setNicheError('You can save and select up to 500 niches.'); return }
    if (!added.length) { setNicheError('These niches are already in the list.'); return }
    setCriteria((current) => ({ ...current, customNiches: [...current.customNiches, ...added], selectedNiches: [...new Set([...current.selectedNiches, ...added])] }))
    setDraft('')
    setNicheError('')
    setNichePanelOpen(false)
  }

  function toggleState(name: string) {
    const state = locationData.states.find((item) => item.name === name)
    setCriteria((current) => {
      const removing = current.selectedStates.includes(name)
      const removedLocations = new Set(state?.locations ?? [])
      return { ...current, selectedStates: toggle(current.selectedStates, name), selectedLocations: removing ? current.selectedLocations.filter((location) => !removedLocations.has(location)) : current.selectedLocations }
    })
  }

  function selectLocationRange(kind: 'pages' | 'numbers') {
    const pages = kind === 'pages'
    const from = pages ? pageFrom : numberFrom
    const to = pages ? pageTo : numberTo
    const maximum = pages ? locationPageCount : locationMatches.length
    if (!validRange(from, to, maximum)) { setRangeMessage(`Enter a valid ${pages ? 'page' : 'location number'} range from 1 to ${maximum}.`); return }
    const start = pages ? (Number(from) - 1) * locationsPerPage : Number(from) - 1
    const end = pages ? Number(to) * locationsPerPage : Number(to)
    const chosen = locationMatches.slice(start, end)
    setCriteria((current) => ({ ...current, selectedLocations: [...new Set([...current.selectedLocations, ...chosen])] }))
    setRangeMessage(`${chosen.length} locations selected from ${pages ? 'pages' : 'numbers'} ${from} to ${to}.`)
  }

  return <div className="la-search-setup">
    {pipelineMode && <PipelineTimeline current={{ details: 0, niches: 1, states: 2, locations: 3 }[step]} completed={[pipelineName.trim() && provider === 'google-maps' ? 0 : -1, criteria.selectedNiches.length ? 1 : -1, criteria.selectedStates.length ? 2 : -1, criteria.selectedLocations.length ? 3 : -1]} />}
    {pipelineMode && step === 'details' && <section className="la-pipeline-details"><div className="la-section-heading"><div><h2>Name your pipeline</h2><p>Give this crawl a name and choose where business discovery starts.</p></div></div><label className="la-pipeline-name">Pipeline name<input type="text" maxLength={100} value={pipelineName} onChange={(event) => setPipelineName(event.target.value)} placeholder="e.g. Texas HVAC contractors" autoFocus /></label><div className="la-pipeline-provider-heading"><h3>Search platform</h3><p>Choose one provider to continue.</p></div><div className="la-pipeline-provider-grid" role="group" aria-label="Search platform">{([
      { id: 'google-maps' as const, name: 'Google Maps', detail: 'Public business listings', available: true },
      { id: 'google' as const, name: 'Google', detail: 'Public web search', available: false },
      { id: 'facebook' as const, name: 'Facebook', detail: 'Public business pages', available: false },
      { id: 'linkedin' as const, name: 'LinkedIn', detail: 'Public company pages', available: false },
    ]).map((item) => <button key={item.id} type="button" className="la-pipeline-provider" aria-pressed={provider === item.id} onClick={() => setProvider(item.id)}><PipelineProviderIcon provider={item.id}/><span className="la-pipeline-provider-copy"><strong>{item.name}</strong><small>{item.detail}</small><em>{item.available ? 'Available' : 'Planned'}</em></span></button>)}</div>{provider && provider !== 'google-maps' && <p className="la-pipeline-provider-note" role="status">Automated crawling for this provider is not available yet. Google Maps is the supported public source.</p>}<div className="la-search-start"><span>Pipeline name and an available provider are required.</span><button type="button" disabled={!pipelineName.trim() || provider !== 'google-maps'} onClick={() => setStep('niches')}>Select niche</button></div></section>}
    {pipelineMode && step !== 'details' && <button type="button" className="la-locations-back" onClick={() => setStep(step === 'locations' ? 'states' : step === 'states' ? 'niches' : 'details')} aria-label="Back to previous pipeline step" title="Back to previous step"><Icon name="back" size={18} /></button>}
    {!pipelineMode && step === 'locations' && <button type="button" className="la-locations-back" onClick={() => setStep('niches')} aria-label="Back to niches and states" title="Back to niches and states"><Icon name="back" size={18} /></button>}
    {message && <p className="la-search-message" role="status">{message}</p>}
    {step === 'niches' && <section className="la-choice-section">
      <div className="la-choice-heading"><div className="la-choice-heading-copy"><h2>Contractor and business niches</h2><p>Choose a niche to continue, or add your own.</p><span>{niches.length} available</span></div><div className="la-choice-toolbar"><input type="search" value={nicheQuery} onChange={(event) => setNicheQuery(event.target.value)} placeholder="Find a niche..." aria-label="Find a niche" /><button type="button" className={iconActions ? 'la-choice-icon-action' : undefined} aria-label="Clear niches" title={iconActions ? 'Clear niches' : undefined} onClick={() => setCriteria((current) => ({ ...current, selectedNiches: [] }))} disabled={!criteria.selectedNiches.length}>{iconActions ? <Icon name="clear" size={18} /> : 'Clear niches'}</button><button type="button" className={iconActions ? 'la-choice-icon-action la-choice-icon-action--add' : 'la-add-niche-trigger'} aria-label="Add niche" title={iconActions ? 'Add niche' : undefined} onClick={() => setNichePanelOpen(true)}>{iconActions ? <Icon name="add" size={17} /> : 'Add niche'}</button></div></div>
      <div className="la-choice-chips" aria-label="Niche choices">{visibleNiches.map((niche) => <button key={niche} type="button" className="la-choice-chip" aria-pressed={criteria.selectedNiches.includes(niche)} onClick={() => setCriteria((current) => ({ ...current, selectedNiches: toggle(current.selectedNiches, niche) }))}>{criteria.selectedNiches.includes(niche) && <span aria-hidden="true">{String.fromCharCode(10003)}</span>}{niche}</button>)}</div>
    </section>}
    {(step === 'states' || (!pipelineMode && step === 'niches')) && criteria.selectedNiches.length > 0 && <section className="la-choice-section">
      <div className="la-choice-heading"><div className="la-choice-heading-copy"><h2>U.S. states</h2><p>Select one or more states to reveal their locations.</p><span>{locationData.states.length} available</span></div><div className="la-choice-toolbar"><input type="search" value={stateQuery} onChange={(event) => setStateQuery(event.target.value)} placeholder="Find a state..." aria-label="Find a state" /><button type="button" className={iconActions ? 'la-choice-icon-action' : undefined} aria-label="Clear states" title={iconActions ? 'Clear states' : undefined} onClick={() => setCriteria((current) => ({ ...current, selectedStates: [], selectedLocations: [] }))} disabled={!criteria.selectedStates.length}>{iconActions ? <Icon name="clear" size={18} /> : 'Clear states'}</button><button type="button" className={iconActions ? 'la-choice-icon-action la-choice-icon-action--add' : undefined} aria-label="Select all states" title={iconActions ? 'Select all states' : undefined} onClick={() => setCriteria((current) => ({ ...current, selectedStates: locationData.states.map((state) => state.name) }))} disabled={allStatesSelected}>{iconActions ? <Icon name="selectAll" size={18} /> : 'Select all states'}</button></div></div>
      <div className="la-choice-chips" aria-label="State choices">{visibleStates.map((state) => <button key={state.name} type="button" className="la-choice-chip" aria-pressed={criteria.selectedStates.includes(state.name)} onClick={() => toggleState(state.name)}>{criteria.selectedStates.includes(state.name) && <span aria-hidden="true">{String.fromCharCode(10003)}</span>}{state.name}</button>)}</div>
    </section>}
    {step === 'locations' && criteria.selectedNiches.length > 0 && selectedStates.length > 0 && <section className="la-choice-section">
      <div className="la-choice-heading la-location-heading"><div className="la-choice-heading-copy"><h2>Locations</h2><p>Choose locations from the selected states.</p><span>{locationMatches.length} available</span></div><div className="la-location-selection-controls"><div className="la-location-method"><span>Selection method</span><CustomSelect label="Location selection method" value={selectionMethod} onChange={(value) => { setSelectionMethod(value as 'search' | 'pages' | 'numbers'); setRangeMessage(''); if (value !== 'search') { setLocationQuery(''); setLocationPage(1) } }} options={[{ value: 'search', label: 'Search' }, { value: 'pages', label: 'By page' }, { value: 'numbers', label: 'By number' }]} /></div>
      {selectionMethod === 'search' && <div className="la-choice-toolbar la-location-search-controls"><input type="search" value={locationQuery} onChange={(event) => { setLocationQuery(event.target.value); setLocationPage(1) }} placeholder="Find a city or place..." aria-label="Find a location" /><button type="button" className="la-choice-icon-action" aria-label="Clear locations" title="Clear locations" onClick={() => setCriteria((current) => ({ ...current, selectedLocations: [] }))} disabled={!criteria.selectedLocations.length}><Icon name="clear" size={18} /></button><button type="button" className="la-choice-icon-action la-choice-icon-action--add" aria-label={locationQuery.trim() ? 'Select all matching locations' : 'Select all locations'} title={locationQuery.trim() ? 'Select all matching locations' : 'Select all locations'} onClick={() => setCriteria((current) => ({ ...current, selectedLocations: [...new Set([...current.selectedLocations, ...locationMatches])] }))} disabled={!locationMatches.length || allMatchingLocationsSelected}><Icon name="selectAll" size={18} /></button></div>}
      {selectionMethod === 'pages' && locationMatches.length > 0 && <div className="la-location-ranges"><div className="la-location-range"><strong>Select page range</strong><label>From page <input type="number" min={1} max={locationPageCount} value={pageFrom} onChange={(event) => setPageFrom(event.target.value)} /></label><label>To page <input type="number" min={1} max={locationPageCount} value={pageTo} onChange={(event) => setPageTo(event.target.value)} /></label><button type="button" className="la-location-range-icon" aria-label="Select pages in range" title="Select pages in range" disabled={!validRange(pageFrom, pageTo, locationPageCount)} onClick={() => selectLocationRange('pages')}><Icon name="selectAll" size={18} /></button></div></div>}
      {selectionMethod === 'numbers' && locationMatches.length > 0 && <div className="la-location-ranges"><div className="la-location-range"><strong>Select location numbers</strong><label>From <input type="number" min={1} max={locationMatches.length} value={numberFrom} onChange={(event) => setNumberFrom(event.target.value)} /></label><label>To <input type="number" min={1} max={locationMatches.length} value={numberTo} onChange={(event) => setNumberTo(event.target.value)} /></label><button type="button" className="la-location-range-icon" aria-label="Select locations in number range" title="Select locations in number range" disabled={!validRange(numberFrom, numberTo, locationMatches.length)} onClick={() => selectLocationRange('numbers')}><Icon name="selectAll" size={18} /></button></div></div>}
      {selectionMethod !== 'search' && <button type="button" className="la-location-clear la-choice-icon-action" aria-label="Clear locations" title="Clear locations" onClick={() => setCriteria((current) => ({ ...current, selectedLocations: [] }))} disabled={!criteria.selectedLocations.length}><Icon name="clear" size={18} /></button>}</div></div>
      <div className="la-choice-chips" aria-label="Location choices">{visibleLocations.map((location, index) => <button key={location} type="button" className="la-choice-chip" aria-pressed={selectedLocationSet.has(location)} onClick={() => setCriteria((current) => ({ ...current, selectedLocations: toggle(current.selectedLocations, location) }))}>{selectedLocationSet.has(location) && <span aria-hidden="true">{String.fromCharCode(10003)}</span>}<span className="la-choice-index">{(currentLocationPage - 1) * locationsPerPage + index + 1}.</span>{location}</button>)}</div>
      {!locationMatches.length && <p className="la-choice-empty">No locations match this search.</p>}
      {rangeMessage && <p className="la-choice-hint" role="status">{rangeMessage}</p>}

    </section>}
    {step === 'niches' ? <div className="la-search-start"><p className="la-choice-footnote">{pipelineMode ? 'Choose one or more niches.' : 'Choose at least one niche and one state, then select locations.'}</p><button type="button" disabled={!criteria.selectedNiches.length || (!pipelineMode && !criteria.selectedStates.length)} onClick={() => { if (pipelineMode) { if (nextAfterNiches === 'start') onSearch(criteria, details); else setStep(nextAfterNiches) } else { setLocationPage(1); setStep('locations') } }}>{pipelineMode ? nextAfterNiches === 'start' ? 'Start pipeline' : nextAfterNiches === 'locations' ? 'Select locations' : 'Select states' : 'Select locations'}</button></div> : step === 'states' ? <div className="la-search-start"><p className="la-choice-footnote">Choose one or more states before selecting locations.</p><button type="button" disabled={!criteria.selectedStates.length} onClick={() => { if (nextAfterStates === 'start') onSearch(criteria, details); else { setLocationPage(1); setStep('locations') } }}>{nextAfterStates === 'start' ? 'Start pipeline' : 'Select locations'}</button></div> : step === 'locations' ? <div className="la-search-start"><div className="la-location-footer-pagination">{locationPageCount > 1 && <nav className="la-choice-pagination" aria-label="Location pages"><div className="la-choice-page-buttons"><button type="button" className="la-location-page-arrow la-location-page-arrow--previous" aria-label="Previous location page" title="Previous page" disabled={currentLocationPage === 1} onClick={() => setLocationPage(currentLocationPage - 1)}><Icon name="chevron" size={15} /></button>{pageChoices(currentLocationPage, locationPageCount).map((page, index) => page === 'ellipsis' ? <span key={`gap-${index}`} aria-hidden="true">...</span> : <button key={page} type="button" aria-current={page === currentLocationPage ? 'page' : undefined} onClick={() => setLocationPage(page)}>{page}</button>)}<button type="button" className="la-location-page-arrow" aria-label="Next location page" title="Next page" disabled={currentLocationPage === locationPageCount} onClick={() => setLocationPage(currentLocationPage + 1)}><Icon name="chevron" size={15} /></button></div><div className="la-choice-page-size"><span>Results per page</span><CustomSelect label="Results per page" value={String(locationsPerPage)} onChange={(value) => { setLocationsPerPage(Number(value)); setLocationPage(1) }} options={[{ value: '25', label: '25' }, { value: '50', label: '50' }, { value: '100', label: '100' }]} /></div><span className="la-choice-page-range">{(currentLocationPage - 1) * locationsPerPage + 1}-{Math.min(currentLocationPage * locationsPerPage, locationMatches.length)} of {locationMatches.length.toLocaleString()}</span></nav>}</div><button type="button" disabled={!criteria.selectedLocations.length} onClick={() => onSearch(criteria, pipelineMode && provider ? { name: pipelineName.trim(), provider } : undefined)}>{pipelineMode ? 'Start crawl' : 'Search contractors'}</button></div> : null}
    {nichePanelOpen && <div className="la-niche-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNichePanelOpen(false) }}><aside className="la-niche-panel" role="dialog" aria-modal="true" aria-labelledby="la-niche-panel-title"><div className="la-niche-panel-heading"><div><h2 id="la-niche-panel-title">Add niches</h2><p>Enter one niche, or separate multiple niches with commas.</p></div><button type="button" className="la-niche-panel-close" aria-label="Close add niche panel" onClick={() => setNichePanelOpen(false)}>×</button></div><label htmlFor="la-niche-draft">Niche names</label><textarea id="la-niche-draft" autoFocus value={draft} onChange={(event) => { setDraft(event.target.value); setNicheError('') }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); addNiches() } }} rows={5} placeholder="General Contractors, Electrical Contractors" /><p className="la-choice-hint">Press Enter to add and select. Shift+Enter starts a new line.</p>{nicheError && <p className="la-niche-panel-error" role="alert">{nicheError}</p>}<button type="button" className="la-niche-panel-submit" disabled={!draft.trim()} onClick={addNiches}>Add niches</button></aside></div>}
  </div>
}
