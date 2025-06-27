import { supabase } from "../../../db/supabaseClient";
import ical from "node-ical";
import { parseISO, format } from "date-fns";

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { icalUrl, cabañaId } = body;

    if (!icalUrl || !cabañaId) {
      return new Response(
        JSON.stringify({
          error: "URL del calendario y ID de cabaña son requeridos",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    } // Guardar la URL en la base de datos para futuras sincronizaciones
    // Verificar si ya existe una configuración para esta cabaña
    const { data: existing } = await supabase
      .from("ical_sources")
      .select("id")
      .eq("cabaña_id", cabañaId)
      .maybeSingle();

    let saveError;

    if (existing) {
      // Actualizar entrada existente
      const { error } = await supabase
        .from("ical_sources")
        .update({
          url: icalUrl,
          last_synced: new Date().toISOString(),
        })
        .eq("id", existing.id);

      saveError = error;
    } else {
      // Crear nueva entrada
      const { error } = await supabase.from("ical_sources").insert({
        cabaña_id: cabañaId,
        url: icalUrl,
        last_synced: new Date().toISOString(),
        enabled: true,
      });

      saveError = error;
    }

    if (saveError) {
      throw new Error(`Error guardando URL: ${saveError.message}`);
    }

    // Obtener eventos del calendario
    const events = await ical.async.fromURL(icalUrl);

    // Procesar cada evento y convertirlo a reservas
    const reservasAirbnb = [];

    for (const key in events) {
      const event = events[key];

      // Solo procesar eventos VEVENT (eventos del calendario)
      if (event.type === "VEVENT") {
        // Solo procesar eventos que sean reservas (con fecha de inicio y fin)
        if (event.start && event.end) {
          // Convertir fechas a formato YYYY-MM-DD
          const fechaInicio = format(event.start, "yyyy-MM-dd");
          const fechaFin = format(event.end, "yyyy-MM-dd");

          // Extraer información de la reserva del summary o description
          let nombreReserva = event.summary || "Reserva de Airbnb";
          // Mejorar nombres genéricos
          if (
            nombreReserva === "Reserved" ||
            nombreReserva === "Airbnb(Not Available)" ||
            nombreReserva.includes("Not Available")
          ) {
            // Añadir fechas al nombre para distinguir mejor las reservas
            const fechaInicioFormateada = format(event.start, "dd/MM/yyyy");
            const fechaFinFormateada = format(event.end, "dd/MM/yyyy");
            nombreReserva = `Huésped Airbnb (${fechaInicioFormateada} al ${fechaFinFormateada})`;
          }

          // Crear la reserva en nuestro sistema
          const { error: reservaError } = await supabase
            .from("reservas")
            .insert([
              {
                nombre: nombreReserva,
                email: "airbnb@importado.com", // Email genérico para reservas importadas
                telefono: "Reserva de Airbnb",
                cabaña_id: cabañaId,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                created_at: new Date().toISOString(),
                external_id: event.uid, // Guardar el ID único del evento para evitar duplicados
                source: "airbnb",
              },
            ]);

          if (reservaError) {
            // Si el error es de duplicado, lo ignoramos
            if (!reservaError.message.includes("duplicate")) {
              console.error("Error al crear reserva:", reservaError);
            }
          } else {
            reservasAirbnb.push({
              fechaInicio,
              fechaFin,
              nombre: nombreReserva,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${reservasAirbnb.length} reservas`,
        reservas: reservasAirbnb,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing iCal import:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Error procesando importación",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const prerender = false;
