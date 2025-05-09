import React, { useState, useEffect } from 'react'
import { supabase } from '../../db/supabaseClient'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const AdminReservas = () => {
  const [reservas, setReservas] = useState([])
  const [cabañas, setCabañas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentReserva, setCurrentReserva] = useState(null)
  const [filters, setFilters] = useState({
    cabaña_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    ubicacion: '',
  })

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    cabaña_id: '',
    fecha_inicio: '',
    fecha_fin: '',
  })

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch cabañas
        const { data: cabañasData, error: cabañasError } = await supabase
          .from('cabañas')
          .select('*, ubicacion')
          .order('nombre', { ascending: true })

        if (cabañasError) throw cabañasError
        setCabañas(cabañasData || [])

        // Fetch reservas
        await fetchReservas()
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchReservas = async () => {
    try {
      let query = supabase
        .from('reservas')
        .select(
          `
          *,
          cabañas: cabaña_id (nombre, precio, ubicacion)
        `
        )
        .order('fecha_inicio', { ascending: false })

      // Apply filters
      if (filters.cabaña_id) {
        query = query.eq('cabaña_id', filters.cabaña_id)
      }
      if (filters.fecha_inicio) {
        query = query.gte('fecha_inicio', filters.fecha_inicio)
      }
      if (filters.fecha_fin) {
        query = query.lte('fecha_fin', filters.fecha_fin)
      }
      // Si hay filtro de ubicación, lo aplicamos a través de la relación con cabañas
      if (filters.ubicacion) {
        // Primero obtenemos los IDs de cabañas que coinciden con la ubicación
        const { data: cabañasIds } = await supabase
          .from('cabañas')
          .select('id')
          .eq('ubicacion', filters.ubicacion)

        if (cabañasIds && cabañasIds.length > 0) {
          const ids = cabañasIds.map((c) => c.id)
          query = query.in('cabaña_id', ids)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setReservas(data || [])
    } catch (err) {
      setError(err.message)
      setReservas([])
    }
  }

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDateChange = (name, date) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date ? format(date, 'yyyy-MM-dd') : '',
    }))
  }

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)

      // Crear objeto con los datos del formulario
      const reservaData = {
        ...formData,
        created_at: new Date().toISOString(), // Agregar timestamp con zona horaria en formato ISO
      }

      if (editMode) {
        // Update existing reserva (sin modificar created_at)
        const { nombre, email, telefono, cabaña_id, fecha_inicio, fecha_fin } =
          formData
        const updateData = {
          nombre,
          email,
          telefono,
          cabaña_id,
          fecha_inicio,
          fecha_fin,
        }

        const { error } = await supabase
          .from('reservas')
          .update(updateData)
          .eq('id', currentReserva.id)

        if (error) throw error
      } else {
        // Create new reserva (con created_at)
        const { error } = await supabase.from('reservas').insert([reservaData])

        if (error) throw error
      }

      await fetchReservas()
      closeModal()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Edit reserva
  const handleEdit = (reserva) => {
    setCurrentReserva(reserva)
    setFormData({
      nombre: reserva.nombre,
      email: reserva.email,
      telefono: reserva.telefono,
      cabaña_id: reserva.cabaña_id,
      fecha_inicio: reserva.fecha_inicio,
      fecha_fin: reserva.fecha_fin,
    })
    setEditMode(true)
    setModalOpen(true)
  }

  // Delete reserva
  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta reserva?')) {
      try {
        setLoading(true)
        const { error } = await supabase.from('reservas').delete().eq('id', id)

        if (error) throw error

        await fetchReservas()
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  // Modal controls
  const openModal = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      cabaña_id: '',
      fecha_inicio: '',
      fecha_fin: '',
    })
    setEditMode(false)
    setCurrentReserva(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setError(null)
  }

  // Apply filters
  const applyFilters = () => {
    fetchReservas()
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({
      cabaña_id: '',
      fecha_inicio: '',
      fecha_fin: '',
      ubicacion: '',
    })
    fetchReservas()
  }

  // Obtener ubicaciones únicas para el filtro
  const ubicaciones = [
    ...new Set(cabañas.map((c) => c.ubicacion).filter(Boolean)),
  ]

  if (loading && reservas.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg max-w-4xl mx-auto mt-8">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 bg-neutral-100 sm:bg-neutral-300">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-8">
        Administración de Reservas
      </h1>

      {/* Filtros - Adaptado para móvil */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
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
                  {ubicacion === 'Serena' ? 'La Serena' : ubicacion}
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
                reservas.map((reserva) => (
                  <tr key={reserva.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {reserva.nombre}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {reserva.cabañas?.nombre}
                      </div>
                      <div className="text-gray-500">
                        ${reserva.cabañas?.precio}/noche
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {reserva.cabañas?.ubicacion === 'Serena'
                          ? 'La Serena'
                          : reserva.cabañas?.ubicacion}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {format(parseISO(reserva.fecha_inicio), 'dd/MM/yyyy', {
                          locale: es,
                        })}
                      </div>
                      <div className="text-gray-500">
                        al{' '}
                        {format(parseISO(reserva.fecha_fin), 'dd/MM/yyyy', {
                          locale: es,
                        })}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-gray-900">{reserva.email}</div>
                      <div className="text-gray-500">{reserva.telefono}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {reserva.created_at
                          ? format(
                              parseISO(reserva.created_at),
                              'dd/MM/yyyy HH:mm',
                              {
                                locale: es,
                              }
                            )
                          : 'N/A'}
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
                ))
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
              {reservas.map((reserva) => (
                <div key={reserva.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-gray-900">
                      {reserva.nombre}
                    </h3>
                    <span className="text-sm bg-gray-100 text-gray-800 py-1 px-2 rounded-full">
                      {reserva.cabañas?.ubicacion === 'Serena'
                        ? 'La Serena'
                        : reserva.cabañas?.ubicacion}
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="text-gray-600 font-medium">Cabaña:</span>{' '}
                    <span className="text-gray-900">
                      {reserva.cabañas?.nombre}
                    </span>
                    <span className="block text-sm text-gray-500">
                      ${reserva.cabañas?.precio}/noche
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="text-gray-600 font-medium">Fechas:</span>{' '}
                    <span className="text-gray-900">
                      {format(parseISO(reserva.fecha_inicio), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </span>
                    <span className="text-gray-500">
                      {' '}
                      al{' '}
                      {format(parseISO(reserva.fecha_fin), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="text-gray-600 font-medium">Contacto:</span>{' '}
                    <div>
                      <span className="text-gray-900">{reserva.email}</span>
                      <span className="block text-gray-500">
                        {reserva.telefono}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="text-gray-600 font-medium">
                      Reserva realizada:
                    </span>{' '}
                    <span className="text-gray-900">
                      {reserva.created_at
                        ? format(
                            parseISO(reserva.created_at),
                            'dd/MM/yyyy HH:mm',
                            {
                              locale: es,
                            }
                          )
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="flex space-x-3 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(reserva)}
                      className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-md text-center font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(reserva.id)}
                      className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-md text-center font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                  {editMode ? 'Editar Reserva' : 'Nueva Reserva'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                      Ubicación
                    </label>
                    <select
                      name="ubicacion"
                      value={filters.ubicacion}
                      onChange={(e) =>
                        setFilters({ ...filters, ubicacion: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Seleccionar ubicación</option>
                      {ubicaciones.map((ubicacion) => (
                        <option key={ubicacion} value={ubicacion}>
                          {ubicacion === 'Serena' ? 'La Serena' : ubicacion}
                        </option>
                      ))}
                    </select>
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
                      {cabañas
                        .filter(
                          (c) =>
                            !filters.ubicacion ||
                            c.ubicacion === filters.ubicacion
                        )
                        .map((cabaña) => (
                          <option key={cabaña.id} value={cabaña.id}>
                            {cabaña.nombre} (
                            {cabaña.ubicacion === 'Serena'
                              ? 'La Serena'
                              : cabaña.ubicacion}
                            )
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
                        setFormData({
                          ...formData,
                          fecha_inicio: e.target.value,
                        })
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
                        setFormData({ ...formData, fecha_fin: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 order-2 sm:order-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
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
                      'Actualizar Reserva'
                    ) : (
                      'Crear Reserva'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReservas
