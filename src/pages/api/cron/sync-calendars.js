import { supabase } from "../../../db/supabaseClient";
import ical from "node-ical";
import { format } from "date-fns";

// Crear una clave secreta segura si no existe
const CRON_SECRET_KEY =
  process.env.CRON_SECRET_KEY ||
  "sync-calendar-secret-key-" + Math.random().toString(36).substring(2, 15);
if (!process.env.CRON_SECRET_KEY) {
  console.warn(
    "⚠️ CRON_SECRET_KEY no está configurada. Se ha generado una clave temporal, pero es recomendable configurar una clave permanente en las variables de entorno."
  );
}

export async function GET(request) {
  // Verificar si la solicitud proviene de un servicio de cron
  const authHeader = request.headers.get("Authorization");
  const userAgent = request.headers.get("User-Agent");

  // Verificar si es una solicitud de Vercel Cron Jobs o una solicitud autenticada con token
  const isVercelCron = userAgent && userAgent.includes("vercel-cron/1.0");
  const hasValidToken =
    authHeader && authHeader === `Bearer ${CRON_SECRET_KEY}`;

  // Permitir si es Vercel Cron O tiene token válido
  if (!isVercelCron && !hasValidToken) {
    console.warn(
      "Intento de acceso no autorizado a la sincronización de calendarios"
    );
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log("Iniciando sincronización de calendarios...");

    // Obtener todas las fuentes de calendarios habilitadas
    const { data: sources, error: sourcesError } = await supabase
      .from("ical_sources")
      .select("*, cabañas:cabaña_id(nombre)")
      .eq("enabled", true);

    if (sourcesError)
      throw new Error(`Error obteniendo fuentes: ${sourcesError.message}`);

    console.log(
      `Se encontraron ${sources?.length || 0} fuentes para sincronizar`
    );

    const results = [];

    // Procesar cada fuente
    for (const source of sources) {
      try {
        console.log(
          `Procesando calendario para cabaña: ${
            source.cabañas?.nombre || source.cabaña_id
          }`
        );

        if (!source.url) {
          console.warn(
            `La cabaña ID: ${source.cabaña_id} no tiene URL configurada.`
          );
          results.push({
            cabaña_id: source.cabaña_id,
            cabaña_nombre: source.cabañas?.nombre,
            error: "URL no configurada",
            success: false,
          });
          continue;
        }

        // Obtener eventos del calendario
        console.log(`Descargando calendario desde: ${source.url}`);
        const events = await ical.async.fromURL(source.url);
        let importCount = 0;
        let updateCount = 0;

        console.log(
          `Procesando ${Object.keys(events).length} eventos del calendario`
        );

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
              updateCount++;
            } else {
              // Extraer más información útil del evento si existe
              const summary = event.summary || "Reserva de Airbnb";
              const description =
                event.description || "Importado automáticamente";

              // Insertar nueva reserva
              await supabase.from("reservas").insert([
                {
                  nombre: summary,
                  email: "airbnb@importado.com",
                  telefono: "Importado de Airbnb",
                  cabaña_id: source.cabaña_id,
                  fecha_inicio: fechaInicio,
                  fecha_fin: fechaFin,
                  created_at: new Date().toISOString(),
                  external_id: event.uid,
                  source: "airbnb",
                  notas: description,
                },
              ]);

              importCount++;
            }
          }
        }

        // Actualizar timestamp de sincronización
        await supabase
          .from("ical_sources")
          .update({
            last_synced: new Date().toISOString(),
            sync_status: "success",
            sync_message: `Se importaron ${importCount} nuevas reservas y se actualizaron ${updateCount}`,
          })
          .eq("id", source.id);

        console.log(
          `✓ Sincronización exitosa para cabaña ${source.cabaña_id}: ${importCount} nuevas, ${updateCount} actualizadas`
        );

        results.push({
          cabaña_id: source.cabaña_id,
          cabaña_nombre: source.cabañas?.nombre,
          imported: importCount,
          updated: updateCount,
          success: true,
        });
      } catch (sourceError) {
        console.error(
          `Error procesando cabaña ${source.cabaña_id}:`,
          sourceError
        );

        // Registrar el error en la base de datos
        await supabase
          .from("ical_sources")
          .update({
            last_sync_attempt: new Date().toISOString(),
            sync_status: "error",
            sync_message: sourceError.message,
          })
          .eq("id", source.id);

        results.push({
          cabaña_id: source.cabaña_id,
          cabaña_nombre: source.cabañas?.nombre,
          error: sourceError.message,
          success: false,
        });
      }
    }

    console.log("Sincronización de calendarios completada.");

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en sincronización:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Permite ejecutar esta función de forma manual desde la interfaz
export async function POST(request) {
  // Verifica la autenticación en caso de ejecución manual
  try {
    const json = await request.json();

    // Si hay un token de administrador proporcionado, verificarlo
    if (json.adminToken && json.adminToken === process.env.ADMIN_SECRET) {
      // Si el token es válido, proceder con la sincronización
      return GET(request);
    }

    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Solicitud inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const dynamic = "force-dynamic";
export const prerender = false;
