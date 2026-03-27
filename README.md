# Neuro Futbol (GitHub Pages + Supabase)

Frontend estático con dos accesos separados:

- `https://waiassa.github.io/neuro-futbol/familias.html`
- `https://waiassa.github.io/neuro-futbol/admin.html`

## Setup rápido en Supabase

1. Crear un proyecto en Supabase.
2. En SQL Editor, ejecutar el archivo `supabase_schema.sql`.
3. Cambiar el valor de `admin_key` en la tabla `app_settings`.
4. En `src/app.js`, configurar:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Publicar en GitHub Pages (branch `main` o `gh-pages`).

## Qué hace cada acceso

- `familias.html`: lista turnos + registra inscripciones.
- `admin.html`: lista turnos + permite agregar turnos con `adminKey`.

## Nota

La carpeta `apps_script/` quedó como referencia histórica de la versión Google Sheets/Apps Script.
