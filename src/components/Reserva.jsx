// src/components/Reserva.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../db/supabaseClient";
import ReservaForm from "./ReservaForm";

export default function Reserva() {
  const [cabañas, setCabañas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCabañas = async () => {
      try {
        const { data, error } = await supabase
          .from("cabañas")
          .select("*")
          .order("precio", { ascending: true });

        if (error) throw error;

        setCabañas(data.map((c) => ({ ...c, disponible: true })));
      } catch (err) {
        console.error("Error fetching cabañas:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCabañas();
  }, []);

  const checkDisponibilidad = async (fechaInicio, fechaFin) => {
    try {
      setLoading(true);
      const { data: reservas, error } = await supabase
        .from("reservas")
        .select("cabaña_id, fecha_inicio, fecha_fin")
        .or(`and(fecha_inicio.lte.${fechaFin},fecha_fin.gte.${fechaInicio})`);

      if (error) throw error;

      setCabañas((prev) =>
        prev.map((cabaña) => {
          // Filtrar reservas para esta cabaña específica
          const reservasParaCabaña = reservas.filter(
            (r) => r.cabaña_id === cabaña.id
          );

          // Contar cuántas unidades están reservadas para este período
          const unidadesReservadas = reservasParaCabaña.length;

          // Calcular unidades disponibles
          const unidadesDisponibles = cabaña.capacidad - unidadesReservadas;

          return {
            ...cabaña,
            disponible: unidadesDisponibles > 0,
            unidadesDisponibles: unidadesDisponibles,
          };
        })
      );
    } catch (err) {
      console.error("Error verificando disponibilidad:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="text-center p-8">Cargando cabañas...</div>;
  if (error) return <div className="text-red-500 p-8">Error: {error}</div>;
  if (cabañas.length === 0)
    return <div className="p-8">No hay cabañas disponibles</div>;

  return (
    <div className="container mx-auto p-4">
      <ReservaForm
        cabañas={cabañas}
        onCheckDisponibilidad={checkDisponibilidad}
      />
    </div>
  );
}
