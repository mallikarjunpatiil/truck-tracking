import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userLoginSchema = z.object({
  identifier: z.string().min(2, "Please enter your User ID or Email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const createUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "user"]),
  user_id_code: z.string().optional(),
  phone_number: z.string().optional(),
});

export const vehicleSearchSchema = z.object({
  customer_name: z.string().optional(),
  agreement_number: z.string().optional(),
  registration_number: z.string().optional(),
  last_four_digits: z.string().max(4).optional(),
  chassis_number: z.string().optional(),
  engine_number: z.string().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v && v.trim().length > 0),
  { message: "At least one search field is required" }
);

export const columnMappingSchema = z.object({
  customer_name: z.string().min(1, "Customer name column is required"),
  agreement_number: z.string().optional(),
  registration_number: z.string().optional(),
  chassis_number: z.string().optional(),
  engine_number: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.string().optional(),
  vehicle_color: z.string().optional(),
  finance_company: z.string().optional(),
  branch: z.string().optional(),
  status: z.string().optional(),
  remarks: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type VehicleSearchInput = z.infer<typeof vehicleSearchSchema>;
export type ColumnMappingInput = z.infer<typeof columnMappingSchema>;
