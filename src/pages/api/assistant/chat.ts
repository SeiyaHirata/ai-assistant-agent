import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { AIAssistant } from '@/lib/assistant';
import { createGoogleAuthClient } from '@/lib/auth';
import { GoogleCalendarPlugin } from '@/plugins/calendar/GoogleCalendarPlugin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const assistant = new AIAssistant(process.env.OPENAI_API_KEY!);
    await assistant.initialize();

    // Initialize Google Calendar plugin
    const auth = createGoogleAuthClient(session.accessToken as string);
    const calendarPlugin = new GoogleCalendarPlugin(auth);
    assistant.registerPlugin(calendarPlugin);

    // Process the message
    const response = await assistant.processMessage(message);
    
    res.status(200).json({ response });
  } catch (error: any) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: error.message });
  }
}
