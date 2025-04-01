import type { APIRoute } from "astro";
import { supabase } from "../../../db/supabaseClient";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return new Response("Email y contraseña requeridos", {
      status: 400,
    });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      throw error || new Error("Invalid login credentials");
    }

    const { access_token, refresh_token } = data.session;

    // Configuración segura de cookies
    cookies.set("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD, // Solo Secure en producción
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hora (igual que expiración del token JWT)
    });

    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
    });

    return redirect("/admin");
  } catch (error) {
    // Log del error (en producción usar un sistema de logging)
    console.error("Login error:", error);

    // Mensaje genérico para evitar información sensible
    return new Response("Error en la autenticación. Intente nuevamente.", {
      status: 401,
    });
  }
};
