import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lat = '25.774', lng = '-80.193', radius = '10000' } = req.query
    const key = process.env.GCP_SERVER_MAPS_KEY || process.env.NEXT_PUBLIC_MAPS_API_KEY

    const makeSearch = async (query: string) => {
      if (!key) {
        // return mock items
        if (query.includes('police')) {
          return [
            { id: 'mock-police-1', name: 'Miami Police Dept. - Central', type: 'police', address: '400 NW 2nd Ave, Miami, FL', lat: 25.783, lng: -80.193, openNow: true, source: 'mock' }
          ]
        }
        return [
          { id: 'mock-fire-1', name: 'Miami Fire Rescue Station 1', type: 'fire', address: '200 NW 2nd Ave, Miami, FL', lat: 25.781, lng: -80.191, openNow: true, source: 'mock' }
        ]
      }

      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
      url.searchParams.set('query', query)
      url.searchParams.set('location', `${lat},${lng}`)
      url.searchParams.set('radius', String(radius))
      url.searchParams.set('key', key)

      const r = await fetch(url.toString())
      const data = await r.json()
      return (data.results || []).map((p: any) => ({
        id: p.place_id,
        name: p.name,
        type: query.includes('police') ? 'police' : 'fire',
        address: p.formatted_address,
        lat: p.geometry?.location?.lat,
        lng: p.geometry?.location?.lng,
        openNow: p.opening_hours?.open_now ?? null,
        source: 'places',
      }))
    }

    const police = await makeSearch('police station')
    const fire = await makeSearch('fire station')

    return res.status(200).json({ results: [...police, ...fire] })
  } catch (e:any) {
    console.error('emergency-list error', e)
    return res.status(500).json({ error: String(e) })
  }
}
