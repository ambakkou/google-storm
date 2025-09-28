import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

type Item = {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  openNow?: boolean | null
  address?: string
  source?: string
}

async function queryPlaceOpenNow(name: string, address: string | undefined, lat: number, lng: number) {
  const key = process.env.GCP_SERVER_MAPS_KEY || process.env.NEXT_PUBLIC_MAPS_API_KEY
  if (!key) return { openNow: null, placeId: null, method: 'no-key' }
  try {
    // Try FindPlaceFromText with name + address (more accurate for business matches)
    const findInput = address ? `${name} ${address}` : name
    const findUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json')
    findUrl.searchParams.set('input', findInput)
    findUrl.searchParams.set('inputtype', 'textquery')
    findUrl.searchParams.set('fields', 'place_id,opening_hours,formatted_address')
    findUrl.searchParams.set('key', key)

    const fr = await fetch(findUrl.toString())
    const fdata = await fr.json()
    const f = (fdata.candidates || [])[0]
    if (f) {
      return { openNow: f.opening_hours?.open_now ?? null, placeId: f.place_id ?? null, method: 'findplace' }
    }

    // Fallback: TextSearch with name + location
    const tsUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    tsUrl.searchParams.set('query', `${name}`)
    tsUrl.searchParams.set('location', `${lat},${lng}`)
    tsUrl.searchParams.set('radius', '5000')
    tsUrl.searchParams.set('key', key)
    const tr = await fetch(tsUrl.toString())
    const tdata = await tr.json()
    const p = (tdata.results || [])[0]
    if (!p) return { openNow: null, placeId: null, method: 'textsearch-none' }
    return { openNow: p.opening_hours?.open_now ?? null, placeId: p.place_id ?? null, method: 'textsearch' }
  } catch (e) {
    console.warn('Places lookup failed for', name, e)
    return { openNow: null, placeId: null, method: 'error' }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const type = String(req.query.type || '')
    if (!['shelter', 'food_bank', 'clinic'].includes(type)) {
      return res.status(400).json({ error: 'invalid type' })
    }

    const fileMap: Record<string,string> = {
      shelter: path.join(process.cwd(), 'public', 'data', 'shelters-miami.json'),
      food_bank: path.join(process.cwd(), 'public', 'data', 'food-banks-miami.json'),
      clinic: path.join(process.cwd(), 'public', 'data', 'clinics-miami.json'),
    }

    const filePath = fileMap[type]
    if (!fs.existsSync(filePath)) return res.status(200).json({ results: [] })
    const raw = fs.readFileSync(filePath, 'utf8')
    const items: Item[] = JSON.parse(raw)

    // Load existing cache
    const cacheDir = path.join(process.cwd(), 'data', 'cache')
    const cachePath = path.join(cacheDir, 'open-status.json')
    let cache: Record<string, { openNow?: boolean | null, lastUpdated?: string }> = {}
    if (fs.existsSync(cachePath)) {
      try { cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')) } catch (_) { cache = {} }
    }

  const updated: Record<string, any> = { ...cache }
  let updatedCount = 0
  const perItemDebug: Record<string, any> = {}

    // Query Places for each item when possible (sequential to avoid rate limits)
    for (const it of items) {
      try {
        const result = await queryPlaceOpenNow(it.name, it.address, it.lat, it.lng)
        const openNow = result?.openNow ?? null
        const placeId = result?.placeId ?? null
        const method = result?.method ?? null
        perItemDebug[it.id] = { placeId, method }
        if (openNow !== null) {
          updated[it.id] = { openNow, lastUpdated: new Date().toISOString(), placeId, method }
          it.openNow = openNow
          updatedCount++
        } else {
          // fall back to cache or static file value
          it.openNow = cache[it.id]?.openNow ?? it.openNow ?? null
        }
      } catch (e) {
        it.openNow = cache[it.id]?.openNow ?? it.openNow ?? null
        perItemDebug[it.id] = { error: String(e) }
      }
    }

    // Write back cache (best-effort)
    try {
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
      fs.writeFileSync(cachePath, JSON.stringify(updated, null, 2), 'utf8')
    } catch (e) {
      console.warn('Failed to write open-status cache', e)
    }

    const meta = {
      keyPresent: Boolean(process.env.GCP_SERVER_MAPS_KEY || process.env.NEXT_PUBLIC_MAPS_API_KEY),
      updatedCount,
      cachePath,
      perItemDebug,
    }

    return res.status(200).json({ results: items, meta })
  } catch (e:any) {
    console.error('static-list error', e)
    return res.status(500).json({ error: String(e) })
  }
}
