import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Validation utilities and schemas
 * Centralized validation functionality
 */

/**
 * Enhanced validation error class with metadata support
 */
export class ValidationError extends Error {
  public readonly metadata: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category:
      | 'authentication'
      | 'authorization'
      | 'validation'
      | 'network'
      | 'server'
      | 'client'
      | 'external';
    correlationId?: string;
    timestamp: Date;
    context?: Record<string, unknown>;
    retryable: boolean;
    userMessage: string;
  };

  constructor(
    message: string,
    public status: number = 400,
    public issues: z.ZodIssue[] = [],
    metadata: Partial<typeof ValidationError.prototype.metadata> = {}
  ) {
    super(message);
    this.name = 'ValidationError';

    this.metadata = {
      severity: 'low',
      category: 'validation',
      timestamp: new Date(),
      retryable: false,
      userMessage: this.getSimpleMessage(),
      context: {
        issues: issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
      },
      ...metadata,
    };
  }

  /**
   * Convert Zod issues to user-friendly error messages
   */
  getFormattedErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    for (const issue of this.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }

    return errors;
  }

  /**
   * Get a single error message for simple validation failures
   */
  getSimpleMessage(): string {
    if (this.issues.length === 0) return this.message;
    return this.issues[0].message;
  }
}

/**
 * Validate request data against a Zod schema
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 */
export async function validateRequest<T>(data: unknown, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const result = schema.safeParse(data);

    if (!result.success) {
      throw new ValidationError('Validation failed', 400, result.error.issues);
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    // Handle unexpected validation errors
    throw new ValidationError('Validation error occurred', 400, []);
  }
}

/**
 * Validate URL parameters (like route params)
 * @param params - URL parameters object
 * @param schema - Zod schema to validate against
 * @returns Validated and typed parameters
 * @throws ValidationError if validation fails
 */
export async function validateParams<T>(
  params: Promise<Record<string, string>> | Record<string, string>,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const resolvedParams = await Promise.resolve(params);
    return validateRequest(resolvedParams, schema);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new ValidationError('Invalid URL parameters', 400, []);
  }
}

/**
 * Validate query parameters from URL search params
 * @param searchParams - URLSearchParams or search params object
 * @param schema - Zod schema to validate against
 * @returns Validated and typed query parameters
 * @throws ValidationError if validation fails
 */
export async function validateQuery<T>(
  searchParams: URLSearchParams | Promise<Record<string, string | string[] | undefined>>,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    let queryObject: Record<string, string | string[] | undefined>;

    if (searchParams instanceof URLSearchParams) {
      queryObject = Object.fromEntries(searchParams.entries());
    } else {
      queryObject = await Promise.resolve(searchParams);
    }

    return validateRequest(queryObject, schema);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new ValidationError('Invalid query parameters', 400, []);
  }
}

/**
 * Validate JSON request body
 * @param request - NextJS Request object
 * @param schema - Zod schema to validate against
 * @returns Validated and typed request body
 * @throws ValidationError if validation fails
 */
export async function validateBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const contentType = request.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      throw new ValidationError('Content-Type must be application/json', 400, []);
    }

    const body = await request.json();
    return validateRequest(body, schema);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON in request body', 400, []);
    }

    throw new ValidationError('Failed to parse request body', 400, []);
  }
}

/**
 * Create a standardized validation error response
 * @param error - ValidationError instance
 * @returns NextResponse with error details
 */
export function createValidationErrorResponse(error: ValidationError): NextResponse {
  const response = {
    error: error.message,
    details: error.issues.length > 0 ? error.getFormattedErrors() : undefined,
  };

  return NextResponse.json(response, { status: error.status });
}

/**
 * Higher-order function to wrap API route handlers with validation
 * @param handler - Original API route handler
 * @param validations - Object containing validation schemas for different parts of the request
 * @returns Wrapped handler with validation
 */
export function withValidation<
  TParams = Record<string, unknown>,
  TQuery = Record<string, unknown>,
  TBody = Record<string, unknown>,
>(
  handler: (
    request: Request,
    context: {
      params: TParams;
      query?: TQuery;
      body?: TBody;
    }
  ) => Promise<NextResponse>,
  validations: {
    params?: z.ZodSchema<TParams>;
    query?: z.ZodSchema<TQuery>;
    body?: z.ZodSchema<TBody>;
  }
) {
  return async (
    request: Request,
    { params }: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      const context: {
        params: TParams;
        query?: TQuery;
        body?: TBody;
      } = {} as {
        params: TParams;
        query?: TQuery;
        body?: TBody;
      };

      // Validate parameters if schema provided
      if (validations.params) {
        context.params = await validateParams(params, validations.params);
      } else {
        context.params = (await params) as TParams;
      }

      // Validate query parameters if schema provided
      if (validations.query) {
        const url = new URL(request.url);
        context.query = await validateQuery(url.searchParams, validations.query);
      }

      // Validate request body if schema provided
      if (validations.body) {
        context.body = await validateBody(request, validations.body);
      }

      // Call the original handler with validated data
      return await handler(request, context);
    } catch (error) {
      // Handle validation errors
      if (error instanceof ValidationError) {
        return createValidationErrorResponse(error);
      }

      // Re-throw other errors to be handled by the original error handling
      throw error;
    }
  };
}

/**
 * Utility function to sanitize string inputs
 * Removes potential XSS vectors while preserving valid content
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocols
    .replace(/vbscript:/gi, ''); // Remove vbscript: protocols
}

/**
 * Utility function to validate and sanitize file uploads (for future use)
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type must be one of: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension must be one of: ${allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

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
