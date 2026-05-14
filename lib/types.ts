// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — TypeScript Types
// ─────────────────────────────────────────────────────────────────

// ── API Response ────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

// ── Auth / Session ───────────────────────────────────────────────
export interface SessionPayload {
  school_id: string;
  is_dev: boolean;
  teacher_id: number | null;
  expires_at: string;
}

export interface AuthRecord {
  id: number;
  school_id: string;
  teacher_id: number | null;
  email: string;
  password_hash: string;
  guard: string;
  last_login: string | null;
  created_at: string;
}

// ── School ───────────────────────────────────────────────────────
export interface School {
  id: string;
  name: string;
  abbreviation: string;
  student_limit: number | null;
  plan_label: string;
  motto: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  color1: string | null;
  color2: string | null;
  school_logo: string | null;        // base64
  school_stamp: string | null;       // base64
  sig_principal: string | null;      // base64
  head_signature: string | null;     // base64
  school_type: 'primary' | 'secondary' | 'both';
  name_primary: string | null;
  name_secondary: string | null;
  abbr_primary: string | null;
  abbr_secondary: string | null;
  principal_name: string | null;
  head_teacher_name: string | null;
  show_position: boolean;
  show_bf: boolean;
  default_attendance_weeks: number;
  coupon_used: string | null;
  school_name_size: number | null;
  created_at?: string;
}

// ── Student ──────────────────────────────────────────────────────
export interface Student {
  id: string;
  school_id: string;
  adm: string;
  name: string;
  gender: 'Male' | 'Female' | null;
  dob: string | null;
  level: string | null;
  class: string;
  department: string | null;
  arm: string | null;
  term: string;
  session: string;
  house: string | null;
  passport: string | null;       // base64
  clubs: string | null;          // JSON array
  guardian_name: string | null;
  guardian_phone: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── Teacher ──────────────────────────────────────────────────────
export type TeacherRole = 'teaching' | 'non-teaching' | 'both';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface Teacher {
  id: number;
  school_id: string;
  name: string;
  employee_id: string | null;
  class: string | null;
  classes: string[];              // parsed JSON array
  subjects: string[] | null;     // parsed JSON array
  admin_tasks: string[] | null;  // parsed JSON array
  role: TeacherRole;
  is_class_teacher: boolean;
  gender: string | null;
  phone: string | null;
  email: string | null;
  dob: string | null;
  qualification: string | null;
  specialisation: string | null;
  hire_date: string | null;
  avatar: string | null;         // base64
  signature: string | null;      // base64
  address: string | null;
  department: string | null;
  staff_type: string | null;
  approval_status: ApprovalStatus;
  self_registered: boolean;
  rejection_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── Result ───────────────────────────────────────────────────────
export type ResultType = 'full' | 'midterm';

export interface SubjectResult {
  name: string;
  ca: number;
  exam: number;
  total: number;
  grade?: string;
  remark?: string;
  department?: string;
  bf1?: number;     // brought-forward 1st term
  bf2?: number;     // brought-forward 2nd term
}

export interface AffectiveRecord {
  punctuality?: string;
  neatness?: string;
  cooperation?: string;
  attentiveness?: string;
  creativity?: string;
  leadership?: string;
  sports?: string;
  clubs?: string;
  [key: string]: string | undefined;
}

export interface Result {
  id: string;
  school_id: string;
  student_id: string;
  student_adm: string;
  student_name: string;
  class: string;
  term: string;
  session: string;
  result_type: ResultType;
  subjects: SubjectResult[];         // parsed JSON
  overall_total: number;
  avg: number;
  grade: string;
  position: number | null;
  out_of: number | null;
  affective: AffectiveRecord;        // parsed JSON
  teacher_name: string | null;
  teacher_comment: string | null;
  principal_comment: string | null;
  student_passport: string | null;
  department: string | null;
  teacher_signature: string | null;
  passport_img?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── PIN ──────────────────────────────────────────────────────────
export type PinDuration = 'session' | 'term';
export type PinResultType = 'full' | 'midterm' | 'both';

export interface Pin {
  id: number;
  school_id: string;
  student_id: string;
  pin: string;
  result_type: PinResultType;
  duration: PinDuration;
  used: boolean;
  used_at: string | null;
  revoked: boolean;
  expires_at: string | null;
  created_at: string;
  // joined
  student_name?: string;
  student_adm?: string;
}

// ── Coupon ───────────────────────────────────────────────────────
export interface Coupon {
  id: number;
  code: string;
  plan_label: string;
  student_limit: number | null;
  used: boolean;
  used_by: string | null;
  used_by_name: string | null;
  used_date: string | null;
  created_at: string;
}

// ── Academic Session ─────────────────────────────────────────────
export interface AcademicSession {
  id: number;
  school_id: string;
  label: string;                  // e.g. "2025/2026"
  start_year: number;
  end_year: number;
  is_current: boolean;
  days_opened: number | null;
  next_term_begins: string | null;
  resumption_date: string | null; // date school resumes next term
  current_term: string | null;    // '1st Term' | '2nd Term' | '3rd Term'
  attendance_weeks: number;
  current_week: number;
  created_at?: string;
}

// ── Attendance ───────────────────────────────────────────────────
export interface AttendanceDay {
  am: 'present' | 'absent' | 'late';
  pm: 'present' | 'absent' | 'late';
  date?: string;
  late?: boolean;
}

export interface AttendanceRecord {
  id: number;
  school_id: string;
  student_id: string;
  class: string;
  term: string;
  session: string;
  week_label: string;
  week_start: string | null;
  days: AttendanceDay[];    // parsed JSON
  created_at?: string;
}

export interface AttendanceSummary {
  [studentId: string]: {
    days_present: number;
    days_late: number;
    days_absent: number;
  };
}

// ── Subject ──────────────────────────────────────────────────────
export interface Subject {
  id: number;
  school_id: string;
  name: string;
  code: string | null;
  description: string | null;
  department: string | null;
  is_compulsory: boolean;
  class_level: string | null;
  created_at?: string;
}

export interface SubjectAssignment {
  id: number;
  school_id: string;
  subject_id: number;
  class: string;
  teacher_id: number | null;
  term: string;
  session: string;
  created_at?: string;
}

// ── Audit Log ────────────────────────────────────────────────────
export interface AuditLog {
  id: number;
  school_id: string | null;
  action: string;
  details: string | null;
  ip: string | null;
  created_at: string;
}

// ── Plan ─────────────────────────────────────────────────────────
export interface Plan {
  limit: number | null;
  label: string;
}

// ── Grade Scale Entry ────────────────────────────────────────────
export interface GradeScaleEntry {
  min: number;
  grade: string;
  remark: string;
}

// ── Dashboard Stats ──────────────────────────────────────────────
export interface DashboardStats {
  students: number;
  results: number;
  classes: number;
  school_avg: number;
  student_limit: number | null;
  plan_label: string;
}
// ── Teacher Coupon ────────────────────────────────────────────────
export interface TeacherCoupon {
  id:           number;
  school_id:    string;
  code:         string;
  label:        string | null;
  used:         boolean;
  used_by_id:   number | null;
  used_by_name: string | null;
  used_at:      string | null;
  expires_at:   string | null;
  created_at:   string;
}