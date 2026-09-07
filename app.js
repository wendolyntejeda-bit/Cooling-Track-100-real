/**
 * app.js - Gestión Operativa de Producción, Roles (Admin/Técnico), CRUD de PODs y Laboratorio
 * CoolingTrack Pro
 */

const App = {
  cdus: [],
  batches: [],
  history: [],
  currentRole: 'admin', // 'admin' | 'technician'
  selectedPodFilter: 'all',
  editingPodName: null,

  init() {
    this.loadSavedRole();
    this.loadData();
    this.initTabs();
    this.initWeeklyAnalysis();
    this.renderAll();
    this.applyRolePermissions();

    if (window.lucide) {
      lucide.createIcons();
    }
  },

  // =========================================================================
  // GESTIÓN DE ROLES Y PERMISOS (ADMIN VS TÉCNICO)
  // =========================================================================
  loadSavedRole() {
    const savedRole = localStorage.getItem('cooling_user_role_v1');
    if (savedRole === 'technician' || savedRole === 'admin') {
      this.currentRole = savedRole;
    } else {
      this.currentRole = 'admin'; // Por defecto Administrador
    }
  },

  setRole(newRole) {
    if (newRole === 'admin') {
      // Abrir modal de PIN
      const pinModal = document.getElementById('admin-pin-modal');
      const pinInput = document.getElementById('admin-pin-input');
      if (pinModal) {
        if (pinInput) pinInput.value = '';
        pinModal.classList.remove('hidden');
        pinInput?.focus();
      }
      return;
    }

    this.currentRole = 'technician';
    localStorage.setItem('cooling_user_role_v1', 'technician');
    this.applyRolePermissions();
    this.showToast("👤 Modo Técnico activado: Solo escaneo y captura semanal", "info");
  },

  verifyAdminPin(event) {
    if (event) event.preventDefault();
    const pinInput = document.getElementById('admin-pin-input');
    const enteredPin = pinInput ? pinInput.value.trim() : '';

    // PIN por defecto: 1234
    if (enteredPin === '1234' || enteredPin === 'admin' || enteredPin === '0000') {
      this.currentRole = 'admin';
      localStorage.setItem('cooling_user_role_v1', 'admin');
      document.getElementById('admin-pin-modal')?.classList.add('hidden');
      this.applyRolePermissions();
      this.showToast("👑 Modo Administrador desbloqueado (Wendolyn Tejeda)", "success");
    } else {
      this.showToast("❌ PIN incorrecto. Intenta con 1234", "error");
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
    }
  },

  applyRolePermissions() {
    const isAdmin = this.currentRole === 'admin';
    const roleBadge = document.getElementById('current-role-badge');
    const roleText = document.getElementById('current-role-text');
    const roleIcon = document.getElementById('current-role-icon');

    if (roleBadge) {
      if (isAdmin) {
        roleBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer hover:opacity-95 transition-all';
        if (roleText) roleText.textContent = 'Admin (Wendolyn T.)';
        if (roleIcon) roleIcon.setAttribute('data-lucide', 'shield-check');
      } else {
        roleBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-200 rounded-xl text-xs font-bold shadow-md cursor-pointer hover:bg-slate-600 transition-all';
        if (roleText) roleText.textContent = 'Técnico de Turno';
        if (roleIcon) roleIcon.setAttribute('data-lucide', 'user');
      }
    }

    // Mostrar u ocultar elementos restringidos para técnicos
    document.querySelectorAll('.admin-only').forEach(el => {
      if (isAdmin) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    if (window.lucide) lucide.createIcons();
  },

  // =========================================================================
  // CARGA Y GENERACIÓN DE DATOS DE PRODUCCIÓN
  // =========================================================================
  getCurrentWeekString() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const weekNumber = Math.ceil((dayOfYear + start.getDay() + 1) / 7);
    return `Week #${weekNumber}`;
  },

  getFormattedToday() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  },

  loadData() {
    const storedCdus = localStorage.getItem('cooling_18_cdus_v5');
    const storedBatches = localStorage.getItem('cooling_veolia_batches_v5');
    const storedHistory = localStorage.getItem('cooling_lab_history_v5');

    if (storedCdus && storedBatches) {
      this.cdus = JSON.parse(storedCdus);
      this.batches = JSON.parse(storedBatches);
      this.history = storedHistory ? JSON.parse(storedHistory) : [];
    } else {
      // Estructura limpia real de producción: 4 PODs con 18 CDUs totales
      const generatedCdus = [];
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const podStructure = [
        { pod: 'POD-01', count: 4 },
        { pod: 'POD-02', count: 4 },
        { pod: 'POD-03', count: 6 },
        { pod: 'POD-04', count: 4 }
      ];

      podStructure.forEach(p => {
        for (let c = 1; c <= p.count; c++) {
          const cduId = `CDU-${p.pod.replace('-', '')}-${String(c).padStart(2, '0')}`;

          generatedCdus.push({
            id: cduId,
            name: `CDU ${c} (${p.pod})`,
            pod: p.pod,
            cduIndex: c,
            fixedBoteId: `BOTE-${cduId}`,
            lastSample: todayStr,
            daysAgo: 0,
            lastPH: 8.4,
            lastConductivity: 650,
            lastTDS: 400,
            lastATP: 280,
            lastTurbidity: 1.5,
            lastTSS: 1.0,
            lastBiocide: 35,
            lastGlycol: 25,
            notes: 'Parámetros óptimos en norma de calidad.',
            status: 'optimal',
            sampleStatus: 'taken'
          });
        }
      });

      this.cdus = generatedCdus;

      // Lote de producción activo actual
      const currentWeek = this.getCurrentWeekString();
      const todayDateFormatted = this.getFormattedToday();

      this.batches = [
        {
          id: `LOT-${currentWeek.replace(/[^A-Z0-9]/gi, '')}-${today.getFullYear()}`,
          week: currentWeek,
          dosingDate: todayDateFormatted,
          responsible: 'Wendolyn Tejeda',
          totalDrums: 120,
          consumedDrums: 0,
          remainingDrums: 120,
          notes: 'Lote semanal preparado de fluido con biocida para pruebas de racks (Purge & Dry)',
          status: 'active'
        }
      ];

      this.history = [];
      this.saveData();
    }
  },

  saveData() {
    localStorage.setItem('cooling_18_cdus_v5', JSON.stringify(this.cdus));
    localStorage.setItem('cooling_veolia_batches_v5', JSON.stringify(this.batches));
    localStorage.setItem('cooling_lab_history_v5', JSON.stringify(this.history));
  },

  getActiveBatch() {
    return this.batches.find(b => b.status === 'active') || this.batches[0] || {
      week: this.getCurrentWeekString(),
      dosingDate: this.getFormattedToday(),
      responsible: 'Wendolyn Tejeda',
      totalDrums: 120,
      remainingDrums: 120
    };
  },

  // =========================================================================
  // GESTIÓN COMPLETA DE PODS (CRUD: CREAR, EDITAR, ELIMINAR)
  // =========================================================================
  getUniquePODs() {
    const podsMap = {};
    this.cdus.forEach(c => {
      if (!podsMap[c.pod]) {
        podsMap[c.pod] = { name: c.pod, count: 0, cdus: [] };
      }
      podsMap[c.pod].count++;
      podsMap[c.pod].cdus.push(c);
    });

    return Object.values(podsMap).sort((a, b) => a.name.localeCompare(b.name));
  },

  openPODsAdminModal() {
    if (this.currentRole !== 'admin') {
      this.showToast("⚠️ Solo el Administrador puede gestionar PODs.", "warning");
      this.setRole('admin');
      return;
    }
    this.resetPODForm();
    this.renderPODsAdminList();
    document.getElementById('pods-admin-modal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  renderPODsAdminList() {
    const container = document.getElementById('pods-admin-list');
    if (!container) return;
    container.innerHTML = '';

    const pods = this.getUniquePODs();

    if (pods.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-slate-400 text-xs">No hay PODs registrados. Crea uno nuevo abajo.</div>`;
      return;
    }

    pods.forEach(pod => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl';
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-xs">
            ${pod.name.replace('POD-', 'P')}
          </div>
          <div>
            <div class="font-extrabold text-slate-900 text-xs">${pod.name}</div>
            <div class="text-[11px] text-slate-500 font-semibold">${pod.count} CDUs asignados</div>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button onclick="window.App.editPOD('${pod.name}', ${pod.count})" class="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold transition-colors">
            ✏️ Editar
          </button>
          <button onclick="window.App.deletePOD('${pod.name}')" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors">
            🗑️ Eliminar
          </button>
        </div>
      `;
      container.appendChild(item);
    });
  },

  resetPODForm() {
    this.editingPodName = null;
    const nameInput = document.getElementById('admin-pod-name');
    const countInput = document.getElementById('admin-pod-count');
    const submitBtn = document.getElementById('btn-save-pod');
    const titleEl = document.getElementById('pod-form-title');

    if (nameInput) {
      nameInput.value = '';
      nameInput.disabled = false;
      nameInput.placeholder = 'ej. POD-05';
    }
    if (countInput) countInput.value = '4';
    if (submitBtn) submitBtn.innerHTML = '➕ Agregar POD';
    if (titleEl) titleEl.textContent = 'Agregar Nuevo POD';
  },

  editPOD(podName, currentCount) {
    this.editingPodName = podName;
    const nameInput = document.getElementById('admin-pod-name');
    const countInput = document.getElementById('admin-pod-count');
    const submitBtn = document.getElementById('btn-save-pod');
    const titleEl = document.getElementById('pod-form-title');

    if (nameInput) {
      nameInput.value = podName;
      nameInput.disabled = true; // No cambiar nombre para no romper IDs existentes
    }
    if (countInput) countInput.value = currentCount;
    if (submitBtn) submitBtn.innerHTML = '💾 Actualizar CDUs';
    if (titleEl) titleEl.textContent = `Editar ${podName}`;
    countInput?.focus();
  },

  savePODForm(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('admin-pod-name');
    const countInput = document.getElementById('admin-pod-count');
    let podName = (this.editingPodName || nameInput?.value || '').trim().toUpperCase();
    const count = parseInt(countInput?.value) || 4;

    if (!podName) {
      this.showToast("⚠️ Ingresa un nombre para el POD (ej. POD-05)", "warning");
      return;
    }

    if (!podName.startsWith('POD-')) {
      podName = `POD-${podName.replace('POD', '').replace('-', '')}`;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (this.editingPodName) {
      // EDICIÓN: Ajustar cantidad de CDUs en el POD existente
      const existingInPod = this.cdus.filter(c => c.pod === podName);
      const otherCdus = this.cdus.filter(c => c.pod !== podName);

      const updatedPodCdus = [];
      for (let c = 1; c <= count; c++) {
        const cduId = `CDU-${podName.replace('-', '')}-${String(c).padStart(2, '0')}`;
        const prev = existingInPod.find(e => e.cduIndex === c);

        if (prev) {
          updatedPodCdus.push(prev);
        } else {
          updatedPodCdus.push({
            id: cduId,
            name: `CDU ${c} (${podName})`,
            pod: podName,
            cduIndex: c,
            fixedBoteId: `BOTE-${cduId}`,
            lastSample: todayStr,
            daysAgo: 0,
            lastPH: 8.4,
            lastConductivity: 650,
            lastTDS: 400,
            lastATP: 280,
            lastTurbidity: 1.5,
            lastTSS: 1.0,
            lastBiocide: 35,
            lastGlycol: 25,
            notes: 'Nuevo CDU inicializado.',
            status: 'optimal',
            sampleStatus: 'taken'
          });
        }
      }

      this.cdus = [...otherCdus, ...updatedPodCdus].sort((a, b) => a.id.localeCompare(b.id));
      this.showToast(`✨ ${podName} actualizado a ${count} CDUs`, "success");
    } else {
      // CREACIÓN: Nuevo POD
      const exists = this.cdus.some(c => c.pod === podName);
      if (exists) {
        this.showToast(`⚠️ El ${podName} ya existe. Puedes editarlo en la lista.`, "warning");
        return;
      }

      const newCdus = [];
      for (let c = 1; c <= count; c++) {
        const cduId = `CDU-${podName.replace('-', '')}-${String(c).padStart(2, '0')}`;
        newCdus.push({
          id: cduId,
          name: `CDU ${c} (${podName})`,
          pod: podName,
          cduIndex: c,
          fixedBoteId: `BOTE-${cduId}`,
          lastSample: todayStr,
          daysAgo: 0,
          lastPH: 8.4,
          lastConductivity: 650,
          lastTDS: 400,
          lastATP: 280,
          lastTurbidity: 1.5,
          lastTSS: 1.0,
          lastBiocide: 35,
          lastGlycol: 25,
          notes: 'Nuevo CDU inicializado.',
          status: 'optimal',
          sampleStatus: 'taken'
        });
      }

      this.cdus = [...this.cdus, ...newCdus].sort((a, b) => a.id.localeCompare(b.id));
      this.showToast(`🎉 ${podName} creado exitosamente con ${count} CDUs`, "success");
    }

    this.saveData();
    this.renderAll();
    this.resetPODForm();
    this.renderPODsAdminList();
  },

  deletePOD(podName) {
    if (!confirm(`¿Estás seguro de eliminar el ${podName} y todos sus CDUs asociados?`)) {
      return;
    }

    this.cdus = this.cdus.filter(c => c.pod !== podName);
    this.saveData();
    this.renderAll();
    this.resetPODForm();
    this.renderPODsAdminList();
    this.showToast(`🗑️ ${podName} eliminado correctamente`, "info");
  },

  // =========================================================================
  // BÚSQUEDA Y VALIDACIÓN DE CDUS
  // =========================================================================
  findCDU(query) {
    if (!query) return null;
    const q = String(query).trim().toUpperCase();
    const cleanQ = q.replace(/[^A-Z0-9]/g, '');

    // 1. Coincidencia exacta de ID o Bote
    let found = this.cdus.find(c => c.id.toUpperCase() === q || c.fixedBoteId.toUpperCase() === q);
    if (found) return found;

    // 2. Coincidencia normalizada
    found = this.cdus.find(c => {
      const cduClean = c.id.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const boteClean = c.fixedBoteId.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return cduClean === cleanQ || boteClean === cleanQ || cduClean.includes(cleanQ) || cleanQ.includes(cduClean);
    });
    if (found) return found;

    // 3. Por nombre (ej. "CDU 1 (POD-01)")
    return this.cdus.find(c => c.name.toUpperCase().includes(q));
  },

  // =========================================================================
  // GESTIÓN DE LOTES VEOLIA Y CONSUMOS
  // =========================================================================
  consumeBidon(qty = 1) {
    const active = this.getActiveBatch();
    if (!active) return;

    if (active.remainingDrums <= 0) {
      this.showToast("⚠️ Stock en cero. Es necesario dar de alta un nuevo lote de bidones.", "warning");
      return;
    }

    active.consumedDrums += qty;
    active.remainingDrums = Math.max(0, active.totalDrums - active.consumedDrums);
    if (active.remainingDrums === 0) active.status = 'depleted';

    this.saveData();
    this.renderAll();
    this.showToast(`🛢️ Consumo registrado: -${qty} bidón. Quedan ${active.remainingDrums} disponibles.`, 'info');
  },

  saveNewBatch(e) {
    if (e) e.preventDefault();

    if (this.currentRole !== 'admin') {
      this.showToast("⚠️ Solo el Administrador puede dar de alta lotes.", "warning");
      this.setRole('admin');
      return;
    }

    const week = document.getElementById('new-batch-week')?.value || this.getCurrentWeekString();
    const dosingDate = document.getElementById('new-batch-date')?.value || this.getFormattedToday();
    const totalDrums = parseInt(document.getElementById('new-batch-qty')?.value) || 120;
    const responsible = document.getElementById('new-batch-resp')?.value || 'Wendolyn Tejeda';
    const notes = document.getElementById('new-batch-notes')?.value || '';

    this.batches.forEach(b => { if (b.status === 'active') b.status = 'archived'; });

    const newBatch = {
      id: `LOT-${week.replace(/\s+/g, '').replace('#', '')}-${Date.now().toString().slice(-4)}`,
      week,
      dosingDate,
      responsible,
      totalDrums,
      consumedDrums: 0,
      remainingDrums: totalDrums,
      notes,
      status: 'active'
    };

    this.batches.unshift(newBatch);
    this.saveData();
    this.renderAll();

    document.getElementById('new-batch-modal')?.classList.add('hidden');
    this.showToast(`✨ Lote ${week} (${totalDrums} bidones) guardado exitosamente.`, 'success');
  },

  getCDUsForPrint(podFilter) {
    if (!podFilter || podFilter === 'all') return this.cdus;
    return this.cdus.filter(c => c.pod === podFilter);
  },

  // =========================================================================
  // MÓDULO: CAPTURA SEMANAL DE RESULTADOS DE LABORATORIO POR POD
  // =========================================================================
  initWeeklyAnalysis() {
    const selector = document.getElementById('weekly-pod-selector');
    if (!selector) return;

    selector.addEventListener('change', (e) => {
      this.renderWeeklyAnalysisTable(e.target.value);
    });
  },

  renderWeeklyAnalysisTable(podName) {
    const tbody = document.querySelector('#tab-weekly-analysis tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const cdusInPod = this.cdus.filter(c => c.pod === podName);

    if (cdusInPod.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-400">No hay CDUs registrados para ${podName}</td></tr>`;
      return;
    }

    cdusInPod.forEach(cdu => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-100 hover:bg-slate-50/50 text-xs';
      tr.innerHTML = `
        <td class="py-3 px-2 font-black text-slate-900">${cdu.id.split('-').slice(1).join('-')}</td>
        <td class="py-2 px-1"><input type="number" step="1" id="weekly-atp-${cdu.id}" value="${cdu.lastATP || ''}" placeholder="<1500" class="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"></td>
        <td class="py-2 px-1"><input type="number" step="0.1" id="weekly-tss-${cdu.id}" value="${cdu.lastTSS || ''}" placeholder="<5" class="w-16 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"></td>
        <td class="py-2 px-1"><input type="number" step="0.1" id="weekly-turb-${cdu.id}" value="${cdu.lastTurbidity || ''}" placeholder="<10" class="w-16 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"></td>
        <td class="py-2 px-1"><input type="number" step="1" id="weekly-cond-${cdu.id}" value="${cdu.lastConductivity || ''}" placeholder="600-700" class="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"></td>
        <td class="py-2 px-1"><input type="number" step="1" id="weekly-tds-${cdu.id}" value="${cdu.lastTDS || ''}" placeholder="<1000" class="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"></td>
        <td class="py-2 px-1"><input type="number" step="0.1" id="weekly-ph-${cdu.id}" value="${cdu.lastPH || ''}" placeholder="8.0-9.5" class="w-16 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"></td>
      `;
      tbody.appendChild(tr);
    });
  },

  saveWeeklyPODAnalysis() {
    const selector = document.getElementById('weekly-pod-selector');
    const podName = selector?.value;
    if (!podName) return;

    const cdusInPod = this.cdus.filter(c => c.pod === podName && c.sampleStatus === 'taken');
    const obs = document.getElementById('weekly-pod-notes')?.value || '';
    const todayStr = new Date().toISOString().split('T')[0];

    const batchHistoryEntry = {
      date: todayStr,
      pod: podName,
      notes: obs,
      records: []
    };

    cdusInPod.forEach(cdu => {
      const atp = parseFloat(document.getElementById(`weekly-atp-${cdu.id}`)?.value) || cdu.lastATP || 280;
      const tss = parseFloat(document.getElementById(`weekly-tss-${cdu.id}`)?.value) || cdu.lastTSS || 1.0;
      const turb = parseFloat(document.getElementById(`weekly-turb-${cdu.id}`)?.value) || cdu.lastTurbidity || 1.5;
      const cond = parseFloat(document.getElementById(`weekly-cond-${cdu.id}`)?.value) || cdu.lastConductivity || 650;
      const tds = parseFloat(document.getElementById(`weekly-tds-${cdu.id}`)?.value) || cdu.lastTDS || 400;
      const ph = parseFloat(document.getElementById(`weekly-ph-${cdu.id}`)?.value) || cdu.lastPH || 8.4;

      cdu.lastATP = atp;
      cdu.lastTSS = tss;
      cdu.lastTurbidity = turb;
      cdu.lastConductivity = cond;
      cdu.lastTDS = tds;
      cdu.lastPH = ph;
      cdu.lastSample = todayStr;
      cdu.daysAgo = 0;
      cdu.sampleStatus = 'taken';

      // Evaluación contra límites de aceptación
      if (atp > 1500 || ph < 7.8 || ph > 9.6 || cond > 750 || tds > 1000 || turb > 10 || tss > 5) {
        cdu.status = 'critical';
      } else if (atp > 1000 || ph < 8.0 || ph > 9.5 || cond < 580 || cond > 720) {
        cdu.status = 'warning';
      } else {
        cdu.status = 'optimal';
      }

      batchHistoryEntry.records.push({
        cduId: cdu.id,
        atp,
        tss,
        turb,
        cond,
        tds,
        ph,
        status: cdu.status
      });
    });

    this.history.unshift(batchHistoryEntry);
    this.saveData();
    this.renderAll();

    this.showToast(`💾 Resultados semanales de ${podName} guardados exitosamente.`, 'success');
  },

  registerWeeklySample(cduId) {
    const cdu = this.findCDU(cduId);
    if (!cdu) return;

    cdu.lastSample = new Date().toISOString().split('T')[0];
    cdu.daysAgo = 0;
    cdu.sampleStatus = 'taken';
    cdu.status = 'optimal';

    this.saveData();
    this.renderAll();
    this.showToast(`✅ Muestra validada y registrada para ${cdu.id}`, 'success');
  },

  registerWeeklySampleWithParams(cduId, params) {
    const cdu = this.findCDU(cduId);
    if (!cdu) return;

    const todayStr = new Date().toISOString().split('T')[0];
    cdu.lastSample = todayStr;
    cdu.daysAgo = 0;
    cdu.sampleStatus = 'taken';
    if (params.ph) cdu.lastPH = params.ph;
    if (params.cond) cdu.lastConductivity = params.cond;
    if (params.biocide) cdu.lastBiocide = params.biocide;
    if (params.glycol) cdu.lastGlycol = params.glycol;
    if (params.notes) cdu.notes = params.notes;

    if (cdu.lastPH < 8.0 || cdu.lastPH > 9.5 || cdu.lastConductivity > 700 || (cdu.lastATP && cdu.lastATP > 1500)) {
      cdu.status = 'warning';
    } else {
      cdu.status = 'optimal';
    }

    this.history.unshift({
      date: todayStr,
      pod: cdu.pod,
      notes: params.notes || 'Muestreo individual registrado vía Poka-Yoke',
      records: [{
        cduId: cdu.id,
        atp: cdu.lastATP || 280,
        tss: cdu.lastTSS || 1.0,
        turb: cdu.lastTurbidity || 1.5,
        cond: cdu.lastConductivity,
        tds: cdu.lastTDS || 400,
        ph: cdu.lastPH,
        status: cdu.status
      }]
    });

    this.saveData();
    this.renderAll();
    this.showToast(`✅ Parámetros de ${cdu.id} guardados en el histórico`, 'success');
  },

  // =========================================================================
  // RENDERIZADO GENERAL Y VISTAS
  // =========================================================================
  renderAll() {
    this.renderHeaderBadge();
    this.renderKPIs();
    this.renderPODMap();
    this.renderBatches();
    this.populatePodSelectors();

    const weeklySelector = document.getElementById('weekly-pod-selector');
    if (weeklySelector && weeklySelector.value) {
      this.renderWeeklyAnalysisTable(weeklySelector.value);
    }

    if (window.LabelsManager && typeof window.LabelsManager.renderPrintSheet === 'function') {
      const activeLabelType = document.getElementById('label-type-selector')?.value || 'veolia-bidon';
      window.LabelsManager.renderPrintSheet(activeLabelType);
    }

    if (window.lucide) lucide.createIcons();
  },

  renderHeaderBadge() {
    const badgeEl = document.getElementById('header-cdu-pod-badge');
    const pods = this.getUniquePODs();
    const totalCdus = this.cdus.length;
    const totalPods = pods.length;

    if (badgeEl) {
      badgeEl.textContent = `${totalCdus} CDUs / ${totalPods} PODs`;
    }
  },

  renderKPIs() {
    const total = this.cdus.length;
    const optimal = this.cdus.filter(c => c.status === 'optimal').length;
    const warning = this.cdus.filter(c => c.status === 'warning').length;
    const critical = this.cdus.filter(c => c.status === 'critical').length;
    const activeBatch = this.getActiveBatch();

    const elTotal = document.getElementById('kpi-cdus-total');
    const elOpt = document.getElementById('kpi-cdus-optimal');
    const elAlerts = document.getElementById('kpi-cdus-alerts');
    const elStock = document.getElementById('kpi-stock-veolia');

    if (elTotal) elTotal.textContent = total;
    if (elOpt) elOpt.textContent = optimal;
    if (elAlerts) elAlerts.textContent = critical + warning;
    if (elStock) elStock.textContent = `${activeBatch?.remainingDrums || 0} / ${activeBatch?.totalDrums || 0}`;
  },

  renderPODMap() {
    const container = document.getElementById('pods-map-container');
    if (!container) return;
    container.innerHTML = '';

    const pods = this.getUniquePODs();

    pods.forEach(podObj => {
      const podName = podObj.name;
      const cduList = podObj.cdus;

      if (this.selectedPodFilter !== 'all' && this.selectedPodFilter !== podName) {
        return;
      }

      const hasCritical = cduList.some(c => c.status === 'critical');
      const hasWarning = cduList.some(c => c.status === 'warning');

      let podBorder = 'border-slate-200';
      let podHeaderBg = 'bg-slate-50/80';

      if (hasCritical) {
        podBorder = 'border-rose-300 ring-1 ring-rose-300';
        podHeaderBg = 'bg-rose-50/80';
      } else if (hasWarning) {
        podBorder = 'border-amber-300 ring-1 ring-amber-300';
        podHeaderBg = 'bg-amber-50/80';
      }

      const podCard = document.createElement('div');
      podCard.className = `glass-card rounded-2xl border ${podBorder} overflow-hidden flex flex-col justify-between transition-all hover:shadow-md`;

      let cduRowsHtml = '';
      cduList.forEach(cdu => {
        let dotColor = 'bg-emerald-500';
        let statusBadge = `<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Al Día</span>`;

        if (cdu.status === 'critical') {
          dotColor = 'bg-rose-500';
          statusBadge = `<span class="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">Alerta (${cdu.daysAgo}d)</span>`;
        } else if (cdu.status === 'warning') {
          dotColor = 'bg-amber-500';
          statusBadge = `<span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Próximo (${cdu.daysAgo}d)</span>`;
        }

        cduRowsHtml += `
          <div class="py-2.5 px-3.5 flex flex-col gap-1.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                <span class="font-mono font-black text-slate-900 text-xs">${cdu.id.split('-').slice(1).join('-')}</span>
              </div>
              <div class="flex items-center gap-2">
                ${statusBadge}
                <button onclick="window.PokaYokeScanner.simulate('cdu', '${cdu.id}'); window.App.switchTab('scanner');" class="text-sky-600 hover:text-sky-800 font-bold text-[11px] bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded transition-colors">
                  Muestrear
                </button>
              </div>
            </div>
            
            <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded">
              <span>pH: <b class="text-slate-800">${cdu.lastPH || '--'}</b></span>
              <span>Cond: <b class="text-slate-800">${cdu.lastConductivity || '--'}µS</b></span>
              <span>ATP: <b class="text-teal-700">${cdu.lastATP || '--'}</b></span>
              <span>TDS: <b class="text-slate-800">${cdu.lastTDS || '--'}</b></span>
            </div>
          </div>
        `;
      });

      podCard.innerHTML = `
        <div>
          <div class="${podHeaderBg} p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-black text-slate-900 text-sm">${podName}</span>
              <span class="text-[10px] font-mono font-bold bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">${cduList.length} CDUs</span>
            </div>
            <span class="text-[10px] font-bold text-slate-400 uppercase">En Operación</span>
          </div>
          <div>${cduRowsHtml}</div>
        </div>
      `;

      container.appendChild(podCard);
    });
  },

  filterMapByPod(val) {
    this.selectedPodFilter = val;
    this.renderPODMap();
  },

  populatePodSelectors() {
    const pods = this.getUniquePODs();

    const selectors = [
      document.getElementById('map-pod-filter'),
      document.getElementById('weekly-pod-selector'),
      document.getElementById('label-pod-selector')
    ];

    selectors.forEach(sel => {
      if (!sel) return;
      const currentVal = sel.value;
      const isFilter = sel.id === 'map-pod-filter' || sel.id === 'label-pod-selector';

      sel.innerHTML = isFilter ? `<option value="all">Ver Todos los PODs (${pods.length})</option>` : '';

      pods.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.count} CDUs)`;
        sel.appendChild(opt);
      });

      if (currentVal && pods.some(p => p.name === currentVal)) {
        sel.value = currentVal;
      } else if (!isFilter && pods.length > 0) {
        sel.value = pods[0].name;
      }
    });
  },

  renderBatches() {
    const tbody = document.getElementById('batches-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.batches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">No hay lotes registrados</td></tr>`;
      return;
    }

    this.batches.forEach(b => {
      const tr = document.createElement('tr');
      const isActive = b.status === 'active';
      const pct = Math.round((b.remainingDrums / b.totalDrums) * 100);

      tr.className = isActive ? 'bg-emerald-50/30' : 'opacity-80';
      tr.innerHTML = `
        <td class="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
          ${isActive ? '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>' : ''}
          ${b.week}
        </td>
        <td class="py-3.5 px-4 text-slate-600 font-mono">${b.dosingDate}</td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold ${b.remainingDrums <= 10 ? 'text-rose-600' : 'text-slate-800'}">${b.remainingDrums} / ${b.totalDrums}</span>
            <div class="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${pct}%"></div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 text-slate-700 font-semibold">${b.responsible}</td>
        <td class="py-3.5 px-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
            ${isActive ? 'Vigente en Piso' : 'Agotado / Histórico'}
          </span>
        </td>
        <td class="py-3.5 px-4 text-right">
          ${isActive ? `
            <button onclick="window.App.consumeBidon(1)" class="px-3 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 text-slate-800 rounded-lg font-bold text-xs shadow-sm transition-all">
              -1 Bidón
            </button>
          ` : '<span class="text-slate-400 text-xs">--</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  // =========================================================================
  // NAVEGACIÓN ENTRE PESTAÑAS
  // =========================================================================
  initTabs() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab-target');
        this.switchTab(targetId);
      });
    });
  },

  switchTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(sec => sec.classList.add('hidden'));
    const targetSection = document.getElementById(`tab-${targetId}`);
    if (targetSection) targetSection.classList.remove('hidden');

    document.querySelectorAll('[data-tab-target]').forEach(b => {
      b.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 font-bold transition-all text-xs';
    });

    const activeBtn = document.querySelector(`[data-tab-target="${targetId}"]`);
    if (activeBtn) {
      activeBtn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-sky-700 font-extrabold shadow-sm border border-slate-200/80 transition-all text-xs';
    }

    if (targetId === 'labels' && window.LabelsManager) {
      const type = document.getElementById('label-type-selector')?.value || 'veolia-bidon';
      window.LabelsManager.renderPrintSheet(type);
    }
  },

  // =========================================================================
  // EXPORTACIÓN EXCEL / CSV CONSOLIDADA (CDUS + HISTÓRICO LAB + LOTES)
  // =========================================================================
  exportReport() {
    let csvContent = "\uFEFF"; // UTF-8 BOM

    // SECCIÓN 1: ESTADO MAESTRO DE CDUS
    csvContent += "=== ESTADO MAESTRO DE CDUS Y MUESTREO ===\n";
    csvContent += "ID CDU,Nombre,POD,Bote Asignado,Ultimo Muestreo,pH,Conductividad (uS),TDS (ppm),ATP (RLU),Turbidez (NTU),TSS (ppm),Biocida (PPM),Glicol (%),Estatus General\n";
    this.cdus.forEach(c => {
      csvContent += `"${c.id}","${c.name}","${c.pod}","${c.fixedBoteId}","${c.lastSample}",${c.lastPH},${c.lastConductivity},${c.lastTDS},${c.lastATP},${c.lastTurbidity},${c.lastTSS},${c.lastBiocide},${c.lastGlycol},"${c.status}"\n`;
    });

    // SECCIÓN 2: HISTÓRICO DE PRUEBAS SEMANALES DE LABORATORIO
    csvContent += "\n=== HISTORICO ACUMULADO DE PRUEBAS SEMANALES ===\n";
    csvContent += "Fecha Captura,POD,ID CDU,ATP (RLU),TSS (ppm),Turbidez (NTU),Conductividad (uS),TDS (ppm),pH,Estatus,Observaciones POD\n";
    if (this.history && this.history.length > 0) {
      this.history.forEach(h => {
        if (h.records && h.records.length > 0) {
          h.records.forEach(r => {
            csvContent += `"${h.date}","${h.pod}","${r.cduId}",${r.atp},${r.tss},${r.turb},${r.cond},${r.tds},${r.ph},"${r.status}","${(h.notes || '').replace(/"/g, '""')}"\n`;
          });
        }
      });
    } else {
      csvContent += "Sin registros historicos adicionales aun.\n";
    }

    // SECCIÓN 3: LOTES MASIVOS VEOLIA
    csvContent += "\n=== CONTROL DE LOTES VEOLIA Y STOCK ===\n";
    csvContent += "ID Lote,Semana,Fecha Dosificacion,Total Bidones,Consumidos,Stock Disponible,Responsable QA,Estado,Notas\n";
    this.batches.forEach(b => {
      csvContent += `"${b.id}","${b.week}","${b.dosingDate}",${b.totalDrums},${b.consumedDrums},${b.remainingDrums},"${b.responsible}","${b.status}","${(b.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CoolingTrack_Pro_Reporte_${this.getCurrentWeekString().replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast("📊 Reporte completo descargado en formato CSV/Excel", "success");
  },

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    let bg = 'bg-slate-900 border-slate-700 text-white';
    let icon = 'ℹ️';

    if (type === 'success') {
      bg = 'bg-emerald-900/90 border-emerald-600 text-emerald-100';
      icon = '✅';
    } else if (type === 'warning') {
      bg = 'bg-amber-900/90 border-amber-600 text-amber-100';
      icon = '⚠️';
    } else if (type === 'error') {
      bg = 'bg-rose-900/90 border-rose-600 text-rose-100';
      icon = '🛑';
    }

    toast.className = `fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-bold transition-all duration-300 transform translate-y-0 opacity-100 ${bg}`;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    setTimeout(() => {
      toast.className = 'hidden';
    }, 3800);
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => window.App.init());
