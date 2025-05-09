import { supabase } from "../../../db/supabaseClient";
import ical from "node-ical";
import { format } from "date-fns";

export async function GET(request) {
  // Verificar si la solicitud proviene de un servicio de cron
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Obtener todas las fuentes de calendarios
    const { data: sources, error: sourcesError } = await supabase
      .from("ical_sources")
      .select("*");

    if (sourcesError)
      throw new Error(`Error obteniendo fuentes: ${sourcesError.message}`);

    const results = [];

    // Procesar cada fuente
    for (const source of sources) {
      try {
        // Obtener eventos del calendario
        const events = await ical.async.fromURL(source.url);
        let importCount = 0;

        // Procesar cada evento
        for (const key in events) {
          const event = events[key];

          if (event.type === "VEVENT" && event.start && event.end) {
            const fechaInicio = format(event.start, "yyyy-MM-dd");
            const fechaFin = format(event.end, "yyyy-MM-dd");

            // Verificar si ya existe la reserva con este external_id
            const { data: existingReserva } = await supabase
              .from("reservas")
              .select("id")
              .eq("external_id", event.uid)
              .single();

            if (existingReserva) {
              // Actualizar reserva existente
              await supabase
                .from("reservas")
                .update({
                  fecha_inicio: fechaInicio,
                  fecha_fin: fechaFin,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingReserva.id);
            } else {
              // Insertar nueva reserva
              await supabase.from("reservas").insert([
                {
                  nombre: event.summary || "Reserva de Airbnb",
                  email: "airbnb@importado.com",
                  telefono: "Reserva de Airbnb",
                  cabaña_id: source.cabaña_id,
                  fecha_inicio: fechaInicio,
                  fecha_fin: fechaFin,
                  created_at: new Date().toISOString(),
                  external_id: event.uid,
                  source: "airbnb",
                },
              ]);

              importCount++;
            }
          }
        }

        // Actualizar timestamp de sincronización
        await supabase
          .from("ical_sources")
          .update({ last_synced: new Date().toISOString() })
          .eq("id", source.id);

        results.push({
          cabaña_id: source.cabaña_id,
          imported: importCount,
          success: true,
        });
      } catch (sourceError) {
        results.push({
          cabaña_id: source.cabaña_id,
          error: sourceError.message,
          success: false,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error en sincronización:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const prerender = false;
