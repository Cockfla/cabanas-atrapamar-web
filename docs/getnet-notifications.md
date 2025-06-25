# Configuración de Notificaciones de Getnet

## Descripción

Este documento explica cómo configurar y usar las notificaciones (webhooks) de Getnet para mantener sincronizado el estado de las reservas con los resultados de los pagos.

## Endpoint de Notificaciones

- **URL**: `/api/payment/notification`
- **Método**: POST
- **Descripción**: Recibe notificaciones asíncronas de Getnet sobre cambios en el estado de las transacciones

## Configuración Requerida

### 1. Variables de Entorno

Asegúrate de tener configuradas las siguientes variables en tu archivo `.env`:

```bash
GETNET_SECRET_KEY=tu_clave_secreta_de_getnet
GETNET_ACCESS_TOKEN=tu_access_token_de_getnet
```

### 2. Configuración en el Panel de Getnet

En el panel de administración de Getnet, configura:

- **URL de Notificación**: `https://atrapamar.cl/api/payment/notification`
- **Método**: POST
- **Puertos**: 443 (HTTPS)

## Estructura de la Notificación

Getnet enviará notificaciones con la siguiente estructura:

```json
{
  "status": {
    "status": "APPROVED",
    "message": "Testing notification",
    "reason": "TT",
    "date": "2022-03-29T16:43:54-05:00"
  },
  "requestId": 65488906,
  "reference": 270656693,
  "signature": "c12b9e8b1780effffe2dd6c27f6fe2d67dace6ce"
}
```

## Estados de Transacción

| Estado Getnet | Estado Reserva | Descripción                |
| ------------- | -------------- | -------------------------- |
| APPROVED      | confirmada     | Pago aprobado exitosamente |
| DECLINED      | fallida        | Pago rechazado             |
| REJECTED      | fallida        | Pago rechazado             |
| FAILED        | fallida        | Pago falló                 |
| PENDING       | pendiente      | Pago en proceso            |
| IN_PROGRESS   | pendiente      | Pago en progreso           |

## Validación de Autenticidad

El endpoint valida automáticamente que las notificaciones provienen de Getnet mediante:

1. **Verificación de Firma**: Calcula SHA-1 de `requestId + status + date + secretKey`
2. **Comparación**: Compara con la firma recibida en el campo `signature`

## Flujo de Procesamiento

1. **Recepción**: Se recibe la notificación POST
2. **Validación**: Se verifica la autenticidad de la notificación
3. **Búsqueda**: Se busca la reserva usando el `requestId` (guardado como `transaction_token`)
4. **Actualización**: Se actualiza el estado de la reserva según el estado del pago
5. **Notificación**: Si el pago fue aprobado, se puede enviar email de confirmación
6. **Respuesta**: Se responde con status 200 a Getnet

## Manejo de Errores

- **Notificación inválida**: Status 401 (Unauthorized)
- **Datos incompletos**: Status 400 (Bad Request)
- **Error interno**: Status 500 (Internal Server Error)
- **Reserva no encontrada**: Status 200 (para evitar reintento de Getnet)

## Testing

Para probar las notificaciones en desarrollo:

1. Usa ngrok o similar para exponer tu servidor local
2. Configura la URL de notificación en el panel de pruebas de Getnet
3. Realiza transacciones de prueba
4. Verifica los logs en la consola del servidor

### Endpoint de Debug

Para facilitar el debugging, puedes usar el endpoint de diagnóstico:

- **URL de estado**: `https://atrapamar.cl/api/payment/debug?test=status`
- **URL de configuración**: `https://atrapamar.cl/api/payment/debug?test=config`
- **URL de headers**: `https://atrapamar.cl/api/payment/debug?test=headers`

### Códigos de Respuesta Comunes

- **200**: Notificación procesada correctamente
- **302**: Redirección exitosa (normal en endpoints de respuesta)
- **400**: Datos incompletos en la notificación
- **401**: Notificación no auténtica (firma inválida)
- **500**: Error interno del servidor

## Logs

El endpoint genera logs detallados para facilitar el debugging:

- Notificaciones recibidas
- Validación de firmas
- Búsqueda de reservas
- Actualizaciones de estado
- Errores encontrados

## Consideraciones de Seguridad

1. **Secret Key**: Nunca expongas la `GETNET_SECRET_KEY` en el frontend
2. **HTTPS**: Siempre usa HTTPS para el endpoint de notificaciones
3. **Validación**: Siempre valida la firma antes de procesar la notificación
4. **Logs**: Evita loguear información sensible como la secret key

## Ejemplo de Configuración en Vercel

En el dashboard de Vercel, configura las variables de entorno:

1. Ve a tu proyecto
2. Settings > Environment Variables
3. Agrega:
   - `GETNET_SECRET_KEY`: Tu clave secreta de Getnet
   - `GETNET_ACCESS_TOKEN`: Tu token de acceso
