import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { request } from 'undici'
import type { HttpAdapter, HttpResponse } from '@leadsghr/platform'

const userAgent = 'LeadsGhrBot/0.1 (+https://leadsghr.example/bot)'

function isPublicIp(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase()
    return !(
      value === '::1' ||
      value === '::' ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      value.startsWith('fe80') ||
      value.startsWith('::ffff:')
    )
  }
  return false
}

/** Server-only HTTP implementation. Keep crawl endpoints disabled until DNS pinning is added. */
export class WebHttpAdapter implements HttpAdapter {
  async get(
    input: string,
    options: { maxBytes?: number; timeoutMs?: number } = {},
  ): Promise<HttpResponse> {
    let url = new URL(input)
    const maxBytes = options.maxBytes ?? 2_000_000
    for (let redirects = 0; redirects <= 5; redirects++) {
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new Error('Unsupported URL')
      if (url.port && !['80', '443'].includes(url.port)) throw new Error('Unsupported port')
      const addresses = await lookup(url.hostname, { all: true })
      if (!addresses.length || addresses.some((entry) => !isPublicIp(entry.address)))
        throw new Error('Blocked address')
      const response = await request(url, {
        method: 'GET',
        headers: { 'user-agent': userAgent, accept: 'text/html,text/plain' },
        headersTimeout: options.timeoutMs ?? 15000,
        bodyTimeout: options.timeoutMs ?? 15000,
      })
      const location = response.headers.location
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && location) {
        await response.body.dump()
        url = new URL(String(location), url)
        continue
      }
      const contentType = String(response.headers['content-type'] ?? '')
      const advertisedSize = Number(response.headers['content-length'] ?? 0)
      if (
        advertisedSize > maxBytes ||
        (!contentType.includes('text/html') && !contentType.includes('text/plain'))
      ) {
        await response.body.dump()
        throw new Error('Unexpected content type or size')
      }
      const chunks: Uint8Array[] = []
      let size = 0
      for await (const chunk of response.body) {
        size += chunk.length
        if (size > maxBytes) throw new Error('Response too large')
        chunks.push(chunk)
      }
      return {
        url: url.toString(),
        status: response.statusCode,
        contentType,
        body: Buffer.concat(chunks).toString('utf8'),
      }
    }
    throw new Error('Too many redirects')
  }
}
