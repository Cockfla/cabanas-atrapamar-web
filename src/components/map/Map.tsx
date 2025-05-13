import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { customIcon } from "./MarkerIcon"; // Importar el icono personalizado
import Image from "astro/components/Image.astro";

interface Props {
  lat: number;
  lng: number;
  titulo: string;
}

export default function Map({ lat, lng, titulo }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={false}
      style={{ height: "400px", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[lat, lng]} icon={customIcon}>
        {" "}
        {/* Usa el icono personalizado */}
        <Popup>
          <div className="flex flex-col items-center justify-center">
            <Image
              width={50}
              height={50}
              loading="lazy"
              src="/cabanas-atrapamar-log.png"
              alt="Logo Cabañas Atrapa Mar"
            />
            <b>{titulo}</b>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
