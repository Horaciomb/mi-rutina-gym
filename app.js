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
  var THEME_COLORS = { light: '#f6f7f9', dark: '#14161a' };

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'dark' || theme === 'light') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    // Sincroniza el color de la barra del navegador móvil con el tema efectivo.
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      var scheme = (m.media || '').indexOf('dark') !== -1 ? 'dark' : 'light';
      m.setAttribute('content', THEME_COLORS[theme || scheme]);
    });
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
    var b = el('button', { class: 'pill' + (active ? ' active' : ''), type: 'button' }, []);
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  var ROL_LABEL = { principal: 'Principal', accesorio: 'Accesorio', core: 'Core' };

  function exerciseCard(ex) {
    var fase = ex.fases[state.fase];
    var card = el('div', { class: 'exercise-card' }, [
      el('div', { class: 'media' }, [
        el('img', { src: ex.gif, alt: ex.nombre, loading: 'lazy', decoding: 'async' }, [])
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

  function renderDayTabs(smoothCenter) {
    var container = document.getElementById('day-tabs');
    container.innerHTML = '';
    var version = ROUTINE_DATA.versiones[state.version];
    version.dias.forEach(function (dia, idx) {
      container.appendChild(pill(dia.nombre, state.diaIndex === idx, function () {
        if (state.diaIndex === idx) return;
        state.diaIndex = idx;
        saveState();
        renderDayTabs(true);
        renderDay();
        scrollToDayStart();
      }));
    });
    centerActiveDayTab(container, smoothCenter);
  }

  // Centra la pestaña del día activo dentro de la barra scrolleable.
  function centerActiveDayTab(container, smooth) {
    var active = container.querySelector('.pill.active');
    if (!active || !container.scrollTo) return;
    var target = active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2;
    container.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Al cambiar de día estando avanzado en la lista, vuelve al inicio del día.
  function scrollToDayStart() {
    var focus = document.getElementById('day-focus');
    var bar = document.querySelector('.day-bar');
    var top = focus.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetHeight : 0) - 8;
    if (window.scrollY > top) {
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    }
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
    dia.ejercicios.forEach(function (ex, idx) {
      var card = exerciseCard(ex);
      card.style.setProperty('--i', idx); // retraso de la animación escalonada
      grid.appendChild(card);
    });
  }

  function renderSubtitle() {
    var version = ROUTINE_DATA.versiones[state.version];
    document.getElementById('version-subtitle').textContent = version.subtitulo;
  }

  function renderAll() {
    // Sanea estado guardado que ya no exista en los datos.
    var version = ROUTINE_DATA.versiones[state.version];
    if (!version) {
      state.version = Object.keys(ROUTINE_DATA.versiones)[0];
      version = ROUTINE_DATA.versiones[state.version];
    }
    if (state.diaIndex >= version.dias.length) state.diaIndex = 0;
    if (!ROUTINE_DATA.fases.some(function (f) { return f.key === state.fase; })) {
      state.fase = ROUTINE_DATA.fases[0].key;
    }

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

  // Sombra en la barra de días solo cuando está pegada arriba.
  function initStickyBar() {
    var sentinel = document.querySelector('.day-bar-sentinel');
    var bar = document.querySelector('.day-bar');
    if (!sentinel || !bar || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    renderAll();
    renderGuide();
    initStickyBar();
  });
})();
