import crypto from "crypto";

/**
 * Endpoint para reversar un pago aprobado usando reversePayment
 * según la documentación de Getnet Web Checkout v2.3
 *
 * Método: POST /api/reverse
 * Requiere: auth object y internalReference
 *
 * IMPORTANTE: Solo funciona el mismo día de la transacción antes de las 23:59
 */
export const POST = async ({ request }) => {
  try {
    const data = await request.json();
    const { internalReference } = data;

    // Validar que se proporcione la referencia interna
    if (!internalReference) {
      throw new Error("internalReference es requerida para reversar un pago");
    }

    console.log(
      `Iniciando reversa de pago con internalReference: ${internalReference}`
    );

    // Preparar autenticación según la documentación de Getnet
    const login =
      process.env.GETNET_LOGIN || "7ffbb7bf1f7361b1200b2e8d74e1d76f";
    const secretKey = process.env.GETNET_SECRET_KEY || "SnZP3D63n3I9dH9O";

    if (!login || !secretKey) {
      throw new Error("Credenciales de Getnet no configuradas");
    }

    // Generar autenticación
    const nonceBuffer = crypto.randomBytes(16);
    const nonce = nonceBuffer.toString("base64");
    const seed = new Date().toISOString();

    // Calcular tranKey: Base64(SHA-256(nonce + seed + secretKey))
    const tranKey = crypto
      .createHash("sha256")
      .update(
        Buffer.concat([nonceBuffer, Buffer.from(seed), Buffer.from(secretKey)])
      )
      .digest("base64");

    // Estructura de datos para la reversa según la documentación
    const reverseData = {
      auth: {
        login,
        tranKey,
        nonce,
        seed,
      },
      internalReference: internalReference.toString(),
    };

    console.log("Enviando solicitud de reversa a Getnet");

    // Determinar endpoint según el ambiente
    const getnetBaseUrl =
      process.env.GETNET_BASE_URL || "https://checkout.test.getnet.cl";
    const endpoint = `${getnetBaseUrl}/api/reverse`;

    // Realizar solicitud de reversa a Getnet
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(reverseData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const reverseResponse = await response.json();

    console.log("Respuesta de reversa de Getnet:", {
      status: reverseResponse.status?.status,
      internalReference: reverseResponse.payment?.internalReference,
      hasPayment: !!reverseResponse.payment,
    });

    // Validar respuesta de Getnet
    if (!reverseResponse.status) {
      throw new Error("Respuesta inválida de Getnet");
    }

    // Verificar si la reversa fue exitosa
    if (reverseResponse.status.status !== "APPROVED") {
      throw new Error(
        `Error en la reversa: ${
          reverseResponse.status.message || "Reversa no aprobada"
        }`
      );
    }

    // Procesar información de la reversa
    const processedReverse = {
      status: reverseResponse.status,
      payment: reverseResponse.payment,
      success: reverseResponse.status.status === "APPROVED",
      message: reverseResponse.status.message,
    };

    // Aquí podrías actualizar tu base de datos para marcar la transacción como reversada
    // Por ejemplo:
    /*
    await supabase
      .from("reservas")
      .update({
        estado: "reversada",
        reverse_details: JSON.stringify(reverseResponse),
        reverse_date: new Date().toISOString(),
      })
      .eq("internal_reference", internalReference);
    */

    console.log(`Reversa exitosa para internalReference: ${internalReference}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: processedReverse,
        message: "Pago reversado exitosamente",
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
    console.error("Error reversando pago:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};

// Permitir solo POST según la documentación
export async function GET() {
  return new Response(
    JSON.stringify({
      error: "Método no permitido. Use POST para reversar un pago.",
      usage:
        "POST /api/payment/reverse con { internalReference: 'REFERENCIA_INTERNA' }",
      note: "La reversa solo funciona el mismo día de la transacción antes de las 23:59",
    }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export const prerender = false;
