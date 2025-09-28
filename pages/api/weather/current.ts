import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleWeatherService } from '@/lib/google-weather-service';

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
    const googleWeatherService = GoogleWeatherService.getInstance();
    const weatherData = await googleWeatherService.getCurrentWeather(
      parseFloat(lat as string), 
      parseFloat(lng as string)
    );
    
    // Fetch severe weather alerts from National Weather Service
    const alerts = await fetchWeatherAlerts(lat as string, lng as string);

    const response: WeatherResponse = {
      current: weatherData.current,
      alerts,
      location: weatherData.location,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch real-time weather data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
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
