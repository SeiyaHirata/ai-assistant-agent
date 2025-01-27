import { AssistantPlugin, AssistantIntent, PluginResponse } from './plugin';

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  channel?: string;
}

export abstract class MessagingPlugin implements AssistantPlugin {
  id: string;
  name: string;
  description: string;
  capabilities: string[];

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.capabilities = [
      'send_message',
      'read_messages',
      'list_channels',
      'notify_user'
    ];
  }

  abstract canHandle(intent: AssistantIntent): boolean;
  abstract execute(intent: AssistantIntent): Promise<PluginResponse>;

  // Common messaging methods
  abstract sendMessage(message: Message): Promise<boolean>;
  abstract readMessages(channel: string, limit?: number): Promise<Message[]>;
  abstract listChannels(): Promise<string[]>;
}
