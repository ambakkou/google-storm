// Google Weather Service
// Uses Google Maps API key with free weather APIs as fallback

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

export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  isHurricaneRisk: boolean;
}

export interface WeatherLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface WeatherResponse {
  current: WeatherCurrent;
  alerts: any[];
  location: WeatherLocation;
}

export interface WeatherForecastResponse {
  forecast: WeatherForecast[];
  location: WeatherLocation;
  lastUpdated: string;
}

export class GoogleWeatherService {
  private static instance: GoogleWeatherService;
  private mapsApiKey: string;
  private openWeatherApiKey: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    this.mapsApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY || '';
  }

  static getInstance(): GoogleWeatherService {
    if (!GoogleWeatherService.instance) {
      GoogleWeatherService.instance = new GoogleWeatherService();
    }
    return GoogleWeatherService.instance;
  }

  /**
   * Get current weather using OpenWeatherMap API (real-time data only)
   */
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherResponse> {
    const cacheKey = `current_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    if (!this.openWeatherApiKey) {
      throw new Error('OpenWeatherMap API key not configured. Please add OPENWEATHER_API_KEY to your environment variables.');
    }

    try {
      const data = await this.getOpenWeatherCurrent(lat, lng);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Error fetching current weather:', error);
      throw new Error(`Failed to fetch real-time weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get weather forecast using OpenWeatherMap API (real-time data only)
   */
  async getForecast(lat: number, lng: number): Promise<WeatherForecastResponse> {
    const cacheKey = `forecast_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    if (!this.openWeatherApiKey) {
      throw new Error('OpenWeatherMap API key not configured. Please add OPENWEATHER_API_KEY to your environment variables.');
    }

    try {
      const data = await this.getOpenWeatherForecast(lat, lng);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Error fetching forecast:', error);
      throw new Error(`Failed to fetch real-time forecast data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current weather from OpenWeatherMap API
   */
  private async getOpenWeatherCurrent(lat: number, lng: number): Promise<WeatherResponse> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${this.openWeatherApiKey}&units=imperial`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Calculate UV Index based on time of day, season, and cloud cover
    const uvIndex = this.calculateUVIndex(lat, lng, data.clouds.all);
    
    return {
      current: {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 2.237), // Convert m/s to mph
        windDirection: data.wind.deg || 0,
        pressure: Math.round(data.main.pressure * 0.02953), // Convert hPa to inHg
        visibility: Math.round((data.visibility || 10000) * 0.000621371), // Convert m to miles
        uvIndex: uvIndex,
        timestamp: new Date().toISOString(),
      },
      alerts: [], // OpenWeatherMap doesn't provide alerts in free tier
      location: {
        name: data.name,
        lat: data.coord.lat,
        lng: data.coord.lon,
      },
    };
  }

  /**
   * Get forecast from OpenWeatherMap API
   */
  private async getOpenWeatherForecast(lat: number, lng: number): Promise<WeatherForecastResponse> {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${this.openWeatherApiKey}&units=imperial`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap forecast API failed: ${response.status}`);
    }

    const data = await response.json();
    const forecast: WeatherForecast[] = [];

    // Group by day and get daily min/max
    const dailyData: { [key: string]: any[] } = {};
    
    data.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(item);
    });

    Object.keys(dailyData).slice(0, 5).forEach(date => {
      const dayData = dailyData[date];
      const temps = dayData.map(item => item.main.temp);
      const windSpeeds = dayData.map(item => item.wind.speed);
      const humidities = dayData.map(item => item.main.humidity);
      const precipitations = dayData.map(item => item.rain?.['3h'] || 0);

      const maxTemp = Math.max(...temps);
      const minTemp = Math.min(...temps);
      const avgWindSpeed = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
      const avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length;
      const totalPrecipitation = precipitations.reduce((a, b) => a + b, 0);

      forecast.push({
        date,
        high: Math.round(maxTemp),
        low: Math.round(minTemp),
        condition: dayData[0].weather[0].description,
        precipitation: Math.round(totalPrecipitation * 100) / 100,
        windSpeed: Math.round(avgWindSpeed * 2.237), // Convert m/s to mph
        humidity: Math.round(avgHumidity),
        isHurricaneRisk: this.isHurricaneRisk(avgWindSpeed * 2.237, totalPrecipitation, date),
      });
    });

    return {
      forecast,
      location: {
        name: data.city.name,
        lat: data.city.coord.lat,
        lng: data.city.coord.lon,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate UV Index based on location, time, and cloud cover
   */
  private calculateUVIndex(lat: number, lng: number, cloudCover: number): number {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1; // 1-12
    
    // Base UV Index calculation
    let baseUV = 0;
    
    // Time of day factor (peak UV around noon)
    const timeFactor = Math.max(0, Math.cos((hour - 12) * Math.PI / 12));
    
    // Seasonal factor (higher in summer months)
    const seasonalFactor = Math.sin((month - 6) * Math.PI / 6);
    
    // Latitude factor (higher UV closer to equator)
    const latFactor = Math.cos(lat * Math.PI / 180);
    
    // Calculate base UV Index (0-11 scale)
    baseUV = (timeFactor * seasonalFactor * latFactor + 1) * 5;
    
    // Apply cloud cover reduction (clouds block UV)
    const cloudReduction = (cloudCover / 100) * 0.7; // Up to 70% reduction
    baseUV = baseUV * (1 - cloudReduction);
    
    // Ensure UV Index is within valid range (0-11)
    return Math.max(0, Math.min(11, Math.round(baseUV)));
  }

  /**
   * Check if conditions indicate hurricane risk
   */
  private isHurricaneRisk(windSpeed: number, precipitation: number, date: string): boolean {
    const isHurricaneSeason = this.isHurricaneSeason(date);
    return isHurricaneSeason && (windSpeed > 40 || precipitation > 2);
  }

  /**
   * Check if date is during hurricane season (June-November)
   */
  private isHurricaneSeason(date: string): boolean {
    const month = new Date(date).getMonth() + 1; // 1-12
    return month >= 6 && month <= 11;
  }

}
