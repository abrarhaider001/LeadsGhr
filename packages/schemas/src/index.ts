import { z } from 'zod'

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

export const desktopPreferencesSchema = z.object({
  showCrawlerPreview: z.boolean(),
  crawlerContactOnly: z.boolean().default(true),
  crawlerEmailSource: z.enum(['leadsghr', 'email-hunter']).default('leadsghr'),
  crawlerFetchMethod: z.enum(['browser', 'http']).default('browser'),
  crawlerConcurrentPages: z.number().int().min(1).max(8).default(2),
  showChromeDuringSearch: z.boolean(),
  searchGoogleMaps: z.boolean().default(true),
  useNicheKeywords: z.boolean().default(false),
  showListingsWithoutWebsite: z.boolean().default(false),
  scanPublicWebsites: z.boolean().default(false),
  includeCompanyName: z.boolean(),
  includeWebsite: z.boolean(),
  includePhone: z.boolean(),
  includeAddress: z.boolean(),
  includeLocation: z.boolean(),
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
})
export type DesktopPreferences = z.infer<typeof desktopPreferencesSchema>
export const defaultDesktopPreferences: DesktopPreferences = {
  showCrawlerPreview: true,
  crawlerContactOnly: true,
  crawlerEmailSource: 'leadsghr',
  crawlerFetchMethod: 'browser',
  crawlerConcurrentPages: 2,
  showChromeDuringSearch: true,
  searchGoogleMaps: true,
  useNicheKeywords: false,
  showListingsWithoutWebsite: false,
  scanPublicWebsites: false,
  includeCompanyName: true,
  includeWebsite: true,
  includePhone: true,
  includeAddress: true,
  includeLocation: true,
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

export function emailVerifyChecksFromPreferences(preferences: DesktopPreferences): EmailVerifyCheckFlags {
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
  patch: Partial<Pick<DesktopPreferences,
    | 'emailVerifyCheckSyntax'
    | 'emailVerifyCheckDomain'
    | 'emailVerifyCheckMx'
    | 'emailVerifyCheckSmtp'
    | 'emailVerifyCheckDisposable'
    | 'emailVerifyCheckRoleBased'
    | 'emailVerifyCheckCatchAll'
  >>,
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

export const mapsScanSchema = z.object({ query: mapsQuerySchema, location: z.string().trim().min(2).max(160) })

export const preparedCrawlSearchSchema = z.object({ niche: z.string().trim().min(1).max(120), term: z.string().trim().min(1).max(120), place: z.string().trim().min(1).max(160), query: mapsQuerySchema })
export type PreparedCrawlSearch = z.infer<typeof preparedCrawlSearchSchema>
export const crawlRowSchema = z.object({ id: z.string().min(1).max(500), niche: z.string().max(120).optional(), name: z.string().max(500), website: z.string().max(2000), phone: z.string().max(200), location: z.string().max(200), address: z.string().max(1000), mapsUrl: z.string().max(2000), source: z.enum(['Maps', 'Website', 'Maps + website']), emails: z.array(z.string()).max(1000), emailsScanned: z.boolean() })
export type CrawlRow = z.infer<typeof crawlRowSchema>
export const pipelineProviderSchema = z.enum(['google-maps', 'google', 'facebook', 'linkedin'])
export type PipelineProvider = z.infer<typeof pipelineProviderSchema>
export const createCrawlRunSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), provider: pipelineProviderSchema.default('google-maps'), kind: z.enum(['pipeline', 'search']).default('search'), criteria: searchCriteriaSchema, preferences: desktopPreferencesSchema, searches: z.array(preparedCrawlSearchSchema).min(1).max(100000), stateStartNumber: z.number().int().min(1).max(50), stateEndNumber: z.number().int().min(1).max(50) })
export type CreateCrawlRun = z.infer<typeof createCrawlRunSchema>
export const crawlRunIdSchema = z.string().uuid()
export const crawlRunProgressSchema = z.object({ id: crawlRunIdSchema, nextQueryIndex: z.number().int().min(0).max(100000), status: z.enum(['running', 'stopped', 'completed', 'failed']), error: z.string().max(2000).optional() })
export const crawlRunRowInputSchema = z.object({ id: crawlRunIdSchema, row: crawlRowSchema })
export type CrawlRunSummary = { id: string; name: string; provider: PipelineProvider; kind: 'pipeline' | 'search'; niches: string[]; states: string[]; stateStartNumber: number; stateEndNumber: number; startedAt: string; finishedAt: string | null; status: 'running' | 'stopped' | 'completed' | 'failed'; nextQueryIndex: number; totalQueries: number; entryCount: number; latestFileName: string | null; latestFileSize: number | null; latestFilePath: string | null }
export type CrawlExport = { id: string; runId: string; fileName: string; filePath: string; fileSize: number; entryCount: number; exportedAt: string }
export type CrawlRunDetail = CrawlRunSummary & { criteria: SearchCriteria; preferences: DesktopPreferences; searches: PreparedCrawlSearch[]; rows: CrawlRow[] }

export const emailVerifyStatusSchema = z.enum(['valid', 'risky', 'invalid'])
export type EmailVerifyStatus = z.infer<typeof emailVerifyStatusSchema>
export const EMAIL_VERIFY_CONCURRENCY_MIN = 1
export const EMAIL_VERIFY_CONCURRENCY_MAX = 20
export const EMAIL_VERIFY_CONCURRENCY_DEFAULT = 5
export const emailVerifyRequestSchema = z.object({
  emails: z.array(z.string().trim().min(1).max(300)).min(1).max(50000),
  concurrency: z.number().int().min(EMAIL_VERIFY_CONCURRENCY_MIN).max(EMAIL_VERIFY_CONCURRENCY_MAX).default(EMAIL_VERIFY_CONCURRENCY_DEFAULT),
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
}).transform((value) => {
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

/** Local-only email open tracking demo. These records are not sent messages. */
export const localTrackingCreateSchema = z.object({
  recipient: z.email().max(320),
  subject: z.string().trim().min(1).max(200),
})
export const localTrackingIdSchema = z.uuid()
export type LocalTrackingRecord = {
  id: string
  recipient: string
  subject: string
  createdAt: string
  firstOpenedAt: string | null
  lastOpenedAt: string | null
  openCount: number
}
