export type UserRole = "admin" | "user";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  user_id_code?: string | null;
  phone_number?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  customer_name: string;
  agreement_number: string | null;
  registration_number: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  vehicle_type?: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  finance_company: string | null;
  branch: string | null;
  status: string | null;
  remarks: string | null;
  photographs?: string[] | null;
  documents?: { name: string; url: string; type?: string }[] | null;
  agreement_details?: Record<string, unknown> | null;
  delivery_details?: Record<string, unknown> | null;
  custom_fields?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
  upload_batch_id: string | null;
}

export interface UploadBatch {
  id: string;
  file_name: string;
  file_path: string | null;
  total_records: number;
  imported_records: number;
  duplicate_records: number;
  failed_records: number;
  status: "pending" | "processing" | "completed" | "failed";
  uploaded_by: string;
  uploader_name?: string | null;
  column_mapping: Record<string, string> | null;
  errors?: string[] | Record<string, unknown>[] | null;
  created_at: string;
  completed_at: string | null;
}

export interface VehicleAccessLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_id_code: string | null;
  user_phone: string | null;
  user_email: string | null;
  vehicle_id: string;
  customer_name: string | null;
  agreement_number: string | null;
  registration_number: string | null;
  vehicle_model: string | null;
  accessed_at: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  accuracy?: number | null;
  location_status: "granted" | "denied" | "unavailable" | "not_supported";
  google_maps_url: string | null;
  maps_link?: string | null;
  ip_address: string | null;
  user_agent: string | null;
  notification_sent: boolean;
  notification_channel: string | null;
  notification_status?: string | null;
  notification_error: string | null;
  is_read?: boolean;
}

export interface AdminNotificationLog {
  id: string;
  access_log_id: string | null;
  channel: "whatsapp" | "sms";
  recipient: string;
  message_body: string;
  provider: string;
  status: "pending" | "delivered" | "failed" | "logged_credential_pending";
  provider_response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface SearchFilters {
  customer_name?: string;
  agreement_number?: string;
  registration_number?: string;
  last_four_digits?: string;
  chassis_number?: string;
  engine_number?: string;
}
