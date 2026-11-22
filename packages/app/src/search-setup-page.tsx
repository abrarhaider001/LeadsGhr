import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PipelineProvider, SearchCriteria } from '@leadsghr/schemas'
import { cn, Icon, Input } from '@leadsghr/ui'
import { CustomSelect } from './custom-select'
import nicheData from '../data/niches.json'
import locationData from '../data/us-states-locations.json'
import { starterPacks } from './niche-library-data'
import { PipelineProviderIcon } from './pipeline-provider-icon'
import { PipelineTimeline } from './pipeline-timeline'
import type { PipelineDraft } from './pipeline-draft'

const empty: SearchCriteria = { nicheKeywordEdits: {}, customNiches: [], selectedNiches: [], selectedStates: [], selectedLocations: [] }
type CriteriaBridge = { loadSearchCriteria(): Promise<SearchCriteria | null>; saveSearchCriteria(input: SearchCriteria): Promise<SearchCriteria> }
const bridge = () => (window as Window & { leadsGhrDesktop?: CriteriaBridge }).leadsGhrDesktop
const toggle = (items: string[], value: string) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]
const countPhrase = (count: number, singular: string) => `${count} ${singular}${count === 1 ? '' : 's'}`
const pageChoices = (page: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 9) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, ...Array.from({ length: 5 }, (_, index) => Math.min(total - 1, Math.max(2, page - 2 + index)))])
  const ordered = [...pages].sort((a, b) => a - b)
  return ordered.flatMap((value, index) => index && value - ordered[index - 1] > 1 ? ['ellipsis' as const, value] : [value])
}

const nicheGroupByName = new Map(starterPacks.map((pack) => [pack.name.toLocaleLowerCase(), pack.category]))
const nicheFilters = [
  { id: 'all', label: 'All' },
  { id: 'Construction', label: 'Construction & Trades', categories: ['Construction', 'Building trades', 'Site and civil'] },
  { id: 'Professional services', label: 'Engineering & Design', categories: ['Professional services'] },
  { id: 'Development', label: 'Real Estate & Development', categories: ['Development', 'Property services'] },
  { id: 'Custom', label: 'Specialized Services', categories: ['Custom'] },
] as const
type NicheFilter = (typeof nicheFilters)[number]['id']
const nicheGroup = (name: string) => nicheGroupByName.get(name.toLocaleLowerCase()) ?? 'Custom'
const nicheMatchesFilter = (name: string, filter: NicheFilter) => {
  if (filter === 'all') return true
  const group = nicheFilters.find((item) => item.id === filter)
  return Boolean(group && 'categories' in group && (group.categories as readonly string[]).includes(nicheGroup(name)))
}

const stateRegions = [
  { id: 'all', label: 'All states' },
  { id: 'Northeast', label: 'Northeast', states: ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'Rhode Island', 'Vermont', 'New Jersey', 'New York', 'Pennsylvania'] },
  { id: 'South', label: 'South', states: ['Delaware', 'Florida', 'Georgia', 'Maryland', 'North Carolina', 'South Carolina', 'Virginia', 'West Virginia', 'Alabama', 'Kentucky', 'Mississippi', 'Tennessee', 'Arkansas', 'Louisiana', 'Oklahoma', 'Texas'] },
  { id: 'Midwest', label: 'Midwest', states: ['Illinois', 'Indiana', 'Michigan', 'Ohio', 'Wisconsin', 'Iowa', 'Kansas', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'South Dakota'] },
  { id: 'West', label: 'West', states: ['Arizona', 'Colorado', 'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Utah', 'Wyoming', 'Alaska', 'California', 'Hawaii', 'Oregon', 'Washington'] },
] as const
type StateRegion = (typeof stateRegions)[number]['id']
const stateMatchesRegion = (name: string, region: StateRegion) => {
  if (region === 'all') return true
  const group = stateRegions.find((item) => item.id === region)
  return group && 'states' in group ? (group.states as readonly string[]).includes(name) : false
}

const byLabel = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })
const choiceLabel = (value: string) => value.replace(/[A-Za-z]+/g, (word) => word === word.toUpperCase() && word.length > 1 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
const choiceGrid = 'grid grid-cols-2 items-stretch gap-(--ui-space-2) sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6'
const tileClass = 'inline-flex min-h-(--ui-control-height-md) max-w-full items-center gap-(--ui-space-2) rounded-(--ui-radius-lg) border px-(--ui-space-2-5) py-(--ui-space-1-5) text-left text-(length:--ui-text-sm) leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer'
const pillClass = 'inline-flex min-h-(--ui-control-height-sm) shrink-0 items-center rounded-(--ui-radius-full) border px-(--ui-space-3) text-(length:--ui-text-xs) font-(--ui-weight-medium) transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer'

function ChoiceMark({ selected }: { selected: boolean }) {
  return <span aria-hidden="true" className={cn('grid size-(--ui-space-3-5) shrink-0 place-items-center rounded-(--ui-radius-xs) border', selected ? 'border-primary-foreground text-primary-foreground' : 'border-border text-transparent')}>
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.2 6.2 4.7 8.8 9.8 3.2" /></svg>
  </span>
}

function ChoiceTile({ label, selected, onClick, prefix, fill = false }: { label: string; selected: boolean; onClick(): void; prefix?: string; fill?: boolean }) {
  return <button type="button" aria-pressed={selected} title={label} onClick={onClick} className={cn(tileClass, fill && 'h-full w-full', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary hover:bg-muted')}>
    <ChoiceMark selected={selected} />
    {prefix && <span className={cn('shrink-0 font-(--ui-weight-medium)', selected ? 'text-primary-foreground' : 'text-muted-foreground')}>{prefix}</span>}
    <span>{label}</span>
  </button>
}

function IconAction({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick(): void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="inline-flex size-(--ui-control-height-sm) shrink-0 items-center justify-center rounded-(--ui-radius-md) border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer disabled:cursor-default disabled:opacity-45">{children}</button>
}

function ChoiceCard({ title, available, description, query, onQuery, queryLabel, placeholder, filters, children, empty }: {
  title: string
  available: number
  description: string
  query: string
  onQuery(value: string): void
  queryLabel: string
  placeholder: string
  filters: ReactNode
  children: ReactNode
  empty?: string
}) {
  return <section className="rounded-(--ui-radius-4xl) border border-border bg-card p-(--ui-space-5)">
    <div className="flex items-center justify-between gap-(--ui-space-3)">
      <h2 className="m-0 text-(length:--ui-text-lg) font-(--ui-weight-semibold) tracking-tight text-foreground">{title}</h2>
      <span className="shrink-0 rounded-(--ui-radius-full) bg-muted px-(--ui-space-2-5) py-(--ui-space-1) text-(length:--ui-text-2xs) font-(--ui-weight-medium) text-muted-foreground">{available} available</span>
    </div>
    <div className="mt-(--ui-space-3) flex flex-wrap items-center justify-between gap-(--ui-space-3)">
      <p className="m-0 text-(length:--ui-text-sm) text-muted-foreground">{description}</p>
      <div className="flex w-full flex-wrap items-center gap-(--ui-space-2) xl:w-auto xl:justify-end">
        <div className="relative w-full max-w-56">
          <span className="pointer-events-none absolute top-1/2 left-(--ui-space-3) -translate-y-1/2 text-muted-foreground"><Icon name="search" size={14} /></span>
          <Input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} aria-label={queryLabel} className="pl-(--ui-space-8)" />
        </div>
        {filters}
      </div>
    </div>
    {empty ? <p className="m-0 mt-(--ui-space-4) text-(length:--ui-text-sm) text-muted-foreground">{empty}</p> : <div className={cn(choiceGrid, 'mt-(--ui-space-4)')}>{children}</div>}
  </section>
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
  const [nicheFilter, setNicheFilter] = useState<NicheFilter>('all')
  const [stateQuery, setStateQuery] = useState('')
  const [stateRegion, setStateRegion] = useState<StateRegion>('all')
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
  const niches = useMemo(() => [...nicheData.niches, ...criteria.customNiches].sort(byLabel), [criteria.customNiches])
  const nicheSearch = nicheQuery.trim().toLowerCase()
  const visibleNiches = niches.filter((niche) => nicheMatchesFilter(niche, nicheFilter) && niche.toLowerCase().includes(nicheSearch))
  const nicheFilterOptions = useMemo(() => [
    { value: 'all', label: `All (${niches.length})` },
    ...nicheFilters.filter((filter) => filter.id !== 'all').map((filter) => ({ value: filter.id, label: `${filter.label} (${niches.filter((name) => nicheMatchesFilter(name, filter.id)).length})` })).sort((a, b) => byLabel(a.label, b.label)),
  ], [niches])
  const stateFilterOptions = useMemo(() => [
    { value: 'all', label: `All states (${locationData.states.length})` },
    ...stateRegions.filter((region) => region.id !== 'all').map((region) => ({ value: region.id, label: `${region.label} (${region.states.length})` })).sort((a, b) => byLabel(a.label, b.label)),
  ], [])
  const stateSearch = stateQuery.trim().toLowerCase()
  const visibleStates = locationData.states.filter((state) => stateMatchesRegion(state.name, stateRegion) && state.name.toLowerCase().includes(stateSearch)).sort((a, b) => byLabel(a.name, b.name))
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
    setNicheFilter('Custom')
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

  const showNiches = step === 'niches'
  const showStates = step === 'states' || (!pipelineMode && step === 'niches')
  const nicheActions = <>
    {iconActions
      ? <IconAction label="Clear niches" disabled={!criteria.selectedNiches.length} onClick={() => setCriteria((current) => ({ ...current, selectedNiches: [] }))}><Icon name="clear" size={16} /></IconAction>
      : <button type="button" className={pillClass} disabled={!criteria.selectedNiches.length} onClick={() => setCriteria((current) => ({ ...current, selectedNiches: [] }))}>Clear niches</button>}
    <button type="button" className="inline-flex min-h-(--ui-control-height-sm) shrink-0 items-center gap-(--ui-space-1-5) rounded-(--ui-radius-md) border border-primary bg-transparent px-(--ui-space-3) text-(length:--ui-text-xs) font-(--ui-weight-semibold) text-primary transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer" onClick={() => setNichePanelOpen(true)}><Icon name="add" size={14} />Add custom niche</button>
  </>
  const stateActions = <>
    {iconActions
      ? <IconAction label="Clear states" disabled={!criteria.selectedStates.length} onClick={() => setCriteria((current) => ({ ...current, selectedStates: [], selectedLocations: [] }))}><Icon name="clear" size={16} /></IconAction>
      : <button type="button" className={cn(pillClass, 'disabled:cursor-default disabled:opacity-45')} disabled={!criteria.selectedStates.length} onClick={() => setCriteria((current) => ({ ...current, selectedStates: [], selectedLocations: [] }))}>Clear states</button>}
    {iconActions
      ? <IconAction label="Select all states" disabled={allStatesSelected} onClick={() => setCriteria((current) => ({ ...current, selectedStates: locationData.states.map((state) => state.name) }))}><Icon name="selectAll" size={16} /></IconAction>
      : <button type="button" className={cn(pillClass, 'disabled:cursor-default disabled:opacity-45')} disabled={allStatesSelected} onClick={() => setCriteria((current) => ({ ...current, selectedStates: locationData.states.map((state) => state.name) }))}>Select all states</button>}
  </>

  return <div className="la-search-setup">
    {!pipelineMode && <header className="flex flex-wrap items-start justify-between gap-(--ui-space-4)">
      <div>
        <h1 className="m-0 text-(length:--ui-text-5xl) font-(--ui-weight-bold) tracking-tight text-foreground">New Search</h1>
        <p className="mt-(--ui-space-1-5) mb-0 text-(length:--ui-text-base) text-muted-foreground">Find and target leads across niches and locations.</p>
      </div>
      <p className="m-0 text-(length:--ui-text-sm) font-(--ui-weight-medium) text-muted-foreground">{step === 'locations' ? 'Step 2 of 2: Choose locations' : 'Step 1 of 2: Define targets'}</p>
    </header>}
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
    {showNiches && <ChoiceCard title="Contractor & Business Niches" available={niches.length} description="Select niches to continue, or add your own." query={nicheQuery} onQuery={setNicheQuery} queryLabel="Find a niche" placeholder="Search niches..." filters={<>
      <CustomSelect label="Filter niches" value={nicheFilter} onChange={(value) => setNicheFilter(value as NicheFilter)} options={nicheFilterOptions} />
      {nicheActions}
    </>} empty={visibleNiches.length ? undefined : nicheSearch ? 'No niches match this search.' : 'No niches in this category.'}>
      {visibleNiches.map((niche) => <ChoiceTile key={niche} fill label={choiceLabel(niche)} selected={criteria.selectedNiches.includes(niche)} onClick={() => setCriteria((current) => ({ ...current, selectedNiches: toggle(current.selectedNiches, niche) }))} />)}
    </ChoiceCard>}
    {showStates && <ChoiceCard title="U.S. States" available={locationData.states.length} description="Select one or more states to reveal locations." query={stateQuery} onQuery={setStateQuery} queryLabel="Find a state" placeholder="Search states..." filters={<>
      <CustomSelect label="Filter states" value={stateRegion} onChange={(value) => setStateRegion(value as StateRegion)} options={stateFilterOptions} />
      {stateActions}
    </>} empty={visibleStates.length ? undefined : 'No states match this search.'}>
      {visibleStates.map((state) => <ChoiceTile key={state.name} fill label={state.name} selected={criteria.selectedStates.includes(state.name)} onClick={() => toggleState(state.name)} />)}
    </ChoiceCard>}
    {step === 'locations' && criteria.selectedNiches.length > 0 && selectedStates.length > 0 && <section className="la-choice-section">
      <div className="la-choice-heading la-location-heading"><div className="la-choice-heading-copy"><h2>Locations</h2><p>Choose locations from the selected states.</p><span>{locationMatches.length} available</span></div><div className="la-location-selection-controls"><div className="la-location-method"><span>Selection method</span><CustomSelect label="Location selection method" value={selectionMethod} onChange={(value) => { setSelectionMethod(value as 'search' | 'pages' | 'numbers'); setRangeMessage(''); if (value !== 'search') { setLocationQuery(''); setLocationPage(1) } }} options={[{ value: 'search', label: 'Search' }, { value: 'pages', label: 'By page' }, { value: 'numbers', label: 'By number' }]} /></div>
      {selectionMethod === 'search' && <div className="la-choice-toolbar la-location-search-controls"><input type="search" value={locationQuery} onChange={(event) => { setLocationQuery(event.target.value); setLocationPage(1) }} placeholder="Find a city or place..." aria-label="Find a location" /><button type="button" className="la-choice-icon-action" aria-label="Clear locations" title="Clear locations" onClick={() => setCriteria((current) => ({ ...current, selectedLocations: [] }))} disabled={!criteria.selectedLocations.length}><Icon name="clear" size={18} /></button><button type="button" className="la-choice-icon-action la-choice-icon-action--add" aria-label={locationQuery.trim() ? 'Select all matching locations' : 'Select all locations'} title={locationQuery.trim() ? 'Select all matching locations' : 'Select all locations'} onClick={() => setCriteria((current) => ({ ...current, selectedLocations: [...new Set([...current.selectedLocations, ...locationMatches])] }))} disabled={!locationMatches.length || allMatchingLocationsSelected}><Icon name="selectAll" size={18} /></button></div>}
      {selectionMethod === 'pages' && locationMatches.length > 0 && <div className="la-location-ranges"><div className="la-location-range"><strong>Select page range</strong><label>From page <input type="number" min={1} max={locationPageCount} value={pageFrom} onChange={(event) => setPageFrom(event.target.value)} /></label><label>To page <input type="number" min={1} max={locationPageCount} value={pageTo} onChange={(event) => setPageTo(event.target.value)} /></label><button type="button" className="la-location-range-icon" aria-label="Select pages in range" title="Select pages in range" disabled={!validRange(pageFrom, pageTo, locationPageCount)} onClick={() => selectLocationRange('pages')}><Icon name="selectAll" size={18} /></button></div></div>}
      {selectionMethod === 'numbers' && locationMatches.length > 0 && <div className="la-location-ranges"><div className="la-location-range"><strong>Select location numbers</strong><label>From <input type="number" min={1} max={locationMatches.length} value={numberFrom} onChange={(event) => setNumberFrom(event.target.value)} /></label><label>To <input type="number" min={1} max={locationMatches.length} value={numberTo} onChange={(event) => setNumberTo(event.target.value)} /></label><button type="button" className="la-location-range-icon" aria-label="Select locations in number range" title="Select locations in number range" disabled={!validRange(numberFrom, numberTo, locationMatches.length)} onClick={() => selectLocationRange('numbers')}><Icon name="selectAll" size={18} /></button></div></div>}
      {selectionMethod !== 'search' && <button type="button" className="la-location-clear la-choice-icon-action" aria-label="Clear locations" title="Clear locations" onClick={() => setCriteria((current) => ({ ...current, selectedLocations: [] }))} disabled={!criteria.selectedLocations.length}><Icon name="clear" size={18} /></button>}</div></div>
      <div className="flex flex-wrap gap-(--ui-space-2)" aria-label="Location choices">{visibleLocations.map((location, index) => <ChoiceTile key={location} label={location} prefix={`${(currentLocationPage - 1) * locationsPerPage + index + 1}.`} selected={selectedLocationSet.has(location)} onClick={() => setCriteria((current) => ({ ...current, selectedLocations: toggle(current.selectedLocations, location) }))} />)}</div>
      {!locationMatches.length && <p className="la-choice-empty">No locations match this search.</p>}
      {rangeMessage && <p className="la-choice-hint" role="status">{rangeMessage}</p>}
    </section>}
    {step === 'niches' ? <div className="la-search-start border-t border-border"><p className="la-choice-footnote">{pipelineMode ? 'Choose one or more niches.' : `${countPhrase(criteria.selectedNiches.length, 'niche')} and ${countPhrase(criteria.selectedStates.length, 'state')} selected · Choose locations to proceed.`}</p><button type="button" disabled={!criteria.selectedNiches.length || (!pipelineMode && !criteria.selectedStates.length)} onClick={() => { if (pipelineMode) { if (nextAfterNiches === 'start') onSearch(criteria, details); else setStep(nextAfterNiches) } else { setLocationPage(1); setStep('locations') } }}>{pipelineMode ? nextAfterNiches === 'start' ? 'Start pipeline' : nextAfterNiches === 'locations' ? 'Select locations' : 'Select states' : 'Select locations'}</button></div> : step === 'states' ? <div className="la-search-start border-t border-border"><p className="la-choice-footnote">Choose one or more states before selecting locations.</p><button type="button" disabled={!criteria.selectedStates.length} onClick={() => { if (nextAfterStates === 'start') onSearch(criteria, details); else { setLocationPage(1); setStep('locations') } }}>{nextAfterStates === 'start' ? 'Start pipeline' : 'Select locations'}</button></div> : step === 'locations' ? <div className="la-search-start"><div className="la-location-footer-pagination">{locationPageCount > 1 && <nav className="la-choice-pagination" aria-label="Location pages"><div className="la-choice-page-buttons"><button type="button" className="la-location-page-arrow la-location-page-arrow--previous" aria-label="Previous location page" title="Previous page" disabled={currentLocationPage === 1} onClick={() => setLocationPage(currentLocationPage - 1)}><Icon name="chevron" size={15} /></button>{pageChoices(currentLocationPage, locationPageCount).map((page, index) => page === 'ellipsis' ? <span key={`gap-${index}`} aria-hidden="true">...</span> : <button key={page} type="button" aria-current={page === currentLocationPage ? 'page' : undefined} onClick={() => setLocationPage(page)}>{page}</button>)}<button type="button" className="la-location-page-arrow" aria-label="Next location page" title="Next page" disabled={currentLocationPage === locationPageCount} onClick={() => setLocationPage(currentLocationPage + 1)}><Icon name="chevron" size={15} /></button></div><div className="la-choice-page-size"><span>Results per page</span><CustomSelect label="Results per page" value={String(locationsPerPage)} onChange={(value) => { setLocationsPerPage(Number(value)); setLocationPage(1) }} options={[{ value: '25', label: '25' }, { value: '50', label: '50' }, { value: '100', label: '100' }]} /></div><span className="la-choice-page-range">{(currentLocationPage - 1) * locationsPerPage + 1}-{Math.min(currentLocationPage * locationsPerPage, locationMatches.length)} of {locationMatches.length.toLocaleString()}</span></nav>}</div><button type="button" disabled={!criteria.selectedLocations.length} onClick={() => onSearch(criteria, pipelineMode && provider ? { name: pipelineName.trim(), provider } : undefined)}>{pipelineMode ? 'Start crawl' : 'Search contractors'}</button></div> : null}
    {nichePanelOpen && <div className="la-niche-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNichePanelOpen(false) }}><aside className="la-niche-panel" role="dialog" aria-modal="true" aria-labelledby="la-niche-panel-title"><div className="la-niche-panel-heading"><div><h2 id="la-niche-panel-title">Add niches</h2><p>Enter one niche, or separate multiple niches with commas.</p></div><button type="button" className="la-niche-panel-close" aria-label="Close add niche panel" onClick={() => setNichePanelOpen(false)}>×</button></div><label htmlFor="la-niche-draft">Niche names</label><textarea id="la-niche-draft" autoFocus value={draft} onChange={(event) => { setDraft(event.target.value); setNicheError('') }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); addNiches() } }} rows={5} placeholder="General Contractors, Electrical Contractors" /><p className="la-choice-hint">Press Enter to add and select. Shift+Enter starts a new line.</p>{nicheError && <p className="la-niche-panel-error" role="alert">{nicheError}</p>}<button type="button" className="la-niche-panel-submit" disabled={!draft.trim()} onClick={addNiches}>Add niches</button></aside></div>}
  </div>
}
