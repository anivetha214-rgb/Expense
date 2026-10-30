'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'

export interface Crop {
  id: string; name: string; nameTa: string; category: string
  unit: string; basePrice: number; volatility: number; spoilage: number
  months: string
}
export interface Market {
  id: string; name: string; nameTa: string; district: string; districtTa: string
  lat: number; lng: number; factor: number
}
export interface District {
  id: string; name: string; nameTa: string; lat: number; lng: number
}
export interface Vehicle {
  id: string; name: string; nameTa: string; ratePerKm: number; capacityQuintal: number
}
export interface Meta {
  crops: Crop[]; markets: Market[]; districts: District[]; vehicles: Vehicle[]
  fees: { marketFeePct: number; handlingPerQuintal: number }
}
export interface LivePrice {
  cropId: string; marketId: string; price: number; base: number; changePct: number; ts: number
}
export interface HistoryRecord {
  cropId: string; marketId: string; date: string; minPrice: number; maxPrice: number; modalPrice: number
}
export interface ForecastPoint { date: string; price: number; low: number; high: number }
export interface PredictResult {
  cropId: string; marketId: string; horizon: number; current: number
  points: ForecastPoint[]; trendPct: number
  advice?: 'SELL_NOW' | 'WAIT' | 'HOLD'
  model: { type: string; mape: number | null; accuracy: number | null }
  engine: 'flask-ml' | 'fallback'
}
export interface RankedMarket {
  marketId: string; marketName: string; marketNameTa: string
  distanceKm: number; grossRevenue: number; spoilagePct: number; spoilageKg: number
  spoilageValue: number; transport: {
    distanceKm: number; vehicleCharge: number; handling: number; tolls: number; weighing: number; total: number
  }
  marketFee: number; totalCosts: number; netProfit: number; netPerQuintal: number
  marginPct: number; vehicleCapacityOk: boolean; tripsNeeded: number
  price: number; rank: number; recommended: boolean
}
export interface ProfitResponse {
  crop: { id: string; name: string; nameTa: string; unit: string }
  district: District; vehicleId: string; quantityQuintal: number; ranked: RankedMarket[]
}
export interface Alert {
  id: string; deviceId: string; cropId: string; marketId: string
  targetPrice: number; direction: 'ABOVE' | 'BELOW'
  active: boolean; triggeredAt: string | null; createdAt: string
}
export interface AppNotification {
  id: string; deviceId: string; title: string; body: string; type: string
  cropId: string | null; marketId: string | null; price: number | null
  read: boolean; createdAt: string
}
export interface Profile {
  deviceId: string; name: string; phone: string | null
  district: string | null; language: string; createdAt: string; updatedAt: string
}

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json() as Promise<T>
}

// ---------------- device identity ----------------
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem('fp-device')
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem('fp-device', id)
  }
  return id
}

// ---------------- react-query hooks ----------------
export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: () => j<{ ml: { status: string; accuracy?: Record<string, number> }; socket: { status: string } }>('/api/bootstrap'),
    staleTime: 60_000,
  })
}

export function useMeta() {
  return useQuery({ queryKey: ['meta'], queryFn: () => j<Meta>('/api/meta'), staleTime: Infinity })
}

export function useLivePrices() {
  const qc = useQueryClient()
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // socket.io real-time ticks (broadcast service on port 3030 via gateway)
  useEffect(() => {
    const socket = io('/?XTransformPort=3030', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    })
    socketRef.current = socket
    socket.on('connect', () => setSocketConnected(true))
    socket.on('disconnect', () => setSocketConnected(false))
    socket.on('price-tick', (data: { ts: number; prices: LivePrice[] }) => {
      qc.setQueryData(['live'], { prices: data.prices, triggered: [], ts: data.ts })
    })
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [qc])

  // polling fallback keeps data fresh even without sockets
  const query = useQuery({
    queryKey: ['live'],
    queryFn: () => j<{ prices: LivePrice[]; triggered: AppNotification[]; ts: number }>('/api/prices/live'),
    refetchInterval: socketConnected ? false : 10_000,
    refetchOnWindowFocus: true,
  })

  return { ...query, socketConnected }
}

export function useHistory(cropId: string, marketId: string | undefined, days: number) {
  return useQuery({
    queryKey: ['history', cropId, marketId ?? 'all', days],
    queryFn: () =>
      j<{ records: HistoryRecord[] }>(
        `/api/prices/history?cropId=${cropId}&days=${days}${marketId ? `&marketId=${marketId}` : ''}`,
      ),
    enabled: !!cropId,
    staleTime: 60_000,
  })
}

export function usePredict(cropId: string, marketId: string, horizon = 7) {
  return useQuery({
    queryKey: ['predict', cropId, marketId, horizon],
    queryFn: () => j<PredictResult>(`/api/predict?cropId=${cropId}&marketId=${marketId}&horizon=${horizon}`),
    enabled: !!cropId && !!marketId,
    staleTime: 120_000,
    retry: 1,
  })
}

export function useMlStatus() {
  return useQuery({
    queryKey: ['ml-status'],
    queryFn: () => j<{ status: string; accuracy?: Record<string, number>; model?: string }>('/api/ml-status'),
    staleTime: 30_000,
  })
}

export function useProfitRanking() {
  return useMutation({
    mutationFn: (body: { cropId: string; districtId: string; vehicleId: string; quantityQuintal: number }) =>
      j<ProfitResponse>('/api/transport', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
}

export function useAlerts(deviceId: string) {
  return useQuery({
    queryKey: ['alerts', deviceId],
    queryFn: () => j<{ alerts: Alert[] }>(`/api/alerts?deviceId=${encodeURIComponent(deviceId)}`),
    enabled: !!deviceId,
  })
}

export function useCreateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { deviceId: string; cropId: string; marketId: string; targetPrice: number; direction: 'ABOVE' | 'BELOW' }) =>
      j<{ alert: Alert; triggeredNow: boolean }>('/api/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alerts'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useAlertActions() {
  const qc = useQueryClient()
  const reArm = useMutation({
    mutationFn: (id: string) =>
      j<{ alert: Alert }>(`/api/alerts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => j<{ ok: boolean }>(`/api/alerts/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
  return { reArm, remove }
}

export function useNotifications(deviceId: string, lang: string) {
  return useQuery({
    queryKey: ['notifications', deviceId, lang],
    queryFn: () => j<{ notifications: AppNotification[]; unread: number }>(`/api/notifications?deviceId=${encodeURIComponent(deviceId)}&lang=${lang}`),
    enabled: !!deviceId,
    refetchInterval: 30_000,
  })
}

export function useMarkNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { deviceId: string; all?: boolean; ids?: string[] }) =>
      j<{ ok: boolean }>('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useProfile(deviceId: string) {
  return useQuery({
    queryKey: ['profile', deviceId],
    queryFn: () => j<{ profile: Profile | null }>(`/api/profile?deviceId=${encodeURIComponent(deviceId)}`),
    enabled: !!deviceId,
  })
}

export function useSaveProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { deviceId: string; name: string; phone?: string; district?: string; language?: string }) =>
      j<{ profile: Profile }>('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export const fmtINR = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
