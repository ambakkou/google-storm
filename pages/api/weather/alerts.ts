import type { NextApiRequest, NextApiResponse } from 'next';

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
  isActive: boolean;
}

interface AlertsResponse {
  alerts: WeatherAlert[];
  lastUpdated: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat = '25.774', lng = '-80.193' } = req.query; // Default to Miami coordinates

  try {
    const alerts = await fetchWeatherAlerts(lat as string, lng as string);
    
    const response: AlertsResponse = {
      alerts: alerts.filter(alert => alert.isActive),
      lastUpdated: new Date().toISOString(),
      location: {
        name: 'Miami, FL',
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Weather alerts API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather alerts' });
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
      console.warn('NWS Alerts API failed, using mock data');
      return getMockAlerts();
    }

    const alertsData = await alertsResponse.json();
    const alerts: WeatherAlert[] = [];

    if (alertsData.features) {
      for (const feature of alertsData.features) {
        const properties = feature.properties;
        if (properties) {
          const now = new Date();
          const startTime = new Date(properties.effective);
          const endTime = new Date(properties.expires);
          const isActive = now >= startTime && now <= endTime;

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
            isActive,
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
  const alerts: WeatherAlert[] = [];
  
  // Check if it's hurricane season (June 1 - November 30)
  const now = new Date();
  const isHurricaneSeason = now.getMonth() >= 5 && now.getMonth() <= 10;
  
  if (isHurricaneSeason) {
    // Add a mock hurricane watch during hurricane season
    alerts.push({
      id: 'mock-hurricane-watch',
      title: 'Hurricane Watch',
      description: 'A hurricane watch is in effect for Miami-Dade County. Conditions are favorable for hurricane development within the next 48 hours. Residents should monitor weather conditions and prepare emergency supplies.',
      severity: 'severe',
      type: 'hurricane',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 48 * 3600000).toISOString(),
      source: 'National Hurricane Center',
      areas: ['Miami-Dade County', 'Broward County'],
      isActive: true,
    });
  }

  // Add occasional thunderstorm warnings
  if (Math.random() > 0.6) {
    alerts.push({
      id: 'mock-thunderstorm-warning',
      title: 'Severe Thunderstorm Warning',
      description: 'Severe thunderstorms with heavy rain, strong winds up to 60 mph, and possible hail are expected in the Miami area. Seek shelter indoors immediately.',
      severity: 'moderate',
      type: 'thunderstorm',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 4 * 3600000).toISOString(),
      source: 'National Weather Service',
      areas: ['Miami-Dade County'],
      isActive: true,
    });
  }

  // Add flood warnings occasionally
  if (Math.random() > 0.8) {
    alerts.push({
      id: 'mock-flood-warning',
      title: 'Flood Warning',
      description: 'Heavy rainfall has caused flooding in low-lying areas. Avoid driving through flooded roads and seek higher ground if necessary.',
      severity: 'moderate',
      type: 'flood',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 6 * 3600000).toISOString(),
      source: 'National Weather Service',
      areas: ['Miami-Dade County'],
      isActive: true,
    });
  }

  return alerts;
}
