export type IncidentStatus = 'submitted' | 'investigating' | 'resolved';
// Severity kini konfigurabel via system_references (incident_severities),
// jadi tipe dibuat fleksibel. 4 nilai default tetap punya label & warna statis.
export type IncidentSeverity = string;
export type ConsultationStatus = 'pending' | 'in_progress' | 'responded' | 'closed';

export interface IncidentNote {
  id: string;
  incident_report_id: string;
  user_id: string;
  note: string;
  is_internal: boolean;
  created_at: string;
  author?: { id: string; name: string } | null;
}

export interface IncidentReporter {
  id: string;
  name: string;
  email: string;
}

export interface IncidentReport {
  id: string;
  reporter_id: string | null;
  incident_type: string;
  incident_date: string;
  location: string;
  description: string;
  involved_parties: string | null;
  is_anonymous: boolean;
  status: IncidentStatus;
  severity: IncidentSeverity | null;
  resolution_notes: string | null;
  attachment_path: string | null;
  created_at: string;
  reporter?: IncidentReporter | null;
  notes?: IncidentNote[];
}

export interface IncidentStatistics {
  total: number;
  by_status: Partial<Record<IncidentStatus, number>>;
  by_type: Record<string, number>;
  by_severity: Partial<Record<IncidentSeverity, number>>;
  trend_30_days: Array<{ date: string; count: number }>;
}

export interface ConsultationRequester {
  id: string;
  name: string;
  email: string;
}

export interface Consultation {
  id: string;
  requester_id: string | null;
  category: string;
  topic: string;
  message: string;
  is_anonymous: boolean;
  status: ConsultationStatus;
  response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  requester?: ConsultationRequester | null;
  responder?: { id: string; name: string } | null;
}

export interface SystemReference {
  id: string;
  category: string;
  name: string;
  value: string;
  is_active: boolean;
}

/** Opsi form (item AKTIF) yang dikembalikan endpoint /incidents/form-options. */
export interface IncidentFormOption {
  value: string;
  name: string;
}

export interface IncidentFormOptions {
  incident_types: IncidentFormOption[];
  incident_severities: IncidentFormOption[];
  attachment: {
    max_size_mb: number;
    allowed_types: string;
  };
  /** Template form aktif per jenis insiden (dari form builder). */
  form_templates?: Record<string, import('./incident-form').ActiveFormTemplate>;
}

/** Konfigurasi penuh (termasuk item nonaktif) untuk halaman CONFIGURE. */
export interface IncidentConfigSettings {
  incident_max_attachment_size_mb: number;
  incident_allowed_attachment_types: string;
  incident_response_deadline_hours: number;
  incident_auto_notify_critical: boolean;
}

export interface IncidentNotificationConfig {
  notify_roles: string[];
  cc_emails: string;
}

export interface IncidentConfig {
  incident_types: SystemReference[];
  incident_severities: SystemReference[];
  settings: IncidentConfigSettings;
  // Read-only: penerima notifikasi dikelola terpusat di matrix SMTP.
  notification: IncidentNotificationConfig;
}

export const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  submitted: 'Laporan Masuk',
  investigating: 'Investigasi',
  resolved: 'Selesai',
};

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  responded: 'Direspons',
  closed: 'Ditutup',
};
