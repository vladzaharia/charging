/**
 * Base SteVe Client with Authentication and Session Management
 * Handles low-level HTTP operations, CSRF tokens, and cookie management
 */

import * as cheerio from 'cheerio';
import { CookieJar } from 'tough-cookie';
import type { SteVeConfig, SteVeSession } from './types';
import { SteVeError, SteVeAuthenticationError } from './types';

export class SteVeBaseClient {
  protected config: SteVeConfig;
  protected cookieJar: CookieJar;
  protected session: SteVeSession | null = null;
  protected readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor(config: SteVeConfig) {
    this.config = config;
    this.cookieJar = new CookieJar();
  }

  /**
   * Authenticate with SteVe server and establish session
   */
  async authenticate(): Promise<void> {
    const loginUrl = `${this.config.serverUrl}/steve/manager/signin`;

    try {
      // Get login page and extract CSRF token
      const loginPageResponse = await this.fetch(loginUrl);
      const loginPageHtml = await loginPageResponse.text();
      const $ = cheerio.load(loginPageHtml);

      const csrfToken = this.extractCsrfToken($);
      if (!csrfToken) {
        throw new SteVeAuthenticationError('Could not extract CSRF token');
      }

      // Submit login credentials
      const formData = new URLSearchParams({
        username: this.config.username,
        password: this.config.password,
        _csrf: csrfToken,
      });

      const loginResponse = await this.fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: loginUrl,
        },
        body: formData.toString(),
        redirect: 'manual',
      });

      // Validate authentication success
      if (loginResponse.status === 302) {
        const location = loginResponse.headers.get('location');
        if (location && !location.includes('signin')) {
          this.session = {
            cookies: await this.cookieJar.getCookieString(this.config.serverUrl).then((c) => [c]),
            csrfToken,
            authenticated: true,
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
          };
          return;
        }
      }

      throw new SteVeAuthenticationError('Invalid credentials');
    } catch (error) {
      if (error instanceof SteVeAuthenticationError) {
        throw error;
      }
      throw new SteVeAuthenticationError(`Authentication failed: ${error}`);
    }
  }

  /**
   * Check if current session is valid and refresh if needed
   */
  async ensureAuthenticated(): Promise<void> {
    if (!this.session || !this.session.authenticated) {
      await this.authenticate();
      return;
    }

    // Check session expiry
    if (this.session.expiresAt && new Date() > this.session.expiresAt) {
      await this.authenticate();
      return;
    }

    // Update last activity
    this.session.lastActivity = new Date();
  }

  /**
   * Extract CSRF token from HTML page
   */
  protected extractCsrfToken($: cheerio.CheerioAPI): string | null {
    // Try multiple common CSRF token patterns
    const selectors = [
      'input[name="_csrf"]',
      'meta[name="_csrf"]',
      'input[name="_token"]',
      'meta[name="_token"]',
      'input[name="csrf_token"]',
      'meta[name="csrf_token"]',
      'input[name="authenticity_token"]',
      'meta[name="authenticity_token"]',
      // Spring Security default
      'input[name="_csrf"][type="hidden"]',
      'meta[name="_csrf_token"]',
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        const token = element.is('input') ? (element.val() as string) : element.attr('content');
        if (token && token.trim()) {
          return token.trim();
        }
      }
    }

    return null;
  }

  /**
   * Get current CSRF token from a page
   */
  async getCurrentCsrfToken(url?: string): Promise<string> {
    await this.ensureAuthenticated();

    const targetUrl = url || `${this.config.serverUrl}/steve/manager/home`;
    const response = await this.fetch(targetUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const token = this.extractCsrfToken($);
    if (!token) {
      // Provide more context for debugging
      const title = $('title').text();
      const hasLoginForm =
        $('form[action*="login"]').length > 0 || $('form[action*="signin"]').length > 0;
      const hasErrorMessage = $('.error, .alert-danger').length > 0;

      throw new SteVeError(
        `Could not extract CSRF token from page. Page title: "${title}", Has login form: ${hasLoginForm}, Has error: ${hasErrorMessage}`,
        'CSRF_TOKEN_ERROR',
        undefined,
        {
          url: targetUrl,
          title,
          hasLoginForm,
          hasErrorMessage,
          htmlSnippet: html.substring(0, 500),
        }
      );
    }

    // Update session token
    if (this.session) {
      this.session.csrfToken = token;
    }

    return token;
  }

  /**
   * Enhanced fetch with automatic authentication and error handling
   */
  protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const cookies = await this.cookieJar.getCookieString(url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'SteVe-Client/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...(cookies && { Cookie: cookies }),
        ...options.headers,
      },
      // Handle self-signed certificates in development
      ...(process.env.NODE_ENV === 'development' &&
        {
          // Note: In production, proper SSL certificates should be used
        }),
    });

    // Store cookies from response
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookieHeaders) {
      await this.cookieJar.setCookie(cookie, url);
    }

    // Handle common HTTP errors (but not redirects, which are normal)
    if (!response.ok && response.status !== 302 && response.status !== 301) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new SteVeError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
        response.status,
        { url, errorText }
      );
    }

    return response;
  }

  /**
   * Fetch and parse HTML page
   */
  protected async fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
    await this.ensureAuthenticated();
    const response = await this.fetch(url);
    const html = await response.text();
    return cheerio.load(html);
  }

  /**
   * Submit form with CSRF protection
   */
  protected async submitForm(
    action: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData: any,
    method: 'POST' | 'PUT' | 'DELETE' | 'GET' = 'POST'
  ): Promise<Response> {
    await this.ensureAuthenticated();

    const baseUrl = action.startsWith('http') ? action : `${this.config.serverUrl}${action}`;

    // For GET requests (like queries), we need to get the CSRF token from the base page
    // For POST requests, we get it from the target page
    let csrfTokenUrl = baseUrl;
    if (method === 'GET' && action.includes('/query')) {
      // For query endpoints, get CSRF token from the base page (without /query)
      csrfTokenUrl = baseUrl.replace('/query', '');
    }

    const csrfToken = await this.getCurrentCsrfToken(csrfTokenUrl);

    // Prepare form data
    const params = new URLSearchParams();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    params.append('_csrf', csrfToken);

    // For GET requests, append parameters to URL; for others, send in body
    if (method === 'GET') {
      const targetUrl = `${baseUrl}?${params.toString()}`;
      return this.fetch(targetUrl, {
        method,
        headers: {
          Referer: csrfTokenUrl,
        },
      });
    } else {
      return this.fetch(baseUrl, {
        method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: csrfTokenUrl,
        },
        body: params.toString(),
      });
    }
  }

  /**
   * Parse table data from HTML
   */
  protected parseTable(
    $: cheerio.CheerioAPI,
    tableSelector: string = 'table'
  ): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];
    const $table = $(tableSelector).first();

    if ($table.length === 0) {
      return results;
    }

    // Extract headers
    const headers: string[] = [];
    $table.find('thead th, tr:first-child th').each((_, th) => {
      headers.push($(th).text().trim());
    });

    // Extract rows
    const rowSelector = 'tbody tr, tr:not(:first-child)';
    const $rows = $table.find(rowSelector);

    $rows.each((_, tr) => {
      const $row = $(tr);
      const rowData: Record<string, unknown> = {};

      $row.find('td').each((index, td) => {
        const $cell = $(td);
        const header = headers[index];
        if (header) {
          // Try to extract links or form values
          const link = $cell.find('a').first();
          if (link.length > 0) {
            rowData[header] = {
              text: $cell.text().trim(),
              href: link.attr('href'),
            };
          } else {
            rowData[header] = $cell.text().trim();
          }
        }
      });

      if (Object.keys(rowData).length > 0) {
        results.push(rowData);
      }
    });

    return results;
  }

  /**
   * Extract form fields and their current values
   */
  protected parseForm(
    $: cheerio.CheerioAPI,
    formSelector: string = 'form'
  ): Record<string, unknown> {
    const formData: Record<string, unknown> = {};
    const $form = $(formSelector).first();

    $form.find('input, select, textarea').each((_, field) => {
      const $field = $(field);
      const name = $field.attr('name');
      const type = $field.attr('type') || $field.prop('tagName')?.toLowerCase();

      if (!name || type === 'submit' || type === 'button') {
        return;
      }

      if (type === 'checkbox' || type === 'radio') {
        formData[name] = $field.prop('checked') || false;
      } else if (type === 'select' || $field.is('select')) {
        formData[name] = $field.val();
      } else {
        formData[name] = $field.val() || '';
      }
    });

    return formData;
  }

  /**
   * Parse date from SteVe format
   */
  protected parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') {
      return null;
    }

    // Handle various SteVe date formats
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Format date for SteVe forms
   */
  protected formatDate(date: Date): string {
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  }

  /**
   * Clean up session and cookies
   */
  async logout(): Promise<void> {
    if (this.session?.authenticated) {
      try {
        await this.fetch(`${this.config.serverUrl}/steve/manager/signout`, {
          method: 'POST',
        });
      } catch (error) {
        // Ignore logout errors
      }
    }

    this.session = null;
    this.cookieJar = new CookieJar();
  }

  /**
   * Get current session info
   */
  getSession(): SteVeSession | null {
    return this.session;
  }
}
