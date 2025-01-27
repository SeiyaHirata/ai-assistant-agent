import { GoogleCalendarPlugin } from '@/plugins/calendar/GoogleCalendarPlugin';
import { AIAssistant } from '@/lib/assistant';
import { OAuth2Client } from 'google-auth-library';

describe('Calendar Integration Tests', () => {
  let assistant: AIAssistant;
  let calendarPlugin: GoogleCalendarPlugin;

  beforeAll(async () => {
    // Initialize assistant with test OpenAI key
    assistant = new AIAssistant(process.env.OPENAI_API_KEY!);
    await assistant.initialize();

    // Mock OAuth client for testing
    const mockAuth = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    mockAuth.setCredentials({ access_token: 'test-token' });

    calendarPlugin = new GoogleCalendarPlugin(mockAuth);
    assistant.registerPlugin(calendarPlugin);
  });

  describe('Natural Language Processing', () => {
    test('should understand availability query in Japanese', async () => {
      const response = await assistant.processMessage('明日の午後2時は空いてますか？');
      expect(response).toBeTruthy();
      // Response should indicate whether the time is available
      expect(response.toLowerCase()).toMatch(/available|空いて/);
    });

    test('should understand schedule query in Japanese', async () => {
      const response = await assistant.processMessage('今週の予定を教えて');
      expect(response).toBeTruthy();
      // Response should contain schedule information
      expect(response).toMatch(/予定|schedule/);
    });
  });

  describe('Calendar Plugin', () => {
    test('should find available time slots', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const result = await calendarPlugin.findAvailableTimeSlots({
        start: tomorrow,
        end: dayAfterTomorrow,
        duration: 60
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('should check specific time slot availability', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(15, 0, 0, 0);

      const result = await calendarPlugin.checkAvailability({
        start: tomorrow,
        end: endTime
      });

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('boolean');
    });
  });

  describe('Event Management', () => {
    test('should create calendar event', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(15, 0, 0, 0);

      const event = {
        summary: 'Test Meeting',
        description: 'Integration test event',
        start: {
          dateTime: tomorrow.toISOString(),
          timeZone: 'Asia/Tokyo'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Tokyo'
        }
      };

      const result = await calendarPlugin.createEvent(event);
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });
  });
});
