import type { APIRoute } from "astro";
import { supabase } from "../../../db/supabaseClient";
import {
  validateCSRFToken,
  isValidEmail,
  isValidPassword,
} from "../../../utils/security";

export const prerender = false;

// Rate limiting simple en memoria (en producción usar Redis)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }

  if (now - attempts.lastAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    return true;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  return false;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";
    const csrfToken = formData.get("csrf_token")?.toString() || "";

    console.log("Datos recibidos:", {
      email,
      hasPassword: !!password,
      hasCSRF: !!csrfToken,
    });

    // Validar CSRF token
    const storedCSRFToken = cookies.get("csrf-token")?.value;
    console.log("CSRF tokens:", {
      received: csrfToken,
      stored: storedCSRFToken,
    });

    if (
      !validateCSRFToken(csrfToken) ||
      !storedCSRFToken ||
      csrfToken !== storedCSRFToken
    ) {
      console.log("CSRF validation failed");
      return new Response("Token de seguridad inválido", {
        status: 403,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      });
    }

    // Validar entrada
    if (!email || !password) {
      return new Response("Email y contraseña requeridos", {
        status: 400,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      });
    }

    // Validar formato de email
    if (!isValidEmail(email)) {
      return new Response("Formato de email inválido", {
        status: 400,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      });
    }

    // Validar contraseña
    if (!isValidPassword(password)) {
      return new Response("Contraseña inválida", {
        status: 400,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      });
    }

    // Rate limiting
    if (isRateLimited(email)) {
      return new Response("Demasiados intentos de login. Intente más tarde.", {
        status: 429,
        headers: {
          "Retry-After": "900", // 15 minutos
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      });
    }

    // Intentar login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      console.error("Login error:", error);
      // Limpiar token CSRF usado
      cookies.delete("csrf-token", { path: "/" });

      return new Response("Credenciales inválidas", {
        status: 401,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      });
    }

    const { access_token, refresh_token } = data.session;

    // Limpiar token CSRF usado
    cookies.delete("csrf-token", { path: "/" });

    // Configuración segura de cookies con flags adicionales
    cookies.set("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hora
    });

    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
    });

    // Cookie de sesión para tracking
    cookies.set("session-active", "true", {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hora
    });

    // Limpiar intentos de login exitosos
    loginAttempts.delete(email);

    console.log("Login exitoso, redirigiendo a /admin");
    return redirect("/admin", 302);
  } catch (error) {
    console.error("Login error:", error);

    return new Response("Error interno del servidor", {
      status: 500,
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  }
};
