import React, { useState, useEffect } from "react";
import { supabase } from "../../db/supabaseClient";
import {
  format,
  parseISO,
  isBefore,
  isAfter,
  isWithinInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import { ImportCalendar, ExportCalendar } from "../calendar/CalendarSync";

const AdminReservas = () => {
  const [reservas, setReservas] = useState([]);
  const [cabañas, setCabañas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentReserva, setCurrentReserva] = useState(null);
  const [selectedCabañaForSync, setSelectedCabañaForSync] = useState("");
  const [filters, setFilters] = useState({
    cabaña_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    ubicacion: "",
  });

  // Form state
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    cabaña_id: "",
    fecha_inicio: "",
    fecha_fin: "",
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch cabañas
        const { data: cabañasData, error: cabañasError } = await supabase
          .from("cabañas")
          .select("*, ubicacion")
          .order("nombre", { ascending: true });

        if (cabañasError) throw cabañasError;
        setCabañas(cabañasData || []);

        // Fetch reservas
        await fetchReservas();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchReservas = async () => {
    try {
      let query = supabase
        .from("reservas")
        .select(
          `
          *,
          cabañas: cabaña_id (nombre, precio, ubicacion)
        `
        )
        .order("fecha_inicio", { ascending: false });

      // Apply filters
      if (filters.cabaña_id) {
        query = query.eq("cabaña_id", filters.cabaña_id);
      }
      if (filters.fecha_inicio) {
        query = query.gte("fecha_inicio", filters.fecha_inicio);
      }
      if (filters.fecha_fin) {
        query = query.lte("fecha_fin", filters.fecha_fin);
      }
      // Si hay filtro de ubicación, lo aplicamos a través de la relación con cabañas
      if (filters.ubicacion) {
        // Primero obtenemos los IDs de cabañas que coinciden con la ubicación
        const { data: cabañasIds } = await supabase
          .from("cabañas")
          .select("id")
          .eq("ubicacion", filters.ubicacion);

        if (cabañasIds && cabañasIds.length > 0) {
          const ids = cabañasIds.map((c) => c.id);
          query = query.in("cabaña_id", ids);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setReservas(data || []);
    } catch (err) {
      setError(err.message);
      setReservas([]);
    }
  };

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (name, date) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date ? format(date, "yyyy-MM-dd") : "",
    }));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Crear objeto con los datos del formulario
      const reservaData = {
        ...formData,
        created_at: new Date().toISOString(), // Agregar timestamp con zona horaria en formato ISO
      };

      if (editMode) {
        // Update existing reserva (sin modificar created_at)
        const { nombre, email, telefono, cabaña_id, fecha_inicio, fecha_fin } =
          formData;
        const updateData = {
          nombre,
          email,
          telefono,
          cabaña_id,
          fecha_inicio,
          fecha_fin,
        };

        const { error } = await supabase
          .from("reservas")
          .update(updateData)
          .eq("id", currentReserva.id);

        if (error) throw error;
      } else {
        // Create new reserva (con created_at)
        const { error } = await supabase.from("reservas").insert([reservaData]);

        if (error) throw error;
      }

      await fetchReservas();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit reserva
  const handleEdit = (reserva) => {
    setCurrentReserva(reserva);
    setFormData({
      nombre: reserva.nombre,
      email: reserva.email,
      telefono: reserva.telefono,
      cabaña_id: reserva.cabaña_id,
      fecha_inicio: reserva.fecha_inicio,
      fecha_fin: reserva.fecha_fin,
    });
    setEditMode(true);
    setModalOpen(true);
  };

  // Delete reserva
  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta reserva?")) {
      try {
        setLoading(true);
        const { error } = await supabase.from("reservas").delete().eq("id", id);

        if (error) throw error;

        await fetchReservas();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Modal controls
  const openModal = () => {
    setFormData({
      nombre: "",
      email: "",
      telefono: "",
      cabaña_id: "",
      fecha_inicio: "",
      fecha_fin: "",
    });
    setEditMode(false);
    setCurrentReserva(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError(null);
  };

  // Apply filters
  const applyFilters = () => {
    fetchReservas();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      cabaña_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      ubicacion: "",
    });
    fetchReservas();
  };

  // Obtener ubicaciones únicas para el filtro
  const ubicaciones = [
    ...new Set(cabañas.map((c) => c.ubicacion).filter(Boolean)),
  ];

  // Determina el estado temporal de una reserva: pasada, activa o futura
  const getReservaStatus = (fechaInicio, fechaFin) => {
    const now = new Date();
    const startDate = parseISO(fechaInicio);
    const endDate = parseISO(fechaFin);

    if (isAfter(startDate, now)) {
      return "future"; // Reserva futura
    } else if (isBefore(endDate, now)) {
      return "past"; // Reserva pasada
    } else {
      return "active"; // Reserva activa (en curso)
    }
  };

  if (loading && reservas.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg max-w-4xl mx-auto mt-8">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 bg-neutral-100 sm:bg-neutral-300 my-8 rounded-lg shadow-md">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-8">
        Administración de Reservas
      </h1>

      {/* Filtros - Adaptado para móvil */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
        {/* ... código existente de filtros ... */}
        <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4">
          Filtrar Reservas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.ubicacion}
              onChange={(e) =>
                setFilters({ ...filters, ubicacion: e.target.value })
              }
            >
              <option value="">Todas</option>
              {ubicaciones.map((ubicacion) => (
                <option key={ubicacion} value={ubicacion}>
                  {ubicacion === "Serena" ? "La Serena" : ubicacion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cabaña
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.cabaña_id}
              onChange={(e) =>
                setFilters({ ...filters, cabaña_id: e.target.value })
              }
            >
              <option value="">Todas</option>
              {cabañas
                .filter(
                  (c) => !filters.ubicacion || c.ubicacion === filters.ubicacion
                )
                .map((cabaña) => (
                  <option key={cabaña.id} value={cabaña.id}>
                    {cabaña.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.fecha_inicio}
              onChange={(e) =>
                setFilters({ ...filters, fecha_inicio: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.fecha_fin}
              onChange={(e) =>
                setFilters({ ...filters, fecha_fin: e.target.value })
              }
            />
          </div>
          <div className="flex items-end gap-2 sm:flex-col md:flex-row">
            <button
              onClick={applyFilters}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm sm:text-base"
            >
              Aplicar
            </button>
            <button
              onClick={resetFilters}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-md text-sm sm:text-base"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Botón para nueva reserva */}
      <div className="flex justify-end mb-4 sm:mb-6">
        <button
          onClick={openModal}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center text-sm sm:text-base"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Nueva Reserva
        </button>
      </div>

      {/* Lista de reservas - Adaptada para móvil */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Vista para desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cabaña
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fechas
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Reserva
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservas.length > 0 ? (
                reservas.map((reserva) => {
                  const reservaStatus = getReservaStatus(
                    reserva.fecha_inicio,
                    reserva.fecha_fin
                  );
                  // Aplicar estilos según el estado temporal
                  const rowClasses = `hover:bg-gray-50 ${
                    reservaStatus === "past"
                      ? "opacity-70"
                      : reservaStatus === "active"
                      ? "bg-yellow-50"
                      : ""
                  }`;
                  const textClasses = {
                    past: "italic text-gray-600",
                    active: "font-semibold",
                    future: "text-gray-900",
                  };

                  return (
                    <tr key={reserva.id} className={rowClasses}>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div
                          className={`font-medium ${textClasses[reservaStatus]}`}
                        >
                          {reserva.nombre}
                          {reserva.source === "airbnb" && (
                            <span className="ml-2 bg-red-100 text-red-700 text-xs px-1 py-0.5 rounded">
                              Airbnb
                            </span>
                          )}
                          {reservaStatus === "active" && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-1 py-0.5 rounded">
                              Activa
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className={textClasses[reservaStatus]}>
                          {reserva.cabañas?.nombre}
                        </div>
                        <div
                          className={`${
                            reservaStatus === "past"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          ${reserva.cabañas?.precio}/noche
                        </div>
                      </td>
                      {/* Resto de celdas de la tabla... */}
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className={textClasses[reservaStatus]}>
                          {reserva.cabañas?.ubicacion === "Serena"
                            ? "La Serena"
                            : reserva.cabañas?.ubicacion}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className={textClasses[reservaStatus]}>
                          {format(
                            parseISO(reserva.fecha_inicio),
                            "dd/MM/yyyy",
                            {
                              locale: es,
                            }
                          )}
                        </div>
                        <div
                          className={`${
                            reservaStatus === "past"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          al{" "}
                          {format(parseISO(reserva.fecha_fin), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className={textClasses[reservaStatus]}>
                          {reserva.email}
                        </div>
                        <div
                          className={`${
                            reservaStatus === "past"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          {reserva.telefono}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className={textClasses[reservaStatus]}>
                          {reserva.created_at
                            ? format(
                                parseISO(reserva.created_at),
                                "dd/MM/yyyy HH:mm",
                                {
                                  locale: es,
                                }
                              )
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(reserva)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(reserva.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 sm:px-6 py-4 text-center text-gray-500"
                  >
                    No se encontraron reservas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista para móvil - Tarjetas en lugar de tabla */}
        <div className="md:hidden">
          {reservas.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {reservas.map((reserva) => {
                const reservaStatus = getReservaStatus(
                  reserva.fecha_inicio,
                  reserva.fecha_fin
                );
                // Aplicar estilos según el estado temporal
                const cardClasses = `p-4 hover:bg-gray-50 ${
                  reservaStatus === "past"
                    ? "opacity-70"
                    : reservaStatus === "active"
                    ? "bg-yellow-50"
                    : ""
                }`;
                const textClasses = {
                  past: "italic text-gray-600",
                  active: "font-semibold",
                  future: "text-gray-900",
                };

                return (
                  <div key={reserva.id} className={cardClasses}>
                    <div className="flex justify-between mb-2">
                      <h3 className={`font-bold ${textClasses[reservaStatus]}`}>
                        {reserva.nombre}
                        {reserva.source === "airbnb" && (
                          <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1 py-0.5 rounded">
                            Airbnb
                          </span>
                        )}
                        {reservaStatus === "active" && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-1 py-0.5 rounded">
                            Activa
                          </span>
                        )}
                      </h3>
                      <span
                        className={`text-sm bg-gray-100 py-1 px-2 rounded-full ${
                          reservaStatus === "past"
                            ? "text-gray-600"
                            : "text-gray-800"
                        }`}
                      >
                        {reserva.cabañas?.ubicacion === "Serena"
                          ? "La Serena"
                          : reserva.cabañas?.ubicacion}
                      </span>
                    </div>

                    {/* Resto de la vista móvil... */}
                    <div className="mb-2">
                      <span
                        className={`${
                          reservaStatus === "past"
                            ? "text-gray-500"
                            : "text-gray-600"
                        } font-medium`}
                      >
                        Cabaña:
                      </span>
                      <span className={textClasses[reservaStatus]}>
                        {reserva.cabañas?.nombre}
                      </span>
                      <span
                        className={`block text-sm ${
                          reservaStatus === "past"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        ${reserva.cabañas?.precio}/noche
                      </span>
                    </div>

                    <div className="mb-2">
                      <span
                        className={`${
                          reservaStatus === "past"
                            ? "text-gray-500"
                            : "text-gray-600"
                        } font-medium`}
                      >
                        Fechas:
                      </span>
                      <span className={textClasses[reservaStatus]}>
                        {format(parseISO(reserva.fecha_inicio), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </span>
                      <span
                        className={
                          reservaStatus === "past"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }
                      >
                        al{" "}
                        {format(parseISO(reserva.fecha_fin), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </span>
                    </div>

                    <div className="mb-2">
                      <span
                        className={`${
                          reservaStatus === "past"
                            ? "text-gray-500"
                            : "text-gray-600"
                        } font-medium`}
                      >
                        Contacto:
                      </span>
                      <div>
                        <span className={textClasses[reservaStatus]}>
                          {reserva.email}
                        </span>
                        <span
                          className={`block ${
                            reservaStatus === "past"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          {reserva.telefono}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span
                        className={`${
                          reservaStatus === "past"
                            ? "text-gray-500"
                            : "text-gray-600"
                        } font-medium`}
                      >
                        Reserva realizada:
                      </span>
                      <span className={textClasses[reservaStatus]}>
                        {reserva.created_at
                          ? format(
                              parseISO(reserva.created_at),
                              "dd/MM/yyyy HH:mm",
                              {
                                locale: es,
                              }
                            )
                          : "N/A"}
                      </span>
                    </div>

                    <div className="flex space-x-3 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleEdit(reserva)}
                        className={`flex-1 ${
                          reservaStatus === "past"
                            ? "bg-blue-50 opacity-80"
                            : "bg-blue-50"
                        } text-blue-600 hover:bg-blue-100 py-2 rounded-md text-center font-medium`}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(reserva.id)}
                        className={`flex-1 ${
                          reservaStatus === "past"
                            ? "bg-red-50 opacity-80"
                            : "bg-red-50"
                        } text-red-600 hover:bg-red-100 py-2 rounded-md text-center font-medium`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No se encontraron reservas
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear/editar reserva */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          {/* ... código existente del modal ... */}
        </div>
      )}
      {/* Sección de sincronización de calendarios */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6  my-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4">
          Sincronización con Airbnb
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seleccionar Cabaña
          </label>
          <select
            className="w-full sm:w-1/2 p-2 border border-gray-300 rounded-md"
            value={selectedCabañaForSync}
            onChange={(e) => setSelectedCabañaForSync(e.target.value)}
          >
            <option value="">Selecciona una cabaña</option>
            {cabañas.map((cabaña) => (
              <option key={cabaña.id} value={cabaña.id}>
                {cabaña.nombre} (
                {cabaña.ubicacion === "Serena" ? "La Serena" : cabaña.ubicacion}
                )
              </option>
            ))}
          </select>
        </div>

        {selectedCabañaForSync && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImportCalendar
              cabañaId={selectedCabañaForSync}
              onSuccess={() => fetchReservas()}
            />
            <ExportCalendar cabañaId={selectedCabañaForSync} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReservas;
