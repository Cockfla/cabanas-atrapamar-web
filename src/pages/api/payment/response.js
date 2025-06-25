import { supabase } from "../../../db/supabaseClient";
import crypto from "crypto";

// Reutiliza la lógica principal en una función para evitar duplicidad
async function processResponse(request, isGet = false) {
  try {
    // Obtener la URL base del sitio
    const siteUrl =
      process.env.SITE_URL || "https://cabanas-atrapamar-web.vercel.app";

    // Log inicial para debugging
    console.log(
      `[${new Date().toISOString()}] Procesando respuesta de pago - Método: ${
        isGet ? "GET" : "POST"
      }`
    );
    console.log("URL recibida:", request.url);

    // Obtener los datos dependiendo del método de la solicitud
    let requestId, reservaId;

    if (isGet) {
      // Para solicitudes GET, los parámetros vienen en la URL
      const url = new URL(request.url);
      requestId = url.searchParams.get("requestId");
      reservaId = url.searchParams.get("id");

      console.log("Parámetros GET detectados:", { requestId, reservaId });
      console.log(
        "Todos los parámetros URL:",
        Object.fromEntries(url.searchParams.entries())
      );
    } else {
      // Para solicitudes POST, los datos vienen como form-data
      const formData = await request.formData();
      requestId = formData.get("requestId");
      reservaId = new URL(request.url).searchParams.get("id");

      console.log("Parámetros POST detectados:", { requestId, reservaId });
      console.log(
        "Todos los datos del formulario:",
        Object.fromEntries(formData.entries())
      );
    }

    if (!requestId && isGet) {
      // Si es GET y no hay requestId, intentamos obtenerlo de otro parámetro
      // a veces Getnet lo envía con otro nombre
      const url = new URL(request.url);
      requestId =
        url.searchParams.get("id_session") ||
        url.searchParams.get("session") ||
        url.searchParams.get("ref");
    }

    // Si tenemos reservaId pero no requestId, verificamos directamente la última transacción asociada
    if (reservaId && !requestId) {
      console.log(
        "Buscando requestId en la base de datos para reservaId:",
        reservaId
      );
      const { data: reserva } = await supabase
        .from("reservas")
        .select("transaction_token, id, estado")
        .eq("id", reservaId)
        .single();

      if (reserva && reserva.transaction_token) {
        requestId = reserva.transaction_token;
        console.log("RequestId encontrado en la base de datos:", requestId);

        // Si la reserva ya está confirmada, redirigir directamente
        if (reserva.estado === "confirmada") {
          console.log("Reserva ya confirmada, redirigiendo...");
          return Response.redirect(
            `${siteUrl}/reserva-resultado?id=${reservaId}&status=confirmed`,
            302
          );
        }
      } else {
        console.log("No se encontró transaction_token en la base de datos");

        // Realizar una consulta adicional para ver qué se guardó exactamente
        const { data: reservaCompleta } = await supabase
          .from("reservas")
          .select("*")
          .eq("id", reservaId)
          .single();

        console.log("Datos completos de la reserva:", reservaCompleta);
      }
    }

    // Si todavía no tenemos requestId pero tenemos reservaId, simplemente actualizamos el estado
    // como pendiente y continuamos con el flujo
    if (!requestId && reservaId) {
      console.log("No se encontró requestId, continuando con estado pendiente");
      await supabase
        .from("reservas")
        .update({
          estado: "pendiente",
          payment_status: "PENDING",
          payment_details: JSON.stringify({
            message: "No se pudo verificar el estado del pago",
          }),
        })
        .eq("id", reservaId);

      // Redirigir al usuario a la página de resultado con estado pendiente
      const redirectUrl = `${siteUrl}/reserva-resultado?id=${reservaId}&status=pendiente`;

      return Response.redirect(redirectUrl, 302);
    }

    if (!reservaId) {
      console.error("❌ Falta el ID de reserva en la solicitud");
      console.log("URL analizada:", request.url);

      // Intentar extraer ID de la URL de diferentes maneras
      const url = new URL(request.url);
      const possibleId =
        url.searchParams.get("reserva_id") ||
        url.searchParams.get("ref") ||
        url.searchParams.get("reference");

      if (possibleId) {
        console.log("ID alternativo encontrado:", possibleId);
        reservaId = possibleId;
      } else {
        return new Response(
          JSON.stringify({
            error: "Falta el ID de reserva",
            received_params: Object.fromEntries(url.searchParams.entries()),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Si llegamos aquí, tenemos tanto requestId como reservaId
    // Preparar autenticación para obtener información de la transacción
    const login = "7ffbb7bf1f7361b1200b2e8d74e1d76f";
    const secretKey = "SnZP3D63n3I9dH9O";

    // Generar nonce (valor aleatorio)
    const nonceBuffer = crypto.randomBytes(16);
    const nonce = nonceBuffer.toString("base64");

    // Generar seed (fecha actual en formato ISO 8601)
    const seed = new Date().toISOString();

    // Calcular tranKey correctamente
    const tranKey = crypto
      .createHash("sha256")
      .update(
        Buffer.concat([nonceBuffer, Buffer.from(seed), Buffer.from(secretKey)])
      )
      .digest("base64");

    // Consultar estado de la transacción según el manual
    const authData = {
      login,
      tranKey,
      nonce,
      seed,
    };

    // Consultar estado de la transacción
    const response = await fetch(
      `https://checkout.test.getnet.cl/api/session/${requestId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ auth: authData }),
      }
    );

    const transactionData = await response.json();
    console.log(
      "Respuesta de consulta de transacción:",
      JSON.stringify(transactionData)
    );

    // Determinar el estado de la transacción
    let estado;
    console.log(
      "Analizando estado de transacción:",
      transactionData.status?.status
    );

    if (transactionData.status?.status === "APPROVED") {
      estado = "confirmada";
      console.log("Transacción APROBADA");
    } else if (transactionData.status?.status === "REJECTED") {
      estado = "fallida";
      console.log("Transacción RECHAZADA");
    } else {
      estado = "pendiente";
      console.log("Transacción en estado PENDIENTE o desconocido");
    }

    // Actualizar la reserva con la información obtenida
    await supabase
      .from("reservas")
      .update({
        estado: estado,
        payment_status: transactionData.status?.status,
        payment_details: JSON.stringify(transactionData),
      })
      .eq("id", reservaId);

    // Redirigir al usuario a la página de resultado
    console.log(`✅ Redirigiendo usuario a resultado con estado: ${estado}`);
    const redirectUrl = `${siteUrl}/reserva-resultado?id=${reservaId}&status=${estado}`;
    console.log("URL de redirección:", redirectUrl);

    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("❌ Error al procesar respuesta de pago:", error);
    console.error("Stack trace:", error.stack);

    // Obtener la URL base para la redirección de error
    const siteUrl =
      process.env.SITE_URL || "https://cabanas-atrapamar-web.vercel.app";

    // Redireccionar a la página de resultado con información de error
    const errorUrl = `${siteUrl}/reserva-resultado?error=true&message=${encodeURIComponent(
      error.message
    )}`;
    console.log("Redirigiendo a página de error:", errorUrl);

    return Response.redirect(errorUrl, 302);
  }
}

// Manejador POST (existente)
export const POST = async ({ request }) => {
  console.log("🔄 Endpoint POST /api/payment/response llamado");
  return processResponse(request);
};

// Nuevo manejador GET
export const GET = async ({ request }) => {
  console.log("🔄 Endpoint GET /api/payment/response llamado");
  return processResponse(request, true);
};

// Agregar prerender false para que funcione en Vercel
export const prerender = false;
