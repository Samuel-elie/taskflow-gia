export type TaskStatus = 'TODO' | 'DOING' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type Project = {
  project_id: string;
  name: string;
  description?: string | null;
  workspace_id: string;
  owner_id: string;
};

export type Task = {
  task_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string | null; // ISO
  assignee_id?: string | null;
};

export type ProjectMember = {
  workspace_member_id: string;
  role: string;
  user: { user_id: string; name?: string | null; email: string };
};
