import { useEffect, useMemo, useState } from 'react'
import type { SearchCriteria } from '@leadsghr/schemas'
import { Icon } from '@leadsghr/ui'
import { compileNicheSelection, getNichePack, nicheCategories, starterPacks, uniqueTerms, updateNicheTerm } from './niche-library-data'

const empty: SearchCriteria = { customNiches: [], selectedNiches: [], selectedStates: [], selectedLocations: [], nicheKeywordEdits: {} }
type CriteriaBridge = { loadSearchCriteria(): Promise<SearchCriteria | null>; saveSearchCriteria(input: SearchCriteria): Promise<SearchCriteria> }
const bridge = () => (window as Window & { leadsGhrDesktop?: CriteriaBridge }).leadsGhrDesktop

export function NicheLibraryPage({ onStartSearch, useNicheKeywords }: { onStartSearch(): void; useNicheKeywords: boolean }) {
  const [criteria, setCriteria] = useState<SearchCriteria>(empty)
  const [ready, setReady] = useState(false)
  const [category, setCategory] = useState('All niches')
  const [query, setQuery] = useState('')
  const [activeName, setActiveName] = useState(starterPacks[0].name)
  const [customDraft, setCustomDraft] = useState('')
  const [termDraft, setTermDraft] = useState('')
  const [negativeDraft, setNegativeDraft] = useState('')
  const [message, setMessage] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    let active = true
    const desktop = bridge()
    if (!desktop) { setMessage('Restart the desktop app to enable saved niche choices.'); setReady(true); return }
    void desktop.loadSearchCriteria().then((saved) => { if (active) { if (saved) setCriteria(saved); setReady(true) } }).catch(() => { if (active) setMessage('Could not load saved niche choices. Existing choices were not changed.') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!ready || !bridge()) return
    void bridge()!.saveSearchCriteria(criteria).catch(() => setMessage('Could not save niche choices.'))
  }, [criteria, ready])

  const allNames = useMemo(() => [...starterPacks.map((pack) => pack.name), ...criteria.customNiches], [criteria.customNiches])
  const visibleNames = allNames.filter((name) => {
    const pack = getNichePack(name, criteria)
    const text = [name, pack.category, ...pack.searchTerms, ...pack.relatedServices].join(' ').toLocaleLowerCase()
    return (category === 'All niches' || pack.category === category) && text.includes(query.trim().toLocaleLowerCase())
  })
  const active = visibleNames.includes(activeName) ? activeName : (visibleNames[0] ?? '')
  const pack = getNichePack(active || starterPacks[0].name, criteria)
  const compiled = compileNicheSelection(criteria)
  const isSelected = criteria.selectedNiches.includes(active)
  const changed = Boolean(criteria.nicheKeywordEdits[active])

  function addCustom() {
    const entries = uniqueTerms(customDraft.split(/[,\r\n]+/).map((value) => value.trim())).filter((value) => value.length <= 120)
    if (!entries.length) { setMessage('Enter at least one niche of 120 characters or fewer.'); return }
    const known = new Set(allNames.map((value) => value.toLocaleLowerCase()))
    const added = entries.filter((value) => !known.has(value.toLocaleLowerCase()))
    if (!added.length) { setMessage('These niches are already in the library.'); return }
    if (criteria.customNiches.length + added.length > 500) { setMessage('The custom niche limit is 500.'); return }
    setCriteria((current) => ({ ...current, customNiches: [...current.customNiches, ...added], selectedNiches: uniqueTerms([...current.selectedNiches, ...added]) }))
    setActiveName(added[0]); setCategory('Custom'); setCustomDraft(''); setShowAdd(false); setMessage(`${added.length} niche${added.length === 1 ? '' : 's'} added and selected.`)
  }
  function removeCustom() {
    if (!criteria.customNiches.includes(active)) return
    setCriteria((current) => { const edits = { ...current.nicheKeywordEdits }; delete edits[active]; return { ...current, customNiches: current.customNiches.filter((name) => name !== active), selectedNiches: current.selectedNiches.filter((name) => name !== active), nicheKeywordEdits: edits } })
    setActiveName(starterPacks[0].name)
    setCategory('All niches')
    setMessage('Custom niche removed.')
  }
  function addTerm(kind: 'keyword' | 'negative') {
    const draft = kind === 'keyword' ? termDraft : negativeDraft
    const entries = uniqueTerms(draft.split(/[,\r\n]+/))
    if (!entries.length || entries.some((value) => value.length > 120)) { setMessage('Enter terms of 120 characters or fewer.'); return }
    setCriteria((current) => entries.reduce((value, term) => updateNicheTerm(value, active, term, kind, 'add'), current))
    if (kind === 'keyword') setTermDraft(''); else setNegativeDraft('')
    setMessage(`${entries.length} ${kind === 'keyword' ? 'search' : 'exclusion'} term${entries.length === 1 ? '' : 's'} added.`)
  }
  async function startSearch() {
    try { await bridge()?.saveSearchCriteria(criteria); onStartSearch() }
    catch { setMessage('Could not save niche choices. Try again.') }
  }
  return <div className="la-niche-library">
    <div className="la-library-intro"><button type="button" onClick={() => setShowAdd(true)}>Add niche</button></div>
    <div className="la-library-layout">
      <aside className="la-library-categories" aria-label="Niche categories"><strong>Categories</strong>{['All niches', ...nicheCategories].map((item) => <button type="button" key={item} aria-current={category === item ? 'page' : undefined} onClick={() => { setCategory(item); const first = allNames.find((name) => item === 'All niches' || getNichePack(name, criteria).category === item); if (first) setActiveName(first) }}><span>{item}</span><small>{item === 'All niches' ? allNames.length : allNames.filter((name) => getNichePack(name, criteria).category === item).length}</small></button>)}</aside>
      <section className="la-library-list"><label className="la-library-search"><Icon name="search" size={16}/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a niche or keyword..." aria-label="Find a niche or keyword" /></label><div className="la-library-list-heading"><strong>{visibleNames.length} niches</strong><span>{criteria.selectedNiches.length} selected</span></div><div className="la-library-items">{visibleNames.map((name) => <button type="button" key={name} className="la-library-item" aria-current={active === name ? 'true' : undefined} onClick={() => setActiveName(name)}><span><strong>{name}</strong><small>{getNichePack(name, criteria).category}</small></span>{criteria.selectedNiches.includes(name) && <span className="la-library-check" aria-label="Selected">&#10003;</span>}</button>)}</div>{!visibleNames.length && <p className="la-library-empty">No niches match this filter.</p>}</section>
      {visibleNames.length > 0 ? <section className="la-library-detail"><div className="la-library-detail-heading"><div><small>{pack.category}</small><h3>{pack.name}</h3><p>{pack.searchTerms.length} search terms &middot; {pack.relatedServices.length} related services</p></div><button type="button" className={isSelected ? 'la-library-selected' : ''} aria-pressed={isSelected} onClick={() => setCriteria((current) => ({ ...current, selectedNiches: isSelected ? current.selectedNiches.filter((name) => name !== active) : [...current.selectedNiches, active] }))}>{isSelected ? '\u2713 Selected' : 'Select niche'}</button></div>
        <div className="la-library-term-section"><div className="la-library-section-title"><h4>Search terms</h4><span>Used to discover businesses</span></div><div className="la-library-terms">{pack.searchTerms.map((term) => <span className="la-library-term" key={term}>{term}<button type="button" title={`Remove ${term}`} aria-label={`Remove ${term}`} onClick={() => setCriteria((current) => updateNicheTerm(current, active, term, 'keyword', 'remove'))}>&times;</button></span>)}</div><div className="la-library-add-term"><input value={termDraft} onChange={(event) => setTermDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTerm('keyword') }} placeholder="Add term, or separate terms with commas" aria-label="Add search terms" /><button type="button" onClick={() => addTerm('keyword')}>Add</button></div></div>
        <div className="la-library-term-section"><div className="la-library-section-title"><h4>Related services</h4><span>Included in the merged keyword set</span></div><div className="la-library-terms">{pack.relatedServices.map((term) => <span className="la-library-term" key={term}>{term}<button type="button" aria-label={`Remove ${term}`} onClick={() => setCriteria((current) => updateNicheTerm(current, active, term, 'keyword', 'remove'))}>&times;</button></span>)}</div></div>
        <div className="la-library-term-section"><div className="la-library-section-title"><h4>Negative terms</h4><span>Exclude matching business names</span></div><div className="la-library-terms">{pack.negativeKeywords.map((term) => <span className="la-library-term la-library-negative" key={term}>{term}<button type="button" aria-label={`Remove ${term}`} onClick={() => setCriteria((current) => updateNicheTerm(current, active, term, 'negative', 'remove'))}>&times;</button></span>)}</div><div className="la-library-add-term"><input value={negativeDraft} onChange={(event) => setNegativeDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTerm('negative') }} placeholder="Add exclusion, or separate with commas" aria-label="Add negative terms" /><button type="button" onClick={() => addTerm('negative')}>Add</button></div></div>
        <div className="la-library-term-section"><div className="la-library-section-title"><h4>Typical website phrases</h4><span>Context for future site analysis</span></div><div className="la-library-terms">{pack.websitePhrases.map((term) => <span className="la-library-term la-library-quiet" key={term}>{term}</span>)}</div></div>
        <div className="la-library-detail-actions">{changed && <button type="button" onClick={() => setCriteria((current) => { const edits = { ...current.nicheKeywordEdits }; delete edits[active]; return { ...current, nicheKeywordEdits: edits } })}>Reset pack edits</button>}{criteria.customNiches.includes(active) && <button type="button" onClick={removeCustom}>Delete custom niche</button>}</div>
      </section> : <section className="la-library-detail la-library-detail-empty"><p>No niches match this category or search. Choose another category or add a custom niche.</p></section>}
    </div>
    <section className="la-library-summary"><div><h3>Combined selection</h3><p>{compiled.packs.length} niches &middot; {compiled.keywords.length} unique keywords &middot; {useNicheKeywords ? compiled.searchTerms.length : compiled.packs.length} search queries per location ({useNicheKeywords ? 'all pack terms' : 'niche names only'}) &middot; {compiled.negativeKeywords.length} negative terms</p></div><button type="button" disabled={!criteria.selectedNiches.length || (useNicheKeywords && !compiled.searchTerms.length)} onClick={() => void startSearch()}>Continue to search <Icon name="arrow" size={16}/></button><div className="la-library-summary-terms">{compiled.keywords.map((term) => <span key={term}>{term}</span>)}</div>{!compiled.packs.length && <p>Select one or more niches to build a keyword set.</p>}{useNicheKeywords && compiled.packs.length > 0 && !compiled.searchTerms.length && <p>Add a search term to at least one selected niche before searching.</p>}</section>
    {message && <p className="la-library-message" role="status">{message}</p>}
    {showAdd && <div className="la-niche-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAdd(false) }}><aside className="la-niche-panel" role="dialog" aria-modal="true" aria-labelledby="la-library-add-title"><div className="la-niche-panel-heading"><div><h2 id="la-library-add-title">Add custom niches</h2><p>Separate names with commas or new lines.</p></div><button type="button" className="la-niche-panel-close" aria-label="Close add niche panel" onClick={() => setShowAdd(false)}>&times;</button></div><label htmlFor="la-library-custom">Niche names</label><textarea id="la-library-custom" autoFocus rows={5} value={customDraft} onChange={(event) => setCustomDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); addCustom() } }} placeholder="Solar Installer, Landscape Contractor" /><p className="la-choice-hint">New niches start with their name as a search term. You can add more terms after saving.</p><button type="button" className="la-niche-panel-submit" onClick={addCustom}>Add niches</button></aside></div>}
  </div>
}
