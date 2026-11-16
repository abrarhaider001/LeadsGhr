import type { Recipient, SendRange } from './types'

export function parseRange(fromRaw: string, toRaw: string, total: number): SendRange {
  if (total < 1) throw new Error('Load a CSV with at least one email first.')
  const from = Number.parseInt(fromRaw, 10)
  const to = Number.parseInt(toRaw, 10)
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new Error('Range must use whole numbers.')
  if (from < 1 || to < 1) throw new Error('Range numbers start at 1.')
  if (from > to) throw new Error('Range start cannot be greater than range end.')
  if (to > total) throw new Error(`Range end cannot exceed ${total}.`)
  return { from, to }
}

export function sliceRecipients(recipients: Recipient[], range: SendRange): Recipient[] {
  return recipients.slice(range.from - 1, range.to).map((recipient, offset) => ({
    ...recipient,
    index: range.from + offset,
  }))
}
