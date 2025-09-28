// AccuWeather API Service
// Provides current weather, forecasts, and alerts using AccuWeather API

export interface AccuWeatherCurrent {
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

export interface AccuWeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  isHurricaneRisk: boolean;
}

export interface AccuWeatherLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface AccuWeatherResponse {
  current: AccuWeatherCurrent;
  alerts: any[];
  location: AccuWeatherLocation;
}

export interface AccuWeatherForecastResponse {
  forecast: AccuWeatherForecast[];
  location: AccuWeatherLocation;
  lastUpdated: string;
}

export class AccuWeatherService {
  private static instance: AccuWeatherService;
  private apiKey: string;
  private baseUrl = 'http://dataservice.accuweather.com';
  private locationKeyCache: Map<string, { key: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  private constructor() {
    this.apiKey = process.env.XWEATHER_API_KEY || process.env.ACCUWEATHER_API_KEY || '';
  }

  static getInstance(): AccuWeatherService {
    if (!AccuWeatherService.instance) {
      AccuWeatherService.instance = new AccuWeatherService();
    }
    return AccuWeatherService.instance;
  }

  /**
   * Throttled request method to avoid rate limiting
   */
  private async throttledRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const response = await fetch(url);
          
          if (response.status === 429) {
            // Rate limited - wait and retry
            console.warn('AccuWeather API rate limited, waiting 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            const retryResponse = await fetch(url);
            if (!retryResponse.ok) {
              throw new Error(`AccuWeather API failed after retry: ${retryResponse.status}`);
            }
            resolve(await retryResponse.json());
          } else if (!response.ok) {
            throw new Error(`AccuWeather API failed: ${response.status}`);
          } else {
            resolve(await response.json());
          }
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process request queue with throttling
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Request failed:', error);
        }
        
        // Wait 1 second between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get location key for coordinates (required for AccuWeather API)
   */
  async getLocationKey(lat: number, lng: number): Promise<string> {
    try {
      // Create cache key
      const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const cached = this.locationKeyCache.get(cacheKey);
      
      // Check if we have a valid cached result
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        return cached.key;
      }

      if (!this.apiKey) {
        console.warn('AccuWeather API key not configured, using mock location key');
        return 'mock-location-key';
      }

      const url = `${this.baseUrl}/locations/v1/cities/geoposition/search?apikey=${this.apiKey}&q=${lat},${lng}`;
      const data = await this.throttledRequest(url);
      
      // Cache the result
      this.locationKeyCache.set(cacheKey, {
        key: data.Key,
        timestamp: Date.now()
      });

      return data.Key;
    } catch (error) {
      console.error('Error getting location key:', error);
      // Return mock key as fallback
      return 'mock-location-key';
    }
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(lat: number, lng: number): Promise<AccuWeatherResponse> {
    try {
      if (!this.apiKey) {
        console.warn('AccuWeather API key not configured, using mock data');
        return this.getMockWeatherData(lat, lng);
      }

      const locationKey = await this.getLocationKey(lat, lng);
      
      // Get current conditions using throttled request
      const currentUrl = `${this.baseUrl}/currentconditions/v1/${locationKey}?apikey=${this.apiKey}&details=true`;
      const currentData = await this.throttledRequest(currentUrl);
      
      // Validate current conditions response
      if (!currentData || !Array.isArray(currentData) || currentData.length === 0) {
        console.error('AccuWeather current conditions API response invalid:', currentData);
        throw new Error('Invalid AccuWeather current conditions response');
      }
      
      const current = currentData[0];

      // Get location details
      const locationResponse = await fetch(
        `${this.baseUrl}/locations/v1/${locationKey}?apikey=${this.apiKey}`
      );

      if (!locationResponse.ok) {
        throw new Error(`AccuWeather location details API failed: ${locationResponse.status}`);
      }

      const locationData = await locationResponse.json();

      // Safely extract current weather data with fallbacks
      const temperature = current.Temperature?.Imperial?.Value || 
                         current.Temperature?.Metric?.Value || 
                         current.Temperature?.Value || 
                         75;
      
      const windSpeed = current.Wind?.Speed?.Imperial?.Value || 
                       current.Wind?.Speed?.Metric?.Value || 
                       current.Wind?.Speed?.Value || 
                       current.Wind?.Speed || 
                       5;
      
      const windDirection = current.Wind?.Direction?.Degrees || 
                           current.Wind?.Direction?.Value || 
                           current.Wind?.Direction || 
                           0;
      
      const pressure = current.Pressure?.Imperial?.Value || 
                      current.Pressure?.Metric?.Value || 
                      current.Pressure?.Value || 
                      current.Pressure || 
                      29.92;
      
      const visibility = current.Visibility?.Imperial?.Value || 
                        current.Visibility?.Metric?.Value || 
                        current.Visibility?.Value || 
                        current.Visibility || 
                        10;

      return {
        current: {
          temperature: Math.round(temperature),
          condition: current.WeatherText || current.Condition || 'Partly Cloudy',
          humidity: current.RelativeHumidity || current.Humidity || 70,
          windSpeed: Math.round(windSpeed * 10) / 10,
          windDirection: Math.round(windDirection),
          pressure: Math.round(pressure * 100) / 100,
          visibility: Math.round(visibility * 10) / 10,
          uvIndex: current.UVIndex || current.UV?.Value || 0,
          timestamp: new Date(current.LocalObservationDateTime || new Date()).toISOString(),
        },
        alerts: [], // AccuWeather doesn't provide alerts in the same way
        location: {
          name: `${locationData?.LocalizedName || 'Unknown'}, ${locationData?.Country?.LocalizedName || 'Unknown'}`,
          lat,
          lng,
        },
      };
    } catch (error) {
      console.error('Error fetching current weather from AccuWeather:', error);
      return this.getMockWeatherData(lat, lng);
    }
  }

  /**
   * Get 5-day weather forecast
   */
  async getForecast(lat: number, lng: number): Promise<AccuWeatherForecastResponse> {
    try {
      if (!this.apiKey) {
        console.warn('AccuWeather API key not configured, using mock data');
        return this.getMockForecastData(lat, lng);
      }

      const locationKey = await this.getLocationKey(lat, lng);
      
      // Use throttled request for forecast
      const forecastUrl = `${this.baseUrl}/forecasts/v1/daily/5day/${locationKey}?apikey=${this.apiKey}&metric=false`;
      const data = await this.throttledRequest(forecastUrl);
      const forecast: AccuWeatherForecast[] = [];

      // Validate API response structure
      if (!data.DailyForecasts || !Array.isArray(data.DailyForecasts)) {
        console.error('AccuWeather API response missing DailyForecasts:', data);
        throw new Error('Invalid AccuWeather API response structure');
      }

      data.DailyForecasts.forEach((day: any, index: number) => {
        try {
        // Safely extract wind speed with fallbacks
        const windSpeed = day.Day?.Wind?.Speed?.Value || 
                         day.Day?.Wind?.Speed || 
                         day.Day?.Wind?.Value || 
                         0;
        
        // Safely extract precipitation with fallbacks
        const precipitation = day.Day?.TotalLiquid?.Value || 
                            day.Day?.Precipitation?.Value || 
                            day.Day?.Rain?.Value || 
                            0;
        
        // Safely extract temperature values
        const highTemp = day.Temperature?.Maximum?.Value || 
                        day.Temperature?.Max?.Value || 
                        day.Temperature?.Maximum || 
                        75;
        
        const lowTemp = day.Temperature?.Minimum?.Value || 
                       day.Temperature?.Min?.Value || 
                       day.Temperature?.Minimum || 
                       65;
        
        // Safely extract other properties
        const condition = day.Day?.IconPhrase || 
                         day.Day?.Condition || 
                         'Partly Cloudy';
        
        const humidity = day.Day?.RelativeHumidity?.Average || 
                        day.Day?.Humidity?.Average || 
                        day.Day?.RelativeHumidity || 
                        70;
        
        forecast.push({
          date: day.Date?.split('T')[0] || new Date().toISOString().split('T')[0],
          high: Math.round(highTemp),
          low: Math.round(lowTemp),
          condition: condition,
          precipitation: Math.round(precipitation * 100) / 100,
          windSpeed: Math.round(windSpeed * 10) / 10,
          humidity: Math.round(humidity),
          isHurricaneRisk: this.isHurricaneRisk(windSpeed, precipitation, day.Date),
        });
        } catch (error) {
          console.error(`Error processing forecast day ${index}:`, error, day);
          // Add a fallback forecast entry
          forecast.push({
            date: new Date().toISOString().split('T')[0],
            high: 75,
            low: 65,
            condition: 'Partly Cloudy',
            precipitation: 0,
            windSpeed: 5,
            humidity: 70,
            isHurricaneRisk: false,
          });
        }
      });

      return {
        forecast,
        location: {
          name: 'Miami, FL', // Will be updated with actual location
          lat,
          lng,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching forecast from AccuWeather:', error);
      return this.getMockForecastData(lat, lng);
    }
  }

  /**
   * Check if conditions indicate hurricane risk
   */
  private isHurricaneRisk(windSpeed: number, precipitation: number, date: string): boolean {
    const isHurricaneSeason = new Date(date).getMonth() >= 5 && new Date(date).getMonth() <= 10;
    const highWindRisk = windSpeed > 25; // mph
    const highPrecipitationRisk = precipitation > 2; // inches
    
    return isHurricaneSeason && (highWindRisk || highPrecipitationRisk);
  }

  /**
   * Mock weather data for fallback
   */
  private getMockWeatherData(lat: number, lng: number): AccuWeatherResponse {
    return {
      current: {
        temperature: 82,
        condition: 'Partly Cloudy',
        humidity: 75,
        windSpeed: 12,
        windDirection: 180,
        pressure: 30.15,
        visibility: 10,
        uvIndex: 7,
        timestamp: new Date().toISOString(),
      },
      alerts: [],
      location: {
        name: 'Miami, FL',
        lat,
        lng,
      },
    };
  }

  /**
   * Mock forecast data for fallback
   */
  private getMockForecastData(lat: number, lng: number): AccuWeatherForecastResponse {
    const forecast: AccuWeatherForecast[] = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const baseTemp = 82 + Math.sin(i * 0.5) * 8;
      const windSpeed = 8 + Math.random() * 15;
      const precipitation = Math.random() * 3;
      
      forecast.push({
        date: dateString,
        high: Math.round(baseTemp + Math.random() * 5),
        low: Math.round(baseTemp - Math.random() * 8),
        condition: this.getRandomCondition(),
        precipitation: Math.round(precipitation * 100) / 100,
        windSpeed: Math.round(windSpeed * 10) / 10,
        humidity: Math.round(70 + Math.random() * 20),
        isHurricaneRisk: this.isHurricaneRisk(windSpeed, precipitation, dateString),
      });
    }

    return {
      forecast,
      location: {
        name: 'Miami, FL',
        lat,
        lng,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  private getRandomCondition(): string {
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }
}
