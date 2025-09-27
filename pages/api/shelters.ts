import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  
  try {
    // Return the shelter data directly
    const shelterData = [
      {"id":"seed-shelter-1","name":"Miami-Dade Emergency Shelter","type":"shelter","address":"123 SW 8th St, Miami, FL 33130","lat":25.774,"lng":-80.193,"openNow":true,"source":"seed"},
      {"id":"seed-shelter-2","name":"Downtown Crisis Shelter","type":"shelter","address":"200 Biscayne Blvd, Miami, FL 33132","lat":25.762,"lng":-80.205,"openNow":false,"source":"seed"},
      {"id":"seed-shelter-3","name":"Homeless Services Center","type":"shelter","address":"155 NW 15th St, Miami, FL 33136","lat":25.785,"lng":-80.185,"openNow":true,"source":"seed"}
    ];
    
    res.status(200).json(shelterData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
