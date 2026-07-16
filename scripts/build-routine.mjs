// Construye data/routine.js y assets/exercises/* a partir de dataset-fuente/data/exercises.json
// Uso: node scripts/build-routine.mjs

import { readFileSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATASET_DIR = path.join(ROOT, 'dataset-fuente');
const EXERCISES = JSON.parse(readFileSync(path.join(DATASET_DIR, 'data', 'exercises.json'), 'utf-8'));
const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

// --- Parametros de series/reps/descanso por fase y rol del ejercicio -------
const PHASES = [
  {
    key: 'fase1_tecnica',
    nombre: 'Fase 1 · Semanas 1-2 — Técnica',
    resumen: 'Prioridad absoluta a la forma. Carga ligera-moderada: debes poder hacer 2-3 reps más de las indicadas con buena técnica.',
    params: {
      principal: { series: '3', reps: '12-15', descanso: '60 seg' },
      accesorio: { series: '3', reps: '12-15', descanso: '60 seg' },
      core: { series: '3', reps: '30-40 seg' },
    },
  },
  {
    key: 'fase1_hipertrofia',
    nombre: 'Fase 1 · Semanas 3-4 — Hipertrofia base',
    resumen: 'Sube la carga 5-10% vs. semana anterior solo si completaste todas las series con buena técnica.',
    params: {
      principal: { series: '3-4', reps: '10-12', descanso: '75 seg' },
      accesorio: { series: '3', reps: '10-12', descanso: '75 seg' },
      core: { series: '3', reps: '35-45 seg' },
    },
  },
  {
    key: 'fase2_fuerza',
    nombre: 'Fase 2 · Semanas 5-8 — Fuerza / Hipertrofia',
    resumen: 'Progresión máxima 10%/semana. Si no llegas al rango de reps con buena forma, no subas peso esa semana.',
    params: {
      principal: { series: '4', reps: '8-10', descanso: '90-120 seg' },
      accesorio: { series: '3', reps: '12-15', descanso: '60-75 seg' },
      core: { series: '3', reps: '40-60 seg' },
    },
  },
];

const PRINCIPIOS = [
  'Técnica antes que carga: domina el patrón con peso ligero-moderado antes de subir kilos.',
  'Progresión máxima de 10% de carga por semana — el tejido se adapta más lento que el sistema nervioso.',
  'Calentamiento de 10 minutos antes de cada sesión: 5 min de cardio suave (cinta/elíptica) + movilidad de hombro, cadera y tobillo.',
  'Trabajo unilateral (una pierna/brazo) en cada sesión para corregir desequilibrios entre lados.',
  'Nunca sacrifiques la forma por el peso — nada de "ego lifting".',
  'Semana 8: retest de peso corporal, cargas en los ejercicios principales, cintura y fotos, antes de repetir el ciclo.',
];

const TRANSVERSAL = {
  caminata: {
    meta: '8,000–10,000 pasos diarios (registra con tu iWatch).',
    notas: [
      'Caminata corta de 10-15 min después del almuerzo — 100% controlable aunque no controles el menú de la oficina.',
      'Caminata corta de 10-15 min después de la cena.',
    ],
  },
  alimentacion: [
    { comida: 'Desayuno', nota: 'Té + huevo revuelto. Si entrenas en ayunas por la mañana, deja el desayuno completo para después del entrenamiento y toma solo café solo o una fruta antes.' },
    { comida: 'Almuerzo (oficina)', nota: 'No controlas el menú, pero sí: sirve proteína y vegetales primero, no repitas plato, evita la soda (ya lo haces), elige a la plancha en vez de frito cuando haya opción.' },
    { comida: 'Cena', nota: 'Té + huevo revuelto funciona bien; agrega vegetales (espinaca, tomate, cebolla en el huevo, o ensalada aparte) para fibra y saciedad. Si entrenas de noche, es un buen post-entreno por su proteína.' },
    { comida: 'General', nota: 'Mantén el control de frituras, quesos y grasas extra. Hidrátate bien durante el día.' },
  ],
  seguimiento: [
    'Pésate 1x/semana, misma hora del día.',
    'Mide cintura cada 2 semanas.',
    'Fotos de progreso 1x/mes.',
    'Anota las cargas usadas en cada ejercicio para poder progresar 5-10%/semana.',
  ],
  metaPlazo: 'Ritmo realista de pérdida de peso: 0.5–0.75 kg/semana → unas 13-20 semanas para los 10kg, sin sacrificar músculo gracias al entrenamiento de fuerza.',
};

// --- Definición de la rutina: qué ejercicio (id real del dataset) va en cada día ---
// rol: 'principal' | 'accesorio' | 'core' -> determina series/reps/descanso vía PHASES
const dia = (nombre, enfoque, ejercicios) => ({ nombre, enfoque, ejercicios });
const ej = (id, rol, nota) => ({ id, rol, nota });

const VERSIONES = {
  LV: {
    nombre: 'Lunes a Viernes',
    subtitulo: '5 días — split Empuje / Tirón / Piernas',
    dias: [
      dia('Lunes', 'Piernas — cuádriceps dominante', [
        ej('1760', 'principal'),
        ej('0760', 'principal'),
        ej('0336', 'accesorio'),
        ej('0585', 'accesorio'),
        ej('0417', 'accesorio'),
        ej('0464', 'core'),
      ]),
      dia('Martes', 'Empuje — pecho / hombro / tríceps', [
        ej('0025', 'principal'),
        ej('0314', 'principal'),
        ej('0405', 'principal'),
        ej('0334', 'accesorio'),
        ej('0241', 'accesorio'),
        ej('0129', 'accesorio'),
      ]),
      dia('Miércoles', 'Tirón — espalda / bíceps (día prioritario)', [
        ej('2330', 'principal'),
        ej('0027', 'principal'),
        ej('0861', 'principal'),
        ej('0203', 'accesorio', 'Sustituto de face pull: prioriza el aprieto escapular arriba.'),
        ej('0031', 'accesorio'),
        ej('0313', 'accesorio'),
      ]),
      dia('Jueves', 'Piernas — posterior dominante (glúteo/isquios)', [
        ej('1459', 'principal'),
        ej('1409', 'principal'),
        ej('0586', 'accesorio'),
        ej('0410', 'accesorio'),
        ej('0594', 'accesorio'),
      ]),
      dia('Viernes', 'Refuerzo — espalda + brazos + core', [
        ej('0293', 'principal'),
        ej('0606', 'principal'),
        ej('0285', 'accesorio'),
        ej('2188', 'accesorio'),
        ej('0687', 'core'),
        ej('3544', 'core'),
      ]),
    ],
  },
  LS: {
    nombre: 'Lunes a Sábado',
    subtitulo: '6 días — Push / Pull / Legs x2',
    dias: [
      dia('Lunes', 'Push A — pecho / hombro / tríceps', [
        ej('0025', 'principal'),
        ej('0405', 'principal'),
        ej('0334', 'accesorio'),
        ej('0241', 'accesorio'),
        ej('0129', 'accesorio'),
      ]),
      dia('Martes', 'Pull A — espalda / bíceps', [
        ej('2330', 'principal'),
        ej('0027', 'principal'),
        ej('0203', 'accesorio', 'Sustituto de face pull: prioriza el aprieto escapular arriba.'),
        ej('0031', 'accesorio'),
        ej('0313', 'accesorio'),
      ]),
      dia('Miércoles', 'Legs A — cuádriceps dominante', [
        ej('1760', 'principal'),
        ej('0760', 'principal'),
        ej('0585', 'accesorio'),
        ej('0417', 'accesorio'),
        ej('0464', 'core'),
      ]),
      dia('Jueves', 'Push B — variantes distintas', [
        ej('0047', 'principal'),
        ej('0289', 'principal'),
        ej('0178', 'accesorio'),
        ej('2188', 'accesorio'),
        ej('1399', 'accesorio'),
      ]),
      dia('Viernes', 'Pull B — énfasis espalda alta/dorsales', [
        ej('0861', 'principal'),
        ej('0606', 'principal'),
        ej('0651', 'principal', 'Si aún no puedes hacer dominadas completas, usa la máquina asistida o banda.'),
        ej('0095', 'accesorio'),
        ej('0285', 'accesorio'),
      ]),
      dia('Sábado', 'Legs B — posterior dominante + core', [
        ej('0085', 'principal'),
        ej('1409', 'principal'),
        ej('0586', 'accesorio'),
        ej('0410', 'accesorio'),
        ej('0687', 'core'),
        ej('3544', 'core'),
      ]),
    ],
  },
};

// El dataset solo trae el nombre en inglés (el campo `name`); las instrucciones sí
// vienen traducidas. Se mantiene un mapa manual de nombres en español para mostrar.
const NOMBRES_ES = {
  '1760': 'Sentadilla goblet con mancuerna',
  '0760': 'Prensa de piernas en máquina Smith',
  '0336': 'Zancada con mancuernas',
  '0585': 'Extensión de cuádriceps en máquina',
  '0417': 'Elevación de talones de pie con mancuerna',
  '0464': 'Plancha frontal con giro',
  '0025': 'Press de banca con barra',
  '0314': 'Press inclinado con mancuerna',
  '0405': 'Press militar sentado con mancuerna',
  '0334': 'Elevación lateral con mancuerna',
  '0241': 'Extensión de tríceps en polea (barra V)',
  '0129': 'Fondos en banco (rodillas flexionadas)',
  '2330': 'Jalón al pecho en polea (rango completo)',
  '0027': 'Remo con barra inclinado',
  '0861': 'Remo sentado en polea',
  '0203': 'Remo para deltoide posterior con cuerda (face pull)',
  '0031': 'Curl de bíceps con barra',
  '0313': 'Curl martillo con mancuerna',
  '1459': 'Peso muerto rumano con mancuernas',
  '1409': 'Puente de glúteo con barra',
  '0586': 'Curl femoral tumbado en máquina',
  '0410': 'Zancada dividida a una pierna con mancuerna (estilo búlgaro)',
  '0594': 'Elevación de talones sentado en máquina',
  '0293': 'Remo con mancuerna inclinado',
  '0606': 'Remo en máquina T-bar',
  '0285': 'Curl de bíceps alterno con mancuerna',
  '2188': 'Extensión de tríceps sentado con mancuerna',
  '0687': 'Giro ruso',
  '3544': 'Plancha lateral inclinada',
  '0047': 'Press de banca inclinado con barra',
  '0289': 'Press de banca con mancuernas',
  '0178': 'Elevación lateral en polea',
  '1399': 'Fondos en el suelo (tríceps)',
  '0651': 'Dominada con agarre neutro',
  '0095': 'Encogimiento de hombros con barra',
  '0085': 'Peso muerto rumano con barra',
};

const BODY_PART_ES = {
  back: 'Espalda', cardio: 'Cardio', chest: 'Pecho', 'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas', neck: 'Cuello', shoulders: 'Hombros',
  'upper arms': 'Brazos', 'upper legs': 'Piernas', waist: 'Core / Abdomen',
};
const EQUIPO_ES = {
  'body weight': 'Peso corporal', dumbbell: 'Mancuerna', barbell: 'Barra',
  cable: 'Polea / cable', 'leverage machine': 'Máquina de palanca',
  'smith machine': 'Máquina Smith', kettlebell: 'Kettlebell', band: 'Banda elástica',
};
const MUSCULO_ES = {
  quads: 'cuádriceps', quadriceps: 'cuádriceps', glutes: 'glúteos', hamstrings: 'isquiotibiales',
  calves: 'pantorrillas', pectorals: 'pectorales', chest: 'pecho', delts: 'deltoides',
  'rear deltoids': 'deltoides posteriores', shoulders: 'hombros', triceps: 'tríceps', biceps: 'bíceps',
  lats: 'dorsales', 'upper back': 'espalda alta', 'lower back': 'espalda baja', forearms: 'antebrazos',
  abs: 'abdominales', obliques: 'oblicuos', traps: 'trapecios', trapezius: 'trapecios',
  rhomboids: 'romboides', spine: 'espalda baja', adductors: 'aductores', abductors: 'abductores',
  soleus: 'sóleo', ankles: 'tobillos', 'ankle stabilizers': 'estabilizadores del tobillo',
};
const traducirMusculo = (m) => MUSCULO_ES[m] || m;

// --- Resolución contra el dataset + copia de assets -------------------------
const ASSETS_DIR = path.join(ROOT, 'assets', 'exercises');
mkdirSync(ASSETS_DIR, { recursive: true });

const resolvedCache = new Map();
function resolveExercise(id) {
  if (resolvedCache.has(id)) return resolvedCache.get(id);
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Ejercicio no encontrado en el dataset: id=${id}`);

  const gifSrc = path.join(DATASET_DIR, e.gif_url);
  const gifFile = path.basename(e.gif_url);
  const gifDest = path.join(ASSETS_DIR, gifFile);
  if (!existsSync(gifDest)) copyFileSync(gifSrc, gifDest);

  const resolved = {
    id: e.id,
    nombre: NOMBRES_ES[e.id] || e.name,
    nombre_en: e.name,
    gif: `assets/exercises/${gifFile}`,
    grupo_muscular: BODY_PART_ES[e.body_part] || e.body_part,
    musculo_objetivo: traducirMusculo(e.target),
    musculos_secundarios: e.secondary_muscles.map(traducirMusculo),
    equipo: EQUIPO_ES[e.equipment] || e.equipment,
    instrucciones: e.instruction_steps.es && e.instruction_steps.es.length
      ? e.instruction_steps.es
      : (e.instructions.es ? [e.instructions.es] : e.instruction_steps.en),
    atribucion: e.attribution,
  };
  resolvedCache.set(id, resolved);
  return resolved;
}

function buildVersion(version) {
  return {
    nombre: version.nombre,
    subtitulo: version.subtitulo,
    dias: version.dias.map((d) => ({
      nombre: d.nombre,
      enfoque: d.enfoque,
      ejercicios: d.ejercicios.map((slot) => {
        const base = resolveExercise(slot.id);
        const fases = {};
        for (const fase of PHASES) {
          fases[fase.key] = fase.params[slot.rol];
        }
        return { ...base, rol: slot.rol, nota: slot.nota || null, fases };
      }),
    })),
  };
}

const routineData = {
  fases: PHASES.map(({ key, nombre, resumen }) => ({ key, nombre, resumen })),
  principios: PRINCIPIOS,
  transversal: TRANSVERSAL,
  versiones: {
    LV: buildVersion(VERSIONES.LV),
    LS: buildVersion(VERSIONES.LS),
  },
};

const outDir = path.join(ROOT, 'data');
mkdirSync(outDir, { recursive: true });
const jsOut = `// Generado por scripts/build-routine.mjs — no editar a mano.\nconst ROUTINE_DATA = ${JSON.stringify(routineData, null, 2)};\n`;
writeFileSync(path.join(outDir, 'routine.js'), jsOut, 'utf-8');

console.log(`OK: ${resolvedCache.size} ejercicios únicos resueltos y copiados a assets/exercises/`);
console.log(`OK: data/routine.js generado (${jsOut.length} bytes)`);
