import { createElement, useEffect, useRef, useState } from 'react'
import { discoverPage, extractContacts, extractRenderedHtmlEmails } from '@leadsghr/extract'
import { Button, EmptyTable } from '@leadsghr/ui'
import { MdOutlineVisibility } from 'react-icons/md'
import type { DesktopPreferences } from '@leadsghr/schemas'

type GuestView = HTMLElement & {
  executeJavaScript(code: string): Promise<string>
}
type PreparedPage = { url: string; html: string }
type DesktopCrawlerBridge = {
  prepareCrawlerTest(input: { url: string }): Promise<PreparedPage>
}
type Activity = { id: number; text: string; kind: 'working' | 'success' | 'email' | 'error' }
type PageResult = { url: string; kind: 'Homepage' | 'Contact page' | 'Page'; emails: string[] }
type UrlRow = { url: string; status: 'Queued' | 'Fetching' | 'Crawling' | 'Crawled' | 'Skipped'; emails: number; kind: PageResult['kind'] }
const CONTACT_PATH = /(?:^|[\/_-])(?:contact(?:-us)?|get-in-touch|reach-us|enquir(?:y|ies)|inquir(?:y|ies))(?:$|[\/_-])/i
function contactLink(links: string[]): string | null {
  return links.find((link) => { try { return CONTACT_PATH.test(decodeURIComponent(new URL(link).pathname)) } catch { return false } }) ?? null
}

const desktop = () => (window as Window & { leadsGhrDesktop?: DesktopCrawlerBridge }).leadsGhrDesktop
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function CrawlerPage({ preferences }: { preferences: DesktopPreferences }) {
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<{ url: string; id: number; partition: string; kind: PageResult['kind'] } | null>(null)
  const [phase, setPhase] = useState<'idle' | 'fetching' | 'loading' | 'crawling' | 'done' | 'error'>('idle')
  const [emails, setEmails] = useState<string[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [homepageLinks, setHomepageLinks] = useState<string[]>([])
  const [contactUrl, setContactUrl] = useState<string | null>(null)
  const [discoveryMs, setDiscoveryMs] = useState<number | null>(null)
  const [pageResults, setPageResults] = useState<PageResult[]>([])
  const [homepageUrl, setHomepageUrl] = useState('')
  const [urlRows, setUrlRows] = useState<UrlRow[]>([])
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [formRecipients, setFormRecipients] = useState<string[]>([])
  const [possibleRecipients, setPossibleRecipients] = useState<string[]>([])
  const [formCount, setFormCount] = useState(0)
  const [activity, setActivity] = useState<Activity[]>([])
  const viewRef = useRef<GuestView | null>(null)
  const detailCloseRef = useRef<HTMLButtonElement | null>(null)
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null)
  const runRef = useRef(0)
  const foundRef = useRef(new Set<string>())
  const linksRef = useRef(new Set<string>())
  const recipientsRef = useRef(new Set<string>())
  const possibleRecipientsRef = useRef(new Set<string>())
  const htmlRef = useRef('')
  const sequenceRef = useRef(0)
  const discoveryStartedRef = useRef(0)
  const discoveredContactRef = useRef<string | null>(null)
  const queueRef = useRef<{ url: string; kind: PageResult['kind'] }[]>([])
  const queuedRef = useRef(new Set<string>())
  const pageEmailRef = useRef(new Map<string, Set<string>>())
  const homepageLinksRef = useRef<string[]>([])
  const contactOnlyRef = useRef(true)
  const emailSourceRef = useRef<DesktopPreferences['crawlerEmailSource']>('leadsghr')

  async function crawlHttpQueue(first: PreparedPage, current: number) {
    let prepared: PreparedPage | null = first
    let kind: PageResult['kind'] = 'Homepage'
    while (prepared && runRef.current === current) {
      const page = prepared
      setPhase('crawling')
      setRow(page.url, { status: 'Crawling' })
      addActivity(`Crawling ${kind.toLowerCase()}...`, 'working')
      collect(page.html, page.url, kind)
      setRow(page.url, { status: 'Crawled' })
      if (kind === 'Homepage') {
        const contact = discoveredContactRef.current ?? contactLink(homepageLinksRef.current)
        if (!contact) setDiscoveryMs(Math.round(performance.now() - discoveryStartedRef.current))
        if (contact) enqueue(contact, 'Contact page')
        if (!contactOnlyRef.current) for (const link of homepageLinksRef.current) enqueue(link, link === contact ? 'Contact page' : 'Page')
      }
      prepared = null
      while (queueRef.current.length && runRef.current === current) {
        const target = queueRef.current.shift()!
        setRow(target.url, { status: 'Fetching' })
        addActivity(`Fetching ${target.kind.toLowerCase()}...`, 'working')
        try {
          await wait(700)
          const next = await desktop()!.prepareCrawlerTest({ url: target.url })
          if (runRef.current !== current) return
          if (next.url !== target.url) setUrlRows((items) => items.map((item) => item.url === target.url ? { ...item, url: next.url } : item))
          kind = target.kind
          prepared = next
          break
        } catch (error) {
          setRow(target.url, { status: 'Skipped' })
          addActivity(`Skipped ${target.url}: ${String(error)}`, 'error')
        }
      }
    }
    if (runRef.current !== current) return
    const count = new Set([...foundRef.current, ...recipientsRef.current, ...possibleRecipientsRef.current]).size
    addActivity(count ? `Crawl complete: ${count} unique email address(es)` : 'No email found on crawled pages', 'success')
    setPhase('done')
  }

  const addActivity = (text: string, kind: Activity['kind']) => {
    setActivity((items) => [...items, { id: ++sequenceRef.current, text, kind }])
  }
  const setRow = (pageUrl: string, changes: Partial<UrlRow>) => setUrlRows((items) => items.map((item) => item.url === pageUrl ? { ...item, ...changes } : item))
  const addPageEmail = (pageUrl: string, pageKind: PageResult['kind'], email: string) => {
    const pageEmails = pageEmailRef.current.get(pageUrl) ?? new Set<string>()
    if (pageEmails.has(email)) return
    pageEmails.add(email)
    pageEmailRef.current.set(pageUrl, pageEmails)
    setRow(pageUrl, { emails: pageEmails.size })
    setPageResults((items) => {
      const existing = items.find((item) => item.url === pageUrl)
      return existing ? items.map((item) => item.url === pageUrl ? { ...item, emails: [...item.emails, email] } : item) : [...items, { url: pageUrl, kind: pageKind, emails: [email] }]
    })
  }
  const enqueue = (pageUrl: string, kind: PageResult['kind']) => {
    const key = new URL(pageUrl).href.replace(/\/$/, '').toLowerCase()
    if (queuedRef.current.has(key)) return
    queuedRef.current.add(key)
    queueRef.current.push({ url: pageUrl, kind })
    setUrlRows((items) => [...items, { url: pageUrl, kind, status: 'Queued', emails: 0 }])
  }
  const collect = (html: string, pageUrl: string, pageKind: PageResult['kind']) => {
    const discovery = discoverPage(html, pageUrl)
    if (pageKind === 'Homepage') {
      homepageLinksRef.current = [...new Set([...homepageLinksRef.current, ...discovery.links])]
      setHomepageLinks(homepageLinksRef.current)
      const match = contactLink(discovery.links)
      if (match && !discoveredContactRef.current) {
        discoveredContactRef.current = match
        setContactUrl(match)
        setDiscoveryMs(Math.round(performance.now() - discoveryStartedRef.current))
      }
    }
    setFormCount((count) => Math.max(count, discovery.formCount))
    for (const link of discovery.links) {
      if (linksRef.current.has(link)) continue
      linksRef.current.add(link)
      setLinks([...linksRef.current])
    }
    for (const address of discovery.formRecipientEmails) {
      addPageEmail(pageUrl, pageKind, address)
      if (recipientsRef.current.has(address)) continue
      recipientsRef.current.add(address)
      possibleRecipientsRef.current.delete(address)
      setPossibleRecipients([...possibleRecipientsRef.current])
      setFormRecipients([...recipientsRef.current])
      addActivity(`Form recipient found: ${address}`, 'email')
    }
    for (const address of discovery.possibleFormRecipientEmails) {
      addPageEmail(pageUrl, pageKind, address)
      if (recipientsRef.current.has(address) || possibleRecipientsRef.current.has(address)) continue
      possibleRecipientsRef.current.add(address)
      setPossibleRecipients([...possibleRecipientsRef.current])
      addActivity(`Possible form recipient in page script: ${address}`, 'email')
    }
    for (const email of (emailSourceRef.current === 'email-hunter' ? extractRenderedHtmlEmails(html) : extractContacts(html).emails)) {
      addPageEmail(pageUrl, pageKind, email)
      if (foundRef.current.has(email)) continue
      foundRef.current.add(email)
      setEmails([...foundRef.current])
      addActivity(`Email found on ${pageKind} [${email}]`, 'email')
    }
  }

  async function start(event: React.FormEvent) {
    event.preventDefault()
    const current = ++runRef.current
    setActivity([])
    setEmails([])
    setLinks([])
    setHomepageLinks([])
    setContactUrl(null)
    setDiscoveryMs(null)
    setPageResults([])
    setHomepageUrl('')
    setUrlRows([])
    setSelectedUrl(null)
    setFormRecipients([])
    setPossibleRecipients([])
    setFormCount(0)
    setPreview(null)
    foundRef.current = new Set()
    linksRef.current = new Set()
    recipientsRef.current = new Set()
    possibleRecipientsRef.current = new Set()
    htmlRef.current = ''
    sequenceRef.current = 0
    discoveredContactRef.current = null
    discoveryStartedRef.current = 0
    queueRef.current = []
    queuedRef.current = new Set()
    pageEmailRef.current = new Map()
    homepageLinksRef.current = []
    contactOnlyRef.current = preferences.crawlerContactOnly
    emailSourceRef.current = preferences.crawlerEmailSource
    if (!desktop()) {
      setPhase('error')
      addActivity('Desktop crawler bridge is unavailable', 'error')
      return
    }
    setPhase('fetching')
    addActivity('Fetching webpage...', 'working')
    try {
      const prepared = await desktop()!.prepareCrawlerTest({ url: url.trim() })
      if (runRef.current !== current) return
      setActivity((items) => items.map((item) => item.id === 1 ? { ...item, text: 'Webpage fetched', kind: 'success' } : item))
      htmlRef.current = prepared.html
      setHomepageUrl(prepared.url)
      discoveryStartedRef.current = performance.now()
      enqueue(prepared.url, 'Homepage')
      queueRef.current.shift()
      setRow(prepared.url, { status: 'Crawling' })
      if (preferences.crawlerFetchMethod === 'http') {
        await crawlHttpQueue(prepared, current)
        return
      }
      setPhase('loading')
      setPreview({ url: prepared.url, id: current, partition: `crawler-test-${crypto.randomUUID()}`, kind: 'Homepage' })
    } catch (error) {
      if (runRef.current !== current) return
      setPhase('error')
      addActivity(String(error), 'error')
    }
  }

  useEffect(() => {
    if (!preview || !viewRef.current) return
    const view = viewRef.current
    const current = preview.id
    let started = false
    const onLoaded = async () => {
      if (started || runRef.current !== current) return
      started = true
      setPhase('crawling')
      setRow(preview.url, { status: 'Crawling' })
      addActivity(`Crawling ${preview.kind.toLowerCase()}...`, 'working')
      const pageKind = preview.kind
      collect(htmlRef.current, preview.url, pageKind)
      try {
        for (let step = 0; step < 8; step++) {
          if (runRef.current !== current) return
          await view.executeJavaScript(`window.scrollTo({ top: document.documentElement.scrollHeight * ${step + 1} / 8, behavior: 'smooth' }); document.documentElement.outerHTML`)
          await wait(550)
          if (runRef.current !== current) return
          const renderedHtml = await view.executeJavaScript('document.documentElement.outerHTML')
          if (/captcha|unusual traffic|verify you are human|sign in to continue/i.test(renderedHtml.slice(0, 10000))) throw new Error('Page presented a challenge; crawl paused')
          collect(renderedHtml, preview.url, pageKind)
        }
        if (runRef.current !== current) return
        setRow(preview.url, { status: 'Crawled' })
        setActivity((items) => items.map((item) => item.text === `Crawling ${preview.kind.toLowerCase()}...` && item.kind === 'working' ? { ...item, text: `${preview.kind} crawled`, kind: 'success' } : item))
        if (pageKind === 'Homepage') {
          const next = discoveredContactRef.current ?? contactLink(homepageLinksRef.current)
          if (!next) { setDiscoveryMs(Math.round(performance.now() - discoveryStartedRef.current)); addActivity('No contact page link found on homepage', 'success') }
          if (next) enqueue(next, 'Contact page')
          if (!contactOnlyRef.current) for (const link of homepageLinksRef.current) enqueue(link, link === next ? 'Contact page' : 'Page')
        }
        while (queueRef.current.length) {
          const target = queueRef.current.shift()!
          if (runRef.current !== current) return
          setRow(target.url, { status: 'Fetching' })
          const entryId = ++sequenceRef.current
          setActivity((items) => [...items, { id: entryId, text: `Fetching ${target.kind.toLowerCase()}...`, kind: 'working' }])
          try {
            await wait(700)
            const prepared = await desktop()!.prepareCrawlerTest({ url: target.url })
            if (runRef.current !== current) return
            if (prepared.url !== target.url) setUrlRows((items) => items.map((item) => item.url === target.url ? { ...item, url: prepared.url } : item))
            htmlRef.current = prepared.html
            setActivity((items) => items.map((item) => item.id === entryId ? { ...item, text: `${target.kind} fetched`, kind: 'success' } : item))
            setPhase('loading')
            setPreview({ url: prepared.url, id: current, partition: `crawler-test-${crypto.randomUUID()}`, kind: target.kind })
            return
          } catch (error) {
            setRow(target.url, { status: 'Skipped' })
            setActivity((items) => items.map((item) => item.id === entryId ? { ...item, text: `Skipped ${target.url}: ${String(error)}`, kind: 'error' } : item))
          }
        }
        if (foundRef.current.size === 0 && recipientsRef.current.size === 0 && possibleRecipientsRef.current.size === 0) addActivity('No email found on crawled pages', 'success')
        else addActivity(`Crawl complete: ${new Set([...foundRef.current, ...recipientsRef.current, ...possibleRecipientsRef.current]).size} unique email address(es)`, 'success')
        setPhase('done')
      } catch (error) {
        if (runRef.current !== current) return
        setPhase('error')
        addActivity(`Could not inspect the page preview: ${String(error)}`, 'error')
      }
    }
    const onFailed = () => {
      if (runRef.current !== current) return
      setPhase('error')
      addActivity('The webpage preview could not load', 'error')
    }
    view.addEventListener('did-finish-load', onLoaded)
    view.addEventListener('did-fail-load', onFailed)
    view.setAttribute('src', preview.url)
    return () => {
      view.removeEventListener('did-finish-load', onLoaded)
      view.removeEventListener('did-fail-load', onFailed)
    }
  }, [preview, preferences.showCrawlerPreview])

  useEffect(() => () => { runRef.current++ }, [])

  useEffect(() => {
    if (!selectedUrl) return
    detailCloseRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetails()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedUrl])

  const closeDetails = () => {
    setSelectedUrl(null)
    requestAnimationFrame(() => detailTriggerRef.current?.focus())
  }

  const working = phase === 'fetching' || phase === 'loading' || phase === 'crawling'
  const emailCount = new Set([...emails, ...formRecipients, ...possibleRecipients]).size
  const selectedRow = urlRows.find((row) => row.url === selectedUrl)
  const selectedEmails = pageResults.find((page) => page.url === selectedUrl)?.emails ?? []
  const webview = preview ? createElement('webview', { key: preview.partition, ref: (node: HTMLElement | null) => { viewRef.current = node as GuestView | null }, partition: preview.partition, className: 'la-crawler-webview', 'aria-label': 'Crawled webpage preview' }) : null
  return <div className="la-crawler">
    <div className="la-crawler-heading"><h2>Crawl public pages</h2><span className="la-crawler-badge">TEST MODE - NO SAVING</span></div>
    <section className="la-crawler-form-section">
      <form className="la-crawler-form" onSubmit={(event) => void start(event)}>
        <label htmlFor="crawler-url">Homepage URL</label>
        <div className="la-crawler-form-row">
          <input id="crawler-url" type="url" required placeholder="https://company.com" value={url} onChange={(event) => setUrl(event.target.value)} disabled={working} />
          <Button type="submit" disabled={working}>{working ? 'Crawling…' : 'Crawl page'}</Button>
        </div>
      </form>
    </section>
    {preferences.crawlerFetchMethod === 'browser' && <div className={`la-crawler-grid${preferences.showCrawlerPreview ? ' la-crawler-grid--preview-only' : ' la-crawler-grid--no-preview'}`}>
      {preferences.showCrawlerPreview ? <section className="la-crawler-preview-section">
        <div className="la-crawler-section-heading"><div><h3>Webpage preview</h3><p>{preview?.url ?? 'Enter a URL to open a page here.'}</p></div><span className={working ? 'la-crawler-live' : 'la-crawler-idle'}>{working ? 'Working' : phase === 'done' ? 'Finished' : 'Preview'}</span></div>
        <div className="la-crawler-webview-frame">
          {webview ?? <div className="la-crawler-empty"><span className="la-crawler-empty-icon">?</span><strong>Webpage preview</strong><span>The page will appear here while the crawler scrolls through it.</span></div>}
        </div>
      </section> : webview && <div className="la-crawler-hidden-preview" aria-hidden="true">{webview}</div>}
    </div>}
    <section className="la-crawler-links-section">
      <h3>URL queue <span>{urlRows.length} pages · {emailCount} unique emails</span></h3>
      <div className={`la-crawler-queue-activity la-crawler-event--${activity.at(-1)?.kind ?? 'working'}`} role="status" aria-live="polite"><span className="la-crawler-dot" /><span>{activity.at(-1)?.text ?? 'Ready to crawl'}</span></div>
      <div className={`la-crawler-table-wrap${urlRows.length ? '' : ' la-crawler-table-wrap--empty'}`}>
        <table className="la-table la-crawler-table">
          <thead><tr><th>#</th><th>Page URL</th><th>Type</th><th>Status</th><th>Emails found</th><th>Actions</th></tr></thead>
          <tbody>{urlRows.map((row, index) => <tr key={row.url}>
            <td>{index + 1}</td>
            <td title={row.url}><a href={row.url} target="_blank" rel="noreferrer">{row.url}</a></td>
            <td>{row.kind}</td>
            <td><span className={`la-crawler-queue-status la-crawler-queue-status--${row.status.toLowerCase()}`}>{row.status}</span></td>
            <td><span className="la-crawler-email-chip" aria-label={`${row.emails} emails found`}>{row.emails}</span></td>
            <td><button type="button" className="la-crawler-view-button" title="View page emails" aria-label={`View emails and details for ${row.url}`} onClick={(event) => { detailTriggerRef.current = event.currentTarget; setSelectedUrl(row.url) }}><MdOutlineVisibility aria-hidden="true" /></button></td>
          </tr>)}</tbody>
        </table>
        {!urlRows.length && <EmptyTable title="No pages queued" description="Enter a public homepage URL to discover pages and their email addresses." />}
      </div>
    </section>
    {selectedRow && <div className="la-niche-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails() }}>
      <aside className="la-niche-panel la-crawler-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="crawler-detail-title">
        <div className="la-niche-panel-heading"><div><h2 id="crawler-detail-title">Page emails</h2><p>Addresses found while crawling this public page.</p></div><button ref={detailCloseRef} type="button" className="la-niche-panel-close" aria-label="Close page details" onClick={closeDetails}>&times;</button></div>
        <dl className="la-crawler-detail-meta">
          <div><dt>Page URL</dt><dd><a href={selectedRow.url} target="_blank" rel="noreferrer">{selectedRow.url}</a></dd></div>
          <div><dt>Page type</dt><dd>{selectedRow.kind}</dd></div>
          <div><dt>Crawl status</dt><dd>{selectedRow.status}</dd></div>
          <div><dt>Email source</dt><dd>{emailSourceRef.current === 'email-hunter' ? 'Email Hunter-style rendered HTML' : 'LeadsGhr extraction'}</dd></div>
          {selectedRow.kind === 'Homepage' && <><div><dt>Links discovered</dt><dd>{homepageLinks.length}</dd></div>{discoveryMs !== null && <div><dt>Discovery time</dt><dd>{discoveryMs} ms</dd></div>}{contactUrl && <div><dt>Contact page</dt><dd><a href={contactUrl} target="_blank" rel="noreferrer">{contactUrl}</a></dd></div>}</>}
        </dl>
        <div className="la-crawler-detail-emails-heading"><h3>Emails found</h3><span className="la-crawler-email-chip">{selectedEmails.length}</span></div>
        {selectedEmails.length ? <ol className="la-crawler-detail-emails">{selectedEmails.map((email) => <li key={email}><span>{email}</span></li>)}</ol> : <p className="la-crawler-detail-empty">{selectedRow.status === 'Crawled' ? 'No emails found on this page.' : 'No emails found yet.'}</p>}
      </aside>
    </div>}
  </div>
}




