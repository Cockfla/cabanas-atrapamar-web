import { supabase } from "../../../db/supabaseClient";
import crypto from "crypto";

export const POST = async ({ request }) => {
  try {
    const data = await request.json();
    const {
      nombre,
      email,
      telefono,
      cabaña_id,
      fecha_inicio,
      fecha_fin,
      monto,
    } = data;

    // 1. Guardar reserva pendiente en la base de datos
    const { data: reservaData, error: reservaError } = await supabase
      .from("reservas")
      .insert([
        {
          nombre,
          email,
          telefono,
          cabaña_id,
          fecha_inicio,
          fecha_fin,
          estado: "pendiente",
          created_at: new Date().toISOString(),
          monto,
        },
      ])
      .select();

    if (reservaError) throw new Error(reservaError.message);

    const reservaId = reservaData[0].id;

    // 2. Preparar autenticación según el manual de Getnet
    const login = "7ffbb7bf1f7361b1200b2e8d74e1d76f"; // Login proporcionado
    const secretKey = "SnZP3D63n3I9dH9O"; // Secret key proporcionado

    // Generar nonce (valor aleatorio)
    const nonceBuffer = crypto.randomBytes(16);
    const nonce = nonceBuffer.toString("base64");

    // Generar seed (fecha actual en formato ISO 8601)
    const seed = new Date().toISOString();

    // Calcular tranKey correctamente según el manual
    // Base64(SHA-256(nonce + seed + secretKey))
    // Donde nonce es el valor binario original, no el codificado en base64
    const tranKey = crypto
      .createHash("sha256")
      .update(
        Buffer.concat([nonceBuffer, Buffer.from(seed), Buffer.from(secretKey)])
      )
      .digest("base64");

    console.log({
      login,
      tranKey,
      nonce,
      seed,
    });

    // 3. Crear estructura de datos para la solicitud según el manual
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321";

    // Generar fecha de expiración (30 minutos a partir de ahora)
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 30);

    // Estructura completa según el manual
    const requestData = {
      auth: {
        login,
        tranKey,
        nonce,
        seed,
      },
      locale: "es_CL",
      buyer: {
        name: nombre.split(" ")[0] || nombre,
        surname: nombre.split(" ").slice(1).join(" ") || "",
        email: email,
        document: "11111111-1", // Documento de ejemplo (RUT)
        documentType: "CLRUT",
        mobile: telefono,
      },
      payment: {
        reference: `RESERVA-${reservaId}`,
        description: `Reserva de cabaña #${cabaña_id} del ${fecha_inicio} al ${fecha_fin}`,
        amount: {
          currency: "CLP",
          total: monto,
        },
      },
      expiration: expirationDate.toISOString(),
      // Incluir ambos parámetros en la URL de retorno
      returnUrl: `${siteUrl}/api/payment/response?id=${reservaId}`,
      ipAddress: "127.0.0.1", // Debe ser la IP real del cliente
      userAgent: "Mozilla/5.0", // Debe ser el User-Agent real del cliente
    };

    console.log("Enviando solicitud a Getnet:", JSON.stringify(requestData));

    // 4. Enviar solicitud a la URL correcta según el manual
    const response = await fetch(
      "https://checkout.test.getnet.cl/api/session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }
    );

    const paymentResponse = await response.json();
    console.log("Respuesta de Getnet:", JSON.stringify(paymentResponse));

    if (!paymentResponse.processUrl) {
      throw new Error(
        "Error al generar la transacción: " + JSON.stringify(paymentResponse)
      );
    }

    // 5. Guardar requestId de la transacción (asegurar que se guarde como string)
    await supabase
      .from("reservas")
      .update({
        transaction_token: paymentResponse.requestId.toString(), // Garantizar que se guarde como string
        process_url: paymentResponse.processUrl,
      })
      .eq("id", reservaId);

    console.log(
      `RequestId ${paymentResponse.requestId} guardado para reserva ${reservaId}`
    );

    // 6. Retornar URL de proceso de pago
    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: paymentResponse.processUrl,
        reserva_id: reservaId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error al crear transacción:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
