import { z } from 'zod'
import { SEARCH_SPEEDS, SEARCH_TIMING_LIMITS, SEARCH_TIMING_PRESETS } from './search-timing'

export const leadSchema = z.object({
  id: z.string().optional(),
  orgId: z.string(),
  name: z.string().min(1),
  domain: z.string().optional(),
  website: z.string().url().optional(),
  niche: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  emails: z.array(z.string().email()).default([]),
  phones: z.array(z.string()).default([]),
  sourceUrl: z.string().url(),
  seenAt: z.string().datetime(),
})
export type Lead = z.infer<typeof leadSchema>

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  plan: z.enum(['explorer', 'starter', 'professional', 'agency']),
})
export type Organization = z.infer<typeof organizationSchema>

export const membershipSchema = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']),
})
export type Membership = z.infer<typeof membershipSchema>

export const runRequestSchema = z.object({
  orgId: z.string().uuid(),
  niche: z.string().min(2),
  country: z.string().min(2),
  cities: z.array(z.string()).min(1),
  sources: z.array(z.string()).min(1),
})
export type RunRequest = z.infer<typeof runRequestSchema>

export const scanRequestSchema = z.object({ url: z.string().url() })

export const nicheKeywordEditsSchema = z.object({
  addedKeywords: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  removedKeywords: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  addedNegativeKeywords: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  removedNegativeKeywords: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
})
export type NicheKeywordEdits = z.infer<typeof nicheKeywordEditsSchema>

export const searchCriteriaSchema = z.object({
  nicheKeywordEdits: z.record(z.string(), nicheKeywordEditsSchema).default({}),
  customNiches: z.array(z.string().trim().min(1).max(120)).max(500),
  selectedNiches: z.array(z.string().trim().min(1).max(120)).max(500),
  selectedStates: z.array(z.string().trim().min(1).max(80)).max(50),
  selectedLocations: z.array(z.string().trim().min(1).max(160)).max(32000),
})
export type SearchCriteria = z.infer<typeof searchCriteriaSchema>

/** Display size (zoom) limits, in percent. Ctrl + / Ctrl - step by DISPLAY_SIZE_STEP; Ctrl 0 resets to 100. */
export const DISPLAY_SIZE_MIN = 70
export const DISPLAY_SIZE_MAX = 200
export const DISPLAY_SIZE_STEP = 10
export const clampDisplaySize = (value: number) =>
  Math.min(
    DISPLAY_SIZE_MAX,
    Math.max(DISPLAY_SIZE_MIN, Math.round(value / DISPLAY_SIZE_STEP) * DISPLAY_SIZE_STEP),
  )

/** Font size limits, in percent. Only type scales; spacing and controls stay the same. */
export const FONT_SIZE_MIN = 80
export const FONT_SIZE_MAX = 150
export const FONT_SIZE_STEP = 10
export const clampFontSize = (value: number) =>
  Math.min(
    FONT_SIZE_MAX,
    Math.max(FONT_SIZE_MIN, Math.round(value / FONT_SIZE_STEP) * FONT_SIZE_STEP),
  )

const L = SEARCH_TIMING_LIMITS
const N = SEARCH_TIMING_PRESETS.normal
export const desktopPreferencesSchema = z.object({
  /** Light or dark look; `system` follows the Windows setting (Settings → Preferences → Appearance). */
  theme: z.enum(['light', 'dark', 'system']).default('light'),
  /** Display size in percent (the window zoom), also changed with Ctrl + / Ctrl - / Ctrl 0 (Settings → Preferences → Appearance). */
  displaySize: z.number().int().min(70).max(200).default(100),
  /** Font size in percent. Scales type only (Settings → Preferences → Appearance). */
  fontSize: z.number().int().min(80).max(150).default(100),
  showCrawlerPreview: z.boolean(),
  crawlerContactOnly: z.boolean().default(true),
  crawlerEmailSource: z.enum(['leadsghr', 'email-hunter']).default('leadsghr'),
  crawlerFetchMethod: z.enum(['browser', 'http']).default('browser'),
  crawlerConcurrentPages: z.number().int().min(1).max(8).default(2),
  showChromeDuringSearch: z.boolean(),
  searchGoogleMaps: z.boolean().default(true),
  /** Also read Google Search's business list (the Places page behind "More businesses"); see AGENTS.md rule 5. */
  searchGooglePlaces: z.boolean().default(false),
  useNicheKeywords: z.boolean().default(false),
  showListingsWithoutWebsite: z.boolean().default(false),
  scanPublicWebsites: z.boolean().default(false),
  includeCompanyName: z.boolean(),
  includeWebsite: z.boolean(),
  includePhone: z.boolean(),
  includeAddress: z.boolean(),
  includeLocation: z.boolean(),
  /** Search timing (Preferences → Search): a preset or `custom`, and the pauses it sets (packages/schemas/src/search-timing.ts). */
  searchSpeed: z.enum(SEARCH_SPEEDS).default('normal'),
  searchListingPauseSec: z.number().min(L.listingPauseSec[0]).max(L.listingPauseSec[1]).default(N.listingPauseSec),
  searchScrollPauseSec: z.number().min(L.scrollPauseSec[0]).max(L.scrollPauseSec[1]).default(N.scrollPauseSec),
  searchMorePlacesPauseSec: z.number().min(L.morePlacesPauseSec[0]).max(L.morePlacesPauseSec[1]).default(N.morePlacesPauseSec),
  searchScrollRounds: z.number().int().min(L.scrollRounds[0]).max(L.scrollRounds[1]).default(N.scrollRounds),
  searchPagePauseMinSec: z.number().min(L.pagePauseMinSec[0]).max(L.pagePauseMinSec[1]).default(N.pagePauseMinSec),
  searchPagePauseMaxSec: z.number().min(L.pagePauseMaxSec[0]).max(L.pagePauseMaxSec[1]).default(N.pagePauseMaxSec),
  searchPagesPerLocation: z.number().int().min(L.pagesPerLocation[0]).max(L.pagesPerLocation[1]).default(N.pagesPerLocation),
  searchLocationPauseSec: z.number().min(L.locationPauseSec[0]).max(L.locationPauseSec[1]).default(N.locationPauseSec),
  searchBreakEvery: z.number().int().min(L.breakEvery[0]).max(L.breakEvery[1]).default(N.breakEvery),
  searchBreakMinutes: z.number().min(L.breakMinutes[0]).max(L.breakMinutes[1]).default(N.breakMinutes),
  emailVerifyCheckSyntax: z.boolean().default(true),
  emailVerifyCheckDomain: z.boolean().default(true),
  emailVerifyCheckMx: z.boolean().default(true),
  emailVerifyCheckSmtp: z.boolean().default(true),
  emailVerifyCheckDisposable: z.boolean().default(true),
  emailVerifyCheckRoleBased: z.boolean().default(true),
  emailVerifyCheckCatchAll: z.boolean().default(true),
  emailVerifyMailFrom: z.string().trim().min(3).max(254).default('verify@example.com'),
  emailVerifyEhlo: z.string().trim().min(1).max(255).default('verify.example.com'),
  emailVerifyPerSession: z.number().int().min(1).max(40).default(8),
  emailVerifyPaceMs: z.number().int().min(0).max(5000).default(400),
  /** Download new LeadsGhr versions in the background (installed app only). Off: only show that one is available. */
  autoUpdate: z.boolean().default(true),
})
export type DesktopPreferences = z.infer<typeof desktopPreferencesSchema>
export const defaultDesktopPreferences: DesktopPreferences = {
  theme: 'light',
  displaySize: 100,
  fontSize: 100,
  showCrawlerPreview: true,
  crawlerContactOnly: true,
  crawlerEmailSource: 'leadsghr',
  crawlerFetchMethod: 'browser',
  crawlerConcurrentPages: 2,
  showChromeDuringSearch: true,
  searchGoogleMaps: true,
  searchGooglePlaces: false,
  useNicheKeywords: false,
  showListingsWithoutWebsite: false,
  scanPublicWebsites: false,
  includeCompanyName: true,
  includeWebsite: true,
  includePhone: true,
  includeAddress: true,
  includeLocation: true,
  searchSpeed: 'normal',
  searchListingPauseSec: SEARCH_TIMING_PRESETS.normal.listingPauseSec,
  searchScrollPauseSec: SEARCH_TIMING_PRESETS.normal.scrollPauseSec,
  searchMorePlacesPauseSec: SEARCH_TIMING_PRESETS.normal.morePlacesPauseSec,
  searchScrollRounds: SEARCH_TIMING_PRESETS.normal.scrollRounds,
  searchPagePauseMinSec: SEARCH_TIMING_PRESETS.normal.pagePauseMinSec,
  searchPagePauseMaxSec: SEARCH_TIMING_PRESETS.normal.pagePauseMaxSec,
  searchPagesPerLocation: SEARCH_TIMING_PRESETS.normal.pagesPerLocation,
  searchLocationPauseSec: SEARCH_TIMING_PRESETS.normal.locationPauseSec,
  searchBreakEvery: SEARCH_TIMING_PRESETS.normal.breakEvery,
  searchBreakMinutes: SEARCH_TIMING_PRESETS.normal.breakMinutes,
  emailVerifyCheckSyntax: true,
  emailVerifyCheckDomain: true,
  emailVerifyCheckMx: true,
  emailVerifyCheckSmtp: true,
  emailVerifyCheckDisposable: true,
  emailVerifyCheckRoleBased: true,
  emailVerifyCheckCatchAll: true,
  emailVerifyMailFrom: 'verify@example.com',
  emailVerifyEhlo: 'verify.example.com',
  emailVerifyPerSession: 8,
  emailVerifyPaceMs: 400,
  autoUpdate: true,
}

export const emailVerifyCheckFlagsSchema = z.object({
  checkSyntax: z.boolean().default(true),
  checkDomain: z.boolean().default(true),
  checkMx: z.boolean().default(true),
  checkSmtp: z.boolean().default(true),
  checkDisposable: z.boolean().default(true),
  checkRoleBased: z.boolean().default(true),
  checkCatchAll: z.boolean().default(true),
})
export type EmailVerifyCheckFlags = z.infer<typeof emailVerifyCheckFlagsSchema>

/** Catch-all needs SMTP; SMTP needs MX; MX needs Domain. */
export function normalizeEmailVerifyChecks<T extends EmailVerifyCheckFlags>(flags: T): T {
  const next = { ...flags }
  if (next.checkCatchAll) next.checkSmtp = true
  if (next.checkSmtp) next.checkMx = true
  if (next.checkMx) next.checkDomain = true
  if (!next.checkDomain) {
    next.checkMx = false
    next.checkSmtp = false
    next.checkCatchAll = false
  } else if (!next.checkMx) {
    next.checkSmtp = false
    next.checkCatchAll = false
  } else if (!next.checkSmtp) {
    next.checkCatchAll = false
  }
  return next
}

export function emailVerifyChecksFromPreferences(
  preferences: DesktopPreferences,
): EmailVerifyCheckFlags {
  return normalizeEmailVerifyChecks({
    checkSyntax: preferences.emailVerifyCheckSyntax,
    checkDomain: preferences.emailVerifyCheckDomain,
    checkMx: preferences.emailVerifyCheckMx,
    checkSmtp: preferences.emailVerifyCheckSmtp,
    checkDisposable: preferences.emailVerifyCheckDisposable,
    checkRoleBased: preferences.emailVerifyCheckRoleBased,
    checkCatchAll: preferences.emailVerifyCheckCatchAll,
  })
}

export function applyEmailVerifyChecksToPreferences(
  preferences: DesktopPreferences,
  patch: Partial<
    Pick<
      DesktopPreferences,
      | 'emailVerifyCheckSyntax'
      | 'emailVerifyCheckDomain'
      | 'emailVerifyCheckMx'
      | 'emailVerifyCheckSmtp'
      | 'emailVerifyCheckDisposable'
      | 'emailVerifyCheckRoleBased'
      | 'emailVerifyCheckCatchAll'
    >
  >,
): DesktopPreferences {
  const merged = { ...preferences, ...patch }
  const checks = normalizeEmailVerifyChecks({
    checkSyntax: merged.emailVerifyCheckSyntax,
    checkDomain: merged.emailVerifyCheckDomain,
    checkMx: merged.emailVerifyCheckMx,
    checkSmtp: merged.emailVerifyCheckSmtp,
    checkDisposable: merged.emailVerifyCheckDisposable,
    checkRoleBased: merged.emailVerifyCheckRoleBased,
    checkCatchAll: merged.emailVerifyCheckCatchAll,
  })
  return {
    ...merged,
    emailVerifyCheckSyntax: checks.checkSyntax,
    emailVerifyCheckDomain: checks.checkDomain,
    emailVerifyCheckMx: checks.checkMx,
    emailVerifyCheckSmtp: checks.checkSmtp,
    emailVerifyCheckDisposable: checks.checkDisposable,
    emailVerifyCheckRoleBased: checks.checkRoleBased,
    emailVerifyCheckCatchAll: checks.checkCatchAll,
  }
}

export const mapsQuerySchema = z.string().trim().min(2).max(260)

export const mapsScanSchema = z.object({
  query: mapsQuerySchema,
  location: z.string().trim().min(2).max(160),
})

export const preparedCrawlSearchSchema = z.object({
  niche: z.string().trim().min(1).max(120),
  term: z.string().trim().min(1).max(120),
  place: z.string().trim().min(1).max(160),
  query: mapsQuerySchema,
})
export type PreparedCrawlSearch = z.infer<typeof preparedCrawlSearchSchema>
/**
 * Where a result row came from. "Google Search" is the business list behind Google Search's "More businesses"
 * (the Places page); "+ website" is added once the business's own website has been checked for emails.
 */
export const CRAWL_ROW_SOURCES = [
  'Maps',
  'Website',
  'Maps + website',
  'Google Search',
  'Google Search + website',
  'Maps + Google Search',
  'Maps + Google Search + website',
] as const
export type CrawlRowSource = (typeof CRAWL_ROW_SOURCES)[number]
/** Combines sources (for example a Maps row also found in Google Search, then its website checked) into one value. */
export function combineSources(...sources: CrawlRowSource[]): CrawlRowSource {
  const maps = sources.some((source) => source.startsWith('Maps'))
  const search = sources.some((source) => source.includes('Google Search'))
  const website = sources.some((source) => /website$/i.test(source))
  if (!maps && !search) return 'Website'
  const parts = [maps && 'Maps', search && 'Google Search', website && 'website'].filter(Boolean)
  return parts.join(' + ') as CrawlRowSource
}
/** The source after the business's website was checked: keeps where the listing came from and adds "website". */
export const withWebsiteSource = (source: CrawlRowSource): CrawlRowSource =>
  combineSources(source, 'Website')
export const crawlRowSchema = z.object({
  id: z.string().min(1).max(500),
  niche: z.string().max(120).optional(),
  name: z.string().max(500),
  website: z.string().max(2000),
  phone: z.string().max(200),
  location: z.string().max(200),
  address: z.string().max(1000),
  mapsUrl: z.string().max(2000),
  source: z.enum(CRAWL_ROW_SOURCES),
  emails: z.array(z.string()).max(1000),
  emailsScanned: z.boolean(),
})
export type CrawlRow = z.infer<typeof crawlRowSchema>
export const pipelineProviderSchema = z.enum(['google-maps', 'google', 'facebook', 'linkedin'])
export type PipelineProvider = z.infer<typeof pipelineProviderSchema>
export const createCrawlRunSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  provider: pipelineProviderSchema.default('google-maps'),
  kind: z.enum(['pipeline', 'search']).default('search'),
  criteria: searchCriteriaSchema,
  preferences: desktopPreferencesSchema,
  searches: z.array(preparedCrawlSearchSchema).min(1).max(100000),
  stateStartNumber: z.number().int().min(1).max(50),
  stateEndNumber: z.number().int().min(1).max(50),
})
export type CreateCrawlRun = z.infer<typeof createCrawlRunSchema>
export const crawlRunIdSchema = z.string().uuid()
export const crawlRunProgressSchema = z.object({
  id: crawlRunIdSchema,
  nextQueryIndex: z.number().int().min(0).max(100000),
  status: z.enum(['running', 'stopped', 'completed', 'failed']),
  error: z.string().max(2000).optional(),
})
export const crawlRunRowInputSchema = z.object({ id: crawlRunIdSchema, row: crawlRowSchema })
export type CrawlRunSummary = {
  id: string
  name: string
  provider: PipelineProvider
  kind: 'pipeline' | 'search'
  niches: string[]
  states: string[]
  stateStartNumber: number
  stateEndNumber: number
  startedAt: string
  finishedAt: string | null
  status: 'running' | 'stopped' | 'completed' | 'failed'
  nextQueryIndex: number
  totalQueries: number
  entryCount: number
  latestFileName: string | null
  latestFileSize: number | null
  latestFilePath: string | null
  /** Why the run stopped, or which searches were skipped. */ error: string | null
}
export type CrawlExport = {
  id: string
  runId: string
  fileName: string
  filePath: string
  fileSize: number
  entryCount: number
  exportedAt: string
}
export type CrawlRunDetail = CrawlRunSummary & {
  criteria: SearchCriteria
  preferences: DesktopPreferences
  searches: PreparedCrawlSearch[]
  rows: CrawlRow[]
}

export const emailVerifyStatusSchema = z.enum(['valid', 'risky', 'invalid'])
export type EmailVerifyStatus = z.infer<typeof emailVerifyStatusSchema>
export const EMAIL_VERIFY_CONCURRENCY_MIN = 1
export const EMAIL_VERIFY_CONCURRENCY_MAX = 20
export const EMAIL_VERIFY_CONCURRENCY_DEFAULT = 5
export const emailVerifyRequestSchema = z
  .object({
    emails: z.array(z.string().trim().min(1).max(300)).min(1).max(50000),
    concurrency: z
      .number()
      .int()
      .min(EMAIL_VERIFY_CONCURRENCY_MIN)
      .max(EMAIL_VERIFY_CONCURRENCY_MAX)
      .default(EMAIL_VERIFY_CONCURRENCY_DEFAULT),
    checkSyntax: z.boolean().default(true),
    checkDomain: z.boolean().default(true),
    checkMx: z.boolean().default(true),
    checkSmtp: z.boolean().default(true),
    checkDisposable: z.boolean().default(true),
    checkRoleBased: z.boolean().default(true),
    checkCatchAll: z.boolean().default(true),
    mailFrom: z.string().trim().min(3).max(254).default('verify@example.com'),
    ehlo: z.string().trim().min(1).max(255).default('verify.example.com'),
    perSession: z.number().int().min(1).max(40).default(8),
    paceMs: z.number().int().min(0).max(5000).default(400),
  })
  .transform((value) => {
    const checks = normalizeEmailVerifyChecks({
      checkSyntax: value.checkSyntax,
      checkDomain: value.checkDomain,
      checkMx: value.checkMx,
      checkSmtp: value.checkSmtp,
      checkDisposable: value.checkDisposable,
      checkRoleBased: value.checkRoleBased,
      checkCatchAll: value.checkCatchAll,
    })
    return { ...value, ...checks }
  })
export type EmailVerifyRequest = z.infer<typeof emailVerifyRequestSchema>
export const emailVerifyChecksSchema = z.object({
  syntax: z.boolean(),
  domain: z.boolean(),
  mx: z.boolean(),
  smtp: z.enum(['accepted', 'rejected', 'temp', 'blocked', 'skipped', 'unverifiable']),
  disposable: z.boolean(),
  roleBased: z.boolean(),
  catchAll: z.boolean(),
})
export type EmailVerifyChecks = z.infer<typeof emailVerifyChecksSchema>
export const emailVerifyResultSchema = z.object({
  email: z.string().min(1).max(320),
  status: emailVerifyStatusSchema,
  reason: z.string().max(500),
  code: z.string().max(40).optional(),
  confidence: z.number().int().min(0).max(100),
  checks: emailVerifyChecksSchema,
  mxHost: z.string().max(255).optional(),
  smtpCode: z.number().int().optional(),
})
export type EmailVerifyResult = z.infer<typeof emailVerifyResultSchema>
export const emailVerifyJobIdSchema = z.string().uuid()

export * from './preferences-file'
export * from './email-templates'
export * from './scraper'
export * from './search-timing'
