import type { NextApiRequest, NextApiResponse } from 'next';

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
    // Fetch forecast data from OpenWeatherMap
    const weatherApiKey = process.env.OPENWEATHER_API_KEY;
    if (!weatherApiKey) {
      console.warn('OpenWeather API key not found, using mock data');
      return res.status(200).json(getMockForecastData(lat as string, lng as string));
    }

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${weatherApiKey}&units=imperial`;
    const forecastResponse = await fetch(forecastUrl);
    
    if (!forecastResponse.ok) {
      console.warn('Forecast API failed, using mock data');
      return res.status(200).json(getMockForecastData(lat as string, lng as string));
    }

    const forecastData = await forecastResponse.json();
    
    // Process the 5-day forecast
    const forecast: ForecastDay[] = [];
    const dailyData = new Map<string, any[]>();

    // Group 3-hour forecasts by day
    forecastData.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(item);
    });

    // Calculate daily forecasts
    dailyData.forEach((dayData, date) => {
      const temps = dayData.map(item => item.main.temp);
      const high = Math.round(Math.max(...temps));
      const low = Math.round(Math.min(...temps));
      const avgCondition = dayData[Math.floor(dayData.length / 2)].weather[0].main;
      const avgPrecipitation = dayData.reduce((sum, item) => sum + (item.rain?.['3h'] || 0), 0) / dayData.length;
      const avgWindSpeed = dayData.reduce((sum, item) => sum + item.wind.speed, 0) / dayData.length;
      const avgHumidity = dayData.reduce((sum, item) => sum + item.main.humidity, 0) / dayData.length;

      forecast.push({
        date,
        high,
        low,
        condition: avgCondition,
        precipitation: Math.round(avgPrecipitation * 100) / 100,
        windSpeed: Math.round(avgWindSpeed * 10) / 10,
        humidity: Math.round(avgHumidity),
        isHurricaneRisk: isHurricaneRisk(avgWindSpeed, avgPrecipitation, date),
      });
    });

    const response: ForecastResponse = {
      forecast: forecast.slice(0, 5), // 5-day forecast
      location: {
        name: forecastData.city.name,
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string),
      },
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Forecast API error:', error);
    // Return mock data as fallback
    res.status(200).json(getMockForecastData(lat as string, lng as string));
  }
}

function isHurricaneRisk(windSpeed: number, precipitation: number, date: string): boolean {
  // Simple heuristic for hurricane risk
  const isHurricaneSeason = new Date(date).getMonth() >= 5 && new Date(date).getMonth() <= 10;
  const highWindRisk = windSpeed > 25; // mph
  const highPrecipitationRisk = precipitation > 2; // inches
  
  return isHurricaneSeason && (highWindRisk || highPrecipitationRisk);
}

function getMockForecastData(lat: string, lng: string): ForecastResponse {
  const forecast: ForecastDay[] = [];
  const today = new Date();
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    
    // Simulate varying weather conditions
    const baseTemp = 82 + Math.sin(i * 0.5) * 8;
    const windSpeed = 8 + Math.random() * 15;
    const precipitation = Math.random() * 3;
    
    forecast.push({
      date: dateString,
      high: Math.round(baseTemp + Math.random() * 5),
      low: Math.round(baseTemp - Math.random() * 8),
      condition: getRandomCondition(),
      precipitation: Math.round(precipitation * 100) / 100,
      windSpeed: Math.round(windSpeed * 10) / 10,
      humidity: Math.round(70 + Math.random() * 20),
      isHurricaneRisk: isHurricaneRisk(windSpeed, precipitation, dateString),
    });
  }

  return {
    forecast,
    location: {
      name: 'Miami, FL',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    },
    lastUpdated: new Date().toISOString(),
  };
}

function getRandomCondition(): string {
  const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm'];
  return conditions[Math.floor(Math.random() * conditions.length)];
}
