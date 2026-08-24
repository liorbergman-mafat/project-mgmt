export type ProjectStatus = "active" | "completed" | "archived";
export type LoanStatus = "loaned" | "returned" | "lost";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary extends Project {
  loan_count: number;
  open_loan_count: number;
  overdue_count: number;
  feedback_count: number;
}

export interface ItemType {
  id: string;
  name: string;
  created_at: string;
}

export interface ItemModel {
  id: string;
  type_id: string;
  name: string;
  created_at: string;
}

export interface ItemStatus {
  id: string;
  name: string;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  kind: string | null;
  brigade: string | null;
  battalion: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  project_id: string;
  type_id: string;
  model_id: string;
  serial_id: string | null;
  status_id: string;
  location_id: string;
  created_at: string;
  updated_at: string;
  type: ItemType | null;
  model: ItemModel | null;
  status: ItemStatus | null;
  location: Location | null;
}

export interface Loan {
  id: string;
  project_id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  status: LoanStatus;
  loaned_at: string;
  due_at: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
  item: Item | null;
  location: Location | null;
}

export interface Feedback {
  id: string;
  project_id: string;
  loan_id: string | null;
  location_id: string;
  rating: number | null;
  content: string;
  feedback_at: string;
  created_at: string;
  location: Location | null;
  loan: Loan | null;
}

export interface ProjectDetail {
  project: Project;
  items: Item[];
  loans: Loan[];
  feedback: Feedback[];
}
