// ─────────────────────────────────────────────────
//  Form Builder: Template, Section, Field
// ─────────────────────────────────────────────────

export const FIELD_TYPES = [
  'text',
  'textarea',
  'select',
  'multiselect',
  'checkbox',
  'radio',
  'date',
  'datetime',
  'email',
  'tel',
  'file',
  'statement',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  [key: string]: unknown;
}

export interface FormField {
  id: string;
  label: string;
  field_key: string;
  field_type: FieldType;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  sort_order: number;
  options: FieldOption[] | null;
  validation_rules: FieldValidationRules | null;
  grid_cols: number; // 1 = full width, 2 = half width
}

export interface FormSection {
  id: string;
  title: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  conditional_field_id: string | null;
  conditional_value: string | null;
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  incident_type: string;
  name: string;
  description: string | null;
  header_title: string;
  header_subtitle: string | null;
  theme_color: string;
  is_active: boolean;
  version: number;
  sections: FormSection[];
  sections_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** Template ringkas untuk daftar (tanpa sections). */
export interface FormTemplateListItem {
  id: string;
  incident_type: string;
  name: string;
  description: string | null;
  header_title: string;
  theme_color: string;
  is_active: boolean;
  version: number;
  sections_count: number;
  created_at: string;
  updated_at: string;
}

/** Template aktif yang dikembalikan form-options (dengan sections + fields). */
export interface ActiveFormTemplate {
  id: string;
  name: string;
  header_title: string;
  header_subtitle: string | null;
  theme_color: string;
  version: number;
  sections: FormSection[];
}

/** Map incident_type → template aktif, dari form-options API. */
export type FormTemplatesMap = Record<string, ActiveFormTemplate>;

// ─────────────────────────────────────────────────
//  Form Responses (jawaban pelapor)
// ─────────────────────────────────────────────────

export interface FormAnswer {
  id: string;
  form_field_id: string;
  field_key: string;
  value: string | null;
  file_path: string | null;
  field?: FormField;
}

export interface FormResponse {
  id: string;
  incident_report_id: string;
  form_template_id: string;
  form_template_version: number;
  submitted_at: string;
  answers: FormAnswer[];
  template?: FormTemplate;
}

// ─────────────────────────────────────────────────
//  Field type metadata (dari /config/field-types API)
// ─────────────────────────────────────────────────

export interface FieldTypeMeta {
  value: FieldType;
  label: string;
}

/** Label tampilan untuk tipe field. */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Teks Pendek',
  textarea: 'Teks Panjang',
  select: 'Dropdown',
  multiselect: 'Dropdown Multi-Pilihan',
  checkbox: 'Checkbox (Pilihan Ganda)',
  radio: 'Radio Button (Pilihan Tunggal)',
  date: 'Tanggal',
  datetime: 'Tanggal & Waktu',
  email: 'Email',
  tel: 'Nomor Telepon',
  file: 'Upload File',
  statement: 'Pernyataan (Checkbox Wajib)',
};

/** Ikon Lucide untuk setiap tipe field. */
export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: 'type',
  textarea: 'align-left',
  select: 'chevron-down',
  multiselect: 'list',
  checkbox: 'check-square',
  radio: 'circle-dot',
  date: 'calendar',
  datetime: 'clock',
  email: 'mail',
  tel: 'phone',
  file: 'paperclip',
  statement: 'file-check',
};

/** Tipe field yang membutuhkan options (value/label pairs). */
export const OPTION_FIELD_TYPES: FieldType[] = ['select', 'multiselect', 'checkbox', 'radio'];
