import type { NextApiRequest, NextApiResponse } from 'next'
import { HurricaneAPIService } from '@/lib/hurricane-apis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const hurricaneService = HurricaneAPIService.getInstance()
    
    // Fetch potential hurricanes and tropical disturbances
    const response = await hurricaneService.getPotentialHurricanes()

    res.status(200).json(response)
  } catch (error: any) {
    console.error('Error fetching potential hurricane data:', error)
    res.status(500).json({ 
      error: 'Failed to fetch potential hurricane data',
      details: error.message,
      hurricanes: [], // Return empty array on error
      lastUpdated: new Date().toISOString(),
      source: 'Error' // Indicate error source
    })
  }
}
