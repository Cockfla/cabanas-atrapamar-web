// src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../db/supabaseClient";
import { applySecurityHeaders } from "../../../utils/security";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    // 1. Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error al cerrar sesión en Supabase:", error);
    }

    // 2. Eliminar todas las cookies de sesión
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    cookies.delete("session-active", { path: "/" });
    cookies.delete("csrf-token", { path: "/" });

    // 3. Redirigir al inicio con headers de seguridad
    const response = redirect("/", 302);

    // Agregar headers de seguridad a la respuesta
    return applySecurityHeaders(response, import.meta.env.PROD);
  } catch (error) {
    console.error("Error en logout:", error);

    // Aún así, limpiar cookies y redirigir
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    cookies.delete("session-active", { path: "/" });
    cookies.delete("csrf-token", { path: "/" });

    const response = redirect("/", 302);
    return applySecurityHeaders(response, import.meta.env.PROD);
  }
};
