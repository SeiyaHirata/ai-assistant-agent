import { CalendarPlugin, AssistantIntent, PluginResponse, TimeSlot } from '@/types/plugin';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleCalendarPlugin extends CalendarPlugin {
  private calendar: any;
  private auth: OAuth2Client;

  constructor(auth: OAuth2Client) {
    super(
      'google-calendar',
      'Google Calendar Plugin',
      'Plugin for managing Google Calendar events and availability'
    );
    this.auth = auth;
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  canHandle(intent: AssistantIntent): boolean {
    return intent.type === 'calendar';
  }

  async execute(intent: AssistantIntent): Promise<PluginResponse> {
    switch (intent.action) {
      case 'check_availability':
        return await this.checkAvailability(intent.parameters as TimeSlot);
      case 'list_events':
        return await this.getEvents(intent.parameters as { start: Date; end: Date });
      default:
        return {
          success: false,
          data: null,
          message: `Unsupported action: ${intent.action}`
        };
    }
  }

  async getEvents(timeRange: { start: Date; end: Date }): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeRange.start.toISOString(),
        timeMax: timeRange.end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return {
        success: true,
        data: response.data.items,
        message: 'Events retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to retrieve events: ${error.message}`
      };
    }
  }

  async checkAvailability(timeSlot: TimeSlot): Promise<boolean> {
    try {
      const events = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeSlot.start.toISOString(),
        timeMax: timeSlot.end.toISOString(),
        singleEvents: true,
      });

      const hasConflicts = events.data.items.some((event: any) => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        return (
          (timeSlot.start >= eventStart && timeSlot.start < eventEnd) ||
          (timeSlot.end > eventStart && timeSlot.end <= eventEnd) ||
          (timeSlot.start <= eventStart && timeSlot.end >= eventEnd)
        );
      });

      return {
        success: true,
        data: !hasConflicts,
        message: hasConflicts ? 'Time slot is not available' : 'Time slot is available'
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to check availability: ${error.message}`
      };
    }
  }

  async createEvent(event: any): Promise<any> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return {
        success: true,
        data: response.data,
        message: 'Event created successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to create event: ${error.message}`
      };
    }
  }
}
