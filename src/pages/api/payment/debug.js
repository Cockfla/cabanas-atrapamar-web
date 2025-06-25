export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const testType = url.searchParams.get("test") || "status";

    const response = {
      timestamp: new Date().toISOString(),
      endpoint: "/api/payment/debug",
      test: testType,
      environment: process.env.NODE_ENV || "development",
      siteUrl: process.env.SITE_URL || "not-configured",
    };

    switch (testType) {
      case "status":
        response.message = "Payment API endpoints are operational";
        response.endpoints = {
          notification: "/api/payment/notification",
          response: "/api/payment/response",
          createTransaction: "/api/payment/create-transaction",
        };
        break;

      case "config":
        response.config = {
          hasGetnetSecretKey: !!process.env.GETNET_SECRET_KEY,
          hasGetnetAccessToken: !!process.env.GETNET_ACCESS_TOKEN,
          hasSiteUrl: !!process.env.SITE_URL,
          siteUrl: process.env.SITE_URL || "not-configured",
        };
        break;

      case "headers":
        response.headers = Object.fromEntries(request.headers.entries());
        break;

      default:
        response.message = "Unknown test type";
        response.availableTests = ["status", "config", "headers"];
    }

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
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

export const prerender = false;
