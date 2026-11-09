import dns from 'node:dns'
import { lookup, resolve4, resolveMx } from 'node:dns/promises'

const PUBLIC_DNS_SERVERS = ['8.8.8.8', '1.1.1.1']

function publicResolver() {
  const resolver = new dns.promises.Resolver()
  resolver.setServers(PUBLIC_DNS_SERVERS)
  return resolver
}

function isNullMx(records: { exchange: string; priority: number }[]) {
  return records.length === 1 && records[0].exchange.replace(/\.$/, '') === ''
}

function mxHosts(records: { exchange: string; priority: number }[]) {
  if (isNullMx(records)) return []
  return [...new Set(
    records
      .sort((a, b) => a.priority - b.priority)
      .map((record) => record.exchange.replace(/\.$/, ''))
      .filter(Boolean),
  )]
}

async function resolveMxRecords(domain: string): Promise<{ hosts: string[]; nullMx: boolean; found: boolean }> {
  try {
    const records = await resolveMx(domain)
    if (isNullMx(records)) return { hosts: [], nullMx: true, found: true }
    const hosts = mxHosts(records)
    if (hosts.length) return { hosts, nullMx: false, found: true }
  } catch {}
  try {
    const records = await publicResolver().resolveMx(domain)
    if (isNullMx(records)) return { hosts: [], nullMx: true, found: true }
    const hosts = mxHosts(records)
    return { hosts, nullMx: false, found: hosts.length > 0 }
  } catch {
    return { hosts: [], nullMx: false, found: false }
  }
}

async function resolveAddressFallback(domain: string): Promise<string[]> {
  try {
    if ((await resolve4(domain)).length) return [domain]
  } catch {}
  try {
    if ((await publicResolver().resolve4(domain)).length) return [domain]
  } catch {}
  try {
    await lookup(domain, { family: 4 })
    return [domain]
  } catch {
    return []
  }
}

export async function resolveDomain(domain: string): Promise<{ exists: boolean; hosts: string[]; nullMx: boolean }> {
  const mx = await resolveMxRecords(domain)
  if (mx.nullMx) return { exists: true, hosts: [], nullMx: true }
  if (mx.hosts.length) return { exists: true, hosts: mx.hosts, nullMx: false }
  const fallback = await resolveAddressFallback(domain)
  if (fallback.length) return { exists: true, hosts: fallback, nullMx: false }
  return { exists: mx.found, hosts: [], nullMx: false }
}
