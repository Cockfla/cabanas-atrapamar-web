import { supabase } from "../../../db/supabaseClient";
import crypto from "crypto";

export async function POST({ request }) {
  try {
    console.log(
      `[${new Date().toISOString()}] 🔔 Recibiendo notificación de Getnet...`
    );
    console.log(
      "Headers recibidos:",
      Object.fromEntries(request.headers.entries())
    );

    // Obtener el cuerpo de la solicitud
    const notification = await request.json();

    console.log(
      "📨 Notificación recibida:",
      JSON.stringify(notification, null, 2)
    );

    // Extraer datos de la notificación
    const { status, requestId, reference, signature } = notification;

    if (!status || !requestId || !reference || !signature) {
      console.error("Notificación incompleta:", notification);
      return new Response(
        JSON.stringify({ error: "Datos de notificación incompletos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validar autenticidad de la notificación
    const secretKey = process.env.GETNET_SECRET_KEY;
    if (!secretKey) {
      console.error("GETNET_SECRET_KEY no configurada");
      return new Response(
        JSON.stringify({ error: "Configuración de servidor incompleta" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Crear firma para validación: SHA-1(requestId + status + date + secretKey)
    const dataToSign = `${requestId}${status.status}${status.date}${secretKey}`;
    const expectedSignature = crypto
      .createHash("sha1")
      .update(dataToSign)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Firma inválida. Notificación no auténtica.");
      console.log("Firma esperada:", expectedSignature);
      console.log("Firma recibida:", signature);
      return new Response(
        JSON.stringify({ error: "Notificación no auténtica" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Notificación validada correctamente");

    // Buscar la reserva por requestId (que guardamos como transaction_token)
    const { data: reserva, error: reservaError } = await supabase
      .from("reservas")
      .select("*")
      .eq("transaction_token", requestId.toString())
      .single();

    if (reservaError || !reserva) {
      console.error(
        "No se encontró la reserva con transaction_token:",
        requestId
      );
      // Aún así retornamos 200 para que Getnet no reintente
      return new Response(
        JSON.stringify({
          message: "Reserva no encontrada, pero notificación procesada",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Reserva encontrada:", reserva.id);

    // Determinar nuevo estado basado en la respuesta de Getnet
    let nuevoEstado;
    let notificacionEmail = false;

    switch (status.status) {
      case "APPROVED":
        nuevoEstado = "confirmada";
        notificacionEmail = true;
        console.log("Pago aprobado - Confirmando reserva");
        break;
      case "DECLINED":
      case "REJECTED":
      case "FAILED":
        nuevoEstado = "fallida";
        console.log("Pago rechazado - Marcando reserva como fallida");
        break;
      case "PENDING":
      case "IN_PROGRESS":
        nuevoEstado = "pendiente";
        console.log("Pago pendiente - Manteniendo en proceso");
        break;
      default:
        console.log("Estado desconocido:", status.status);
        nuevoEstado = "pendiente";
        break;
    }

    // Actualizar la reserva en la base de datos
    const updateData = {
      estado: nuevoEstado,
      payment_details: JSON.stringify(notification),
      updated_at: new Date().toISOString(),
    };

    // Si el pago fue aprobado, también actualizamos la fecha de confirmación
    if (nuevoEstado === "confirmada") {
      updateData.fecha_confirmacion = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("reservas")
      .update(updateData)
      .eq("id", reserva.id);

    if (updateError) {
      console.error("Error actualizando reserva:", updateError);
      return new Response(
        JSON.stringify({ error: "Error actualizando reserva" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Reserva ${reserva.id} actualizada a estado: ${nuevoEstado}`);

    // Si el pago fue aprobado, enviar notificación por email (opcional)
    if (notificacionEmail) {
      try {
        await enviarEmailConfirmacion(reserva, notification);
      } catch (emailError) {
        console.error("Error enviando email de confirmación:", emailError);
        // No fallar la notificación por error de email
      }
    }

    // Responder exitosamente a Getnet
    return new Response(
      JSON.stringify({
        message: "Notificación procesada correctamente",
        reservaId: reserva.id,
        nuevoEstado: nuevoEstado,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error procesando notificación de Getnet:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Función auxiliar para enviar email de confirmación
async function enviarEmailConfirmacion(reserva, paymentNotification) {
  console.log("Enviando email de confirmación para reserva:", reserva.id);

  // Aquí puedes integrar con tu servicio de email preferido
  // Por ejemplo: SendGrid, Nodemailer, etc.

  // Ejemplo de estructura del email:
  const emailData = {
    to: reserva.email,
    subject: `Confirmación de Reserva #${reserva.id} - Cabañas Atrapa Mar`,
    html: `
      <h2>¡Tu reserva ha sido confirmada!</h2>
      <p>Hola ${reserva.nombre},</p>
      <p>Tu pago ha sido procesado exitosamente y tu reserva está confirmada.</p>
      
      <h3>Detalles de tu reserva:</h3>
      <ul>
        <li><strong>Número de reserva:</strong> ${reserva.id}</li>
        <li><strong>Fecha de llegada:</strong> ${reserva.fecha_inicio}</li>
        <li><strong>Fecha de salida:</strong> ${reserva.fecha_fin}</li>
        <li><strong>Monto pagado:</strong> $${reserva.monto.toLocaleString(
          "es-CL"
        )}</li>
      </ul>
      
      <p>Te esperamos en Cabañas Atrapa Mar. ¡Que disfrutes tu estadía!</p>
      
      <p>Saludos,<br>
      Equipo Cabañas Atrapa Mar</p>
    `,
  };

  console.log("Email preparado para:", emailData.to);

  // TODO: Implementar envío real de email
  // await enviarEmail(emailData);
}

// Permitir solo POST
export async function GET() {
  return new Response(JSON.stringify({ error: "Método no permitido" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
