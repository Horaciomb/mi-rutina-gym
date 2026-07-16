(function () {
  'use strict';

  var STORAGE_KEY = 'rutina-eric-state-v1';
  var THEME_KEY = 'rutina-eric-theme';

  var state = Object.assign(
    { version: 'LV', fase: 'fase1_tecnica', diaIndex: 0 },
    readState()
  );

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // --- Tema ---------------------------------------------------------------
  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'dark' || theme === 'light') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved);
    var btn = document.getElementById('theme-toggle');
    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var effectiveIsDark = current ? current === 'dark' : prefersDark;
      var next = effectiveIsDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  // --- Helpers de render ----------------------------------------------------
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c) e.appendChild(c);
    });
    return e;
  }

  function pill(label, active, onClick) {
    var b = el('button', { class: 'pill' + (active ? ' active' : '') }, []);
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  var ROL_LABEL = { principal: 'Principal', accesorio: 'Accesorio', core: 'Core' };

  function exerciseCard(ex) {
    var fase = ex.fases[state.fase];
    var card = el('div', { class: 'exercise-card' }, [
      el('div', { class: 'media' }, [
        el('img', { src: ex.gif, alt: ex.nombre, loading: 'lazy' }, [])
      ]),
      buildInfo(ex, fase)
    ]);
    return card;
  }

  function buildInfo(ex, fase) {
    var info = el('div', { class: 'info' }, []);
    info.appendChild(el('h3', { text: ex.nombre }, []));

    var chips = el('div', { class: 'chip-row' }, [
      el('span', { class: 'chip rol-' + ex.rol, text: ROL_LABEL[ex.rol] }, []),
      el('span', { class: 'chip muted', text: ex.grupo_muscular + ' · ' + ex.musculo_objetivo }, []),
      el('span', { class: 'chip muted', text: ex.equipo }, [])
    ]);
    info.appendChild(chips);

    var setsRow = el('div', { class: 'sets-row' }, []);
    if (ex.rol === 'core') {
      setsRow.appendChild(setStat('Series', fase.series));
      setsRow.appendChild(setStat('Duración', fase.reps));
    } else {
      setsRow.appendChild(setStat('Series', fase.series));
      setsRow.appendChild(setStat('Reps', fase.reps));
      setsRow.appendChild(setStat('Descanso', fase.descanso));
    }
    info.appendChild(setsRow);

    if (ex.nota) {
      info.appendChild(el('p', { class: 'note', text: '💡 ' + ex.nota }, []));
    }

    if (ex.musculos_secundarios && ex.musculos_secundarios.length) {
      info.appendChild(el('p', {
        class: 'secondary-muscles',
        text: 'También trabaja: ' + ex.musculos_secundarios.join(', ')
      }, []));
    }

    var details = el('details', { class: 'instructions' }, []);
    var summary = el('summary', { text: 'Ver instrucciones' }, []);
    details.appendChild(summary);
    var ol = el('ol', {}, []);
    ex.instrucciones.forEach(function (step) {
      ol.appendChild(el('li', { text: step }, []));
    });
    details.appendChild(ol);
    info.appendChild(details);

    return info;
  }

  function setStat(label, value) {
    var wrap = el('div', {}, []);
    wrap.appendChild(el('span', { class: 'label', text: label }, []));
    wrap.appendChild(el('strong', { text: value }, []));
    return wrap;
  }

  // --- Render principal -----------------------------------------------------
  function renderVersionPills() {
    var container = document.getElementById('version-pills');
    container.innerHTML = '';
    Object.keys(ROUTINE_DATA.versiones).forEach(function (key) {
      var v = ROUTINE_DATA.versiones[key];
      container.appendChild(pill(v.nombre, state.version === key, function () {
        state.version = key;
        state.diaIndex = 0;
        saveState();
        renderAll();
      }));
    });
  }

  function renderFasePills() {
    var container = document.getElementById('fase-pills');
    container.innerHTML = '';
    ROUTINE_DATA.fases.forEach(function (f) {
      var shortLabel = f.nombre.split('—')[1] ? f.nombre.split('—')[1].trim() : f.nombre;
      container.appendChild(pill(shortLabel, state.fase === f.key, function () {
        state.fase = f.key;
        saveState();
        renderAll();
      }));
    });
  }

  function renderDayTabs() {
    var container = document.getElementById('day-tabs');
    container.innerHTML = '';
    var version = ROUTINE_DATA.versiones[state.version];
    version.dias.forEach(function (dia, idx) {
      container.appendChild(pill(dia.nombre, state.diaIndex === idx, function () {
        state.diaIndex = idx;
        saveState();
        renderDay();
      }));
    });
  }

  function renderPhaseBanner() {
    var faseInfo = ROUTINE_DATA.fases.find(function (f) { return f.key === state.fase; });
    var banner = document.getElementById('phase-banner');
    banner.innerHTML = '';
    banner.appendChild(el('h3', { text: faseInfo.nombre }, []));
    banner.appendChild(el('p', { text: faseInfo.resumen }, []));
  }

  function renderDay() {
    var version = ROUTINE_DATA.versiones[state.version];
    if (state.diaIndex >= version.dias.length) state.diaIndex = 0;
    var dia = version.dias[state.diaIndex];

    var focus = document.getElementById('day-focus');
    focus.innerHTML = '';
    focus.appendChild(el('h2', { text: dia.nombre + ' — ' + dia.enfoque }, []));
    focus.appendChild(el('span', { class: 'badge-count', text: dia.ejercicios.length + ' ejercicios' }, []));

    var grid = document.getElementById('exercise-grid');
    grid.innerHTML = '';
    dia.ejercicios.forEach(function (ex) {
      grid.appendChild(exerciseCard(ex));
    });
  }

  function renderSubtitle() {
    var version = ROUTINE_DATA.versiones[state.version];
    document.getElementById('version-subtitle').textContent = version.subtitulo;
  }

  function renderAll() {
    renderVersionPills();
    renderFasePills();
    renderSubtitle();
    renderDayTabs();
    renderPhaseBanner();
    renderDay();
  }

  // --- Guía general (estática, se pinta una sola vez) ------------------------
  function renderGuide() {
    var principiosList = document.getElementById('principios-list');
    ROUTINE_DATA.principios.forEach(function (p) {
      principiosList.appendChild(el('li', { text: p }, []));
    });

    var pasosCard = document.getElementById('pasos-content');
    pasosCard.appendChild(el('p', { class: 'meta-line', text: 'Meta: ' + ROUTINE_DATA.transversal.caminata.meta }, []));
    var pasosList = el('ul', {}, []);
    ROUTINE_DATA.transversal.caminata.notas.forEach(function (n) {
      pasosList.appendChild(el('li', { text: n }, []));
    });
    pasosCard.appendChild(pasosList);

    var alimentacionCard = document.getElementById('alimentacion-content');
    ROUTINE_DATA.transversal.alimentacion.forEach(function (a) {
      alimentacionCard.appendChild(el('p', {}, [
        (function () { var s = document.createElement('strong'); s.textContent = a.comida + ': '; return s; })(),
        document.createTextNode(a.nota)
      ]));
    });

    var seguimientoCard = document.getElementById('seguimiento-content');
    var seguimientoList = el('ul', {}, []);
    ROUTINE_DATA.transversal.seguimiento.forEach(function (s) {
      seguimientoList.appendChild(el('li', { text: s }, []));
    });
    seguimientoCard.appendChild(seguimientoList);
    seguimientoCard.appendChild(el('p', { class: 'meta-line', text: ROUTINE_DATA.transversal.metaPlazo }, []));
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    renderAll();
    renderGuide();
  });
})();
