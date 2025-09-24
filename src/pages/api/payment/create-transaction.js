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
      documento, // Nuevo campo
      tipoDocumento = "CLRUT", // Valor por defecto
    } = data;

    // Validación de campos requeridos según documentación
    if (
      !nombre ||
      !email ||
      !telefono ||
      !cabaña_id ||
      !fecha_inicio ||
      !fecha_fin ||
      !monto
    ) {
      throw new Error("Faltan campos requeridos para crear la transacción");
    }

    // Validar que el monto sea un número válido
    const montoNumerico = Number(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      throw new Error("El monto debe ser un número válido mayor a 0");
    }

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
    // Usar variables de entorno para las credenciales
    const login =
      process.env.GETNET_LOGIN || "7ffbb7bf1f7361b1200b2e8d74e1d76f"; // Login de ambiente de pruebas
    const secretKey = process.env.GETNET_SECRET_KEY || "SnZP3D63n3I9dH9O"; // Secret key de ambiente de pruebas

    // Validar que las credenciales están configuradas
    if (!login || !secretKey) {
      throw new Error("Credenciales de Getnet no configuradas");
    }

    // Generar nonce (valor aleatorio de 16 bytes)
    const nonceBuffer = crypto.randomBytes(16);
    const nonce = nonceBuffer.toString("base64"); // Para enviar en la estructura auth

    // Generar seed (fecha actual en formato ISO 8601)
    const seed = new Date().toISOString();

    // Calcular tranKey correctamente según el manual de Getnet v2.3
    // Base64(SHA-256(nonce + seed + secretKey))
    // Donde nonce es el valor binario original (no el codificado en base64)
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

    // 3. Obtener información real del cliente
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Mozilla/5.0";

    // Obtener URL base del sitio
    const siteUrl =
      process.env.SITE_URL ||
      process.env.PUBLIC_SITE_URL ||
      "http://localhost:4321";

    // Generar fecha de expiración (15 minutos recomendados por la documentación)
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 15);

    // Separar nombre y apellido correctamente
    const nombreParts = nombre.trim().split(" ");
    const primerNombre = nombreParts[0] || "";
    const apellidos = nombreParts.slice(1).join(" ") || "";

    // 4. Crear estructura de datos para la solicitud según el manual v2.3
    const requestData = {
      auth: {
        login,
        tranKey,
        nonce,
        seed,
      },
      locale: "es_CL", // Requerido según documentación
      buyer: {
        name: primerNombre,
        surname: apellidos,
        email: email,
        document: documento || "11111111-1", // Documento de ejemplo si no se proporciona
        documentType: tipoDocumento,
        mobile: telefono.toString(),
      },
      payment: {
        reference: `RESERVA-${reservaId}`, // Referencia única requerida
        description: `Reserva de cabaña del ${fecha_inicio} al ${fecha_fin}`, // Descripción del pago
        amount: {
          currency: "CLP", // Moneda según ISO 4217
          total: montoNumerico, // Monto total
        },
      },
      expiration: expirationDate.toISOString(), // Requerido - formato ISO 8601
      returnUrl: `${siteUrl}/reserva-resultado?id=${reservaId}`, // URL de retorno requerida
      cancelUrl: `${siteUrl}/reservas`, // URL de cancelación
      ipAddress: clientIP, // IP real del cliente requerida
      userAgent: userAgent, // User-Agent real requerido
      skipResult: true, // Omitir pantalla de resultado y redirigir automáticamente
      noBuyerFill: false, // Permitir autocompletado de datos del comprador
    };

    console.log("Enviando solicitud a Getnet:", {
      ...requestData,
      auth: {
        login: requestData.auth.login,
        tranKey: "[HIDDEN]",
        nonce: "[HIDDEN]",
        seed: requestData.auth.seed,
      },
    });

    // 5. Determinar endpoint según el ambiente
    const getnetBaseUrl =
      process.env.GETNET_BASE_URL || "https://checkout.test.getnet.cl";
    const endpoint = `${getnetBaseUrl}/api/session`;

    // Enviar solicitud a Getnet
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const paymentResponse = await response.json();
    console.log("Respuesta de Getnet:", {
      status: paymentResponse.status,
      requestId: paymentResponse.requestId,
      hasProcessUrl: !!paymentResponse.processUrl,
    });

    // Validar respuesta de Getnet
    if (!paymentResponse.processUrl || !paymentResponse.requestId) {
      throw new Error(
        `Error en la respuesta de Getnet: ${JSON.stringify(paymentResponse)}`
      );
    }

    // Verificar el estado de la respuesta
    if (paymentResponse.status && paymentResponse.status.status !== "OK") {
      throw new Error(
        `Error de Getnet: ${
          paymentResponse.status.message || "Error desconocido"
        }`
      );
    }

    // 6. Guardar datos de la transacción en la base de datos
    const updateData = {
      transaction_token: paymentResponse.requestId.toString(),
      process_url: paymentResponse.processUrl,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("reservas")
      .update(updateData)
      .eq("id", reservaId);

    if (updateError) {
      console.error("Error actualizando reserva:", updateError);
      throw new Error("Error guardando datos de transacción");
    }

    console.log(
      `Transacción creada exitosamente - RequestId: ${paymentResponse.requestId}, ReservaId: ${reservaId}`
    );

    // 7. Retornar respuesta exitosa con URL de proceso de pago
    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: paymentResponse.processUrl,
        reserva_id: reservaId,
        request_id: paymentResponse.requestId,
        reference: requestData.payment.reference,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
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
