# Rutina de Horacio — Fuerza y Recomposición Corporal

Sitio web **estático** con una rutina de gimnasio personalizada de **8 semanas** para
recomposición corporal. Sin framework ni bundler: HTML + CSS + JavaScript vanilla, publicado con
**GitHub Pages**. Diseñado para usarse **desde el teléfono** durante el entrenamiento.

## ✨ Características

- **Dos calendarios** intercambiables: Lunes-Viernes (5 días, Empuje/Tirón/Piernas) y Lunes-Sábado (6 días, Push/Pull/Legs ×2).
- **Tres fases** de progresión (Técnica → Hipertrofia base → Fuerza/Hipertrofia) que ajustan series, reps y descanso automáticamente.
- **GIF animado, músculos e instrucciones** paso a paso por ejercicio (en español).
- **Tema claro/oscuro** con respeto por la preferencia del sistema; recuerda tu elección.
- **Guía general**: principios de entrenamiento, caminata diaria, alimentación y seguimiento.
- Estado (calendario, fase y día) guardado en `localStorage`.

## 🗂️ Estructura

```
├── index.html              # Estructura de la página (vista única)
├── styles.css              # Estilos + temas claro/oscuro (CSS custom properties)
├── app.js                  # Render, estado en localStorage, tema, barra de días sticky
├── data/routine.js         # ★ GENERADO — const ROUTINE_DATA con la rutina resuelta
├── assets/exercises/*.gif  # ★ GENERADO — GIFs de los ejercicios usados
├── scripts/build-routine.mjs   # Genera routine.js y copia los GIFs desde el dataset
├── dataset-fuente/         # ⛔ Ignorado por git — fuente de datos (ver abajo)
└── CONTEXTO-PROYECTO.md    # Documento de traspaso con el contexto completo
```

## 🚀 Uso local

No requiere build del front. Levanta un servidor estático:

```bash
python -m http.server 8123
# abre http://localhost:8123/
```

## 🔧 Regenerar los datos de la rutina

`data/routine.js` y los GIFs se **generan** a partir del dataset fuente. La rutina (qué ejercicio
va en cada día, roles y parámetros por fase) se define en `scripts/build-routine.mjs`.

```bash
# 1. Obtener el dataset fuente (ignorado por git)
git clone https://github.com/hasaneyldrm/exercises-dataset.git dataset-fuente

# 2. Regenerar data/routine.js + copiar los GIFs usados
node scripts/build-routine.mjs
```

> Solo necesitas el dataset para **editar/regenerar** la rutina. Para ver o servir el sitio no
> hace falta: los GIFs usados y `data/routine.js` ya están versionados.

## 📦 Despliegue

GitHub Pages sirve desde la rama `main`. Al hacer `push` a `main`, el sitio se actualiza en 1-2 min.

## 📚 Más contexto

Para retomar el proyecto (flujo de datos, skills usados, decisiones de diseño e historial de
trabajo) revisa **[`CONTEXTO-PROYECTO.md`](CONTEXTO-PROYECTO.md)**.

## 🙏 Créditos

- Datos de ejercicios e instrucciones: [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset) (MIT).
- GIFs e imágenes © [Gym Visual](https://gymvisual.com/) — uso personal.
