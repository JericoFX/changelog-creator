# changelog-creator
Sends a formatted embed to discord on server start if the changelog file was modified.

## Interfaz web

Incluye una herramienta construida con [SolidJS](https://www.solidjs.com/) para gestionar el `changelog.json` sin editarlo manualmente.

### Requisitos

- Node.js 18 o superior

### Uso

```bash
cd web
npm install
npm run dev
```

El servidor de desarrollo se inicia en `http://localhost:5173`. La interfaz carga automáticamente `changelogs/changelog.json` y permite cambiar la ruta si tu archivo está en otra ubicación accesible desde el servidor de archivos.

Cuando trabajes en local puedes usar el botón **Guardar archivo** para escribir los cambios directamente sobre el JSON original. La acción realiza una petición `PUT` al archivo y queda registrada en la consola del navegador y en la terminal de Vite para que puedas verificar la ruta que se está utilizando. En entornos de producción deberás seguir usando la opción **Descargar JSON** y subir el archivo manualmente.

Para preparar una versión final:

```bash
npm run build
```

El contenido listo para producción se generará en `web/dist`. Copia esa carpeta al recurso dentro de tu servidor (por ejemplo `changelog-creator/web`) y sirve los archivos estáticos junto con los JSON de `changelogs/`. El script de servidor sigue leyendo las claves `Version`, `Changes` y `DO_NOT_CHANGE_VER`; la sección `History` añadida por la interfaz es opcional y solo se utiliza para la vista web.


## Convars
```
set changelog_webhook "webhook" # This one is necessary
set changelog_filename "changelog.json" # optional, will default to changelog.json
```
