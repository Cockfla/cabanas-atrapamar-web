import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "../db/supabaseClient";
import { set } from "date-fns";

const ReservaForm = ({ cabañas, onCheckDisponibilidad }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm();

  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reservedDates, setReservedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [cabañaSeleccionada, setCabañaSeleccionada] = useState(null);
  const [capacidadDisponible, setCapacidadDisponible] = useState({});

  const cabañaId = watch("cabaña_id");

  const changeMonth = (increment) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  useEffect(() => {
    if (!cabañaId) return;

    const fetchReservedDates = async () => {
      try {
        // Primero, obtener capacidad de la cabaña seleccionada
        const { data: cabañaData } = await supabase
          .from("cabañas")
          .select("*")
          .eq("id", cabañaId)
          .single();

        setCabañaSeleccionada(cabañaData);

        // Luego, obtener las reservas
        const { data } = await supabase
          .from("reservas")
          .select("fecha_inicio, fecha_fin")
          .eq("cabaña_id", cabañaId);

        // Crear un mapa de fechas con contador de reservas
        const reservasPorFecha = {};
        const disponibilidadPorFecha = {};

        data.forEach((reserva) => {
          const start = new Date(reserva.fecha_inicio);
          const end = new Date(reserva.fecha_fin);

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split("T")[0];
            reservasPorFecha[dateString] =
              (reservasPorFecha[dateString] || 0) + 1;
            disponibilidadPorFecha[dateString] =
              cabañaData.capacidad - reservasPorFecha[dateString];
          }
        });

        setCapacidadDisponible(disponibilidadPorFecha);

        // Actualizar el array de fechas reservadas (para DatePicker)
        const fechasCompletas = Object.entries(reservasPorFecha)
          .filter(([fecha, count]) => count >= cabañaData.capacidad)
          .map(([fecha]) => new Date(fecha));

        setReservedDates(fechasCompletas);
      } catch (error) {
        console.error("Error fetching reserved dates:", error);
      }
    };

    fetchReservedDates();
  }, [cabañaId]);

  // Personalizar la visualización de días en el DatePicker
  const dayClassName = (date) => {
    const dateString = date.toISOString().split("T")[0];
    const disponibles = capacidadDisponible[dateString];

    if (!cabañaSeleccionada) return undefined;

    if (disponibles === 0) return "bg-red-100 text-red-500";
    if (disponibles < cabañaSeleccionada.capacidad)
      return "bg-orange-100 text-orange-700";
    return undefined;
  };

  // Función para renderizar tooltip con disponibilidad
  const renderDayContents = (day, date) => {
    const dateString = date.toISOString().split("T")[0];
    const disponibles = capacidadDisponible[dateString];

    if (!cabañaSeleccionada || disponibles === undefined) return day;

    return (
      <div className="relative" title={`${disponibles} disponibles`}>
        {day}
        <div className="absolute bottom-0 left-0 right-0 text-center text-xs">
          {disponibles}/{cabañaSeleccionada?.capacidad || 1}
        </div>
      </div>
    );
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("reservas").insert([
        {
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          cabaña_id: data.cabaña_id,
          fecha_inicio: fechaInicio.toISOString().split("T")[0],
          fecha_fin: fechaFin.toISOString().split("T")[0],
        },
      ]);

      if (error) throw error;

      setSuccess(true);
      reset();
      setFechaInicio(null);
      setFechaFin(null);
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      alert("Error al reservar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Reserva tu Cabaña
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Nombre completo
            </label>
            <input
              {...register("nombre", { required: "Este campo es obligatorio" })}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.nombre ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ej: Juan Pérez"
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              {...register("email", {
                required: "Este campo es obligatorio",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Correo electrónico inválido",
                },
              })}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ej: juan@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Teléfono de contacto
            </label>
            <input
              {...register("telefono", {
                required: "Este campo es obligatorio",
                pattern: {
                  value: /^[0-9]{9,12}$/,
                  message: "Teléfono inválido",
                },
              })}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.telefono ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ej: 912345678"
            />
            {errors.telefono && (
              <p className="mt-1 text-sm text-red-600">
                {errors.telefono.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Selecciona tu cabaña
            </label>
            <select
              {...register("cabaña_id", {
                required: "Debes seleccionar una cabaña",
              })}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cabaña_id ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">-- Selecciona una opción --</option>
              {cabañas.map((cabaña) => (
                <option
                  key={cabaña.id}
                  value={cabaña.id}
                  disabled={!cabaña.disponible}
                >
                  {cabaña.nombre} - ${cabaña.precio}{" "}
                  {!cabaña.disponible && "(No disponible)"}
                </option>
              ))}
            </select>
            {errors.cabaña_id && (
              <p className="mt-1 text-sm text-red-600">
                {errors.cabaña_id.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Fecha de llegada
            </label>
            <div onClick={(e) => e.preventDefault()}>
              <DatePicker
                selected={fechaInicio}
                onChange={(date) => {
                  setFechaInicio(date);
                  if (fechaFin && date > fechaFin) {
                    setFechaFin(null);
                  }
                }}
                minDate={new Date()}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecciona fecha"
                dayClassName={dayClassName}
                renderDayContents={renderDayContents}
                selectsStart
                startDate={fechaInicio}
                endDate={fechaFin}
                excludeDates={reservedDates}
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Fecha de salida
            </label>
            <div onClick={(e) => e.preventDefault()}>
              <DatePicker
                selected={fechaFin}
                onChange={(date) => setFechaFin(date)}
                minDate={fechaInicio || new Date()}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecciona fecha"
                dayClassName={dayClassName}
                renderDayContents={renderDayContents}
                selectsEnd
                startDate={fechaInicio}
                endDate={fechaFin}
                excludeDates={reservedDates}
                disabled={!fechaInicio}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !fechaInicio || !fechaFin}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 ${
            loading || !fechaInicio || !fechaFin
              ? "opacity-70 cursor-not-allowed"
              : ""
          }`}
        >
          {success && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
              ¡Reserva realizada con éxito! Te contactaremos pronto para
              confirmar.
            </div>
          )}
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
              Procesando reserva...
            </span>
          ) : (
            "Confirmar Reserva"
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Al reservar, aceptas nuestros términos y condiciones.
        </p>
      </form>
    </div>
  );
};

export default ReservaForm;
