// Utilidades de seguridad para la aplicación
import crypto from "crypto";

/**
 * Sanitiza una cadena de texto para prevenir XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que una contraseña cumpla con requisitos mínimos
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Genera un token CSRF seguro usando crypto de Node.js
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Valida que un token CSRF sea válido
 */
export function validateCSRFToken(token: string): boolean {
  return (
    typeof token === "string" &&
    token.length === 64 &&
    /^[a-f0-9]+$/i.test(token)
  );
}

/**
 * Headers de seguridad estándar
 */
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
  "X-Download-Options": "noopen",
  "X-Permitted-Cross-Domain-Policies": "none",
};

/**
 * Headers de seguridad para producción
 */
export const productionSecurityHeaders = {
  ...securityHeaders,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

/**
 * Aplica headers de seguridad a una respuesta
 */
export function applySecurityHeaders(
  response: Response,
  isProduction = false
): Response {
  const headers = isProduction ? productionSecurityHeaders : securityHeaders;

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
