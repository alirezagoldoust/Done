export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  initials: string;
}

export interface BoardMember {
  id: number;
  user: User;
  created_at: string;
}

export interface BoardColumn {
  id: number;
  name: string;
  position: number;
}

export interface BoardStatus {
  id: number;
  name: string;
  position: number;
  is_collapsible: boolean;
  collapsed: boolean;
}

export interface CreateStatusInput {
  name: string;
  is_collapsible?: boolean;
}

export interface UpdateStatusInput {
  name?: string;
  is_collapsible?: boolean;
  collapsed?: boolean;
  position?: number;
}

export type TaskColor = "default" | "purple" | "blue" | "teal" | "red";

export interface Task {
  id: number;
  board: number;
  column: number;
  status: number;
  title: string;
  description: string;
  doer: User | null;
  deadline: string | null;
  color: TaskColor;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BoardSummary {
  id: number;
  name: string;
  description: string;
  member_count: number;
  task_count: number;
  created_at: string;
  updated_at: string;
}

export interface BoardDetail {
  id: number;
  name: string;
  description: string;
  columns: BoardColumn[];
  statuses: BoardStatus[];
  members: BoardMember[];
  tasks: Task[];
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  column: number;
  status?: number;
  description?: string;
  doer_id?: number | null;
  deadline?: string | null;
  color?: TaskColor;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  doer_id?: number | null;
  deadline?: string | null;
  color?: TaskColor;
  status?: number;
  column?: number;
}

export interface MoveTaskInput {
  column_id: number;
  status_id: number;
  before_task_id?: number | null;
  after_task_id?: number | null;
}
