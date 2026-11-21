export const APP_NAME = "Truck Tracking Master";
export const APP_DESCRIPTION = "Secure Vehicle & Customer Information Management System";

export const ROLES = {
  ADMIN: "admin" as const,
  USER: "user" as const,
};

export const ADMIN_EMAILS = [
  "mallikarjun.patil8638@gmail.com",
];

export const VEHICLE_COLUMNS = [
  { key: "customer_name", label: "Customer Name", required: true },
  { key: "agreement_number", label: "Agreement Number" },
  { key: "registration_number", label: "Registration Number" },
  { key: "chassis_number", label: "Chassis Number" },
  { key: "engine_number", label: "Engine Number" },
  { key: "vehicle_make", label: "Vehicle Make" },
  { key: "vehicle_model", label: "Vehicle Model" },
  { key: "vehicle_year", label: "Vehicle Year" },
  { key: "vehicle_color", label: "Vehicle Color" },
  { key: "finance_company", label: "Finance Company" },
  { key: "branch", label: "Branch" },
  { key: "status", label: "Status" },
  { key: "remarks", label: "Remarks" },
] as const;

export const UPLOAD_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

export const SEARCH_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
};

export const LOGIN_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};
