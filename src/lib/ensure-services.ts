// FarmPrice AI — service orchestration (server only)
// Ensures the DB is seeded and the Python Flask ML micro-service +
// socket.io price-broadcast service are running (self-healing across restarts).
import 'server-only'
import { spawn } from 'child_process'
import { openSync, appendFileSync } from 'fs'
import path from 'path'
import { ensureSeeded } from '@/lib/seed'

const ML_PORT = 5001
const SOCKET_PORT = 3030
const PYTHON = process.env.PYTHON_BIN || '/home/z/.venv/bin/python3'
const PROJECT_ROOT = process.cwd()

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(timer)
    return res
  } catch {
    return null
  }
}

export interface MlStatus {
  status: 'ready' | 'training' | 'offline'
  accuracy?: Record<string, number>
  model?: string
}

export async function getMlStatus(): Promise<MlStatus> {
  const res = await fetchWithTimeout(`http://127.0.0.1:${ML_PORT}/health`, 1200)
  if (res?.ok) {
    try {
      const data = await res.json()
      return { status: data.ready ? 'ready' : 'training', accuracy: data.accuracy, model: data.model }
    } catch { /* fallthrough */ }
  }
  return { status: 'offline' }
}

const spawnState: Record<string, number> = {}
const RESPAWN_COOLDOWN_MS = 20000

function shouldSpawn(key: string): boolean {
  const last = spawnState[key] ?? 0
  if (Date.now() - last < RESPAWN_COOLDOWN_MS) return false
  spawnState[key] = Date.now()
  return true
}

function spawnDetached(cmd: string, args: string[], cwd: string) {
  try {
    const logFd = openSync(path.join(cwd, 'spawn.log'), 'a')
    const child = spawn(cmd, args, {
      cwd,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      // Next.js dev sets PORT=3000 — pin the mini-service port explicitly
      env: { ...process.env, PORT: String(ML_PORT) },
    })
    child.on('error', (err) => {
      try { appendFileSync(path.join(cwd, 'spawn.log'), `\n[spawn error] ${String(err)}\n`) } catch { /* noop */ }
    })
    child.unref()
  } catch (e) {
    try { appendFileSync(path.join(cwd, 'spawn.log'), `\n[spawn throw] ${String(e)}\n`) } catch { /* noop */ }
  }
}

/** Start the Flask ML micro-service if it is not responding. */
export async function ensureMlService(): Promise<MlStatus> {
  let status = await getMlStatus()
  if (status.status !== 'offline') return status
  if (shouldSpawn('ml')) {
    spawnDetached(PYTHON, ['app.py'], path.join(PROJECT_ROOT, 'mini-services', 'ml-service'))
  }
  // Wait briefly for it to boot (training happens in background thread, /health responds immediately)
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500))
    status = await getMlStatus()
    if (status.status !== 'offline') return status
  }
  return { status: 'offline' }
}

export interface SocketStatus { status: 'running' | 'offline' }

export async function getSocketStatus(): Promise<SocketStatus> {
  // engine.io handshake URL — socket.io owns all other paths on this port
  const res = await fetchWithTimeout(`http://127.0.0.1:${SOCKET_PORT}/socket.io/?EIO=4&transport=polling`, 1000)
  if (res) return { status: 'running' }
  return { status: 'offline' }
}

/** Start the socket.io price broadcast service if it is not responding. */
export async function ensureSocketService(): Promise<SocketStatus> {
  let status = await getSocketStatus()
  if (status.status === 'running') return status
  if (shouldSpawn('socket')) {
    spawnDetached('bun', ['index.ts'], path.join(PROJECT_ROOT, 'mini-services', 'price-socket'))
  }
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 500))
    status = await getSocketStatus()
    if (status.status === 'running') return status
  }
  return { status: 'offline' }
}

let bootstrapped: Promise<void> | null = null

export function ensureServices(): Promise<void> {
  if (!bootstrapped) {
    bootstrapped = (async () => {
      await ensureSeeded()
      await Promise.all([ensureMlService(), ensureSocketService()])
    })().catch((e) => {
      bootstrapped = null
      throw e
    })
  }
  return bootstrapped
}
