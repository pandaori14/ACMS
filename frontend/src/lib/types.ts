/**
 * Tipe domain bersama untuk frontend (selaras model backend).
 * Field dibuat opsional bila pemakaian di UI tidak selalu memuatnya
 * (mis. relasi yang di-eager-load secara kondisional).
 */

export interface Faculty {
  id: string;
  code?: string;
  name?: string;
  status?: string;
}

export interface Program {
  id: string;
  faculty_id?: string;
  code?: string;
  name?: string;
  accreditation?: string | null;
  level?: string;
  status?: string;
  faculty?: Faculty;
}

export interface Stase {
  id: string;
  program_id?: string;
  code?: string;
  name?: string;
  duration_weeks?: number;
  credits?: number;
  passing_grade?: number;
  is_mandatory?: boolean;
  color_code?: string | null;
  status?: string;
  program?: Program;
}

export interface Student {
  id: string;
  /** Sebagian endpoint memuat relasi `student` sebagai User dengan nama datar. */
  name?: string;
  user?: { id: string; name?: string; email?: string };
  identity_number?: string;
  program?: Program;
  cohort?: { id: string; name?: string };
  status?: string;
}

export interface RotationAssignment {
  id: string;
  stase?: Stase;
  hospital?: { id: string; name?: string };
  student?: Student;
  rotation_period?: { start_date: string; end_date: string };
  status?: string;
}

export interface StaseGrade {
  id: string;
  student_id?: string;
  rotation_assignment?: RotationAssignment;
  student?: Student;
  status: string;
  minicex_score?: number | string | null;
  dops_score?: number | string | null;
  cbd_score?: number | string | null;
  logbook_score?: number | string | null;
  final_score?: number | string | null;
  letter_grade?: string | null;
}

export interface RubricIndicator {
  key: string;
  label?: string;
  weight?: number;
  max_score?: number;
}

export interface RubricSchema {
  indicators?: RubricIndicator[];
}

export interface AssessmentTemplate {
  id: string;
  name?: string;
  type?: string;
  rubric_schema?: RubricSchema;
}

export interface ExamStation {
  id: string;
  exam_id?: string;
  name?: string;
  description?: string | null;
  order?: number;
  assessmentTemplate?: AssessmentTemplate;
}

export interface ExamScore {
  id: string;
  exam_participant_id?: string;
  exam_station_id?: string | null;
  assessor_id?: string;
  score?: number | null;
  feedback?: string | null;
}

export interface ExamParticipant {
  id: string;
  exam_id?: string;
  student_id?: string;
  status?: string;
  student?: Student;
  scores?: ExamScore[];
}

export interface ExamAssessor {
  id: string;
  exam_id?: string;
  exam_station_id?: string | null;
  assessor_id?: string;
  assessor?: { id: string; name?: string };
  examStation?: ExamStation;
}

export interface Exam {
  id: string;
  name: string;
  type: string;
  stase_id?: string;
  date: string;
  status: string;
  description?: string | null;
  stase?: Stase;
  stations?: ExamStation[];
  participants?: ExamParticipant[];
  assessors?: ExamAssessor[];
}
