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

export interface ForecastDay {
  date: string;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  isHurricaneRisk: boolean;
}

export interface ForecastResponse {
  forecast: ForecastDay[];
  location: WeatherLocation;
  lastUpdated: string;
}

export class WeatherService {
  private static instance: WeatherService;
  private alertsCache: Map<string, WeatherAlert[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  async getCurrentWeather(lat: number, lng: number): Promise<WeatherResponse> {
    try {
      const response = await fetch(`/api/weather/current?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error('Failed to fetch current weather');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching current weather:', error);
      throw error;
    }
  }

  async getWeatherAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
    const cacheKey = `${lat},${lng}`;
    const now = Date.now();
    
    // Check cache first
    if (this.alertsCache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.alertsCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`/api/weather/alerts?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weather alerts');
      }
      
      const data = await response.json();
      const alerts = data.alerts || [];
      
      // Cache the results
      this.alertsCache.set(cacheKey, alerts);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
      
      return alerts;
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      throw error;
    }
  }

  async getForecast(lat: number, lng: number): Promise<ForecastResponse> {
    try {
      const response = await fetch(`/api/weather/forecast?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error('Failed to fetch forecast');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching forecast:', error);
      throw error;
    }
  }

  getSeverityColor(severity: WeatherAlert['severity']): string {
    switch (severity) {
      case 'minor': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'severe': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'extreme': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  getSeverityIcon(severity: WeatherAlert['severity']): string {
    switch (severity) {
      case 'minor': return 'ℹ️';
      case 'moderate': return '⚠️';
      case 'severe': return '🚨';
      case 'extreme': return '🔴';
      default: return '📢';
    }
  }

  getTypeIcon(type: WeatherAlert['type']): string {
    switch (type) {
      case 'hurricane': return '🌀';
      case 'tropical_storm': return '🌪️';
      case 'tornado': return '🌪️';
      case 'flood': return '🌊';
      case 'thunderstorm': return '⛈️';
      default: return '🌦️';
    }
  }

  isUrgentAlert(alert: WeatherAlert): boolean {
    return alert.severity === 'severe' || alert.severity === 'extreme';
  }

  isHurricaneRelated(alert: WeatherAlert): boolean {
    return alert.type === 'hurricane' || alert.type === 'tropical_storm';
  }

  shouldNotifyUser(alert: WeatherAlert, lastNotified?: Map<string, number>): boolean {
    if (!alert.isActive) return false;
    
    // Always notify for extreme/severe alerts
    if (this.isUrgentAlert(alert)) return true;
    
    // Check if we've notified about this alert recently (within 1 hour)
    if (lastNotified && lastNotified.has(alert.id)) {
      const lastNotifiedTime = lastNotified.get(alert.id)!;
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - lastNotifiedTime < oneHour) {
        return false;
      }
    }
    
    return true;
  }

  formatAlertTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours > 0) {
      return `in ${diffHours}h`;
    } else if (diffHours < 0) {
      return `${Math.abs(diffHours)}h ago`;
    } else {
      return 'now';
    }
  }

  getAlertRecommendation(alert: WeatherAlert): string {
    switch (alert.type) {
      case 'hurricane':
        return 'Evacuate if ordered. Secure outdoor items. Have emergency supplies ready.';
      case 'tropical_storm':
        return 'Stay indoors. Avoid flooded areas. Monitor weather updates.';
      case 'tornado':
        return 'Seek shelter in basement or interior room. Avoid windows.';
      case 'flood':
        return 'Avoid flooded roads. Move to higher ground if necessary.';
      case 'thunderstorm':
        return 'Stay indoors. Avoid electrical equipment and plumbing.';
      default:
        return 'Monitor weather conditions and follow local emergency instructions.';
    }
  }
}
