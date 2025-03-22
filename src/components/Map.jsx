import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css"; // Importa los estilos de Leaflet
import L from "leaflet";

export default function Map() {
  return (
    <MapContainer
      center={[-34.39491810022256, -72.0175572211526]}
      zoom={16}
      scrollWheelZoom={false}
      style={{ height: "400px", width: "100%" }} // Define un tamaño fijo para el mapa
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[-34.39491810022256, -72.0175572211526]}>
        <Popup>
          <div className="flex flex-col items-center justify-center">
            <img src="/cabanas-atrapamar-log.png" width={50} />
            <b>Cabañas Atrapa Mar</b>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
