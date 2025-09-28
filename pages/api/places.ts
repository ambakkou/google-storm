import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, lat, lng, radius = 2500, openNow = false, q } = req.query;
    const key = process.env.GCP_SERVER_MAPS_KEY;
    const loc = `${lat},${lng}`;

  // Decide query: provide sensible defaults for each supported type
  const textQuery = q || (type === 'clinic' ? 'free clinic emergency medical'
              : type === 'food_bank' ? 'food bank food pantry emergency food'
              : type === 'shelter' ? 'homeless shelter emergency shelter'
              : type === 'police' ? 'police station law enforcement'
              : type === 'fire' ? 'fire station fire department' : '');

    if (!textQuery) return res.status(200).json({ results: [] });

    // Fallback mock data when API key is not available
    if (!key) {
      console.warn('GCP_SERVER_MAPS_KEY not configured, returning mock data');
      const mockResults = generateMockPlaces(type as string, lat as string, lng as string);
      return res.status(200).json({ results: mockResults });
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.set('query', String(textQuery));
    url.searchParams.set('location', String(loc));
    url.searchParams.set('radius', String(radius));
    if (openNow) url.searchParams.set('opennow', 'true');
    url.searchParams.set('key', key);

    const r = await fetch(url.toString());
    const data = await r.json();

    const results = (data.results || []).map((p: any) => ({
      id: p.place_id,
      name: p.name,
      type,
      address: p.formatted_address,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      openNow: p.opening_hours?.open_now ?? null,
      source: 'places',
      url: `https://maps.google.com/?cid=${p.place_id}`
    }));

    res.status(200).json({ results });
  } catch (e:any) {
    console.warn('Places API failed, returning mock data:', e);
    const mockResults = generateMockPlaces(req.query.type as string, req.query.lat as string, req.query.lng as string);
    res.status(200).json({ results: mockResults });
  }
}

function generateMockPlaces(type: string, lat: string, lng: string) {
  const baseLat = parseFloat(lat) || 25.774;
  const baseLng = parseFloat(lng) || -80.193;
  
  if (type === 'food_bank') {
    return [
      {
        id: 'mock-food-1',
        name: 'Miami Community Food Bank',
        type: 'food_bank',
        address: '155 NW 15th St, Miami, FL 33136',
        lat: baseLat + 0.01,
        lng: baseLng - 0.01,
        openNow: true,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-food-2', 
        name: 'Downtown Food Pantry',
        type: 'food_bank',
        address: '200 Biscayne Blvd, Miami, FL 33132',
        lat: baseLat - 0.005,
        lng: baseLng + 0.005,
        openNow: false,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-food-3',
        name: 'Emergency Food Distribution Center',
        type: 'food_bank',
        address: '450 SW 8th St, Miami, FL 33130',
        lat: baseLat + 0.003,
        lng: baseLng + 0.008,
        openNow: true,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-food-4',
        name: 'Coral Gables Food Bank',
        type: 'food_bank',
        address: '2801 SW 37th Ave, Coral Gables, FL 33133',
        lat: baseLat - 0.008,
        lng: baseLng - 0.003,
        openNow: false,
        source: 'mock',
        url: '#'
      }
    ];
  }
  
  if (type === 'clinic') {
    return [
      {
        id: 'mock-clinic-1',
        name: 'Miami Free Clinic',
        type: 'clinic',
        address: '1800 NW 10th Ave, Miami, FL 33136',
        lat: baseLat + 0.008,
        lng: baseLng - 0.008,
        openNow: true,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-clinic-2',
        name: 'Community Health Center',
        type: 'clinic', 
        address: '1500 NW 7th St, Miami, FL 33125',
        lat: baseLat - 0.012,
        lng: baseLng + 0.012,
        openNow: false,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-clinic-3',
        name: 'Emergency Medical Services',
        type: 'clinic',
        address: '320 Biscayne Blvd, Miami, FL 33132',
        lat: baseLat + 0.005,
        lng: baseLng + 0.002,
        openNow: true,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-clinic-4',
        name: 'Homeless Health Care Center',
        type: 'clinic',
        address: '2200 NW 7th Ave, Miami, FL 33127',
        lat: baseLat - 0.006,
        lng: baseLng - 0.010,
        openNow: false,
        source: 'mock',
        url: '#'
      }
    ];
  }
  
  if (type === 'police') {
    return [
      {
        id: 'mock-police-1',
        name: 'Miami Police Dept. - Central',
        type: 'police',
        address: '400 NW 2nd Ave, Miami, FL',
        lat: baseLat + 0.005,
        lng: baseLng - 0.003,
        openNow: true,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-police-2',
        name: 'Little Havana Police Station',
        type: 'police',
        address: '501 SW 12th Ave, Miami, FL',
        lat: baseLat - 0.007,
        lng: baseLng + 0.004,
        openNow: true,
        source: 'mock',
        url: '#'
      }
    ]
  }

  if (type === 'fire') {
    return [
      {
        id: 'mock-fire-1',
        name: 'Miami Fire Rescue Station 1',
        type: 'fire',
        address: '200 NW 2nd Ave, Miami, FL',
        lat: baseLat + 0.006,
        lng: baseLng - 0.002,
        openNow: true,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-fire-2',
        name: 'Coral Gables Fire Station',
        type: 'fire',
        address: '2200 Ponce de Leon Blvd, Coral Gables, FL',
        lat: baseLat - 0.01,
        lng: baseLng + 0.01,
        openNow: true,
        source: 'mock',
        url: '#'
      }
    ]
  }

  if (type === 'shelter') {
    return [
      {
        id: 'mock-shelter-1',
        name: 'Downtown Emergency Shelter',
        type: 'shelter',
        address: '123 Main St, Miami, FL',
        lat: baseLat + 0.004,
        lng: baseLng + 0.002,
        openNow: true,
        source: 'mock',
        url: '#'
      },
      {
        id: 'mock-shelter-2',
        name: 'Harbor Light Shelter',
        type: 'shelter',
        address: '78 Harbor Way, Miami, FL',
        lat: baseLat - 0.006,
        lng: baseLng - 0.005,
        openNow: false,
        source: 'mock',
        url: '#'
      }
    ]
  }

  return [];
}
