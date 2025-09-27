import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestoreInstance } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.body;
  const db = getFirestoreInstance();

  const pendRef = db.collection('pendingResources').doc(id);
  const snap = await pendRef.get();
  if (!snap.exists) return res.status(404).json({ error: 'Not found' });

  const data = snap.data()!;
  await db.collection('resources').add({
    ...data,
    approvedAt: new Date().toISOString()
  });
  await pendRef.delete();
  res.status(200).json({ ok: true });
}
