# Cabañas Atrapamar

![Logo Cabañas Atrapamar](https://atrapamar.cl/cabanas-atrapamar-log.png)

## Descripción

Bienvenido a **Cabañas Atrapamar**, tu refugio costero en dos destinos únicos de Chile. Ofrecemos alojamiento cómodo y acogedor en **Pichilemu** (capital mundial del surf) y **La Serena** (ciudad de los campanarios).

## Nuestras Ubicaciones

### 🏄‍♂️ Pichilemu - Capital Mundial del Surf

📍 **Dirección exacta:**  
Avenida Comercio con pasaje La Estrella #230, Pichilemu

- A 10 minutos caminando del Centro y la Playa Principal
- En el corazón de la cultura surfista de Chile
- Acceso fácil a las mejores playas de la región
- Playas de clase mundial para surfear
- Vibrante vida nocturna y gastronomía local

### 🌊 La Serena - Ciudad de los Campanarios

📍 **Dirección exacta:**  
Marejadas 658, Caleta San Pedro, La Serena

- Ubicación privilegiada frente al mar
- Cerca de todos los servicios y atracciones
- Hermosas playas y rica cultura nortina
- Paisajes naturales impresionantes
- Tranquilidad y conexión con la naturaleza

## Características de Nuestras Cabañas

- **Cabañas totalmente equipadas** con todo lo necesario para tu estadía
- **Capacidad para diferentes tamaños de grupos** (2, 4, 5, 6 y 8 personas)
- **Ubicación cercana a atracciones principales** en ambas ciudades
- **Ambiente familiar y seguro** para disfrutar con toda la familia
- **Reservas online** con sistema de disponibilidad en tiempo real
- **Pagos seguros** con múltiples métodos de pago

## Cabañas Disponibles

### Pichilemu

- Cabaña 2 personas
- Cabaña 4 personas
- Cabaña 5 personas
- Cabaña 6 personas
- Cabaña 8 personas

### La Serena

- Cabañas El Faro
- Cabañas El Valle

## Contacto

📞 **WhatsApp:** [+56 9 6155 4758](https://wa.me/56961554758)  
📧 **Email:** [reservas@atrapamar.cl](mailto:reservas@atrapamar.cl)

### Síguenos en redes sociales:

[![Instagram](https://img.shields.io/badge/Instagram-@atrapamar__pichilemu-E4405F?style=for-the-badge&logo=instagram)](https://www.instagram.com/atrapamar_cabanas)  
[![Facebook](https://img.shields.io/badge/Facebook-Cabañas_Pichilemu-1877F2?style=for-the-badge&logo=facebook)](https://www.facebook.com/cabanaspichilemu.garridoabarca)

## Cómo reservar

1. **Visita nuestro sitio web** y consulta disponibilidad en tiempo real
2. **Selecciona tus fechas** y la cabaña que prefieras
3. **Completa el formulario** con tus datos
4. **Confirma tu reserva** con el pago correspondiente
5. **¡Prepárate para disfrutar!**

## Experiencia Atrapamar

### En Pichilemu:

- Playas de clase mundial para surfear
- Vibrante vida nocturna y gastronomía local
- Paisajes naturales impresionantes
- Tranquilidad y conexión con la naturaleza

### En La Serena:

- Hermosas playas del norte de Chile
- Rica cultura nortina y gastronomía local
- Paisajes desérticos y costeros únicos
- Clima privilegiado durante todo el año

## Sitio Web

🌐 **Visita nuestro sitio web:** [www.atrapamar.cl](https://www.atrapamar.cl)

¡Te esperamos para vivir una experiencia única en cualquiera de nuestros destinos!

# Cabañas Atrapa Mar

Sitio web para la gestión de reservas de cabañas en Pichilemu y La Serena, Chile.

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

### Para evitar el mensaje "Sitio peligroso" en Chrome:

1. **Opción 1: Usar localhost en lugar de IP**

   - Accede a `http://localhost:4321` en lugar de la IP
   - Chrome confía más en localhost

2. **Opción 2: Configurar certificado local (Recomendado)**

   ```bash
   # Instalar mkcert
   brew install mkcert

   # Generar certificados locales
   mkcert -install
   mkcert localhost 127.0.0.1

   # Iniciar con HTTPS
   npm run dev:https
   ```

3. **Opción 3: Deshabilitar advertencias de seguridad (Solo desarrollo)**
   - En Chrome, ve a `chrome://flags/`
   - Busca "Insecure origins treated as secure"
   - Agrega `http://localhost:4321` y `http://127.0.0.1:4321`

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
PUBLIC_SUPABASE_URL=tu_url_de_supabase
PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

## 🔒 Seguridad

El proyecto incluye múltiples capas de seguridad:

- ✅ Protección CSRF
- ✅ Rate limiting
- ✅ Headers de seguridad
- ✅ Validación de entrada
- ✅ Cookies seguras
- ✅ Prevención de clickjacking

## 📁 Estructura del Proyecto

```
src/
├── components/     # Componentes React y Astro
├── pages/         # Páginas y API routes
├── layouts/       # Layouts de Astro
├── styles/        # Estilos CSS
├── utils/         # Utilidades
└── db/           # Configuración de base de datos
```

## 🛠️ Tecnologías

- **Astro** - Framework web
- **React** - Componentes interactivos
- **Supabase** - Base de datos y autenticación
- **Tailwind CSS** - Estilos
- **TypeScript** - Tipado estático

## 📝 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run dev:https` - Servidor con HTTPS
- `npm run build` - Construir para producción
- `npm run preview` - Vista previa de producción

## 🔧 Configuración de Producción

El proyecto está configurado para desplegar en Vercel con:

- Headers de seguridad automáticos
- HTTPS obligatorio
- Optimizaciones de rendimiento
