import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lat = '25.774', lng = '-80.193', radius = '5000', q } = req.query
    const key = process.env.GCP_SERVER_MAPS_KEY || process.env.NEXT_PUBLIC_MAPS_API_KEY

  const defaultCity = 'Miami, FL'
  const queryText = String(q || `food bank food pantry emergency food near ${defaultCity}`)

    if (!key) {
      // return mock food bank items
      return res.status(200).json({ results: [
        { id: 'mock-food-1', name: 'Miami Community Food Bank', type: 'food_bank', address: '155 NW 15th St, Miami, FL', lat: 25.784, lng: -80.203, openNow: true, source: 'mock' },
        { id: 'mock-food-2', name: 'Downtown Food Pantry', type: 'food_bank', address: '200 Biscayne Blvd, Miami, FL', lat: 25.776, lng: -80.191, openNow: false, source: 'mock' }
      ] })
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    url.searchParams.set('query', queryText)
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(radius || '5000'))
    url.searchParams.set('key', key)

    const r = await fetch(url.toString())
    const data = await r.json()
    const results = (data.results || []).map((p: any) => ({
      id: p.place_id,
      name: p.name,
      type: 'food_bank',
      address: p.formatted_address,
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
      openNow: p.opening_hours?.open_now ?? null,
      source: 'places',
    }))

    return res.status(200).json({ results })
  } catch (e:any) {
    console.error('food-banks error', e)
    return res.status(500).json({ error: String(e) })
  }
}
