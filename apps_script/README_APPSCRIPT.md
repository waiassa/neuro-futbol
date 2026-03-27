# Apps Script — instrucciones de despliegue

1) Crear una Google Sheet nueva con hojas (tabs): `Schedules` y `Registrations`.

- `Schedules` columnas (fila 1 = headers): `id`, `category`, `day`, `time`.
- `Registrations` columnas: `createdAt`, `scheduleId`, `parentEmail`, `childName`.

2) Abrir el editor de Apps Script desde la Sheet (Extensiones → Apps Script) y pegar el contenido de `Code.gs`.

3) En el editor de Apps Script, ir a `Project Settings` -> `Script properties` y añadir `ADMIN_KEY` (elige una cadena secreta para administración).

4) Deploy -> New deployment -> Select type "Web app". Ejecutar la app como: "Me" y acceso: "Anyone" o "Anyone, even anonymous" (según tu preferencia). Copiar la URL del Web App.

5) En el frontend (`index.html`) pega la URL del Web App en la caja `API base` y clic en `Cargar turnos`.

Notas de seguridad: con acceso público cualquiera puede llamar `register`, por eso tener `ADMIN_KEY` protege solo las operaciones administrativas. Si quieres controlar usuarios (padres/administradores) deberás integrar Google Sign-In u otro método de autenticación y ajustar la lógica del Apps Script.
