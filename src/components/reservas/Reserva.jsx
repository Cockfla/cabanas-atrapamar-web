// src/components/Reserva.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../../db/supabaseClient'
import ReservaForm from './ReservaForm'

export default function Reserva({ ubicacion = 'pichilemu' }) {
  const [cabañas, setCabañas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [normalizedUbicacion, setNormalizedUbicacion] = useState(ubicacion)

  useEffect(() => {
    // Normalizar la ubicación para que coincida con la base de datos
    let dbUbicacion

    if (typeof ubicacion === 'string') {
      const ub = ubicacion.toLowerCase()

      if (ub === 'pichilemu') {
        dbUbicacion = 'pichilemu'
        setNormalizedUbicacion('Pichilemu')
      } else if (ub === 'laserena' || ub === 'serena') {
        dbUbicacion = 'laserena'
        setNormalizedUbicacion('La Serena')
      } else {
        // Valor por defecto
        dbUbicacion = 'pichilemu'
        setNormalizedUbicacion('Pichilemu')
      }
    } else {
      // Si no hay ubicación, usar valor por defecto
      dbUbicacion = 'pichilemu'
      setNormalizedUbicacion('Pichilemu')
    }

    const fetchCabañas = async () => {
      try {
        // Construir la consulta basada en la ubicación
        let query = supabase
          .from('cabañas')
          .select('*')
          .eq('ubicacion', dbUbicacion)
          .order('precio', { ascending: true })

        const { data, error } = await query

        if (error) throw error

        setCabañas(data.map((c) => ({ ...c, disponible: true })))
      } catch (err) {
        console.error('Error fetching cabañas:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCabañas()
  }, [ubicacion])

  const checkDisponibilidad = async (fechaInicio, fechaFin) => {
    try {
      setLoading(true)
      const fechaInicioString = fechaInicio.toISOString().split('T')[0]
      const fechaFinString = fechaFin.toISOString().split('T')[0]

      const { data: reservas, error } = await supabase
        .from('reservas')
        .select('cabaña_id, fecha_inicio, fecha_fin')
        .or(
          `and(fecha_inicio.lte.${fechaFinString},fecha_fin.gte.${fechaInicioString})`
        )

      if (error) throw error

      setCabañas((prev) =>
        prev.map((cabaña) => {
          // Filtrar reservas para esta cabaña específica
          const reservasParaCabaña = reservas.filter(
            (r) => r.cabaña_id === cabaña.id
          )

          // Contar cuántas unidades están reservadas para este período
          const unidadesReservadas = reservasParaCabaña.length

          // Calcular unidades disponibles
          const unidadesDisponibles = cabaña.capacidad - unidadesReservadas

          return {
            ...cabaña,
            disponible: unidadesDisponibles > 0,
            unidadesDisponibles: unidadesDisponibles,
          }
        })
      )
    } catch (err) {
      console.error('Error verificando disponibilidad:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center p-8">Cargando cabañas...</div>
  if (error) return <div className="text-red-500 p-8">Error: {error}</div>
  if (cabañas.length === 0)
    return (
      <div className="text-center p-8">
        <div className="bg-yellow-100 p-6 rounded-lg border border-yellow-300 text-yellow-800">
          <h3 className="text-xl font-semibold mb-2">
            No hay cabañas disponibles
          </h3>
          <p>No encontramos cabañas disponibles para {normalizedUbicacion}.</p>
          <a
            href="/"
            className="mt-4 inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    )

  return (
    <div className="container mx-auto p-4">
      <ReservaForm
        cabañas={cabañas}
        onCheckDisponibilidad={checkDisponibilidad}
        ubicacion={normalizedUbicacion}
      />
    </div>
  )
}
