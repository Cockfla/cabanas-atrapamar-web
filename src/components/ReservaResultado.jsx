import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { supabase } from "../db/supabaseClient";

export default function ReservaResultado() {
  const [reserva, setReserva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReserva = async () => {
      try {
        // Obtener ID y estado de la reserva de la URL
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        const status = params.get("status");

        if (!id) {
          throw new Error("No se encontró el ID de la reserva");
        }

        // Si tenemos el ID, obtener detalles de la reserva
        const { data, error } = await supabase
          .from("reservas")
          .select(
            `
            *,
            cabañas (nombre, precio, ubicacion)
          `
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("No se encontró la reserva");

        setReserva(data);
      } catch (err) {
        console.error("Error al cargar la reserva:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReserva();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Cargando información de la reserva...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !reserva) {
    return (
      <Layout>
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
            <p className="text-red-600 mb-4">
              {error || "No se pudo cargar la información de la reserva"}
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  const esReservaExitosa = reserva.estado === "confirmada";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div
          className={`border rounded-lg p-8 max-w-2xl mx-auto ${
            esReservaExitosa
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          {esReservaExitosa ? (
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
          ) : (
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
              <p className="text-yellow-600">
                El pago está en proceso o fue rechazado.
              </p>
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
                <span className="font-medium">{reserva.cabañas?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ubicación:</span>
                <span className="font-medium">
                  {reserva.cabañas?.ubicacion === "pichilemu"
                    ? "Pichilemu"
                    : "La Serena"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de llegada:</span>
                <span className="font-medium">
                  {new Date(reserva.fecha_inicio).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de salida:</span>
                <span className="font-medium">
                  {new Date(reserva.fecha_fin).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado del pago:</span>
                <span
                  className={`font-medium ${
                    esReservaExitosa ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {esReservaExitosa ? "Completado" : "Pendiente"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monto total:</span>
                <span className="font-medium">${reserva.monto}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">
              {esReservaExitosa
                ? "Hemos enviado los detalles de tu reserva a tu correo electrónico."
                : "Si el pago fue rechazado, puedes intentar nuevamente o contactarnos para asistencia."}
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
