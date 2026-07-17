# Contexto del proyecto — Rutina de gym (sitio estático)

> Documento de traspaso para retomar el proyecto en **otra sesión / otra cuenta de Claude Code**.
> Reúne todo lo que **no viaja con `git clone`**: el dataset fuente (ignorado en `.gitignore`),
> los skills usados (sin trackear), y las decisiones de diseño y contexto que se le dieron al proyecto.
>
> Última actualización: 2026-07-17.

---

## 1. Qué es el proyecto

Sitio web **estático** (HTML + CSS + JS vanilla, sin framework ni bundler) que muestra una
**rutina de gimnasio personalizada de 8 semanas** para recomposición corporal. Se publica con
**GitHub Pages** desde la rama `main`.

- **Repo remoto:** `https://github.com/Horaciomb/mi-rutina-gym.git`
- **URL publicada:** GitHub Pages del repo (rama `main`, raíz del proyecto; hay un `.nojekyll` para que Pages sirva los archivos tal cual).
- **Título en la UI:** "Rutina de Horacio — Fuerza y Recomposición Corporal".
- **Idioma:** todo en español (`<html lang="es">`).

### Contenido de la rutina (lo que da forma a los datos)
- **Dos calendarios** seleccionables:
  - `LV` — **Lunes a Viernes** (5 días, split Empuje / Tirón / Piernas).
  - `LS` — **Lunes a Sábado** (6 días, Push / Pull / Legs ×2).
- **Tres fases** del programa (cada una cambia series/reps/descanso):
  - `fase1_tecnica` — Semanas 1-2, Técnica.
  - `fase1_hipertrofia` — Semanas 3-4, Hipertrofia base.
  - `fase2_fuerza` — Semanas 5-8, Fuerza / Hipertrofia.
- Cada ejercicio tiene un **rol**: `principal` | `accesorio` | `core`, que determina los parámetros por fase.
- **Prioridad muscular del usuario:** espalda, piernas y brazos. Meta: recomposición / ~-10 kg sin perder músculo.
- Incluye una **guía general** transversal: principios de entrenamiento, caminata diaria (8-10k pasos), alimentación (desayuno/almuerzo oficina/cena) y seguimiento (peso, cintura, fotos, cargas).

> Nota factual: el `localStorage` usa la clave `rutina-eric-state-v1` / `rutina-eric-theme` (nombre heredado); el título visible dice "Rutina de Horacio". No es un bug, solo nomenclatura interna.

---

## 2. Estructura de archivos

```
cambioFisc/
├── index.html            # Estructura de la página (una sola vista)
├── styles.css            # Todos los estilos (con temas claro/oscuro por CSS vars)
├── app.js                # Lógica: render, estado en localStorage, tema, sticky bar
├── data/
│   └── routine.js         # ★ GENERADO — define `const ROUTINE_DATA = {...}`
├── assets/
│   └── exercises/*.gif    # ★ GENERADO — solo los GIFs de los ejercicios usados (37)
├── scripts/
│   └── build-routine.mjs  # Script Node que genera data/routine.js + copia los GIFs
├── dataset-fuente/        # ⛔ IGNORADO por git — fuente de datos (ver §4)
├── .nojekyll              # Le dice a GitHub Pages que no procese con Jekyll
├── .gitignore
├── .claude/  .agents/     # ⚠️ Skills, SIN trackear y NO ignorados (ver §5)
├── skills-lock.json       # ⚠️ Lockfile de skills, SIN trackear
└── CONTEXTO-PROYECTO.md   # Este archivo
```

**No hay `package.json`, `node_modules`, ni build del front.** El único paso de "build" es
ejecutar `scripts/build-routine.mjs` con Node para regenerar `data/routine.js` y los GIFs.
El front-end se sirve tal cual (abrir `index.html` o un servidor estático).

### Archivos generados — no editar a mano
- **`data/routine.js`** — lo produce `build-routine.mjs`. La primera línea lo indica. Si editas la rutina, se hace en el `.mjs` y se regenera.
- **`assets/exercises/*.gif`** — se copian desde `dataset-fuente/` al correr el script; solo se copian los ~37 ejercicios que la rutina realmente usa.

---

## 3. Cómo se generan los datos (flujo crítico)

```
dataset-fuente/data/exercises.json  (1324 ejercicios, ignorado por git)
              │
              ▼
   node scripts/build-routine.mjs
              │
              ├──►  data/routine.js         (const ROUTINE_DATA con la rutina resuelta)
              └──►  assets/exercises/*.gif  (copia solo los GIFs usados)
```

`build-routine.mjs` contiene, hard-codeado en el propio script:
- **`PHASES`** — parámetros de series/reps/descanso por fase y por rol (principal/accesorio/core).
- **`VERSIONES`** (`LV` y `LS`) — qué **id de ejercicio del dataset** va en cada día, con su rol y notas opcionales. Aquí se define la rutina real.
- **`NOMBRES_ES`** — mapa manual id→nombre en español (el dataset solo trae el nombre en inglés en `name`; las *instrucciones* sí vienen traducidas en `instruction_steps.es`).
- **`BODY_PART_ES`, `EQUIPO_ES`, `MUSCULO_ES`** — diccionarios de traducción de grupo muscular, equipo y músculos.
- **`PRINCIPIOS`, `TRANSVERSAL`** — textos de la guía general (principios, caminata, alimentación, seguimiento).

Para **editar la rutina** (cambiar ejercicios, días, series): editar `VERSIONES` / `PHASES` /
`NOMBRES_ES` en `scripts/build-routine.mjs` y volver a correr:

```bash
node scripts/build-routine.mjs
```

Requiere que exista `dataset-fuente/` (ver §4). Si un id de ejercicio no está en el dataset, el
script lanza `Error: Ejercicio no encontrado en el dataset: id=XXXX`.

---

## 4. `dataset-fuente/` — está IGNORADO por git (no viaja al clonar)

`.gitignore` contiene:
```
dataset-fuente/
Thumbs.db
.DS_Store
```

`dataset-fuente/` es un **clon del dataset público de ejercicios**:
- **Origen:** `https://github.com/hasaneyldrm/exercises-dataset.git` (licencia MIT + términos de media).
- **Contenido:** 1324 ejercicios en `data/exercises.json`, 1324 GIFs de animación (en `videos/`), 1324 miniaturas 180×180 (en `images/`), con instrucciones paso a paso en 10 idiomas (incluye español).
- El campo `gif_url` de cada ejercicio apunta al GIF dentro del dataset; el script lo copia a `assets/exercises/`.

### Para recuperarlo en la nueva sesión
```bash
cd cambioFisc
git clone https://github.com/hasaneyldrm/exercises-dataset.git dataset-fuente
node scripts/build-routine.mjs   # regenera data/routine.js y los GIFs
```

> **No hace falta** el dataset solo para *ver/servir* el sitio (los GIFs usados y `data/routine.js`
> ya están commiteados). Solo se necesita para **regenerar/editar** la rutina.

---

## 5. Skills usados — SIN trackear y NO ignorados ⚠️

Punto importante para el traspaso: `.claude/`, `.agents/` y `skills-lock.json` aparecen como
**untracked** en `git status` pero **no** están en `.gitignore`. Es decir: **al clonar el repo
desde GitHub en la otra cuenta, los skills NO llegan** (no están commiteados). Por eso quedan
documentados aquí.

- **`.agents/skills/<skill>/`** — contenido real de cada skill (archivos `.md`).
- **`.claude/skills/<skill>`** — **symlinks** que apuntan a `.agents/skills/<skill>` (así es como Claude Code los descubre).
- **`skills-lock.json`** — lockfile con el origen y hash de cada skill.

### Skill 1 — `make-interfaces-feel-better`
- **Origen (`skills-lock.json`):** GitHub `jakubkrehel/make-interfaces-feel-better`, path `skills/make-interfaces-feel-better/SKILL.md`.
- **Qué es:** principios de ingeniería de diseño para pulir interfaces (radios concéntricos, alineación óptica, sombras en vez de bordes, animaciones interrumpibles/escalonadas, font smoothing, números tabulares, contornos en imágenes, scale-on-press, áreas táctiles ≥44px, nunca `transition: all`, etc.).
- **Archivos:** `SKILL.md` + `typography.md`, `surfaces.md`, `animations.md`, `performance.md`.
- **Se usó para:** la sesión de mejoras de interfaz para mobile (ver §7). Este skill fue la guía directa de esa iteración.

### Skill 2 — `strength-and-conditioning`
- **Origen (`skills-lock.json`):** GitHub `Tibsfox/gsd-skill-creator`, path `examples/skills/physical-education/strength-and-conditioning/SKILL.md`.
- **Qué es:** principios de fuerza, potencia y acondicionamiento (las siete adaptaciones clásicas de fuerza, modalidades de entrenamiento de resistencia, modelos de periodización, progresión por edad, prevención de lesiones).
- **Relevancia:** respaldo de dominio para el diseño de la rutina (fases, progresión ≤10%/semana, roles de ejercicio).

### Para re-instalar los skills en la nueva cuenta
Los datos de origen están en `skills-lock.json`. Reobtenerlos desde sus repos:
```bash
# make-interfaces-feel-better
#   github.com/jakubkrehel/make-interfaces-feel-better → skills/make-interfaces-feel-better/
# strength-and-conditioning
#   github.com/Tibsfox/gsd-skill-creator → examples/skills/physical-education/strength-and-conditioning/
```
Colocar cada skill en `.agents/skills/<nombre>/` y (opcional) recrear los symlinks en
`.claude/skills/<nombre>`. Alternativamente, usar el mecanismo de instalación de skills de Claude
Code apuntando a esos mismos orígenes.

> **Recomendación:** si quieres que los skills viajen con el repo, considera **commitear**
> `.agents/`, `.claude/` (o al menos `skills-lock.json`) — hoy no están commiteados.

---

## 6. Cómo desarrollar, probar y desplegar

### Ver el sitio localmente
No requiere build del front. Cualquiera de estas opciones:
```bash
# Servidor estático simple (recomendado, evita problemas de rutas/CORS con file://)
python -m http.server 8123
# luego abrir http://localhost:8123/
```
También se puede abrir `index.html` directo en el navegador (funciona porque todo es relativo).

### Probar en viewport mobile
El sitio está optimizado para mobile (es donde se usa). Para verificar en un ancho de teléfono
se puede renderizar con Chrome headless, p. ej.:
```bash
chrome --headless=new --screenshot=out.png --window-size=390,844 --hide-scrollbars \
       --virtual-time-budget=4000 http://localhost:8123/
```
(390×844 ≈ iPhone.) O usar las DevTools del navegador en modo responsive.

### Regenerar datos
```bash
node scripts/build-routine.mjs   # necesita dataset-fuente/ presente
```

### Desplegar
GitHub Pages sirve desde `main`. Basta con:
```bash
git add ...
git commit -m "..."
git push        # Pages se actualiza en ~1-2 min
```
Si al abrir en el móvil se ve la versión vieja, forzar recarga / abrir en incógnito (caché).

---

## 7. Historial de trabajo

### Commits en `main`
1. **`bcc1842` — Sitio inicial de la rutina de fuerza.** Estructura completa: `index.html`, `styles.css`, `app.js`, `data/routine.js`, `scripts/build-routine.mjs`, los 37 GIFs, `.gitignore`, `.nojekyll`.
2. **`b5b8cbc` — Traducir músculos secundarios faltantes al español.** Ampliación de `MUSCULO_ES` en el script + regeneración de `routine.js`.
3. **`70ee7d5` — Mejorar la interfaz para uso móvil.** Ver detalle abajo.

### Sesión "Mejorar la interfaz para uso móvil" (commit `70ee7d5`)
Iteración guiada por el skill `make-interfaces-feel-better`, enfocada en que el sitio se sienta
bien **en el teléfono** (que es donde el usuario lo usa durante el entrenamiento). Cambios:

- **Barra de días sticky:** de los 3 selectores que antes eran sticky, ahora **solo las pestañas de día** quedan fijas arriba (lo único que se toca durante la sesión), con fondo translúcido + `backdrop-filter: blur` y sombra que aparece solo al pegarse (vía `IntersectionObserver` sobre un sentinel).
- **Áreas táctiles ≥44px:** píldoras, toggle de tema y el summary "Ver instrucciones".
- **Scale-on-press (`scale(0.96)`)** en botones/píldoras y toggle; `:hover` solo dentro de `@media (hover: hover)` para evitar hover pegajoso en táctil.
- **Scroll horizontal de píldoras** de borde a borde de la pantalla (márgenes negativos + `overscroll-behavior-x: contain`) y **centrado automático** de la pestaña del día activo.
- **Radios concéntricos** en las tarjetas de ejercicio (20px = imagen 6px + padding 14px) y **contorno sutil** en los GIFs (`--img-outline`: negro 0.1 en claro / blanco 0.1 en oscuro).
- **Números tabulares** y más grandes en series/reps/descanso y en el contador de ejercicios.
- **Animación de entrada escalonada** de las tarjetas (fade + `translateY(8px)`, retraso de 45ms por tarjeta, tope 315ms), envuelta en `prefers-reduced-motion: no-preference`.
- **Chevron propio** animado en el `<details>` de instrucciones (rota con `cubic-bezier(0.2,0,0,1)`).
- **`theme-color`** (metas claro/oscuro) sincronizado por JS al alternar tema, para teñir la barra del navegador móvil.
- **Tipografía:** `-webkit-font-smoothing: antialiased`, `text-wrap: balance` en h1-h3, `text-wrap: pretty` en párrafos, `text-size-adjust: 100%`, `-webkit-tap-highlight-color: transparent`.
- **Bugs corregidos de paso:**
  - La pestaña de día activa **no se actualizaba** al cambiar de día (solo se re-renderizaba el contenido) → ahora re-renderiza las pestañas y centra la activa.
  - Cambiar de día estando abajo dejaba a mitad de la lista → scroll suave al inicio del día.
  - `localStorage` con versión/fase/día inexistente rompía el render → se **sanea el estado** en `renderAll()`.
  - A ≥640px la columna de imagen era 120px pero la imagen seguía en 96px → ahora 120×120.

---

## 8. Sistema de temas (claro/oscuro)

- Definido con **CSS custom properties** en `:root`, `:root[data-theme="dark"]` y un bloque
  `@media (prefers-color-scheme: dark)` para respetar la preferencia del sistema cuando no hay
  override manual.
- El toggle (botón `#theme-toggle`, esquina superior derecha) guarda la elección en
  `localStorage` (`rutina-eric-theme`) y alterna `data-theme` en `<html>`.
- `applyTheme()` en `app.js` también actualiza los `<meta name="theme-color">` para el navegador móvil.

---

## 9. Convenciones y notas para retomar

- **Estilo de código:** JS ES5-ish dentro de una IIFE con `'use strict'`, sin dependencias. Helper `el(tag, attrs, children)` para crear DOM. Mantener ese estilo si se amplía `app.js`.
- **No editar `data/routine.js` a mano** — regenerar desde el script.
- **Los GIFs** en `assets/exercises/` están commiteados; solo se agregan nuevos al usar nuevos ids en el script (que los copia desde el dataset).
- **Windows / Git:** el repo se trabaja en Windows; git avisa `LF will be replaced by CRLF` — es esperado, no rompe nada.
- **Atribución (footer):** datos de ejercicios de `hasaneyldrm/exercises-dataset` (MIT); GIFs © Gym Visual (gymvisual.com), uso personal. Mantener el crédito.
```
