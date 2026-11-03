import PgBoss from 'pg-boss'
import type { QueueAdapter } from '@leadsghr/platform'

export class WebQueueAdapter implements QueueAdapter {
  constructor(private readonly boss: PgBoss) {}
  async enqueue<T>(name: string, payload: T): Promise<string> {
    const id = await this.boss.send(name, payload as object)
    if (!id) throw new Error('Queue did not accept the job')
    return id
  }
}
