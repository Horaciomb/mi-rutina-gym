(function () {
  'use strict';

  var firebaseConfig = {
    apiKey: 'AIzaSyBN8HsnTGJpG4gOjzImzfF3yq8H0gnrYiA',
    authDomain: 'rutina-app-eed1b.firebaseapp.com',
    databaseURL: 'https://rutina-app-eed1b-default-rtdb.firebaseio.com',
    projectId: 'rutina-app-eed1b',
    storageBucket: 'rutina-app-eed1b.firebasestorage.app',
    messagingSenderId: '911848717165',
    appId: '1:911848717165:web:565bcae01a15de9ce2b864',
  };

  var db = null;
  var uid = null;
  var chartInstance = null;

  // --- Helpers DOM (reusa el patrón de app.js) ---
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  // --- Firebase init ---
  function initFirebase() {
    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK no cargado — tracking deshabilitado');
        return false;
      }
      firebase.initializeApp(firebaseConfig);
      db = firebase.database();

      return firebase.auth().signInAnonymously().then(function (cred) {
        uid = cred.user.uid;
        console.log('Firebase auth OK, uid:', uid);
        return true;
      }).catch(function (err) {
        console.error('Firebase auth error:', err);
        return false;
      });
    } catch (err) {
      console.error('Firebase init error:', err);
      return Promise.resolve(false);
    }
  }

  // --- CRUD ---
  function saveEntry(exerciseId, data) {
    if (!db || !uid) return Promise.resolve();
    var key = today() + '_' + exerciseId;
    var entry = Object.assign({ exerciseId: exerciseId, date: today() }, data);
    return db.ref('users/' + uid + '/tracking/' + key).set(entry);
  }

  function getEntriesForDay(date, callback) {
    if (!db || !uid) { callback({}); return; }
    db.ref('users/' + uid + '/tracking').orderByChild('date').equalTo(date)
      .once('value').then(function (snap) { callback(snap.val() || {}); });
  }

  function getHistoryForExercise(exerciseId, callback) {
    if (!db || !uid) { callback([]); return; }
    db.ref('users/' + uid + '/tracking').orderByChild('exerciseId').equalTo(exerciseId)
      .once('value').then(function (snap) {
        var entries = [];
        snap.forEach(function (child) { entries.push(child.val()); });
        entries.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
        callback(entries);
      });
  }

  function getLastWeight(exerciseId, callback) {
    if (!db || !uid) { callback(null); return; }
    db.ref('users/' + uid + '/tracking').orderByChild('exerciseId').equalTo(exerciseId)
      .limitToLast(1).once('value').then(function (snap) {
        var val = snap.val();
        callback(val ? Object.values(val)[0].peso : null);
      });
  }

  // --- Tracker UI por tarjeta ---
  function buildTrackerSection(ex, fase) {
    var section = el('div', { class: 'tracker-section' }, []);

    if (ex.rol === 'core') {
      var completeRow = el('div', { class: 'tracker-complete-row' }, []);
      var cb = el('input', { type: 'checkbox', class: 'tracker-checkbox', id: 'cb-' + ex.id }, []);
      var lbl = el('label', { class: 'tracker-label', text: 'Completado', 'for': 'cb-' + ex.id }, []);
      completeRow.appendChild(cb);
      completeRow.appendChild(lbl);
      section.appendChild(completeRow);
      section.dataset.exerciseId = ex.id;
      section.dataset.fase = ex.fase;
      setupCoreEvents(section, ex);
      return section;
    }

    // Fila 1: peso + reps
    var row1 = el('div', { class: 'tracker-row' }, []);
    var pesoWrap = el('div', { class: 'tracker-field' }, [
      el('label', { class: 'tracker-field-label', text: 'Peso (kg)' }, []),
    ]);
    var pesoInput = el('input', {
      type: 'number', class: 'tracker-input', min: '0', step: '0.5',
      placeholder: '0', inputmode: 'decimal', 'data-field': 'peso'
    }, []);
    pesoWrap.appendChild(pesoInput);

    var repsWrap = el('div', { class: 'tracker-field' }, [
      el('label', { class: 'tracker-field-label', text: 'Reps' }, []),
    ]);
    var repsInput = el('input', {
      type: 'number', class: 'tracker-input', min: '0', step: '1',
      placeholder: fase.reps.split('-')[0] || '10', inputmode: 'numeric', 'data-field': 'reps'
    }, []);
    repsWrap.appendChild(repsInput);

    row1.appendChild(pesoWrap);
    row1.appendChild(repsWrap);

    // Fila 2: completado
    var row2 = el('div', { class: 'tracker-complete-row' }, []);
    var cb = el('input', { type: 'checkbox', class: 'tracker-checkbox', id: 'cb-' + ex.id }, []);
    var lbl = el('label', { class: 'tracker-label', text: 'Completado', 'for': 'cb-' + ex.id }, []);
    row2.appendChild(cb);
    row2.appendChild(lbl);

    // Status
    var status = el('span', { class: 'tracker-status', text: '' }, []);

    section.appendChild(row1);
    section.appendChild(row2);
    section.appendChild(status);
    section.dataset.exerciseId = ex.id;
    section.dataset.fase = ex.fase;

    // Eventos
    var saveTimeout;
    function scheduleSave() {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(function () { doSave(section, ex); }, 400);
    }

    pesoInput.addEventListener('input', scheduleSave);
    repsInput.addEventListener('input', scheduleSave);
    cb.addEventListener('change', function () {
      doSave(section, ex);
      var card = section.closest('.exercise-card');
      if (card) {
        card.classList.toggle('completed', cb.checked);
      }
    });

    return section;
  }

  function setupCoreEvents(section, ex) {
    var cb = section.querySelector('.tracker-checkbox');
    cb.addEventListener('change', function () {
      saveEntry(ex.id, {
        completado: cb.checked, peso: 0, reps: 0,
        version: window.__currentVersion || '', fase: window.__currentFase || ''
      });
      var card = section.closest('.exercise-card');
      if (card) card.classList.toggle('completed', cb.checked);
    });
  }

  function doSave(section, ex) {
    var pesoInput = section.querySelector('[data-field="peso"]');
    var repsInput = section.querySelector('[data-field="reps"]');
    var cb = section.querySelector('.tracker-checkbox');
    var status = section.querySelector('.tracker-status');
    var peso = parseFloat(pesoInput.value) || 0;
    var reps = parseInt(repsInput.value) || 0;
    var completado = cb.checked;

    saveEntry(ex.id, {
      peso: peso, reps: reps, completado: completado,
      version: window.__currentVersion || '', fase: window.__currentFase || ''
    }).then(function () {
      if (status) {
        status.textContent = 'Guardado';
        status.classList.add('visible');
        setTimeout(function () { status.classList.remove('visible'); }, 1500);
      }
    }).catch(function (err) {
      console.error('Error guardando:', err);
    });
  }

  // Carga datos del día para una tarjeta
  function loadDayDataForCard(section, date) {
    var exerciseId = section.dataset.exerciseId;
    if (!db || !uid || !exerciseId) return;

    var key = date + '_' + exerciseId;
    db.ref('users/' + uid + '/tracking/' + key).once('value').then(function (snap) {
      var entry = snap.val();
      if (entry) {
        var pesoInput = section.querySelector('[data-field="peso"]');
        var repsInput = section.querySelector('[data-field="reps"]');
        var cb = section.querySelector('.tracker-checkbox');
        if (pesoInput && entry.peso) pesoInput.value = entry.peso;
        if (repsInput && entry.reps) repsInput.value = entry.reps;
        if (cb) {
          cb.checked = !!entry.completado;
          var card = section.closest('.exercise-card');
          if (card) card.classList.toggle('completed', cb.checked);
        }
      } else {
        // Sin datos hoy → cargar último peso usado
        getLastWeight(exerciseId, function (w) {
          var pesoInput = section.querySelector('[data-field="peso"]');
          if (pesoInput && w) pesoInput.value = w;
        });
      }
    });
  }

  // --- Progress chart ---
  function buildProgressSection() {
    var section = el('div', { class: 'progress-section' }, []);

    var selectRow = el('div', { class: 'progress-select-row' }, [
      el('label', { class: 'tracker-field-label', text: 'Ejercicio' }, []),
    ]);
    var select = el('select', { class: 'progress-select', id: 'progress-exercise-select' }, []);
    select.appendChild(el('option', { value: '', text: 'Elegí un ejercicio...' }, []));
    selectRow.appendChild(select);
    section.appendChild(selectRow);

    var summaryRow = el('div', { class: 'progress-summary' }, [
      el('div', { class: 'progress-stat', id: 'progress-current' }, [
        el('span', { class: 'progress-stat-label', text: 'Último peso' }, []),
        el('span', { class: 'progress-stat-value', id: 'progress-current-val', text: '—' }, []),
      ]),
      el('div', { class: 'progress-stat', id: 'progress-sessions' }, [
        el('span', { class: 'progress-stat-label', text: 'Sesiones' }, []),
        el('span', { class: 'progress-stat-value', id: 'progress-sessions-val', text: '—' }, []),
      ]),
      el('div', { class: 'progress-stat', id: 'progress-change' }, [
        el('span', { class: 'progress-stat-label', text: 'Cambio' }, []),
        el('span', { class: 'progress-stat-value', id: 'progress-change-val', text: '—' }, []),
      ]),
    ]);
    section.appendChild(summaryRow);

    var chartWrap = el('div', { class: 'progress-chart-wrap' }, [
      el('canvas', { id: 'progress-chart' }, []),
    ]);
    section.appendChild(chartWrap);

    select.addEventListener('change', function () {
      loadExerciseProgress(select.value);
    });

    return section;
  }

  function populateExerciseDropdown() {
    var select = document.getElementById('progress-exercise-select');
    if (!select || !db || !uid) return;

    db.ref('users/' + uid + '/tracking').once('value').then(function (snap) {
      var seen = {};
      snap.forEach(function (child) {
        var entry = child.val();
        if (!seen[entry.exerciseId]) {
          seen[entry.exerciseId] = true;
          var nombre = getExerciseName(entry.exerciseId);
          var opt = el('option', { value: entry.exerciseId, text: nombre }, []);
          select.appendChild(opt);
        }
      });
    });
  }

  function getExerciseName(id) {
    if (typeof ROUTINE_DATA === 'undefined') return id;
    var versions = Object.keys(ROUTINE_DATA.versiones);
    for (var v = 0; v < versions.length; v++) {
      var dias = ROUTINE_DATA.versiones[versions[v]].dias;
      for (var d = 0; d < dias.length; d++) {
        var ejercicios = dias[d].ejercicios;
        for (var e = 0; e < ejercicios.length; e++) {
          if (ejercicios[e].id === id) return ejercicios[e].nombre;
        }
      }
    }
    return id;
  }

  function loadExerciseProgress(exerciseId) {
    var currentVal = document.getElementById('progress-current-val');
    var sessionsVal = document.getElementById('progress-sessions-val');
    var changeVal = document.getElementById('progress-change-val');
    if (!exerciseId) {
      if (currentVal) currentVal.textContent = '—';
      if (sessionsVal) sessionsVal.textContent = '—';
      if (changeVal) changeVal.textContent = '—';
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      return;
    }

    getHistoryForExercise(exerciseId, function (entries) {
      if (!entries.length) {
        if (currentVal) currentVal.textContent = '—';
        if (sessionsVal) sessionsVal.textContent = '0';
        if (changeVal) changeVal.textContent = '—';
        return;
      }

      var pesos = entries.map(function (e) { return e.peso || 0; }).filter(function (p) { return p > 0; });
      var last = pesos[pesos.length - 1] || 0;
      var first = pesos[0] || 0;
      var change = last - first;

      if (currentVal) currentVal.textContent = last + ' kg';
      if (sessionsVal) sessionsVal.textContent = entries.length;
      if (changeVal) {
        changeVal.textContent = (change >= 0 ? '+' : '') + change + ' kg';
        changeVal.className = 'progress-stat-value ' + (change > 0 ? 'positive' : change < 0 ? 'negative' : '');
      }

      renderChart(entries);
    });
  }

  function renderChart(entries) {
    var canvas = document.getElementById('progress-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    var labels = entries.map(function (e) {
      var d = new Date(e.date + 'T12:00:00');
      return d.getDate() + '/' + (d.getMonth() + 1);
    });
    var pesos = entries.map(function (e) { return e.peso || 0; });
    var reps = entries.map(function (e) { return e.reps || 0; });

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      || (!document.documentElement.getAttribute('data-theme')
        && window.matchMedia('(prefers-color-scheme: dark)').matches);

    var gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    var textColor = isDark ? '#aaa' : '#666';

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Peso (kg)',
            data: pesos,
            borderColor: '#14b8a6',
            backgroundColor: 'rgba(20,184,166,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Reps',
            data: reps,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139,92,246,0.1)',
            fill: false,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderDash: [4, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            labels: { color: textColor, font: { size: 12 } },
          },
          tooltip: {
            backgroundColor: isDark ? '#1e2028' : '#fff',
            titleColor: isDark ? '#eee' : '#333',
            bodyColor: isDark ? '#ccc' : '#555',
            borderColor: isDark ? '#333' : '#ddd',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { size: 11 } },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, font: { size: 11 } },
            grid: { color: gridColor },
          },
        },
      },
    });
  }

  // --- Integración con app.js ---
  function onDayRender() {
    var grid = document.getElementById('exercise-grid');
    if (!grid) return;
    var sections = grid.querySelectorAll('.tracker-section');
    var date = today();
    sections.forEach(function (section) {
      loadDayDataForCard(section, date);
    });
    populateExerciseDropdown();
  }

  // Exponer para que app.js llame después de renderDay
  window.onTrackingDayRender = onDayRender;
  window.buildTrackerSection = buildTrackerSection;

  // --- Init al cargar ---
  document.addEventListener('DOMContentLoaded', function () {
    var progressContainer = document.getElementById('progress-content');
    if (progressContainer) {
      progressContainer.appendChild(buildProgressSection());
    }

    initFirebase().then(function (ok) {
      if (ok) console.log('Tracking habilitado');
      else console.log('Tracking deshabilitado (sin Firebase)');
    });
  });
})();
