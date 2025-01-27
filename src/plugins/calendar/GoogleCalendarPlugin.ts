import { CalendarPlugin, AssistantIntent, PluginResponse, TimeSlot } from '@/types/plugin';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface AvailableTimeSlot {
  start: Date;
  end: Date;
  duration: number; // in minutes
}

export class GoogleCalendarPlugin extends CalendarPlugin {
  private calendar: any;
  private auth: OAuth2Client;
  private workingHours = {
    start: 9, // 9:00 AM
    end: 18,  // 6:00 PM
  };

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
      case 'find_available_slots':
        return await this.findAvailableTimeSlots(
          intent.parameters as { start: Date; end: Date; duration: number }
        );
      default:
        return {
          success: false,
          data: null,
          message: `Unsupported action: ${intent.action}`
        };
    }
  }

  async getEvents(timeRange: { start: Date; end: Date }): Promise<PluginResponse> {
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
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: `Failed to retrieve events: ${error.message}`
      };
    }
  }

  async checkAvailability(timeSlot: TimeSlot): Promise<PluginResponse> {
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
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: `Failed to check availability: ${error.message}`
      };
    }
  }

  async findAvailableTimeSlots(params: {
    start: Date;
    end: Date;
    duration: number;
  }): Promise<PluginResponse> {
    try {
      const { start, end, duration } = params;
      const events = await this.getEvents({ start, end });
      
      if (!events.success) {
        throw new Error('Failed to retrieve events');
      }

      const availableSlots: AvailableTimeSlot[] = [];
      let currentDate = new Date(start);
      
      while (currentDate < end) {
        // Only check during working hours
        if (currentDate.getHours() >= this.workingHours.start && 
            currentDate.getHours() < this.workingHours.end) {
          
          const slotEnd = new Date(currentDate.getTime() + duration * 60000);
          
          const availability = await this.checkAvailability({
            start: currentDate,
            end: slotEnd
          });

          if (availability.success && availability.data === true) {
            availableSlots.push({
              start: new Date(currentDate),
              end: slotEnd,
              duration
            });
          }
        }

        // Move to next 30-minute slot
        currentDate = new Date(currentDate.getTime() + 30 * 60000);
      }

      return {
        success: true,
        data: availableSlots,
        message: `Found ${availableSlots.length} available time slots`
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: `Failed to find available time slots: ${error.message}`
      };
    }
  }

  async createEvent(event: any): Promise<PluginResponse> {
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
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: `Failed to create event: ${error.message}`
      };
    }
  }
}
}
