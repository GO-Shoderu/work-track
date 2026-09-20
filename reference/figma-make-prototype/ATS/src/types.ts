export type Stage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';
export type UserRole = 'platform_owner' | 'admin' | 'customer';

export type Screen =
  | 'login'
  | 'customer-overview'
  | 'customer-pipeline'
  | 'customer-candidates'
  | 'customer-jobs'
  | 'customer-settings'
  | 'admin-overview'
  | 'admin-customers'
  | 'admin-review'
  | 'admin-admins'
  | 'admin-inbox'
  | 'admin-audit'
  | 'admin-settings'
  | 'public-request-access'
  | 'public-job-page'
  | 'public-job-apply';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentRole: string;
  location: string;
  linkedin?: string;
  cvFile?: string;
  dateAdded: string;
  initials: string;
  avatarColor: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  status: 'Open' | 'Closed' | 'Draft';
  description: string;
  requirements: string;
  createdDate: string;
  isPublic: boolean;
  publicSlug?: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  stage: Stage;
  dateApplied: string;
  lastUpdated: string;
  aiScore?: number;
  aiStrengths?: string[];
  aiGaps?: string[];
  aiEvidence?: string[];
  aiSummary?: string;
  aiStatus?: 'idle' | 'processing' | 'complete' | 'failed';
  notes?: string;
  activities?: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  date: string;
  user: string;
  action: string;
}

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  openJobs: number;
  candidateCount: number;
  assignedAdminId?: string;
  lastActivity: string;
  createdDate: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'Platform Owner' | 'Admin';
  assignedCustomerIds: string[];
  status: 'Active' | 'Inactive';
  lastActivity: string;
  initials: string;
  permissions: string[];
}

export interface AccessRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  hiringNeeds?: string;
  notes?: string;
  status: 'Pending' | 'Needs Information' | 'Approved' | 'Rejected';
  submittedDate: string;
}

export interface InboxItem {
  id: string;
  type: 'review_request' | 'admin_action' | 'system' | 'alert';
  title: string;
  description: string;
  date: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface AuditEntry {
  id: string;
  date: string;
  user: string;
  userRole: string;
  action: string;
  target: string;
  ipAddress: string;
}
