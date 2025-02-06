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
    case 'GET':
      try {
        const { start, end } = req.query;
        if (!start || !end) {
          return res.status(400).json({ error: 'Start and end dates are required' });
        }

        const events = await calendarPlugin.getEvents({
          start: new Date(start as string),
          end: new Date(end as string)
        });

        res.status(200).json(events);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
      break;

    case 'POST':
      try {
        const { summary, description, start, end, attendees } = req.body;
        
        if (!summary || !start || !end) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const event = {
          summary,
          description,
          start: {
            dateTime: new Date(start).toISOString(),
            timeZone: 'Asia/Tokyo',
          },
          end: {
            dateTime: new Date(end).toISOString(),
            timeZone: 'Asia/Tokyo',
          },
          attendees: attendees?.map((email: string) => ({ email })),
        };

        const result = await calendarPlugin.createEvent(event);
        res.status(201).json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
