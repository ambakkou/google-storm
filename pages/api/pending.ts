import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestoreInstance } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  
  try {
    const db = getFirestoreInstance();
    const { name, type, address, lat, lng, notes, submittedBy } = req.body;

    // Ensure lat and lng are valid numbers, default to 0 if undefined
    const validLat = typeof lat === 'number' && !isNaN(lat) ? lat : 0;
    const validLng = typeof lng === 'number' && !isNaN(lng) ? lng : 0;

    const doc = {
      name, 
      type, 
      address, 
      lat: validLat, 
      lng: validLng, 
      notes: notes || '',
      source: 'community',
      submittedBy: submittedBy || 'anon',
      submittedAt: new Date().toISOString(),
      aiReview: { status: 'pending', notes: '' }
    };
    const ref = await db.collection('pendingResources').add(doc);
    res.status(200).json({ id: ref.id });
  } catch (error: any) {
    console.error('Error adding pending resource:', error);
    
    // If Firebase is not configured, return a mock response
    if (error.message.includes('Firebase not properly configured') || 
        error.message.includes('Could not load the default credentials')) {
      console.warn('Firebase not configured, returning mock response');
      return res.status(200).json({ id: 'mock-pending-id' });
    }
    
    res.status(500).json({ error: error.message });
  }
}