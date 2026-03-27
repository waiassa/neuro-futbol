# Agenda - Centro de Entrenamiento (GitHub Pages + Google Sheets)

Este repo contiene un frontend simple para publicar en GitHub Pages y un ejemplo de Google Apps Script (Web App) que usa una Google Sheet como base de datos.

Pasos resumidos:

1. Crear una Google Sheet con hojas: `Categories`, `Schedules`, `Children`, `Registrations`.
2. Añadir el script `apps_script/Code.gs` en el editor de Apps Script, configurar la `ADMIN_KEY` en Properties y desplegar como Web App (quien tenga el enlace puede ejecutar).
3. Configurar en `src/app.js` la constante `SCRIPT_EXEC_URL` con la URL de tu Web App.
4. El frontend publica dos accesos separados:
   - `https://waiassa.github.io/neuro-futbol/familias.html` (usa `route=parent`)
   - `https://waiassa.github.io/neuro-futbol/admin.html` (usa `route=admin`)
5. Publicar el frontend en GitHub Pages (branch `gh-pages` o `main` + settings).

Ver `apps_script/README_APPSCRIPT.md` para detalles de Sheets y despliegue.
