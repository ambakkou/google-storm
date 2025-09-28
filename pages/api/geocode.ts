import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: 'Address is required' });
    
    const key = process.env.GCP_SERVER_MAPS_KEY || process.env.NEXT_PUBLIC_MAPS_API_KEY;

    if (!key) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }
    
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', String(address));
    url.searchParams.set('key', key);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('Geocoding response for:', address, 'Status:', data.status);

    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      console.log('Geocoded coordinates:', { lat, lng });
      res.status(200).json({ lat, lng });
    } else {
      console.log('Geocoding failed:', data.status, data.error_message);
      res.status(404).json({ error: `Address not found: ${data.status}` });
    }
  } catch (error: any) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: error.message });
  }
}
