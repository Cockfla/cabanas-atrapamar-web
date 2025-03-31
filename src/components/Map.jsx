// Map.astro
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Solución para el icono del marcador
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function Map() {
  return (
    <MapContainer
      center={[-34.39491810022256, -72.0175572211526]}
      zoom={16}
      scrollWheelZoom={false}
      style={{ height: "400px", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[-34.39491810022256, -72.0175572211526]}>
        <Popup>
          <div className="flex flex-col items-center justify-center">
            <img
              src="/cabanas-atrapamar-log.png"
              width={50}
              alt="Logo Cabañas Atrapa Mar"
            />
            <b>Cabañas Atrapa Mar</b>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
