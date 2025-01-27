import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { createGoogleAuthClient } from '@/lib/auth';
import { GoogleCalendarPlugin } from '@/plugins/calendar/GoogleCalendarPlugin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });
  if (!session?.accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const auth = createGoogleAuthClient(session.accessToken as string);
  const calendarPlugin = new GoogleCalendarPlugin(auth);

  switch (req.method) {
    case 'POST':
      try {
        const { start, end, duration } = req.body;
        
        if (!start || !end || !duration) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await calendarPlugin.findAvailableTimeSlots({
          start: new Date(start),
          end: new Date(end),
          duration: parseInt(duration)
        });

        res.status(200).json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
      break;

    case 'GET':
      try {
        const { start, end } = req.query;
        if (!start || !end) {
          return res.status(400).json({ error: 'Start and end times are required' });
        }

        const result = await calendarPlugin.checkAvailability({
          start: new Date(start as string),
          end: new Date(end as string)
        });

        res.status(200).json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
