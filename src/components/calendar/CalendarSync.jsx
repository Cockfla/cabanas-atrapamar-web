import React, { useState } from "react";
import { supabase } from "../../db/supabaseClient";

export const ImportCalendar = ({ cabañaId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [icalUrl, setIcalUrl] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Llamamos al endpoint de importación de calendario
      const response = await fetch("/api/calendar/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cabañaId,
          icalUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al importar las reservas");
      }

      // Guardamos la URL para sincronizaciones futuras
      const { error: saveError } = await supabase.from("ical_sources").upsert(
        {
          cabaña_id: cabañaId,
          url: icalUrl,
          last_synced: new Date().toISOString(),
        },
        {
          onConflict: "cabaña_id",
        }
      );

      if (saveError)
        throw new Error(`Error guardando URL: ${saveError.message}`);

      setSuccess(true);
      if (typeof onSuccess === "function") {
        onSuccess(); // Recargar las reservas
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-3">
        Importar Reservas desde Airbnb
      </h3>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded-md text-sm">
          Reservas importadas correctamente
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label
            htmlFor="ical-url"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            URL del Calendario iCal de Airbnb
          </label>
          <input
            id="ical-url"
            type="url"
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="https://www.airbnb.es/calendar/ical/..."
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Puedes encontrar esta URL en tu cuenta de Airbnb en Calendario &gt;
            Exportar Calendario
          </p>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Importando...
            </>
          ) : (
            "Importar Reservas"
          )}
        </button>
      </form>
    </div>
  );
};

export const ExportCalendar = ({ cabañaId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkToken, setLinkToken] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const generateExportLink = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      // Generar un token único para esta cabaña
      const token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Guardar relación entre token y cabaña en la base de datos
      const { error: saveError } = await supabase.from("ical_links").upsert(
        {
          cabaña_id: cabañaId,
          link_token: token,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "cabaña_id",
        }
      );

      if (saveError) throw saveError;

      // Crear URL para exportar el calendario
      const baseUrl = window.location.origin;
      const exportUrl = `${baseUrl}/api/calendar/export/${token}.ics`;

      setLinkToken(token);
      setCalendarUrl(exportUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(calendarUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        setError("No se pudo copiar al portapapeles");
      }
    );
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-3">
        Exportar Calendario
      </h3>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <p className="mb-3 text-sm text-gray-600">
        Genera un enlace iCal para sincronizar esta cabaña con otras plataformas
        como Airbnb
      </p>

      <button
        onClick={generateExportLink}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md mb-3"
        disabled={loading}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generando...
          </>
        ) : (
          "Generar Enlace iCal"
        )}
      </button>

      {calendarUrl && (
        <div className="mt-3">
          <div className="flex items-center">
            <input
              type="text"
              value={calendarUrl}
              readOnly
              className="flex-1 p-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
            />
            <button
              onClick={copyToClipboard}
              className={`px-3 py-2 rounded-r-md ${
                copied ? "bg-green-500" : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {copied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Usa este enlace en tu cuenta de Airbnb para sincronizar la
            disponibilidad. Ve a Calendario &gt; Preferencias &gt; Importar
            calendario y pega el enlace.
          </p>
        </div>
      )}
    </div>
  );
};
