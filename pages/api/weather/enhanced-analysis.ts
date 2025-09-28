import type { NextApiRequest, NextApiResponse } from 'next';
import { EnhancedWeatherService } from '@/lib/enhanced-weather-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat = '25.774', lng = '-80.193' } = req.query; // Default to Miami coordinates

  try {
    const enhancedWeatherService = EnhancedWeatherService.getInstance();
    const analysis = await enhancedWeatherService.getWeatherAnalysis(
      parseFloat(lat as string), 
      parseFloat(lng as string)
    );

    if (!analysis) {
      return res.status(200).json({ 
        hasWeatherCondition: false,
        message: 'No significant weather conditions detected',
        lastUpdated: new Date().toISOString()
      });
    }

    const recommendation = enhancedWeatherService.getWeatherRecommendation(analysis);
    const isHurricaneRiskZone = enhancedWeatherService.isHurricaneRiskZone(
      parseFloat(lat as string), 
      parseFloat(lng as string)
    );

    res.status(200).json({
      hasWeatherCondition: true,
      condition: analysis,
      recommendation,
      isHurricaneRiskZone,
      location: {
        name: 'Miami, FL',
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string),
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Enhanced weather analysis API error:', error);
    res.status(500).json({ error: 'Failed to analyze weather conditions' });
  }
}
