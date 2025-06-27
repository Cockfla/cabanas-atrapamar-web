import { supabase } from "../../../../db/supabaseClient";
import ical from "ical-generator";
import { format } from "date-fns";

export async function GET({ params }) {
  try {
    const { token } = params;

    if (!token) {
      return new Response("Token no proporcionado", { status: 400 });
    }

    // Eliminar la extensión .ics si está presente
    const cleanToken = token.replace(".ics", "");

    // Buscar el token en la base de datos para identificar la cabaña
    const { data: tokenData, error: tokenError } = await supabase
      .from("ical_links")
      .select("cabaña_id")
      .eq("link_token", cleanToken)
      .single();

    if (tokenError || !tokenData) {
      return new Response("Token inválido o expirado", { status: 404 });
    }

    // Obtener información de la cabaña
    const { data: cabaña, error: cabañaError } = await supabase
      .from("cabañas")
      .select("nombre, ubicacion")
      .eq("id", tokenData.cabaña_id)
      .single();

    if (cabañaError || !cabaña) {
      return new Response("Cabaña no encontrada", { status: 404 });
    }

    // Obtener reservas para esta cabaña
    const { data: reservas, error: reservasError } = await supabase
      .from("reservas")
      .select("*")
      .eq("cabaña_id", tokenData.cabaña_id);

    if (reservasError) {
      return new Response("Error obteniendo reservas", { status: 500 });
    }

    // Crear el calendario iCal
    const calendar = ical({
      name: `Reservas - ${cabaña.nombre} (${cabaña.ubicacion})`,
      timezone: "America/Santiago",
      prodId: {
        company: "Atrapa Mar Cabañas",
        product: "Reservas Calendar",
        language: "ES",
      },
    });

    // Añadir cada reserva como un evento
    reservas.forEach((reserva) => {
      // Convertir fechas de string a Date
      const fechaInicio = new Date(reserva.fecha_inicio);
      // La fecha de fin en iCal es exclusiva, así que sumamos un día
      const fechaFin = new Date(reserva.fecha_fin);
      fechaFin.setDate(fechaFin.getDate() + 1);

      calendar.createEvent({
        start: fechaInicio,
        end: fechaFin,
        summary: `Reserva: ${reserva.nombre}`,
        description: `Reserva para ${reserva.nombre}. Contacto: ${reserva.email}, ${reserva.telefono}`,
        location: cabaña.ubicacion,
        uid: reserva.id.toString(), // Identificador único para el evento
        status: "CONFIRMED",
        created: new Date(reserva.created_at || new Date()),
      });
    });

    // Generar el contenido del calendario
    const icalString = calendar.toString();

    // Devolver el calendario como respuesta
    return new Response(icalString, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="${cabaña.nombre}-reservas.ics"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating iCal:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}

export const prerender = false;
