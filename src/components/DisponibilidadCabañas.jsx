import React, { useState, useEffect } from "react";
import { supabase } from "../db/supabaseClient";

const DisponibilidadCabanas = () => {
  const [cabañas, setCabañas] = useState([]);
  const [selectedCabaña, setSelectedCabaña] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservedDates, setReservedDates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Obtener todas las cabañas
  useEffect(() => {
    const fetchCabañas = async () => {
      try {
        const { data, error } = await supabase
          .from("cabañas")
          .select("*")
          .order("precio", { ascending: true });

        if (error) throw error;

        setCabañas(data);
        if (data.length > 0) {
          setSelectedCabaña(data[0].id);
        }
      } catch (err) {
        console.error("Error fetching cabañas:", err);
      }
    };

    fetchCabañas();
  }, []);

  // Obtener fechas reservadas
  useEffect(() => {
    if (!selectedCabaña) return;

    const fetchReservedDates = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("reservas")
          .select("fecha_inicio, fecha_fin")
          .eq("cabaña_id", selectedCabaña);

        if (error) throw error;

        const dates = data.flatMap((reserva) => {
          const start = new Date(reserva.fecha_inicio);
          const end = new Date(reserva.fecha_fin);
          const dates = [];

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
          }
          return dates;
        });

        setReservedDates(dates);
      } catch (err) {
        console.error("Error fetching reserved dates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReservedDates();
  }, [selectedCabaña]);

  const getDayStatus = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return "past";
    }
    if (reservedDates.some((d) => d.toDateString() === date.toDateString())) {
      return "reserved";
    }
    return "available";
  };

  // Cambiar mes
  const changeMonth = (increment) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  // Verificar si una fecha está reservada
  const isDateReserved = (date) => {
    return reservedDates.some((d) => d.toDateString() === date.toDateString());
  };

  // Ajustar día de la semana (0=Lunes, 6=Domingo)
  const getAdjustedDay = (date) => {
    return (date.getDay() + 6) % 7;
  };

  // Generar días del calendario
  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);

    // Ajuste para empezar en Lunes
    const startingDay = (firstDay.getDay() + 6) % 7;
    const days = [];
    const totalDays = 42; // 6 semanas

    for (let i = 0; i < totalDays; i++) {
      const day = new Date(year, month, 1 + (i - startingDay));
      const isCurrentMonth = day.getMonth() === month;
      const dayStatus = getDayStatus(day);
      const isToday = day.toDateString() === new Date().toDateString();

      let dayClass = "p-2 border rounded text-center ";

      if (!isCurrentMonth) {
        dayClass += "text-gray-400 bg-gray-50";
      } else {
        switch (dayStatus) {
          case "past":
            dayClass += "bg-gray-200 text-gray-500";
            break;
          case "reserved":
            dayClass += "bg-red-100 text-red-500";
            break;
          case "available":
            dayClass += "bg-green-100 text-green-700";
            break;
        }
      }

      if (isToday) {
        dayClass += " border-2 border-blue-500 font-bold";
      }

      days.push(
        <div key={i} className={dayClass}>
          {day.getDate()}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 my-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Disponibilidad de Cabañas
      </h2>

      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-medium mb-2">
          Selecciona una cabaña:
        </label>
        <select
          value={selectedCabaña || ""}
          onChange={(e) => setSelectedCabaña(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {cabañas.map((cabaña) => (
            <option key={cabaña.id} value={cabaña.id}>
              {cabaña.nombre} - ${cabaña.precio}/noche
            </option>
          ))}
        </select>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">
            {currentMonth.toLocaleDateString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Mes anterior"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Mes siguiente"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-xs">
              <div className="p-2 font-medium text-center">Lun</div>
              <div className="p-2 font-medium text-center">Mar</div>
              <div className="p-2 font-medium text-center">Mié</div>
              <div className="p-2 font-medium text-center">Jue</div>
              <div className="p-2 font-medium text-center">Vie</div>
              <div className="p-2 font-medium text-center">Sáb</div>
              <div className="p-2 font-medium text-center">Dom</div>

              {renderCalendarDays()}
            </div>

            <div className="flex justify-center mt-6 space-x-6">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 border border-green-300 mr-2"></div>
                <span className="text-sm">Disponible</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 border border-red-300 mr-2"></div>
                <span className="text-sm">Reservado</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DisponibilidadCabanas;
