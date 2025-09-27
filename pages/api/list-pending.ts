import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestoreInstance } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  
  try {
    const db = getFirestoreInstance();
    const snapshot = await db.collection('pendingResources').orderBy('submittedAt', 'desc').get();
    
    const pendingResources = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.() || new Date(doc.data().submittedAt)
    }));
    
    res.status(200).json({ resources: pendingResources });
  } catch (error: any) {
    console.error('Error fetching pending resources:', error);
    
    // If Firebase is not configured, return empty array
    if (error.message.includes('Firebase not properly configured') || 
        error.message.includes('Could not load the default credentials')) {
      console.warn('Firebase not configured, returning empty pending resources array');
      return res.status(200).json({ resources: [] });
    }
    
    res.status(500).json({ error: error.message });
  }
}
