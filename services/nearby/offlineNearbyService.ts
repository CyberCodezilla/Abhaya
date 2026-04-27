import { LocationData } from '@/types/emergency.types';

/**
 * Interface for Offline Police Station Data
 */
export interface PoliceStation {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  city: string;
  distanceKm?: number; // Calculated on the fly
}

/**
 * Loads the offline police station database
 */
export function getOfflinePoliceData(): PoliceStation[] {
  try {
    // We use require to synchronously load the JSON from assets during runtime
    return require('@/assets/data/police_stations.json');
  } catch (error) {
    console.error('[OfflineNearby] Failed to load police station data:', error);
    return [];
  }
}

/**
 * Calculates the Haversine distance between two points in Kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in KM
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Finds the nearest offline police stations based on user location
 * 
 * @param location User's current Lat/Lng
 * @param limit Maximum number of stations to return
 */
export function findNearestPoliceStationsOffline(
  location: LocationData | null,
  limit: number = 3
): PoliceStation[] {
  if (!location) return [];

  const stations = getOfflinePoliceData();
  
  // Calculate distance for each station
  const stationsWithDistance = stations.map(station => ({
    ...station,
    distanceKm: calculateDistance(
      location.latitude,
      location.longitude,
      station.latitude,
      station.longitude
    )
  }));

  // Sort by nearest distance
  return stationsWithDistance
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
    .slice(0, limit);
}
