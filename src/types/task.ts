import { AssistantPlugin, AssistantIntent, PluginResponse } from './plugin';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assignee?: string;
}

export abstract class TaskManagementPlugin implements AssistantPlugin {
  id: string;
  name: string;
  description: string;
  capabilities: string[];

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.capabilities = [
      'create_task',
      'update_task',
      'delete_task',
      'list_tasks',
      'assign_task'
    ];
  }

  abstract canHandle(intent: AssistantIntent): boolean;
  abstract execute(intent: AssistantIntent): Promise<PluginResponse>;

  // Common task management methods
  abstract createTask(task: Task): Promise<Task>;
  abstract updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
  abstract deleteTask(taskId: string): Promise<boolean>;
  abstract listTasks(filters?: Partial<Task>): Promise<Task[]>;
}
