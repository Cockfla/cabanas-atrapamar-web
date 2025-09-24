import crypto from "crypto";

/**
 * Endpoint para consultar información de una transacción usando getRequestInformation
 * según la documentación de Getnet Web Checkout v2.3
 *
 * Método: POST /api/session/REQUEST_ID
 * Requiere: auth object con login, tranKey, nonce, seed
 */
export const POST = async ({ request }) => {
  try {
    const data = await request.json();
    const { requestId } = data;

    // Validar que se proporcione el requestId
    if (!requestId) {
      throw new Error(
        "requestId es requerido para consultar el estado de la transacción"
      );
    }

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

    // Estructura de autenticación requerida
    const authData = {
      auth: {
        login,
        tranKey,
        nonce,
        seed,
      },
    };

    console.log(`Consultando estado de transacción ${requestId}`);

    // Determinar endpoint según el ambiente
    const getnetBaseUrl =
      process.env.GETNET_BASE_URL || "https://checkout.test.getnet.cl";
    const endpoint = `${getnetBaseUrl}/api/session/${requestId}`;

    // Realizar consulta a Getnet
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(authData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const transactionInfo = await response.json();

    console.log("Respuesta de consulta de Getnet:", {
      requestId: transactionInfo.requestId,
      status: transactionInfo.status?.status,
      hasPayment: !!transactionInfo.payment,
    });

    // Procesar información de la transacción
    const processedInfo = {
      requestId: transactionInfo.requestId,
      status: transactionInfo.status,
      request: transactionInfo.request,
      payments: transactionInfo.payment || [],
      hasPayment: !!(
        transactionInfo.payment && transactionInfo.payment.length > 0
      ),
    };

    // Si hay información de pago, extraer detalles relevantes
    if (processedInfo.hasPayment) {
      const payment = transactionInfo.payment[0]; // Tomar el primer pago
      processedInfo.paymentDetails = {
        status: payment.status,
        amount: payment.amount,
        receipt: payment.receipt,
        authorization: payment.authorization,
        paymentMethod: payment.paymentMethod,
        paymentMethodName: payment.paymentMethodName,
        franchise: payment.franchise,
        reference: payment.reference,
        refunded: payment.refunded,
      };

      // Extraer información adicional del procesador si está disponible
      if (payment.processorFields) {
        const processorFields = {};
        payment.processorFields.forEach((field) => {
          processorFields[field.keyword] = field.value;
        });
        processedInfo.paymentDetails.processorFields = processorFields;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: processedInfo,
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
    console.error("Error consultando información de transacción:", error);

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
      error:
        "Método no permitido. Use POST para consultar información de transacción.",
      usage:
        "POST /api/payment/get-request-info con { requestId: 'ID_DE_TRANSACCION' }",
    }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export const prerender = false;
