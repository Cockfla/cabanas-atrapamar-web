import React from "react";

export default function ReservaResultadoContent({ reserva, error }) {
  // Función para formatear fechas
  const formatFecha = (fechaStr) => {
    try {
      return new Date(fechaStr).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return "Fecha no disponible";
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg mx-auto text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-red-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (!reserva) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const esReservaExitosa = reserva.estado === "confirmada";
  const esReservaRechazada = reserva.estado === "fallida";
  const esReservaPendiente = !esReservaExitosa && !esReservaRechazada;

  // Función para determinar el color de fondo según el estado
  const getBgClass = () => {
    if (esReservaExitosa) return "bg-green-50 border-green-200";
    if (esReservaRechazada) return "bg-red-50 border-red-200";
    return "bg-yellow-50 border-yellow-200";
  };

  // Función para obtener el mensaje según el estado
  const getMensaje = () => {
    if (esReservaExitosa)
      return "Hemos enviado los detalles de tu reserva a tu correo electrónico.";
    if (esReservaRechazada) {
      // Si hay detalles de pago, intentamos obtener el mensaje de error
      let mensajeError = "Tu pago ha sido rechazado.";
      try {
        const paymentDetails =
          typeof reserva.payment_details === "string"
            ? JSON.parse(reserva.payment_details)
            : reserva.payment_details;

        // Verificar si hay información de status en los detalles de pago
        if (paymentDetails?.status?.message) {
          mensajeError += ` Motivo: ${paymentDetails.status.message}`;
        } else if (paymentDetails?.payment?.[0]?.status?.message) {
          mensajeError += ` Motivo: ${paymentDetails.payment[0].status.message}`;
        }
      } catch (e) {
        console.error("Error al procesar detalles de pago:", e);
      }
      return `${mensajeError} Puedes intentar nuevamente o contactarnos para asistencia.`;
    }
    return "Tu reserva está en proceso de confirmación. Recibirás un correo cuando se complete.";
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div
        className={`border rounded-lg p-8 max-w-2xl mx-auto ${getBgClass()}`}
      >
        {/* Encabezado según estado */}
        {esReservaExitosa && (
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-700 mt-4 mb-2">
              ¡Reserva Confirmada!
            </h2>
            <p className="text-green-600">
              Tu pago ha sido procesado exitosamente.
            </p>
          </div>
        )}

        {esReservaRechazada && (
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-700 mt-4 mb-2">
              Pago Rechazado
            </h2>
            <p className="text-red-600">
              No pudimos procesar tu pago. Por favor intenta nuevamente.
            </p>
          </div>
        )}

        {esReservaPendiente && (
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-yellow-700 mt-4 mb-2">
              Reserva Pendiente
            </h2>
            <p className="text-yellow-600">Estamos procesando tu solicitud.</p>
          </div>
        )}

        {/* Detalles de la reserva */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">
            Detalles de tu reserva
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Número de reserva:</span>
              <span className="font-medium">{reserva.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cabaña:</span>
              <span className="font-medium">
                {reserva.cabaña?.nombre || "No disponible"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ubicación:</span>
              <span className="font-medium">
                {reserva.cabaña?.ubicacion === "pichilemu"
                  ? "Pichilemu"
                  : "La Serena"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha de llegada:</span>
              <span className="font-medium">
                {formatFecha(reserva.fecha_inicio)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha de salida:</span>
              <span className="font-medium">
                {formatFecha(reserva.fecha_fin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estado del pago:</span>
              <span
                className={`font-medium ${
                  esReservaExitosa
                    ? "text-green-600"
                    : esReservaRechazada
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {esReservaExitosa
                  ? "Completado"
                  : esReservaRechazada
                  ? "Rechazado"
                  : "Pendiente"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto total:</span>
              <span className="font-medium">
                ${reserva.monto.toLocaleString("es-CL")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">{getMensaje()}</p>

          {/* Botones diferentes según estado */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver al inicio
            </a>

            {esReservaRechazada && (
              <a
                href={`/reservas?retry=true&id=${reserva.id}&ubicacion=${
                  reserva.cabaña?.ubicacion || "pichilemu"
                }`}
                className="inline-block px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Intentar nuevamente
              </a>
            )}

            {esReservaExitosa && (
              <button
                onClick={() => window.print()}
                className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Imprimir comprobante
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
