import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage & { body: any }, res: ServerResponse & { status: (code: number) => any; json: (data: any) => void }) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token is required' });

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(401).json({ error: data.error, description: data.error_description });
    }

    return res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (e) {
    console.error('Token refresh error:', e);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
}