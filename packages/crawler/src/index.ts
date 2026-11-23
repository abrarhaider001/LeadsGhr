import robotsParser from 'robots-parser'
import type { HttpAdapter } from '@leadsghr/platform'
import { extractContacts, type ExtractedContacts } from '@leadsghr/extract'

export interface CrawlResult extends ExtractedContacts {
  pages: string[]
  skipped: string[]
}
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Shared orchestration. The platform HttpAdapter enforces SSRF, redirects and credentials. */
export async function crawlPublicSite(
  http: HttpAdapter,
  siteUrl: string,
  userAgent: string,
  maxPages = 6,
): Promise<CrawlResult> {
  const origin = new URL(siteUrl).origin
  const robotsUrl = `${origin}/robots.txt`
  const robotsResponse = await http.get(robotsUrl)
  if (robotsResponse.status !== 200 && robotsResponse.status !== 404)
    throw new Error('Robots policy unavailable; crawl paused')
  const robots = robotsParser(robotsUrl, robotsResponse.status === 200 ? robotsResponse.body : '')
  const candidates = ['/', '/contact', '/about', '/team', '/locations', '/imprint']
  const result: CrawlResult = { emails: [], phones: [], socialUrls: [], pages: [], skipped: [] }
  for (const path of candidates.slice(0, maxPages)) {
    const url = new URL(path, origin).toString()
    if (!robots.isAllowed(url, userAgent)) {
      result.skipped.push(url)
      continue
    }
    const response = await http.get(url)
    if (
      [401, 403, 429, 503].includes(response.status) ||
      /captcha|unusual traffic|verify you are human|sign in to continue/i.test(
        response.body.slice(0, 10000),
      )
    ) {
      result.skipped.push(url)
      break
    }
    if (response.status === 200 && response.contentType.includes('text/html')) {
      const extracted = extractContacts(response.body)
      result.emails.push(...extracted.emails)
      result.phones.push(...extracted.phones)
      result.socialUrls.push(...extracted.socialUrls)
      result.pages.push(url)
    }
    await wait(Math.max(2000, (robots.getCrawlDelay(userAgent) ?? 0) * 1000))
  }
  result.emails = [...new Set(result.emails)]
  result.phones = [...new Set(result.phones)]
  result.socialUrls = [...new Set(result.socialUrls)]
  return result
}
