import Fastify from 'fastify'
import { runRequestSchema } from '@leadsghr/schemas'

const server = Fastify({ logger: true })
server.get('/health', async () => ({ status: 'ok', service: 'leadsghr-api' }))
server.post('/runs/validate', async (request, reply) => {
  const parsed = runRequestSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid run request', issues: parsed.error.issues })
  return { valid: true, note: 'Validation only; authentication, quota checks and job submission are not enabled.' }
})

const port = Number(process.env.PORT ?? 4000)
server.listen({ port, host: '127.0.0.1' }).catch((error) => { server.log.error(error); process.exit(1) })
