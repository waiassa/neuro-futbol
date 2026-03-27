# Agenda - Centro de Entrenamiento (GitHub Pages + Google Sheets)

Este repo contiene un frontend simple para publicar en GitHub Pages y un ejemplo de Google Apps Script (Web App) que usa una Google Sheet como base de datos.

Pasos resumidos:

1. Crear una Google Sheet con hojas: `Categories`, `Schedules`, `Children`, `Registrations`.
2. Añadir el script `apps_script/Code.gs` en el editor de Apps Script, configurar la `ADMIN_KEY` en Properties y desplegar como Web App (quien tenga el enlace puede ejecutar).
3. Copiar la URL del Web App y pegarla en la caja `API base` en la `index.html`, luego `Cargar turnos`.
4. Publicar el frontend en GitHub Pages (branch `gh-pages` o `main` + settings).

Ver `apps_script/README_APPSCRIPT.md` para detalles de Sheets y despliegue.
