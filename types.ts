

export enum Role {
  ADMIN = 'ADMIN',            // Super Admin (Gère tout)
  RESPONSIBLE = 'RESPONSIBLE', // Responsable de classe (Gère sa classe)
  STUDENT = 'STUDENT',         // Élève (Lecture seule + Vote)
}

export interface ClassGroup {
  id: string;
  name: string; // ex: DUT 2
  description?: string;
  email?: string; // Mailing list de la classe (ex: dut2@ecole.com)
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  classId?: string; // Null pour l'Admin global
  avatar?: string; // URL, Base64 string, or Emoji char
}

export enum Urgency {
  INFO = 'INFO',
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  urgency: Urgency;
  authorId: string;
  classId: string;
  durationHours?: number; // Durée de visibilité en heures (optionnel)
}

export interface MeetSession {
  id: string;
  subject: string;
  link: string;
  date: string; // ISO string
  teacherName: string;
  classId: string;
  authorId: string; // ID du créateur
}

export interface Exam {
  id: string;
  subject: string;
  date: string; // ISO string
  durationMinutes: number;
  room: string;
  notes?: string;
  authorId: string;
  classId: string;
}

export interface PollOption {
  id: string;
  label: string;
  voterIds: string[]; // Liste des IDs des votants pour permettre le changement de vote
}

export interface Poll {
  id: string;
  question: string;
  type: 'SINGLE' | 'MULTIPLE';
  options: PollOption[];
  active: boolean;
  createdAt: string;
  isAnonymous: boolean;
  classId: string;
  authorId: string; // ID du créateur
  durationHours?: number; // Durée de visibilité en heures (optionnel)
}

export interface SentEmail {
  id: string;
  created_at: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  resource_type: string;
  sender_name: string;
  class_id: string;
}

export interface EmailConfig {
  provider: 'MAILTO' | 'SENDGRID';
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
}

// --- SECURITY & UX ---

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  author: string;
  role: Role;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface Notification {
  id: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  timestamp?: string;
  targetPage?: string; // Page vers laquelle rediriger au clic
  resourceId?: string; // ID de l'élément spécifique à ouvrir
  read?: boolean; // État de lecture
}

export interface AppState {
  user: User | null;
  schoolName: string;
  classes: ClassGroup[];
  users: User[];
  announcements: Announcement[];
  meets: MeetSession[];
  exams: Exam[];
  polls: Poll[];
  auditLogs: AuditLog[];
}