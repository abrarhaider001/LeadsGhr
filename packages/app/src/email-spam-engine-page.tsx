import { useRef, useState } from 'react'
import { EmptyTable, Icon } from '@leadsghr/ui'
import { analyzeSpam, BODY_LIMIT, rewriteSpamDraft, SUBJECT_LIMIT, type AttachmentMeta, type SpamAnalysis, type SpamFinding, type RewriteSuggestion } from './spam-engine-data'

function HighlightedText({ text, matches }: { text: string; matches: SpamFinding[] }) {
  const segments: React.ReactNode[] = []
  let cursor = 0
  for (const item of matches.filter((match) => match.start !== undefined && match.end !== undefined).sort((a, b) => a.start! - b.start!)) {
    if (item.start! < cursor) continue
    segments.push(text.slice(cursor, item.start))
    segments.push(<mark key={item.id} title={`${item.title}: +${item.points} points`}>{text.slice(item.start, item.end)}</mark>)
    cursor = item.end!
  }
  segments.push(text.slice(cursor))
  return <div className="la-spam-highlight-text">{segments}</div>
}

export function EmailSpamEnginePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const [result, setResult] = useState<SpamAnalysis | null>(null)
  const [suggestion, setSuggestion] = useState<RewriteSuggestion | null>(null)
  const [message, setMessage] = useState('')
  function check() {
    if (!subject.trim() && !body.trim()) { setMessage('Enter a subject or message first.'); setResult(null); return }
    setResult(analyzeSpam(subject, body, attachments))
    setSuggestion(null)
    setMessage('Analysis complete. This is a content risk check, not a delivery prediction.')
  }
  function revise() {
    const next = rewriteSpamDraft(subject, body, attachments)
    setSuggestion(next)
    setMessage(next.subject === subject && next.body === body ? 'No automatic phrase replacements found. Review the findings for manual improvements.' : 'Review the suggested draft before applying it. Check its meaning and factual accuracy.')
  }
  function apply() {
    if (!suggestion) return
    setSubject(suggestion.subject)
    setBody(suggestion.body)
    setResult(analyzeSpam(suggestion.subject, suggestion.body, attachments))
    setSuggestion(null)
    setMessage('Suggested draft applied. Review it before sending.')
  }
  const hasDraft = Boolean(subject.trim() || body.trim())
  return <div className="la-spam-page">
    <div className="la-spam-intro"><div><h2>Email Spam Check</h2><p>Check your draft for risky wording and review a clearer version.</p></div><span className="la-spam-local-badge"><span aria-hidden="true" /> Private on this computer</span></div>
    <div className="la-spam-layout">
      <section className="la-spam-panel" aria-label="Email draft">
        <div className="la-spam-panel-title"><span className="la-spam-panel-icon"><Icon name="mail" size={18}/></span><div><h3>Email draft</h3><p>Write or paste the message you want to check.</p></div></div>
        <label className="la-spam-field"><span>Subject <small>{subject.length}/{SUBJECT_LIMIT} characters</small></span><input value={subject} maxLength={SUBJECT_LIMIT} onChange={(event) => { setSubject(event.target.value); setResult(null); setSuggestion(null) }} placeholder="A clear subject for your message" /></label>
        <label className="la-spam-field la-spam-body"><span>Message <small>{body.length}/{BODY_LIMIT} characters</small></span><textarea value={body} maxLength={BODY_LIMIT} onChange={(event) => { setBody(event.target.value); setResult(null); setSuggestion(null) }} placeholder="Write or paste your email body here..." /></label>
        <div className="la-spam-attachments"><input ref={fileInputRef} type="file" multiple aria-label="Choose attachments for name and size check" onChange={(event) => { setAttachments(Array.from(event.target.files ?? []).map((file) => ({ filename: file.name, sizeKb: Math.round(file.size / 1024) }))); setResult(null); setSuggestion(null) }} /><button type="button" onClick={() => fileInputRef.current?.click()}><Icon name="add" size={15}/> {attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? '' : 's'}` : 'Add attachment metadata'}</button><small>Names and sizes only. Files stay on your computer.</small>{attachments.length > 0 && <div className="la-spam-attachment-list">{attachments.map((item, index) => <span key={`${item.filename}-${index}`} title={item.filename}>{item.filename} · {item.sizeKb} KB</span>)}</div>}</div>
        <div className="la-spam-actions"><button type="button" className="la-spam-primary" onClick={check} disabled={!hasDraft}><Icon name="shield" size={16}/> Check content</button><button type="button" onClick={() => { setSubject(''); setBody(''); setAttachments([]); if (fileInputRef.current) fileInputRef.current.value = ''; setResult(null); setSuggestion(null); setMessage('') }}>Clear draft</button></div>
      </section>
      <section className="la-spam-panel la-spam-results" aria-label="Spam check results">
        <div className="la-spam-panel-title la-spam-result-heading"><span className="la-spam-panel-icon"><Icon name="shield" size={18}/></span><div><h3>Content analysis</h3><p>Findings appear after you check the draft.</p></div>{result && <span className={`la-spam-level la-spam-level-${result.level.toLowerCase()}`}>{result.level} risk · {result.score}/100</span>}</div>
        {result ? <>
          <p className="la-spam-disclaimer">This is a local content risk heuristic, not spam probability. Sender reputation, authentication, engagement, and sending behavior are not measured.</p>
          <div className="la-spam-metrics"><span>{result.phraseMatches} flagged phrases</span><span>{result.linkCount} links</span><span>{result.findings.length} findings</span></div>
          {result.phraseMatches > 0 && <details className="la-spam-preview"><summary>View highlighted draft</summary><strong>Subject</strong><HighlightedText text={subject} matches={result.findings.filter((item) => item.location === 'Subject')} /><strong>Message</strong><HighlightedText text={body} matches={result.findings.filter((item) => item.location === 'Body')} /></details>}
          {result.findings.length ? <div className="la-spam-findings">{result.findings.map((item) => <div key={item.id} className="la-spam-finding"><span className={`la-spam-severity la-spam-severity-${item.severity}`}>{item.severity}</span><div><strong>{item.title} <small>· {item.location} · +{item.points} points</small></strong><p>{item.detail}</p>{item.excerpt && <code>{item.excerpt}</code>}</div></div>)}</div> : <p className="la-spam-clean">No content issues matched these rules. Delivery still depends on other factors.</p>}
          <button type="button" className="la-spam-primary" onClick={revise}>Suggest clearer wording</button>
          {suggestion && <div className="la-spam-suggestion"><h4>Suggested draft</h4><p>Content risk: {suggestion.before.score} → {analyzeSpam(suggestion.subject, suggestion.body, attachments).score}. Review meaning, links, and claims before applying.</p><label>Subject<input value={suggestion.subject} maxLength={SUBJECT_LIMIT} onChange={(event) => setSuggestion({ ...suggestion, subject: event.target.value })} /></label><label>Message<textarea value={suggestion.body} maxLength={BODY_LIMIT} onChange={(event) => setSuggestion({ ...suggestion, body: event.target.value })} /></label>{suggestion.changes.length > 0 && <details><summary>{suggestion.changes.length} suggested changes</summary><ul>{suggestion.changes.map((change, index) => <li key={index}>{change}</li>)}</ul></details>}<button type="button" onClick={apply}>Apply to draft</button></div>}
        </> : <EmptyTable title="Ready to check" description="Add a subject and message, then check the content to see highlighted phrases and suggestions." />}
      </section>
    </div>
    {message && <p className="la-spam-message" role="status">{message}</p>}
  </div>
}
