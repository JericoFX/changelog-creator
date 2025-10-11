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

El servidor de desarrollo se inicia en `http://localhost:5173`. Puedes ajustar la ruta del `changelog.json` desde la propia interfaz. Para preparar una versión final:

```bash
npm run build
```

El contenido listo para producción se generará en `web/dist`. Copia esa carpeta al recurso dentro de tu servidor (por ejemplo `changelog-creator/web`) y sirve los archivos estáticos junto con el `changelog.json`. El script de servidor sigue leyendo las claves `Version`, `Changes` y `DO_NOT_CHANGE_VER`; la sección `History` añadida por la interfaz es opcional y solo se utiliza para la vista web.


## Convars
```
set changelog_webhook "webhook" # This one is necessary
set changelog_filename "changelog.json" # optional, will default to changelog.json
```
