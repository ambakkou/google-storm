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
    res.status(500).json({ error: error.message });
  }
}
