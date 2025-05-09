import { supabase } from "../../../db/supabaseClient";
import crypto from "crypto";

export const POST = async ({ request }) => {
  try {
    // En la respuesta de Getnet, los datos vienen como form-data
    const formData = await request.formData();
    const requestId = formData.get("requestId");
    const reservaId = new URL(request.url).searchParams.get("id");

    if (!requestId || !reservaId) {
      throw new Error("Faltan parámetros requeridos");
    }

    // Preparar autenticación para obtener información de la transacción
    const login = "7ffbb7bf1f7361b1200b2e8d74e1d76f";
    const secretKey = "SnZP3D63n3I9dH9O";

    // Generar nonce (valor aleatorio)
    const nonceBuffer = crypto.randomBytes(16);
    const nonce = nonceBuffer.toString("base64");

    // Generar seed (fecha actual en formato ISO 8601)
    const seed = new Date().toISOString();

    // Calcular tranKey (Base64(SHA-256(nonce + seed + secretKey)))
    const tranKeyRaw = crypto
      .createHash("sha256")
      .update(nonceBuffer + seed + secretKey)
      .digest();
    const tranKey = tranKeyRaw.toString("base64");

    // Consultar estado de la transacción según el manual
    const authData = {
      login,
      tranKey,
      nonce,
      seed,
    };

    // Usar el endpoint correcto para consultar el estado de la transacción
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
    if (transactionData.status?.status === "APPROVED") {
      estado = "confirmada";
    } else if (transactionData.status?.status === "REJECTED") {
      estado = "fallida";
    } else {
      estado = "pendiente";
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
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321";
    const redirectUrl = `${siteUrl}/reserva-resultado?id=${reservaId}&status=${estado}`;

    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("Error al procesar respuesta de pago:", error);

    const siteUrl = import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321";
    return Response.redirect(`${siteUrl}/error-pago`, 302);
  }
};
