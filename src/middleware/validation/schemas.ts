import { z } from 'zod';

/**
 * Validation schemas for API endpoints
 */

// Charger ID validation - matches the custom nanoid format from database
// Uses 8 characters from '123456789ABCDEFGHJKLMNPQRSTUVWXYZ' (no lowercase, no 0/O/I)
export const ChargerIdSchema = z.object({
  id: z
    .string()
    .min(1, 'Charger ID is required')
    .regex(
      /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/,
      'Charger ID must be exactly 8 characters using valid characters (no lowercase, no 0/O/I)'
    ),
});

// Connector type validation - matches database enum
export const ConnectorTypeSchema = z.enum(['j1772', 'ccs1', 'nacs'], {
  errorMap: () => ({ message: 'Connector type must be one of: j1772, ccs1, nacs' }),
});

// Permission level validation - matches database enum
export const PermissionLevelSchema = z.enum(['viewer', 'editor', 'manager'], {
  errorMap: () => ({ message: 'Permission level must be one of: viewer, editor, manager' }),
});

// User status validation - matches database enum
export const UserStatusSchema = z.enum(['unverified', 'active', 'disabled'], {
  errorMap: () => ({ message: 'User status must be one of: unverified, active, disabled' }),
});

// Phone number validation - matches database domain
export const PhoneNumberSchema = z
  .string()
  .nullable()
  .refine(
    (value) => {
      if (value === null) return true;
      // Match the database regex: ^\+?[1-9]\d{1,14}$ with length <= 16
      return /^\+?[1-9]\d{1,14}$/.test(value) && value.length <= 16;
    },
    {
      message: 'Phone number must be in international format (+1234567890) with 2-16 digits',
    }
  );

// Postal code validation - matches database domain patterns
export const PostalCodeSchema = z
  .string()
  .nullable()
  .refine(
    (value) => {
      if (value === null) return true;
      if (value.length > 12) return false;

      // US ZIP code: 12345 or 12345-6789
      const usZip = /^\d{5}(-\d{4})?$/;
      // Canadian postal code: A1A 1A1
      const canadianPostal = /^[A-Z]\d[A-Z] \d[A-Z]\d$/;
      // UK postal code: A1 1AA or AB1 1AA or AB12 1AA
      const ukPostal = /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/;

      return usZip.test(value) || canadianPostal.test(value) || ukPostal.test(value);
    },
    {
      message: 'Postal code must be in valid format (US: 12345, Canada: A1A 1A1, UK: A1 1AA)',
    }
  );

// Email validation with XSS protection
export const EmailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(254, 'Email must be less than 254 characters')
  .refine(
    (value) => {
      // Prevent XSS in email field
      return !/<script|javascript:|data:|vbscript:|on\w+\s*=/i.test(value);
    },
    {
      message: 'Email contains invalid characters',
    }
  );

// Name validation with XSS protection (for first_name, last_name)
export const NameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .refine(
    (value) => {
      const trimmed = value.trim();
      return trimmed.length > 0;
    },
    {
      message: 'Name cannot be empty or only whitespace',
    }
  )
  .refine(
    (value) => {
      // Prevent XSS - matches database validation
      return !/<script|javascript:|data:|vbscript:|on\w+\s*=/i.test(value);
    },
    {
      message: 'Name contains invalid characters',
    }
  );

// Address line validation
export const AddressLineSchema = z
  .string()
  .nullable()
  .refine(
    (value) => {
      if (value === null) return true;
      return value.length <= 255;
    },
    {
      message: 'Address line must be less than 255 characters',
    }
  )
  .refine(
    (value) => {
      if (value === null) return true;
      // Basic XSS prevention
      return !/<script|javascript:|data:|vbscript:|on\w+\s*=/i.test(value);
    },
    {
      message: 'Address contains invalid characters',
    }
  );

// City/State validation
export const CityStateSchema = z
  .string()
  .nullable()
  .refine(
    (value) => {
      if (value === null) return true;
      return value.length <= 100;
    },
    {
      message: 'City/State must be less than 100 characters',
    }
  )
  .refine(
    (value) => {
      if (value === null) return true;
      // Basic XSS prevention
      return !/<script|javascript:|data:|vbscript:|on\w+\s*=/i.test(value);
    },
    {
      message: 'City/State contains invalid characters',
    }
  );

// Country validation (ISO 3166-1 alpha-2 codes)
export const CountrySchema = z
  .string()
  .length(2, 'Country code must be exactly 2 characters')
  .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters (ISO 3166-1 alpha-2)');

// Profile validation schema for future use
export const ProfileSchema = z.object({
  first_name: NameSchema,
  last_name: NameSchema,
  email: EmailSchema,
  phone: PhoneNumberSchema,
  address_line1: AddressLineSchema,
  address_line2: AddressLineSchema,
  city: CityStateSchema,
  state: CityStateSchema,
  postal_code: PostalCodeSchema,
  country: CountrySchema,
  status: UserStatusSchema.optional(),
});

// Profile update schema (partial updates allowed)
export const ProfileUpdateSchema = ProfileSchema.partial().refine(
  (data) => {
    // At least one field must be provided for update
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  }
);

// Connector validation schema for future use
export const ConnectorSchema = z.object({
  connector_id: z.number().int().positive('Connector ID must be a positive integer'),
  connector_idx: z.number().int().min(0, 'Connector index must be non-negative'),
  connector_type: ConnectorTypeSchema,
});

// Permission validation schema for future use
export const PermissionSchema = z.object({
  supabase_id: z.string().uuid('Invalid user ID format'),
  role: z.string().min(1, 'Role is required'),
  created_by: z.string().uuid('Invalid creator ID format').nullable(),
});

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be a positive number'),
  limit: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});

// Search query validation
export const SearchQuerySchema = z.object({
  q: z
    .string()
    .nullable()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        // Prevent XSS in search queries
        return !/<script|javascript:|data:|vbscript:|on\w+\s*=/i.test(value);
      },
      {
        message: 'Search query contains invalid characters',
      }
    ),
});

// Export type inference helpers
export type ChargerIdInput = z.infer<typeof ChargerIdSchema>;
export type ProfileInput = z.infer<typeof ProfileSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type ConnectorInput = z.infer<typeof ConnectorSchema>;
export type PermissionInput = z.infer<typeof PermissionSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
