import { supabase } from "../db/supabaseClient";
import calendarConfig from "../config/calendar-sources.json";
import fs from "fs";
import path from "path";

async function setupCalendarSync() {
  console.log("Iniciando configuración de sincronización de calendarios...");

  try {
    // Verificar que todas las cabañas existan en la base de datos
    for (const cabana of calendarConfig.cabanas) {
      if (!cabana.enabled) {
        console.log(
          `La cabaña ID: ${cabana.id} está desactivada, omitiendo...`
        );
        continue;
      }

      // Verificar si la cabaña existe
      const { data: cabanaData, error: cabanaError } = await supabase
        .from("cabañas")
        .select("id, nombre")
        .eq("id", cabana.id)
        .single();

      if (cabanaError) {
        console.warn(
          `Advertencia: La cabaña ID: ${cabana.id} no existe en la base de datos.`
        );
        continue;
      }

      console.log(`Configurando sincronización para: ${cabanaData.nombre}`); // Guardar o actualizar la configuración en la base de datos
      // Verificar si ya existe una configuración para esta cabaña
      const { data: existing } = await supabase
        .from("ical_sources")
        .select("id")
        .eq("cabaña_id", cabana.id)
        .maybeSingle();

      let saveError;

      if (existing) {
        // Actualizar entrada existente
        const { error } = await supabase
          .from("ical_sources")
          .update({
            url: cabana.icalUrl,
            last_synced: null, // Se actualizará en la primera sincronización
            enabled: true,
          })
          .eq("id", existing.id);

        saveError = error;
      } else {
        // Crear nueva entrada
        const { error } = await supabase.from("ical_sources").insert({
          cabaña_id: cabana.id,
          url: cabana.icalUrl,
          last_synced: null, // Se actualizará en la primera sincronización
          enabled: true,
        });

        saveError = error;
      }

      if (saveError) {
        console.error(`Error configurando cabaña ID: ${cabana.id}:`, saveError);
      } else {
        console.log(`✓ Configuración actualizada para cabaña ID: ${cabana.id}`);
      }
    }

    console.log("Configuración de sincronización completada con éxito.");
  } catch (error) {
    console.error("Error en la configuración:", error);
  }
}

// Ejecución del script
setupCalendarSync()
  .then(() => {
    console.log("Proceso finalizado");
  })
  .catch((err) => {
    console.error("Error crítico:", err);
  });
