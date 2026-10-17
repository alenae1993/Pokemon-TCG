# Liga Kanto TCG — versión para celular

Pokémon TCG de la era Base jugable en español (Base Set, Jungle, Fossil, Base Set 2, Team Rocket, Gym Heroes y Gym Challenge), con apertura de sobres, constructor de mazos y campaña de 8 gimnasios de Kanto contra la IA.

## Publicar en GitHub Pages
1. Crea un repositorio nuevo en GitHub (por ejemplo `liga-kanto`).
2. Sube **todo el contenido de esta carpeta** a la raíz del repositorio (index.html, manifest.webmanifest, sw.js, .nojekyll y las carpetas `src`, `assets`, `icons`).
   - Desde la web: *Add file → Upload files* y arrastra las carpetas (la web acepta hasta 100 archivos por subida; si falla, sube `assets` en una segunda tanda).
   - Con Git: `git init`, `git add .`, `git commit -m "Liga Kanto"`, `git branch -M main`, `git remote add origin https://github.com/TU_USUARIO/liga-kanto.git`, `git push -u origin main`.
3. En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save*.
4. En 1–2 minutos queda en `https://TU_USUARIO.github.io/liga-kanto/`.

## Instalar en el teléfono
- **Android (Chrome):** abre el enlace → menú ⋮ → *Agregar a la pantalla principal* / *Instalar app*.
- **iPhone (Safari):** abre el enlace → botón Compartir → *Agregar a inicio*.

Se abre a pantalla completa y, tras la primera carga, funciona sin conexión.

## Guardado
El progreso se guarda en el navegador del teléfono. Usa *Opciones → Exportar partida* para respaldarlo o pasarlo a otro dispositivo, e *Importar partida* para cargarlo.

## Actualizar
Si cambias archivos, sube el número de versión en `sw.js` (`liga-kanto-v8` → `v8`) para que los teléfonos descarguen la versión nueva.
