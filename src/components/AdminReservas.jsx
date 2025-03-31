import React, { useState, useEffect } from "react";
import { supabase } from "../db/supabaseClient";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const AdminReservas = () => {
  const [reservas, setReservas] = useState([]);
  const [cabañas, setCabañas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentReserva, setCurrentReserva] = useState(null);
  const [filters, setFilters] = useState({
    cabaña_id: "",
    fecha_inicio: "",
    fecha_fin: "",
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
          .select("*")
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
          cabañas: cabaña_id (nombre, precio)
        `
        )
        .order("fecha_inicio", { ascending: true });

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

      if (editMode) {
        // Update existing reserva
        const { error } = await supabase
          .from("reservas")
          .update(formData)
          .eq("id", currentReserva.id);

        if (error) throw error;
      } else {
        // Create new reserva
        const { error } = await supabase.from("reservas").insert([formData]);

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
    });
    fetchReservas();
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Administración de Reservas
      </h1>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Filtrar Reservas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {cabañas.map((cabaña) => (
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
          <div className="flex items-end space-x-2">
            <button
              onClick={applyFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Aplicar
            </button>
            <button
              onClick={resetFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Botón para nueva reserva */}
      <div className="flex justify-end mb-6">
        <button
          onClick={openModal}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
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

      {/* Lista de reservas */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cabaña
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fechas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservas.length > 0 ? (
                reservas.map((reserva) => (
                  <tr key={reserva.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {reserva.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {reserva.cabañas?.nombre}
                      </div>
                      <div className="text-gray-500">
                        ${reserva.cabañas?.precio}/noche
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {format(new Date(reserva.fecha_inicio), "PPP", {
                          locale: es,
                        })}
                      </div>
                      <div className="text-gray-500">
                        al{" "}
                        {format(new Date(reserva.fecha_fin), "PPP", {
                          locale: es,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{reserva.email}</div>
                      <div className="text-gray-500">{reserva.telefono}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No se encontraron reservas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear/editar reserva */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {editMode ? "Editar Reserva" : "Nueva Reserva"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg
                    className="h-6 w-6"
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
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cabaña
                    </label>
                    <select
                      name="cabaña_id"
                      value={formData.cabaña_id}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Seleccionar cabaña</option>
                      {cabañas.map((cabaña) => (
                        <option key={cabaña.id} value={cabaña.id}>
                          {cabaña.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de llegada
                    </label>
                    <input
                      type="date"
                      name="fecha_inicio"
                      value={formData.fecha_inicio}
                      onChange={(e) =>
                        handleDateChange("fecha_inicio", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de salida
                    </label>
                    <input
                      type="date"
                      name="fecha_fin"
                      value={formData.fecha_fin}
                      onChange={(e) =>
                        handleDateChange("fecha_fin", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
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
                        Procesando...
                      </span>
                    ) : editMode ? (
                      "Actualizar Reserva"
                    ) : (
                      "Crear Reserva"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReservas;
