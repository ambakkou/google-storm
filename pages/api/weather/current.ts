import type { NextApiRequest, NextApiResponse } from 'next';

interface WeatherResponse {
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    visibility: number;
    uvIndex: number;
    timestamp: string;
  };
  alerts: WeatherAlert[];
  location: {
    name: string;
    lat: number;
    lng: number;
  };
}

interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  type: 'hurricane' | 'tropical_storm' | 'tornado' | 'flood' | 'thunderstorm' | 'other';
  startTime: string;
  endTime: string;
  source: string;
  areas: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat = '25.774', lng = '-80.193' } = req.query; // Default to Miami coordinates

  try {
    // Fetch current weather data from OpenWeatherMap
    const weatherApiKey = process.env.OPENWEATHER_API_KEY;
    if (!weatherApiKey) {
      console.warn('OpenWeather API key not found, using mock data');
      return res.status(200).json(getMockWeatherData(lat as string, lng as string));
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${weatherApiKey}&units=imperial`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      console.warn('Weather API failed, using mock data');
      return res.status(200).json(getMockWeatherData(lat as string, lng as string));
    }

    const weatherData = await weatherResponse.json();
    
    // Fetch severe weather alerts from National Weather Service
    const alerts = await fetchWeatherAlerts(lat as string, lng as string);

    const response: WeatherResponse = {
      current: {
        temperature: Math.round(weatherData.main.temp),
        condition: weatherData.weather[0].main,
        humidity: weatherData.main.humidity,
        windSpeed: weatherData.wind.speed,
        windDirection: weatherData.wind.deg,
        pressure: weatherData.main.pressure,
        visibility: weatherData.visibility / 1609.34, // Convert meters to miles
        uvIndex: 0, // Would need additional API call for UV index
        timestamp: new Date().toISOString(),
      },
      alerts,
      location: {
        name: weatherData.name,
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Weather API error:', error);
    // Return mock data as fallback
    res.status(200).json(getMockWeatherData(lat as string, lng as string));
  }
}

async function fetchWeatherAlerts(lat: string, lng: string): Promise<WeatherAlert[]> {
  try {
    // Fetch alerts from National Weather Service API
    const alertsUrl = `https://api.weather.gov/alerts?point=${lat},${lng}`;
    const alertsResponse = await fetch(alertsUrl, {
      headers: {
        'User-Agent': 'GoogleStorm/1.0 (Emergency Resource Finder)',
      },
    });

    if (!alertsResponse.ok) {
      console.warn('NWS Alerts API failed');
      return getMockAlerts();
    }

    const alertsData = await alertsResponse.json();
    const alerts: WeatherAlert[] = [];

    if (alertsData.features) {
      for (const feature of alertsData.features) {
        const properties = feature.properties;
        if (properties) {
          const alert: WeatherAlert = {
            id: properties.id,
            title: properties.headline || properties.event || 'Weather Alert',
            description: properties.description || '',
            severity: mapSeverity(properties.severity),
            type: mapAlertType(properties.event),
            startTime: properties.effective || new Date().toISOString(),
            endTime: properties.expires || new Date(Date.now() + 3600000).toISOString(),
            source: 'National Weather Service',
            areas: properties.areaDesc ? properties.areaDesc.split(';') : [],
          };
          alerts.push(alert);
        }
      }
    }

    return alerts.length > 0 ? alerts : getMockAlerts();
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    return getMockAlerts();
  }
}

function mapSeverity(nwsSeverity: string): WeatherAlert['severity'] {
  switch (nwsSeverity?.toLowerCase()) {
    case 'minor': return 'minor';
    case 'moderate': return 'moderate';
    case 'severe': return 'severe';
    case 'extreme': return 'extreme';
    default: return 'moderate';
  }
}

function mapAlertType(event: string): WeatherAlert['type'] {
  const eventLower = event?.toLowerCase() || '';
  if (eventLower.includes('hurricane')) return 'hurricane';
  if (eventLower.includes('tropical')) return 'tropical_storm';
  if (eventLower.includes('tornado')) return 'tornado';
  if (eventLower.includes('flood')) return 'flood';
  if (eventLower.includes('thunderstorm')) return 'thunderstorm';
  return 'other';
}

function getMockWeatherData(lat: string, lng: string): WeatherResponse {
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
    alerts: getMockAlerts(),
    location: {
      name: 'Miami, FL',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    },
  };
}

function getMockAlerts(): WeatherAlert[] {
  // Check if it's hurricane season (June 1 - November 30)
  const now = new Date();
  const isHurricaneSeason = now.getMonth() >= 5 && now.getMonth() <= 10;
  
  const alerts: WeatherAlert[] = [];
  
  if (isHurricaneSeason) {
    // Add a mock hurricane watch during hurricane season
    alerts.push({
      id: 'mock-hurricane-watch',
      title: 'Hurricane Watch',
      description: 'A hurricane watch is in effect for Miami-Dade County. Conditions are favorable for hurricane development within the next 48 hours.',
      severity: 'severe',
      type: 'hurricane',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 48 * 3600000).toISOString(),
      source: 'National Hurricane Center',
      areas: ['Miami-Dade County', 'Broward County'],
    });
  }

  // Add occasional thunderstorm warnings
  if (Math.random() > 0.7) {
    alerts.push({
      id: 'mock-thunderstorm-warning',
      title: 'Severe Thunderstorm Warning',
      description: 'Severe thunderstorms with heavy rain, strong winds, and possible hail are expected in the area.',
      severity: 'moderate',
      type: 'thunderstorm',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 4 * 3600000).toISOString(),
      source: 'National Weather Service',
      areas: ['Miami-Dade County'],
    });
  }

  return alerts;
}
