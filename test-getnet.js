// Test script para verificar la integración con Getnet
// Ejecutar con: node test-getnet.js

import fetch from "node-fetch";

const BASE_URL = "http://localhost:4321";

async function testGetnetIntegration() {
  console.log("🧪 Iniciando pruebas de integración con Getnet...\n");

  try {
    // 1. Probar creación de transacción
    console.log("1. Probando creación de transacción...");

    const transactionData = {
      nombre: "Juan Pérez Test",
      email: "juan.test@example.com",
      telefono: "912345678",
      documento: "12345678-9",
      cabaña_id: "1",
      fecha_inicio: "2025-09-26",
      fecha_fin: "2025-09-27",
      monto: 50000,
    };

    const createResponse = await fetch(
      `${BASE_URL}/api/payment/create-transaction`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      }
    );

    const createResult = await createResponse.json();

    if (createResult.success) {
      console.log("✅ Transacción creada exitosamente");
      console.log("   RequestId:", createResult.request_id);
      console.log("   ReservaId:", createResult.reserva_id);
      console.log(
        "   URL de pago:",
        createResult.redirect_url ? "Generada" : "No generada"
      );

      // 2. Probar consulta de estado
      if (createResult.request_id) {
        console.log("\n2. Probando consulta de estado...");

        const statusResponse = await fetch(
          `${BASE_URL}/api/payment/get-request-info`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requestId: createResult.request_id,
            }),
          }
        );

        const statusResult = await statusResponse.json();

        if (statusResult.success) {
          console.log("✅ Consulta de estado exitosa");
          console.log("   Estado:", statusResult.data.status?.status);
          console.log("   Tiene pago:", statusResult.data.hasPayment);
        } else {
          console.log("❌ Error consultando estado:", statusResult.error);
        }
      }
    } else {
      console.log("❌ Error creando transacción:", createResult.message);
    }

    // 3. Probar endpoint de debug
    console.log("\n3. Probando endpoint de debug...");

    const debugResponse = await fetch(
      `${BASE_URL}/api/payment/debug?test=config`
    );
    const debugResult = await debugResponse.json();

    console.log("✅ Debug info:");
    console.log("   Ambiente:", debugResult.environment);
    console.log(
      "   Tiene credenciales:",
      debugResult.config?.hasGetnetSecretKey
    );
    console.log("   URL configurada:", debugResult.config?.hasSiteUrl);
  } catch (error) {
    console.error("❌ Error durante las pruebas:", error.message);
  }

  console.log("\n🏁 Pruebas completadas");
}

// Ejecutar pruebas solo si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testGetnetIntegration();
}

export { testGetnetIntegration };
