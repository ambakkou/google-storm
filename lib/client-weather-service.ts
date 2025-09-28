// Client-side weather service that handles API calls properly
// This service runs only on the client side and uses relative URLs

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  type: 'hurricane' | 'tropical_storm' | 'tornado' | 'flood' | 'thunderstorm' | 'other';
  startTime: string;
  endTime: string;
  source: string;
  areas: string[];
  isActive: boolean;
}

export interface WeatherCurrent {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  timestamp: string;
}

export interface WeatherLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface WeatherResponse {
  current: WeatherCurrent;
  alerts: WeatherAlert[];
  location: WeatherLocation;
}

export interface HurricaneData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: number;
  windSpeed: number;
  pressure: number;
  movement: string;
  lastUpdated: string;
}

export class ClientWeatherService {
  private static instance: ClientWeatherService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  static getInstance(): ClientWeatherService {
    if (!ClientWeatherService.instance) {
      ClientWeatherService.instance = new ClientWeatherService();
    }
    return ClientWeatherService.instance;
  }

  async getCurrentWeather(lat: number, lng: number): Promise<WeatherResponse | null> {
    const cacheKey = `weather_${lat}_${lng}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/weather/current?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error(`Weather API failed: ${response.status}`);
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return null;
    }
  }

  async getWeatherAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
    const cacheKey = `alerts_${lat}_${lng}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/weather/alerts?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error(`Alerts API failed: ${response.status}`);
      }
      
      const data = await response.json();
      const alerts = data.alerts || [];
      this.cache.set(cacheKey, { data: alerts, timestamp: Date.now() });
      return alerts;
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  }

  async getHurricanes(): Promise<HurricaneData[]> {
    const cacheKey = 'hurricanes';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch('/api/hurricanes');
      if (!response.ok) {
        throw new Error(`Hurricanes API failed: ${response.status}`);
      }
      
      const data = await response.json();
      const hurricanes = data.hurricanes || [];
      this.cache.set(cacheKey, { data: hurricanes, timestamp: Date.now() });
      return hurricanes;
    } catch (error) {
      console.error('Error fetching hurricanes:', error);
      return [];
    }
  }

  async getEnhancedAnalysis(lat: number, lng: number): Promise<any> {
    const cacheKey = `analysis_${lat}_${lng}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/weather/enhanced-analysis?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error(`Enhanced analysis API failed: ${response.status}`);
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Error fetching enhanced analysis:', error);
      return null;
    }
  }

  // Calculate distance between two coordinates
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Find nearby hurricanes within specified distance
  findNearbyHurricanes(hurricanes: HurricaneData[], lat: number, lng: number, maxDistance: number = 500): HurricaneData[] {
    return hurricanes.filter(hurricane => {
      const distance = this.calculateDistance(lat, lng, hurricane.lat, hurricane.lng);
      return distance <= maxDistance;
    });
  }

  // Check if location is in hurricane risk zone
  isHurricaneRiskZone(lat: number, lng: number): boolean {
    const hurricaneZones = [
      { lat: 25.7617, lng: -80.1918, radius: 200 }, // Miami
      { lat: 26.1224, lng: -80.1373, radius: 200 }, // Fort Lauderdale
      { lat: 26.7153, lng: -80.0534, radius: 200 }, // West Palm Beach
      { lat: 30.3322, lng: -81.6557, radius: 200 }, // Jacksonville
      { lat: 29.7604, lng: -95.3698, radius: 200 }, // Houston
      { lat: 29.9511, lng: -90.0715, radius: 200 }, // New Orleans
    ];

    return hurricaneZones.some(zone => {
      const distance = this.calculateDistance(lat, lng, zone.lat, zone.lng);
      return distance <= zone.radius;
    });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
