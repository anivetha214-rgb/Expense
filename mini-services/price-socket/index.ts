/**
 * FarmPrice AI — real-time price broadcast service (socket.io)
 * ------------------------------------------------------------
 * Polls the Next.js /api/prices/live tick (which also runs the alert
 * engine) every 8 s and broadcasts:
 *   - "price-tick"  { ts, prices }                 to everyone
 *   - "alerts"      { notifications }              to everyone (client filters by deviceId)
 *
 * Path is always "/" so the Caddy gateway can forward `/?XTransformPort=3030`.
 */
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3030
const NEXT_LIVE_URL = process.env.NEXT_LIVE_URL || 'http://127.0.0.1:3000/api/prices/live'

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, clients: io.engine.clientsCount }))
    return
  }
  res.writeHead(404)
  res.end()
})

const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

let lastPayload: { prices: unknown[]; triggered: unknown[]; ts: number } | null = null

async function tick() {
  try {
    const res = await fetch(NEXT_LIVE_URL, { cache: 'no-store' as RequestCache })
    if (!res.ok) return
    const data = (await res.json()) as { prices: unknown[]; triggered: unknown[]; ts: number }
    lastPayload = data
    io.emit('price-tick', { ts: data.ts, prices: data.prices })
    if (Array.isArray(data.triggered) && data.triggered.length > 0) {
      io.emit('alerts', { notifications: data.triggered })
    }
  } catch {
    // Next.js may be restarting; ignore and retry on next interval
  }
}

io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`)
  if (lastPayload) {
    socket.emit('price-tick', { ts: lastPayload.ts, prices: lastPayload.prices })
  }
  socket.on('disconnect', () => console.log(`[socket] client disconnected: ${socket.id}`))
  socket.on('error', (err) => console.error(`[socket] error (${socket.id}):`, err))
})

setInterval(tick, 8000)
void tick()

httpServer.listen(PORT, () => {
  console.log(`[socket] price broadcast service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
