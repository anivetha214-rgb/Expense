// FarmPrice AI — transportation cost + profit estimation engine (server side, shared shapes)
import {
  VEHICLES, MARKET_FEE_PCT, HANDLING_PER_QUINTAL, WEIGHING_FEE,
  TOLL_PER_KM_TRUCK, ROAD_FACTOR,
} from '@/lib/seed-data'
import { roadDistanceKm } from '@/lib/geo'

export interface TransportInput {
  districtId: string
  marketId: string
  vehicleId: string
  quantityQuintal: number
  pricePerQuintal: number
}

export interface TransportBreakdown {
  distanceKm: number
  vehicleCharge: number
  handling: number
  tolls: number
  weighing: number
  total: number
}

export interface ProfitResult {
  marketId: string
  distanceKm: number
  grossRevenue: number
  spoilagePct: number
  spoilageKg: number
  spoilageValue: number
  transport: TransportBreakdown
  marketFee: number
  totalCosts: number
  netProfit: number
  netPerQuintal: number
  marginPct: number
  vehicleCapacityOk: boolean
  tripsNeeded: number
}

export function transportCost(
  distanceKm: number, vehicleId: string, quantityQuintal: number,
): TransportBreakdown {
  const vehicle = VEHICLES.find((v) => v.id === vehicleId) ?? VEHICLES[2]
  const tripsNeeded = Math.max(1, Math.ceil(quantityQuintal / vehicle.capacityQuintal))
  // Round trip: carry full load to market, return empty (return leg costs ~60%)
  const vehicleCharge = Math.round(vehicle.ratePerKm * distanceKm * tripsNeeded * 1.6)
  const handling = Math.round(quantityQuintal * HANDLING_PER_QUINTAL)
  const tolls = (vehicle.id === 'two-wheeler' || vehicle.id === 'auto' || distanceKm <= 60)
    ? 0
    : Math.round(distanceKm * tripsNeeded * TOLL_PER_KM_TRUCK)
  const weighing = WEIGHING_FEE * tripsNeeded
  return {
    distanceKm,
    vehicleCharge,
    handling,
    tolls,
    weighing,
    total: vehicleCharge + handling + tolls + weighing,
  }
}

/**
 * Net profit for selling `quantityQuintal` of a crop at a market:
 * revenue − spoilage loss − transport − market fee.
 */
export function estimateProfitForMarket(args: {
  distanceKm: number
  quantityQuintal: number
  pricePerQuintal: number
  vehicleId: string
  cropSpoilage: number // % per 10 km
}): ProfitResult {
  const { distanceKm, quantityQuintal, pricePerQuintal, vehicleId, cropSpoilage } = args
  const vehicle = VEHICLES.find((v) => v.id === vehicleId) ?? VEHICLES[2]
  const tripsNeeded = Math.max(1, Math.ceil(quantityQuintal / vehicle.capacityQuintal))
  const grossRevenue = Math.round(pricePerQuintal * quantityQuintal)

  const spoilagePct = Math.min(12, cropSpoilage * (distanceKm / 10))
  const spoilageKg = Math.round(quantityQuintal * 100 * (spoilagePct / 100))
  const sellableQuintal = quantityQuintal * (1 - spoilagePct / 100)
  const effectiveRevenue = Math.round(sellableQuintal * pricePerQuintal)
  const spoilageValue = grossRevenue - effectiveRevenue

  const transport = transportCost(distanceKm, vehicleId, quantityQuintal)
  const marketFee = Math.round((effectiveRevenue * MARKET_FEE_PCT) / 100)

  const totalCosts = transport.total + marketFee + spoilageValue
  const netProfit = effectiveRevenue - transport.total - marketFee
  return {
    marketId: '',
    distanceKm,
    grossRevenue,
    spoilagePct: Math.round(spoilagePct * 10) / 10,
    spoilageKg,
    spoilageValue,
    transport,
    marketFee,
    totalCosts,
    netProfit,
    netPerQuintal: Math.round(netProfit / quantityQuintal),
    marginPct: grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0,
    vehicleCapacityOk: quantityQuintal <= vehicle.capacityQuintal,
    tripsNeeded,
  }
}

export function distanceDistrictToMarket(
  district: { lat: number; lng: number },
  market: { lat: number; lng: number },
): number {
  return roadDistanceKm(district.lat, district.lng, market.lat, market.lng, ROAD_FACTOR)
}

export { VEHICLES }
