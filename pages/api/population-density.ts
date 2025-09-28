import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  
  try {
    const { lat, lng, radius = 5000 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    // For now, we'll use mock data based on Miami area patterns
    // In production, you could integrate with:
    // - US Census API
    // - Google Places API for business density
    // - Real-time crowd data APIs
    
    const baseLat = parseFloat(lat as string);
    const baseLng = parseFloat(lng as string);
    
    const densityZones = generatePopulationDensityZones(baseLat, baseLng);
    
    res.status(200).json({ 
      zones: densityZones,
      timestamp: new Date().toISOString(),
      source: 'population_density'
    });
  } catch (error: any) {
    console.error('Error fetching population density:', error);
    res.status(500).json({ error: error.message });
  }
}

function generatePopulationDensityZones(centerLat: number, centerLng: number) {
  const zones = [];
  
  // Generate density zones around Miami area
  const densityData = [
    // High density areas (avoid during crowding)
    { 
      name: "Downtown Miami", 
      lat: 25.7617, lng: -80.1918, 
      density: "very_high", 
      population: 85000, 
      riskLevel: "high",
      description: "Dense urban core with high foot traffic"
    },
    { 
      name: "South Beach", 
      lat: 25.7907, lng: -80.1300, 
      density: "very_high", 
      population: 65000, 
      riskLevel: "high",
      description: "Tourist area with heavy crowds"
    },
    { 
      name: "Brickell", 
      lat: 25.7663, lng: -80.1917, 
      density: "high", 
      population: 45000, 
      riskLevel: "medium",
      description: "Business district, crowded during work hours"
    },
    
    // Medium density areas
    { 
      name: "Coral Gables", 
      lat: 25.7214, lng: -80.2683, 
      density: "medium", 
      population: 25000, 
      riskLevel: "low",
      description: "Residential area with moderate density"
    },
    { 
      name: "Coconut Grove", 
      lat: 25.7282, lng: -80.2436, 
      density: "medium", 
      population: 20000, 
      riskLevel: "low",
      description: "Mixed residential/commercial area"
    },
    
    // Low density areas (safer for social distancing)
    { 
      name: "Homestead", 
      lat: 25.4687, lng: -80.4776, 
      density: "low", 
      population: 8000, 
      riskLevel: "very_low",
      description: "Suburban area with low population density"
    },
    { 
      name: "Key Biscayne", 
      lat: 25.6948, lng: -80.1624, 
      density: "low", 
      population: 12000, 
      riskLevel: "very_low",
      description: "Island community with sparse population"
    },
    { 
      name: "Pinecrest", 
      lat: 25.6615, lng: -80.3017, 
      density: "low", 
      population: 15000, 
      riskLevel: "very_low",
      description: "Suburban residential area"
    }
  ];
  
  // Calculate distance from center point and add radius info
  return densityData.map(zone => {
    const distance = calculateDistance(centerLat, centerLng, zone.lat, zone.lng);
    
    return {
      ...zone,
      id: `density-${zone.name.toLowerCase().replace(/\s+/g, '-')}`,
      distance: Math.round(distance * 1000), // Convert to meters
      radius: getDensityRadius(zone.density),
      color: getDensityColor(zone.density),
      opacity: getDensityOpacity(zone.density),
      crowdingScore: calculateCrowdingScore(zone.population, zone.density)
    };
  }).filter(zone => zone.distance <= 25000); // Within 25km radius
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getDensityRadius(density: string): number {
  switch (density) {
    case 'very_high': return 1500;
    case 'high': return 2000;
    case 'medium': return 2500;
    case 'low': return 3000;
    default: return 2000;
  }
}

function getDensityColor(density: string): string {
  switch (density) {
    case 'very_high': return '#dc2626'; // Red - avoid
    case 'high': return '#ea580c'; // Orange - caution
    case 'medium': return '#facc15'; // Yellow - moderate
    case 'low': return '#16a34a'; // Green - safe
    default: return '#6b7280';
  }
}

function getDensityOpacity(density: string): number {
  switch (density) {
    case 'very_high': return 0.8;
    case 'high': return 0.6;
    case 'medium': return 0.4;
    case 'low': return 0.3;
    default: return 0.4;
  }
}

function calculateCrowdingScore(population: number, density: string): number {
  const densityMultiplier = {
    'very_high': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  }[density] || 2;
  
  return Math.min(100, Math.round((population / 1000) * densityMultiplier));
}
