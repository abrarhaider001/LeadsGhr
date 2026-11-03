import type { NicheKeywordEdits, SearchCriteria } from '@leadsghr/schemas'
import starter from '../data/niche-packs.json'

export type NichePack = { name: string; category: string; searchTerms: string[]; relatedServices: string[]; negativeKeywords: string[]; websitePhrases: string[] }
export const starterPacks: NichePack[] = starter.packs
export const nicheCategories = [...new Set(starterPacks.map((pack) => pack.category)), 'Custom']
export const emptyNicheEdits = (): NicheKeywordEdits => ({ addedKeywords: [], removedKeywords: [], addedNegativeKeywords: [], removedNegativeKeywords: [] })
const key = (value: string) => value.trim().toLocaleLowerCase()
export const uniqueTerms = (values: string[]) => [...new Map(values.map((value) => [key(value), value.trim()] as const).filter(([normalized]) => normalized)).values()]

export function getNichePack(name: string, criteria: SearchCriteria): NichePack {
  const base = starterPacks.find((pack) => key(pack.name) === key(name)) ?? { name, category: 'Custom', searchTerms: [name], relatedServices: [], negativeKeywords: [], websitePhrases: [] }
  const edits = criteria.nicheKeywordEdits[name] ?? emptyNicheEdits()
  const removed = new Set(edits.removedKeywords.map(key))
  const negativeRemoved = new Set(edits.removedNegativeKeywords.map(key))
  return {
    ...base,
    searchTerms: uniqueTerms([...base.searchTerms, ...edits.addedKeywords]).filter((term) => !removed.has(key(term))),
    relatedServices: uniqueTerms(base.relatedServices).filter((term) => !removed.has(key(term))),
    negativeKeywords: uniqueTerms([...base.negativeKeywords, ...edits.addedNegativeKeywords]).filter((term) => !negativeRemoved.has(key(term))),
  }
}

export function compileNicheSelection(criteria: SearchCriteria) {
  const packs = criteria.selectedNiches.map((name) => getNichePack(name, criteria))
  return {
    packs,
    keywords: uniqueTerms(packs.flatMap((pack) => [...pack.searchTerms, ...pack.relatedServices])),
    negativeKeywords: uniqueTerms(packs.flatMap((pack) => pack.negativeKeywords)),
    websitePhrases: uniqueTerms(packs.flatMap((pack) => pack.websitePhrases)),
    searchTerms: uniqueTerms(packs.flatMap((pack) => pack.searchTerms)),
  }
}

export function updateNicheTerm(criteria: SearchCriteria, name: string, term: string, kind: 'keyword' | 'negative', action: 'add' | 'remove'): SearchCriteria {
  const normalized = term.trim().replace(/\s+/g, ' ')
  if (!normalized || normalized.length > 120) return criteria
  const edits = criteria.nicheKeywordEdits[name] ?? emptyNicheEdits()
  const base = starterPacks.find((pack) => key(pack.name) === key(name))
  const builtIn = kind === 'keyword' ? [...(base?.searchTerms ?? []), ...(base?.relatedServices ?? [])] : (base?.negativeKeywords ?? [])
  const addField = kind === 'keyword' ? 'addedKeywords' : 'addedNegativeKeywords'
  const removeField = kind === 'keyword' ? 'removedKeywords' : 'removedNegativeKeywords'
  const existsInBase = builtIn.some((value) => key(value) === key(normalized))
  const next = { ...edits,
    [addField]: action === 'add' && !existsInBase ? uniqueTerms([...edits[addField], normalized]) : edits[addField].filter((value) => key(value) !== key(normalized)),
    [removeField]: action === 'remove' && existsInBase ? uniqueTerms([...edits[removeField], normalized]) : edits[removeField].filter((value) => key(value) !== key(normalized)),
  }
  return { ...criteria, nicheKeywordEdits: { ...criteria.nicheKeywordEdits, [name]: next } }
}
