import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "../../db/supabaseClient";

const ReservaForm = ({
  cabañas,
  onCheckDisponibilidad,
  ubicacion = "Pichilemu",
}) => {
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
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
      // Formatear las fechas correctamente en YYYY-MM-DD
      const formatearFecha = (fecha) => {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, "0");
        const day = String(fecha.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Obtener el precio de la cabaña seleccionada
      const cabañaSeleccionada = cabañas.find(
        (c) => c.id === parseInt(data.cabaña_id)
      );
      if (!cabañaSeleccionada) {
        throw new Error("Cabaña no encontrada");
      }

      // Calcular número de noches
      const fechaInicioObj = new Date(fechaInicio);
      const fechaFinObj = new Date(fechaFin);
      const diffTime = Math.abs(fechaFinObj - fechaInicioObj);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calcular monto total (precio por noche * número de noches)
      const montoTotal = cabañaSeleccionada.precio * diffDays;

      setIsProcessingPayment(true);

      // Iniciar proceso de pago con Getnet
      const paymentResponse = await fetch("/api/payment/create-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          documento: data.documento || null, // Incluir RUT si se proporciona
          cabaña_id: data.cabaña_id,
          fecha_inicio: formatearFecha(fechaInicio),
          fecha_fin: formatearFecha(fechaFin),
          monto: montoTotal,
        }),
      });

      const paymentData = await paymentResponse.json();

      console.log("Respuesta del servidor:", paymentData);

      if (paymentData.success && paymentData.redirect_url) {
        // Mostrar mensaje de redirección
        console.log("Redirigiendo a Getnet:", paymentData.redirect_url);

        // Redirigir al usuario a la pasarela de pago de Getnet
        window.location.href = paymentData.redirect_url;
      } else {
        console.error("Error en la respuesta:", paymentData);
        throw new Error(paymentData.message || "Error al procesar el pago");
      }
    } catch (error) {
      setIsProcessingPayment(false);
      alert("Error al reservar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-200 rounded-xl shadow-md overflow-hidden p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        {ubicacion ? `Reserva tu Cabaña en ${ubicacion}` : "Reserva tu Cabaña"}
      </h2>

      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
          ¡Reserva realizada con éxito! Te contactaremos pronto para confirmar.
        </div>
      )}

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
              RUT (opcional para pago con Getnet)
            </label>
            <input
              {...register("documento", {
                pattern: {
                  value: /^[0-9]{7,8}-[0-9Kk]{1}$/,
                  message: "Formato de RUT inválido (ej: 12345678-9)",
                },
              })}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.documento ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ej: 12345678-9"
            />
            {errors.documento && (
              <p className="mt-1 text-sm text-red-600">
                {errors.documento.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Opcional: Si proporcionas tu RUT, aparecerá en el recibo de pago
            </p>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              Selecciona tu cabaña {ubicacion ? `en ${ubicacion}` : ""}
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
          disabled={loading || isProcessingPayment || !fechaInicio || !fechaFin}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 ${
            loading || isProcessingPayment || !fechaInicio || !fechaFin
              ? "opacity-70 cursor-not-allowed"
              : ""
          }`}
        >
          {loading || isProcessingPayment ? (
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
              {isProcessingPayment
                ? "Conectando con Getnet..."
                : "Procesando reserva..."}
            </span>
          ) : (
            "Continuar al pago"
          )}
        </button>

        {/* Sección de información de pago con Getnet según documentación */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
          <div className="flex justify-center mb-3">
            <img
              src="/Logo_WebCheckout_Getnet.svg"
              alt="Getnet Web Checkout"
              className="h-12"
            />
          </div>
          <div className="text-center">
            <h4 className="font-medium text-gray-900 mb-2">
              Tarjeta de crédito, débito o prepago
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Paga seguro todo lo que necesitas con Getnet utilizando tus
              tarjetas de crédito, débito y prepago, de todos los emisores
              nacionales e internacionales.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-3">
          Al reservar, aceptas nuestros{" "}
          <a
            href="/terminos-y-condiciones"
            className="underline hover:text-blue-500"
          >
            términos y condiciones
          </a>{" "}
          y{" "}
          <a
            href="/politica-de-privacidad"
            className="underline hover:text-blue-500"
          >
            política de privacidad
          </a>
          . Serás redirigido a nuestra pasarela de pagos segura.
        </p>
      </form>
    </div>
  );
};

export default ReservaForm;
