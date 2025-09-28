import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lat = '25.774', lng = '-80.193', radius = '5000', q } = req.query
    const key = process.env.GCP_SERVER_MAPS_KEY || process.env.NEXT_PUBLIC_MAPS_API_KEY

  const defaultCity = 'Miami, FL'
  const queryText = String(q || `clinic free clinic urgent care emergency medical near ${defaultCity}`)

    if (!key) {
      return res.status(200).json({ results: [
        { id: 'mock-clinic-1', name: 'Miami Free Clinic', type: 'clinic', address: '1800 NW 10th Ave, Miami, FL', lat: 25.782, lng: -80.196, openNow: true, source: 'mock' },
        { id: 'mock-clinic-2', name: 'Community Health Center', type: 'clinic', address: '1500 NW 7th St, Miami, FL', lat: 25.772, lng: -80.188, openNow: false, source: 'mock' }
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
      type: 'clinic',
      address: p.formatted_address,
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
      openNow: p.opening_hours?.open_now ?? null,
      source: 'places',
    }))

    return res.status(200).json({ results })
  } catch (e:any) {
    console.error('clinics error', e)
    return res.status(500).json({ error: String(e) })
  }
}
