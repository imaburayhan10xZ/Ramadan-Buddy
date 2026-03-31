export interface LocationSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

// Using OpenStreetMap Nominatim API
const BASE_URL = "https://nominatim.openstreetmap.org";

export const searchCity = async (query: string): Promise<LocationSearchResult[]> => {
  try {
    // Added addressdetails=1 and increased limit to 10 for better coverage
    const response = await fetch(`${BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    return [];
  }
};

export const getCityName = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(`${BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
    if (!response.ok) return "Unknown Location";
    const data = await response.json();
    
    const addr = data.address;
    // Prefer City > Town > Village > County > State
    return addr.city || addr.town || addr.village || addr.county || addr.state || "Unknown Location";
  } catch (error) {
    return "Unknown Location";
  }
};