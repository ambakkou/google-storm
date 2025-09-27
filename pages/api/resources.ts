import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestoreInstance } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  
  try {
    const db = getFirestoreInstance();
    const snapshot = await db.collection('resources').orderBy('approvedAt', 'desc').get();
    
    const resources = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        notes: data.notes,
        source: data.source || 'community',
        approvedAt: data.approvedAt,
        openNow: null, // Community resources don't have real-time hours
        url: null
      };
    });
    
    res.status(200).json({ resources });
  } catch (error: any) {
    console.error('Error fetching approved resources:', error);
    
    // If Firebase is not configured, return empty array instead of error
    if (error.message.includes('Firebase not properly configured') || 
        error.message.includes('Could not load the default credentials')) {
      console.warn('Firebase not configured, returning empty resources array');
      return res.status(200).json({ resources: [] });
    }
    
    res.status(500).json({ error: error.message });
  }
}
