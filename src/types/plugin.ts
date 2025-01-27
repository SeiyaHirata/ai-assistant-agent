export interface AssistantPlugin {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  
  // Method to check if this plugin can handle a specific intent
  canHandle(intent: AssistantIntent): boolean;
  
  // Method to execute the plugin's functionality
  execute(intent: AssistantIntent): Promise<PluginResponse>;
}

export interface AssistantIntent {
  type: string;
  action: string;
  parameters: Record<string, any>;
  rawInput: string;
}

export interface PluginResponse {
  success: boolean;
  data: any;
  message: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

// Base class for calendar-related plugins
export abstract class CalendarPlugin implements AssistantPlugin {
  id: string;
  name: string;
  description: string;
  capabilities: string[];

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.capabilities = [
      'check_availability',
      'list_events',
      'create_event',
      'update_event',
      'delete_event'
    ];
  }

  abstract canHandle(intent: AssistantIntent): boolean;
  abstract execute(intent: AssistantIntent): Promise<PluginResponse>;
  
  // Common calendar methods that all calendar plugins should implement
  abstract getEvents(timeRange: { start: Date; end: Date }): Promise<any[]>;
  abstract checkAvailability(timeSlot: TimeSlot): Promise<boolean>;
  abstract createEvent(event: any): Promise<any>;
}

// Plugin Manager to handle registration and execution of plugins
export class PluginManager {
  private plugins: Map<string, AssistantPlugin>;

  constructor() {
    this.plugins = new Map();
  }

  registerPlugin(plugin: AssistantPlugin) {
    this.plugins.set(plugin.id, plugin);
  }

  async executeIntent(intent: AssistantIntent): Promise<PluginResponse> {
    for (const plugin of this.plugins.values()) {
      if (plugin.canHandle(intent)) {
        return await plugin.execute(intent);
      }
    }
    
    return {
      success: false,
      data: null,
      message: 'No plugin found to handle this intent'
    };
  }

  getPlugins(): AssistantPlugin[] {
    return Array.from(this.plugins.values());
  }
}
