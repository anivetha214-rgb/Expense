// FarmPrice AI — seed reference data (Tamil Nadu focused)
// Crop base prices are realistic ₹/quintal wholesale levels (2024-25),
// seasonal multipliers capture harvest gluts / lean months.

export interface CropSeed {
  id: string
  name: string
  nameTa: string
  category: string
  basePrice: number
  volatility: number
  spoilage: number // % loss per 10 km
  months: number[] // seasonal price multiplier for months 1..12
}

export interface MarketSeed {
  id: string
  name: string
  nameTa: string
  district: string
  districtTa: string
  lat: number
  lng: number
  factor: number
}

export interface DistrictSeed {
  id: string
  name: string
  nameTa: string
  lat: number
  lng: number
}

export const CROPS: CropSeed[] = [
  {
    id: 'tomato', name: 'Tomato', nameTa: 'தக்காளி', category: 'Vegetable',
    basePrice: 1650, volatility: 0.032, spoilage: 0.30,
    months: [1.02, 0.86, 0.80, 0.94, 1.06, 0.92, 1.00, 1.10, 1.16, 1.22, 1.10, 1.02],
  },
  {
    id: 'onion', name: 'Onion', nameTa: 'வெங்காயம்', category: 'Vegetable',
    basePrice: 1950, volatility: 0.026, spoilage: 0.06,
    months: [1.08, 1.12, 1.05, 0.90, 0.82, 0.88, 0.96, 1.04, 1.10, 1.14, 1.08, 1.02],
  },
  {
    id: 'potato', name: 'Potato', nameTa: 'உருளைக்கிழங்கு', category: 'Vegetable',
    basePrice: 1520, volatility: 0.021, spoilage: 0.08,
    months: [1.06, 1.10, 1.04, 0.92, 0.85, 0.90, 0.98, 1.05, 1.10, 1.12, 1.06, 1.00],
  },
  {
    id: 'banana', name: 'Banana', nameTa: 'வாழைக்காய்', category: 'Fruit',
    basePrice: 2150, volatility: 0.020, spoilage: 0.24,
    months: [1.02, 1.00, 0.98, 0.96, 0.98, 1.02, 1.04, 1.02, 1.00, 0.98, 0.98, 1.00],
  },
  {
    id: 'brinjal', name: 'Brinjal', nameTa: 'கத்தரிக்காய்', category: 'Vegetable',
    basePrice: 2050, volatility: 0.026, spoilage: 0.28,
    months: [1.04, 0.96, 0.90, 0.94, 1.02, 1.08, 1.10, 1.06, 1.02, 1.00, 1.00, 1.04],
  },
  {
    id: 'carrot', name: 'Carrot', nameTa: 'கேரட்', category: 'Vegetable',
    basePrice: 2850, volatility: 0.024, spoilage: 0.20,
    months: [1.00, 0.94, 0.90, 0.98, 1.08, 1.14, 1.12, 1.08, 1.04, 1.00, 0.96, 0.96],
  },
  {
    id: 'cabbage', name: 'Cabbage', nameTa: 'முட்டைகோஸ்', category: 'Vegetable',
    basePrice: 1350, volatility: 0.026, spoilage: 0.30,
    months: [1.02, 0.88, 0.84, 0.96, 1.10, 1.14, 1.10, 1.04, 1.00, 1.02, 1.04, 1.04],
  },
  {
    id: 'chilli', name: 'Green Chilli', nameTa: 'பச்சை மிளகாய்', category: 'Spice',
    basePrice: 5600, volatility: 0.040, spoilage: 0.22,
    months: [1.10, 1.04, 0.92, 0.86, 0.92, 1.02, 1.12, 1.14, 1.08, 1.00, 0.96, 1.02],
  },
  {
    id: 'mango', name: 'Mango', nameTa: 'மாம்பழம்', category: 'Fruit',
    basePrice: 5200, volatility: 0.036, spoilage: 0.25,
    months: [1.35, 1.30, 1.18, 0.95, 0.72, 0.60, 0.70, 1.05, 1.30, 1.38, 1.40, 1.38],
  },
  {
    id: 'turmeric', name: 'Turmeric', nameTa: 'மஞ்சள்', category: 'Spice',
    basePrice: 11500, volatility: 0.014, spoilage: 0.01,
    months: [1.02, 1.02, 1.00, 0.98, 0.96, 0.98, 1.00, 1.02, 1.04, 1.02, 1.00, 1.00],
  },
  {
    id: 'groundnut', name: 'Groundnut', nameTa: 'நிலக்கடலை', category: 'Oilseed',
    basePrice: 5850, volatility: 0.015, spoilage: 0.03,
    months: [1.04, 1.02, 0.98, 0.94, 0.96, 1.02, 1.08, 1.10, 1.06, 1.02, 1.00, 1.02],
  },
  {
    id: 'paddy', name: 'Paddy (Rice)', nameTa: 'நெல்', category: 'Cereal',
    basePrice: 2350, volatility: 0.011, spoilage: 0.01,
    months: [1.00, 1.02, 1.04, 1.02, 0.98, 0.96, 0.98, 1.00, 1.00, 0.98, 0.96, 0.98],
  },
]

export const MARKETS: MarketSeed[] = [
  { id: 'koyambedu', name: 'Koyambedu Wholesale Market', nameTa: 'கோயம்பேடு மொத்த சந்தை', district: 'Chennai', districtTa: 'சென்னை', lat: 13.0704, lng: 80.1946, factor: 1.08 },
  { id: 'gandhi-trichy', name: 'Gandhi Market', nameTa: 'காந்தி மார்க்கெட்', district: 'Tiruchirappalli', districtTa: 'திருச்சிராப்பள்ளி', lat: 10.8155, lng: 78.6908, factor: 1.02 },
  { id: 'ukkadam', name: 'Ukkadam Market', nameTa: 'உக்கடம் சந்தை', district: 'Coimbatore', districtTa: 'கோயம்புத்தூர்', lat: 10.9700, lng: 76.9400, factor: 1.04 },
  { id: 'central-madurai', name: 'Madurai Central Market', nameTa: 'மதுரை மத்திய சந்தை', district: 'Madurai', districtTa: 'மதுரை', lat: 9.9257, lng: 78.1147, factor: 1.00 },
  { id: 'salem', name: 'Salem Wholesale Market', nameTa: 'சேலம் மொத்த சந்தை', district: 'Salem', districtTa: 'சேலம்', lat: 11.6495, lng: 78.1570, factor: 0.99 },
  { id: 'erode', name: 'Erode Marketing Yard', nameTa: 'ஈரோடு விற்பனை மையம்', district: 'Erode', districtTa: 'ஈரோடு', lat: 11.3410, lng: 77.7172, factor: 0.97 },
  { id: 'hosur', name: 'Hosur Market', nameTa: 'ஓசூர் சந்தை', district: 'Krishnagiri', districtTa: 'கிருஷ்ணகிரி', lat: 12.7400, lng: 77.8300, factor: 1.03 },
  { id: 'tanjore', name: 'Thanjavur Market', nameTa: 'தஞ்சாவூர் சந்தை', district: 'Thanjavur', districtTa: 'தஞ்சாவூர்', lat: 10.7870, lng: 79.1378, factor: 0.98 },
  { id: 'tirunelveli', name: 'Tirunelveli Market', nameTa: 'திருநெல்வேலி சந்தை', district: 'Tirunelveli', districtTa: 'திருநெல்வேலி', lat: 8.7139, lng: 77.7567, factor: 0.99 },
  { id: 'vellore', name: 'Vellore Market', nameTa: 'வேலூர் சந்தை', district: 'Vellore', districtTa: 'வேலூர்', lat: 12.9165, lng: 79.1325, factor: 1.01 },
]

export const DISTRICTS: DistrictSeed[] = [
  { id: 'chennai', name: 'Chennai', nameTa: 'சென்னை', lat: 13.0827, lng: 80.2707 },
  { id: 'coimbatore', name: 'Coimbatore', nameTa: 'கோயம்புத்தூர்', lat: 11.0168, lng: 76.9558 },
  { id: 'madurai', name: 'Madurai', nameTa: 'மதுரை', lat: 9.9252, lng: 78.1198 },
  { id: 'tiruchirappalli', name: 'Tiruchirappalli', nameTa: 'திருச்சிராப்பள்ளி', lat: 10.7905, lng: 78.7047 },
  { id: 'salem', name: 'Salem', nameTa: 'சேலம்', lat: 11.6643, lng: 78.1460 },
  { id: 'erode', name: 'Erode', nameTa: 'ஈரோடு', lat: 11.3410, lng: 77.7172 },
  { id: 'thanjavur', name: 'Thanjavur', nameTa: 'தஞ்சாவூர்', lat: 10.7870, lng: 79.1378 },
  { id: 'tirunelveli', name: 'Tirunelveli', nameTa: 'திருநெல்வேலி', lat: 8.7139, lng: 77.7567 },
  { id: 'vellore', name: 'Vellore', nameTa: 'வேலூர்', lat: 12.9165, lng: 79.1325 },
  { id: 'krishnagiri', name: 'Krishnagiri', nameTa: 'கிருஷ்ணகிரி', lat: 12.5186, lng: 78.2137 },
  { id: 'tiruppur', name: 'Tiruppur', nameTa: 'திருப்பூர்', lat: 11.1085, lng: 77.3411 },
  { id: 'karur', name: 'Karur', nameTa: 'கரூர்', lat: 10.9601, lng: 78.0766 },
  { id: 'dindigul', name: 'Dindigul', nameTa: 'திண்டுக்கல்', lat: 10.3673, lng: 77.9803 },
  { id: 'sivaganga', name: 'Sivaganga', nameTa: 'சிவகங்கை', lat: 9.8433, lng: 78.4809 },
  { id: 'ramanathapuram', name: 'Ramanathapuram', nameTa: 'ராமநாதபுரம்', lat: 9.3639, lng: 78.8395 },
  { id: 'thoothukudi', name: 'Thoothukudi', nameTa: 'தூத்துக்குடி', lat: 8.7642, lng: 78.1348 },
  { id: 'villupuram', name: 'Villupuram', nameTa: 'விழுப்புரம்', lat: 11.9401, lng: 79.4861 },
  { id: 'cuddalore', name: 'Cuddalore', nameTa: 'கடலூர்', lat: 11.7480, lng: 79.7714 },
  { id: 'dharmapuri', name: 'Dharmapuri', nameTa: 'தர்மபுரி', lat: 12.1211, lng: 78.1582 },
  { id: 'namakkal', name: 'Namakkal', nameTa: 'நாமக்கல்', lat: 11.2189, lng: 78.1674 },
  { id: 'pudukkottai', name: 'Pudukkottai', nameTa: 'புதுக்கோட்டை', lat: 10.3833, lng: 78.8001 },
  { id: 'tiruvannamalai', name: 'Tiruvannamalai', nameTa: 'திருவண்ணாமலை', lat: 12.2253, lng: 79.0747 },
  { id: 'kanchipuram', name: 'Kanchipuram', nameTa: 'காஞ்சிபுரம்', lat: 12.8342, lng: 79.7036 },
  { id: 'nagapattinam', name: 'Nagapattinam', nameTa: 'நாகப்பட்டினம்', lat: 10.7672, lng: 79.8449 },
]

export interface VehicleSeed {
  id: string
  name: string
  nameTa: string
  ratePerKm: number // ₹/km one way, includes fuel & driver
  capacityQuintal: number
}

export const VEHICLES: VehicleSeed[] = [
  { id: 'two-wheeler', name: 'Two-wheeler (small load)', nameTa: 'இருசக்கர வாகனம் (சிறு சுமை)', ratePerKm: 3.5, capacityQuintal: 2 },
  { id: 'auto', name: 'Auto rickshaw', nameTa: 'ஆட்டோ ரிக்சா', ratePerKm: 16, capacityQuintal: 8 },
  { id: 'mini-truck', name: 'Mini truck', nameTa: 'சிறிய லாரி', ratePerKm: 30, capacityQuintal: 30 },
  { id: 'tractor', name: 'Tractor with trailer', nameTa: 'டிராக்டர் டிரெய்லர்', ratePerKm: 34, capacityQuintal: 50 },
  { id: 'truck', name: 'Truck (10 tonne)', nameTa: 'லாரி (10 டன்)', ratePerKm: 48, capacityQuintal: 100 },
]

export const MARKET_FEE_PCT = 1.5 // commission / market fee on sale value
export const HANDLING_PER_QUINTAL = 42 // loading + unloading ₹/quintal
export const WEIGHING_FEE = 30 // ₹ flat
export const TOLL_PER_KM_TRUCK = 2.2 // ₹/km applies to mini-truck/tractor/truck beyond 60 km
export const ROAD_FACTOR = 1.28 // straight line → road distance multiplier
