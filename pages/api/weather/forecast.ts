import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleWeatherService } from '@/lib/google-weather-service';

interface ForecastDay {
  date: string;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  isHurricaneRisk: boolean;
}

interface ForecastResponse {
  forecast: ForecastDay[];
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  lastUpdated: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat = '25.774', lng = '-80.193' } = req.query; // Default to Miami coordinates

  try {
    const googleWeatherService = GoogleWeatherService.getInstance();
    const forecastData = await googleWeatherService.getForecast(
      parseFloat(lat as string), 
      parseFloat(lng as string)
    );

    const response: ForecastResponse = {
      forecast: forecastData.forecast,
      location: forecastData.location,
      lastUpdated: forecastData.lastUpdated,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Forecast API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch real-time forecast data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function isHurricaneRisk(windSpeed: number, precipitation: number, date: string): boolean {
  // Simple heuristic for hurricane risk
  const isHurricaneSeason = new Date(date).getMonth() >= 5 && new Date(date).getMonth() <= 10;
  const highWindRisk = windSpeed > 25; // mph
  const highPrecipitationRisk = precipitation > 2; // inches
  
  return isHurricaneSeason && (highWindRisk || highPrecipitationRisk);
}

