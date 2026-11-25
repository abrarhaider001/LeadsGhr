export interface NichePack {
  id: string
  keywords: string[]
  negativeKeywords: string[]
}

export function compileKeywords(packs: NichePack[]): NichePack {
  const unique = (values: string[]) => [
    ...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)),
  ]
  return {
    id: packs.map((pack) => pack.id).join('+'),
    keywords: unique(packs.flatMap((pack) => pack.keywords)),
    negativeKeywords: unique(packs.flatMap((pack) => pack.negativeKeywords)),
  }
}

export function registrableDomain(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  if (!hostname || hostname === 'localhost') throw new Error('A public domain is required')
  return hostname
}
