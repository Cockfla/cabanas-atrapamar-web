import React, { useEffect, useState } from "react";
import ReservaResultadoContent from "./ReservaResultadoContent.jsx";

export default function ReservaResultadoWrapper({ reserva, error }) {
  const [isClient, setIsClient] = useState(false);
  const [reservaData, setReservaData] = useState(null);

  useEffect(() => {
    setIsClient(true);
    if (reserva) {
      // Asegurar que los datos están correctamente serializados
      setReservaData(reserva);
    }
  }, [reserva]);

  // Mostrar loading hasta que se hidrate en el cliente
  if (!isClient) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return <ReservaResultadoContent reserva={reservaData} error={error} />;
}
