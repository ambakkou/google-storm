import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cachePath = path.join(process.cwd(), 'data', 'cache', 'open-status.json')
    if (!fs.existsSync(cachePath)) return res.status(200).json({})
    const raw = fs.readFileSync(cachePath, 'utf8')
    const parsed = JSON.parse(raw)
    return res.status(200).json(parsed)
  } catch (e:any) {
    return res.status(500).json({ error: String(e) })
  }
}
