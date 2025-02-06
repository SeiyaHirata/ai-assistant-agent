import OpenAI from 'openai';
import { AssistantPlugin, AssistantIntent, PluginResponse } from '@/types/plugin';
import { GoogleCalendarPlugin } from '@/plugins/calendar/GoogleCalendarPlugin';

export class AIAssistant {
  private openai: OpenAI;
  private assistant: any;
  private thread: any;
  private plugins: Map<string, AssistantPlugin>;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.plugins = new Map();
  }

  registerPlugin(plugin: AssistantPlugin) {
    this.plugins.set(plugin.id, plugin);
  }

  async initialize() {
    // Create or retrieve the assistant
    this.assistant = await this.openai.beta.assistants.create({
      name: "AI Secretary",
      instructions: `
        You are an AI secretary that helps users manage their schedule and tasks.
        You can understand natural language queries about calendar events and availability.
        
        When processing calendar-related queries:
        1. For availability checks ("この日時空いてるか?"), use the checkAvailability function
        2. For schedule queries, use the getEvents function
        3. Always confirm the exact date and time with the user if ambiguous
        4. Respond in the same language as the user's query
        
        Format dates and times in a user-friendly way when responding.
      `,
      model: "gpt-4-turbo-preview",
      tools: [{
        type: "function",
        function: {
          name: "checkAvailability",
          description: "Check calendar availability for a specific time slot",
          parameters: {
            type: "object",
            properties: {
              startTime: {
                type: "string",
                description: "Start time in ISO format"
              },
              endTime: {
                type: "string",
                description: "End time in ISO format"
              }
            },
            required: ["startTime", "endTime"]
          }
        }
      }, {
        type: "function",
        function: {
          name: "getEvents",
          description: "Get calendar events for a specific time range",
          parameters: {
            type: "object",
            properties: {
              startTime: {
                type: "string",
                description: "Start time in ISO format"
              },
              endTime: {
                type: "string",
                description: "End time in ISO format"
              }
            },
            required: ["startTime", "endTime"]
          }
        }
      }, {
        type: "function",
        function: {
          name: "findAvailableSlots",
          description: "Find available time slots within a date range",
          parameters: {
            type: "object",
            properties: {
              startTime: {
                type: "string",
                description: "Start time in ISO format"
              },
              endTime: {
                type: "string",
                description: "End time in ISO format"
              },
              duration: {
                type: "number",
                description: "Duration in minutes"
              }
            },
            required: ["startTime", "endTime", "duration"]
          }
        }
      }]
    });

    // Create a new thread for the conversation
    this.thread = await this.openai.beta.threads.create();
  }

  async processMessage(message: string): Promise<string> {
    // Add the user's message to the thread
    await this.openai.beta.threads.messages.create(this.thread.id, {
      role: "user",
      content: message
    });

    // Run the assistant
    const run = await this.openai.beta.threads.runs.create(this.thread.id, {
      assistant_id: this.assistant.id
    });

    // Wait for the run to complete
    let runStatus = await this.openai.beta.threads.runs.retrieve(
      this.thread.id,
      run.id
    );

    while (runStatus.status !== "completed") {
      if (runStatus.status === "requires_action") {
        const toolCalls = runStatus.required_action?.submit_tool_outputs.tool_calls;
        const toolOutputs = [];

        for (const toolCall of toolCalls || []) {
          const { name, arguments: args } = toolCall.function;
          const parsedArgs = JSON.parse(args);

          let result;
          if (name === "checkAvailability") {
            const calendarPlugin = this.plugins.get('google-calendar') as GoogleCalendarPlugin;
            result = await calendarPlugin.checkAvailability({
              start: new Date(parsedArgs.startTime),
              end: new Date(parsedArgs.endTime)
            });
          } else if (name === "getEvents") {
            const calendarPlugin = this.plugins.get('google-calendar') as GoogleCalendarPlugin;
            result = await calendarPlugin.getEvents({
              start: new Date(parsedArgs.startTime),
              end: new Date(parsedArgs.endTime)
            });
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify(result)
          });
        }

        // Submit tool outputs
        await this.openai.beta.threads.runs.submitToolOutputs(
          this.thread.id,
          run.id,
          { tool_outputs: toolOutputs }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(
        this.thread.id,
        run.id
      );
    }

    // Get the latest message
    const messages = await this.openai.beta.threads.messages.list(this.thread.id);
    const lastMessage = messages.data[0];

    return lastMessage.content[0].text.value;
  }
}
