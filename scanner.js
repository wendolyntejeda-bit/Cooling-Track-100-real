/**
 * scanner.js - Motor Poka-Yoke con Captura Rápida de Parámetros
 * CoolingTrack Pro
 */

const PokaYokeScanner = {
  html5QrCode: null,
  isScanning: false,
  activeCDU: null,
  audioCtx: null,

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.audioCtx = new AudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  playSound(type = 'success') {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      const now = this.audioCtx.currentTime;

      if (type === 'match') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(110, now + 0.15);
        osc.frequency.setValueAtTime(220, now + 0.3);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (e) {}
  },

  async startCamera(containerId = 'qr-reader') {
    this.initAudio();
    if (this.isScanning) return;

    try {
      this.html5QrCode = new Html5Qrcode(containerId);
      const config = {
        fps: 20,
        qrbox: (w, h) => ({ width: Math.min(w, h) * 0.8, height: Math.min(w, h) * 0.8 }),
        aspectRatio: 1.0
      };

      await this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => this.handleScan(decodedText),
        () => {}
      );

      this.isScanning = true;
      document.getElementById('scanner-laser')?.classList.remove('hidden');
      document.getElementById('scanner-placeholder')?.classList.add('hidden');
      const btn = document.getElementById('btn-toggle-cam');
      if (btn) btn.innerHTML = '<i data-lucide="video-off" class="w-4 h-4 mr-1.5 inline"></i> Detener Cámara';
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error("Error iniciando cámara:", err);
      window.App.showToast("No se pudo abrir la cámara. Revisa permisos o usa las herramientas de prueba.", "error");
    }
  },

  async stopCamera() {
    if (!this.isScanning || !this.html5QrCode) return;
    try {
      await this.html5QrCode.stop();
      this.html5QrCode = null;
      this.isScanning = false;
      document.getElementById('scanner-laser')?.classList.add('hidden');
      document.getElementById('scanner-placeholder')?.classList.remove('hidden');
      const btn = document.getElementById('btn-toggle-cam');
      if (btn) btn.innerHTML = '<i data-lucide="video" class="w-4 h-4 mr-1.5 inline"></i> Encender Cámara';
      if (window.lucide) lucide.createIcons();
    } catch (err) {}
  },

  toggleCamera() {
    if (this.isScanning) this.stopCamera();
    else this.startCamera();
  },

  // Parser tolerante y flexible para cualquier formato de código QR
  parsePayload(raw) {
    if (!raw) return { type: 'unknown', id: '' };
    const text = String(raw).trim();
    const upper = text.toUpperCase();

    if (upper.includes('VEOLIA') || upper.includes('BIOCIDA')) {
      const parts = text.split('|');
      return {
        type: 'veolia_bidon',
        week: parts[1] || 'Week #35',
        dosingDate: parts[2] || new Date().toLocaleDateString('es-MX'),
        responsible: parts[3] || 'Wendolyn Tejeda'
      };
    }
    if (upper.startsWith('BOTE:') || upper.startsWith('BOTE-') || upper.startsWith('BOTE ') || upper.startsWith('MUESTRA-')) {
      let clean = text.replace(/^(BOTE:|BOTE-|BOTE\s+|MUESTRA-)/i, '').trim(); clean = clean.replace (/^CDU-P(\d+)/i, 'CDU-POD$1' );
      return { type: 'bote', id: clean, raw: text };
    }
    if (upper.startsWith('CDU:') || upper.startsWith('CDU-') || upper.startsWith('CDU ')) {
      let clean = text.replace(/^CDU:\s*/i, '').trim(); clean = clean.replace (/^CDU-P(\d+)/i, 'CDU-POD$1' );
      return { type: 'cdu', id: clean, raw: text };
    }

    const cduMatch = window.App.findCDU(text);
    if (cduMatch) {
      if (upper.includes('BOTE')) return { type: 'bote', id: cduMatch.id, raw: text };
      return { type: 'cdu', id: cduMatch.id, raw: text };
    }

    return { type: 'unknown', id: text, raw: text };
  },

  handleScan(rawText) {
    const item = this.parsePayload(rawText);
    console.log("Escaneado:", rawText, item);

    if (item.type === 'veolia_bidon') {
      this.playSound('beep');
      this.showVeoliaBidonResult(item);
      return;
    }

    if (item.type === 'cdu') {
      const cdu = window.App.findCDU(item.id);
      if (!cdu) {
        this.playSound('error');
        window.App.showToast(`⚠️ CDU no encontrado: ${item.id}`, 'warning');
        return;
      }
      this.activeCDU = cdu;
      this.playSound('beep');
      this.updateScannerUI();
      window.App.showToast(`📍 CDU Fijado: ${cdu.id} (${cdu.pod})`, 'info');
      return;
    }

    if (item.type === 'bote') {
      if (!this.activeCDU) {
        this.playSound('error');
        this.showPokaYokeResult('NO_CDU', { boteId: item.raw || item.id });
        return;
      }

      const cleanBoteId = String(item.id).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanCduId = this.activeCDU.id.toUpperCase().replace(/[^A-Z0-9]/g, '');

      if (cleanBoteId.includes(cleanCduId) || cleanCduId.includes(cleanBoteId) || (this.activeCDU.fixedBoteId && this.activeCDU.fixedBoteId.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(cleanBoteId))) {
        // MATCH 100% CORRECTO
        this.playSound('match');
        this.activeCDU.sampleStatus = 'taken';
        this.activeCDU.lastSample = new Date().toISOString().split('T')[0];
        this.activeCDU.daysAgo = 0;
        this.activeCDU.status = 'optimal';

        window.App.saveData();
        window.App.renderAll();

        this.showPokaYokeResult('MATCH', {
          cdu: this.activeCDU,
          boteId: item.raw || `BOTE-${this.activeCDU.id}`
        });
      } else {
        // ERROR POKA-YOKE
        this.playSound('error');
        this.showPokaYokeResult('MISMATCH', {
          cdu: this.activeCDU,
          scannedBote: item.raw || item.id
        });
      }
      return;
    }

    this.playSound('error');
    window.App.showToast(`Código escaneado: "${rawText}" (no reconocido)`, 'warning');
  },

  updateScannerUI() {
    const badge = document.getElementById('scanner-active-cdu-badge');
    const nameEl = document.getElementById('scanner-cdu-name');
    const promptEl = document.getElementById('scanner-status-text');

    if (this.activeCDU) {
      badge?.classList.remove('hidden');
      if (nameEl) nameEl.textContent = `${this.activeCDU.id} (${this.activeCDU.pod})`;
      if (promptEl) promptEl.textContent = `🛢️ Escanea el contenedor asignado para validar la muestra`;
    } else {
      badge?.classList.add('hidden');
      if (promptEl) promptEl.textContent = `📍 Escanea un CDU para iniciar el muestreo`;
    }
  },

  resetScanner() {
    this.activeCDU = null;
    this.updateScannerUI();
    document.getElementById('poka-result-container')?.classList.add('hidden');
  },

  saveMatchWithParams(cduId) {
    const notes = document.getElementById('match-input-notes')?.value || '';
    const cdu = window.App.findCDU(cduId);
    if (cdu) {
      cdu.notes = notes;
      cdu.sampleStatus = 'taken';
      cdu.lastSample = new Date().toISOString().split('T')[0];
      cdu.daysAgo = 0;
      cdu.status = 'optimal';
      window.App.saveData();
      window.App.renderAll();
      window.App.showToast(`✅ Muestra validada para ${cdu.id}. Registrada para análisis semanal.`, 'success');
    }
    this.resetScanner();
  },

  showPokaYokeResult(type, data) {
    const container = document.getElementById('poka-result-container');
    if (!container) return;
    container.classList.remove('hidden');

    if (type === 'MATCH') {
      const c = data.cdu;
      container.innerHTML = `
        <div class="animate-match-success bg-white border-2 border-emerald-500 rounded-2xl shadow-xl overflow-hidden">
          
          <!-- Green Header Banner -->
          <div class="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i data-lucide="check-check" class="w-6 h-6 text-white"></i>
              </div>
              <div>
                <span class="text-[10px] font-mono font-bold uppercase bg-black/20 px-2 py-0.5 rounded">POKA-YOKE MATCH VALIDADO (100% CORRECTO)</span>
                <h3 class="text-lg font-black leading-tight mt-0.5">${c.id} ↔ BOTE ASIGNADO</h3>
              </div>
            </div>
            <span class="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg">${c.pod}</span>
          </div>

          <!-- Parameter Capture Form -->
          <div class="p-5 space-y-4 text-xs">
            <div class="border-b pb-2 border-slate-100">
              <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div class="text-lg font-black text-emerald-700">
                  ✅ MUESTRA VALIDADA
                </div>
                <div class="text-sm text-slate-600 mt-2">
                  La muestra fue asociada correctamente al CDU y al contenedor.
                </div>
                <div class="text-xs text-slate-500 mt-2">
                  Estado: Pendiente de análisis de laboratorio
                </div>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-600 mb-1">Observaciones / Filtro</label>
              <input type="text" id="match-input-notes" placeholder="ej. Líquido claro sin sedimentos" value="${c.notes || ''}" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2 pt-2">
              <button onclick="window.PokaYokeScanner.saveMatchWithParams('${c.id}')" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="check" class="w-4 h-4"></i> Registrar Muestra
              </button>
              <button onclick="window.App.registerWeeklySample('${c.id}'); window.PokaYokeScanner.resetScanner();" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                Validar y cerrar
              </button>
            </div>
          </div>

        </div>
      `;
    } else if (type === 'MISMATCH') {
      container.innerHTML = `
        <div class="animate-poka-error bg-gradient-to-br from-rose-500 to-red-700 text-white p-6 rounded-2xl shadow-2xl text-center space-y-3 border-4 border-rose-300">
          <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white">
            <i data-lucide="alert-octagon" class="w-8 h-8"></i>
          </div>
          <div class="text-xs font-mono font-bold tracking-widest bg-black/30 px-3 py-1 rounded-full inline-block uppercase">
            🛑 ALERTA POKA-YOKE: ¡BOTE EQUIVOCADO!
          </div>
          <h2 class="text-2xl font-black">NO COINCIDE EL BOTE</h2>
          <div class="bg-black/30 p-3.5 rounded-xl max-w-md mx-auto text-left text-xs space-y-1.5">
            <div>📍 <b>CDU en el que estás:</b> <span class="text-rose-100 font-bold">${data.cdu.id} (${data.cdu.pod})</span></div>
            <div>❌ <b>Bote que escaneaste:</b> <span class="text-amber-300 font-mono font-bold">${data.scannedBote}</span></div>
          </div>
          <p class="text-xs text-rose-100 font-medium">
            ¡Detén la toma de muestra! Ve por el bote físico asignado a <b>${data.cdu.id}</b> para evitar contaminación de muestras.
          </p>
          <div class="pt-2">
            <button onclick="window.PokaYokeScanner.resetScanner()" class="px-5 py-2.5 bg-white text-rose-900 font-black rounded-xl text-xs hover:bg-rose-50 shadow-lg transition-all">
              Entendido, Corregir Bote
            </button>
          </div>
        </div>
      `;
    } else if (type === 'NO_CDU') {
      container.innerHTML = `
        <div class="bg-amber-500 text-white p-5 rounded-2xl shadow-lg text-center space-y-2">
          <i data-lucide="info" class="w-8 h-8 mx-auto"></i>
          <h3 class="text-lg font-bold">Escanea Primero el CDU</h3>
          <p class="text-xs text-amber-100">
            Escaneaste el <b>${data.boteId}</b>. Primero escanea el código del CDU para validar que estás en el rack correcto.
          </p>
          <button onclick="window.PokaYokeScanner.resetScanner()" class="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs">
            Aceptar
          </button>
        </div>
      `;
    }

    if (window.lucide) lucide.createIcons();
  },

  showVeoliaBidonResult(bidon) {
    const container = document.getElementById('poka-result-container');
    if (!container) return;
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="bg-white border-2 border-slate-900 p-5 rounded-2xl shadow-xl space-y-4 text-slate-900">
        <div class="flex items-center justify-between border-b pb-3 border-slate-200">
          <div>
            <span class="text-xs font-black uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded">VEOLIA CHEMICALS</span>
            <h3 class="text-lg font-black text-slate-900 mt-0.5">Fluido con Biocida Vigente</h3>
          </div>
          <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Aprobado para CDUs
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold">Semana de Preparación</span>
            <div class="text-base font-extrabold text-slate-900">${bidon.week}</div>
          </div>
          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold">Fecha Dosificación</span>
            <div class="text-base font-extrabold text-slate-900">${bidon.dosingDate}</div>
          </div>
          <div class="col-span-2 border-t pt-2 border-slate-200 flex justify-between">
            <span class="text-slate-500">Responsable QA: <b>${bidon.responsible}</b></span>
            <span class="text-slate-500">Dosificación: <b>Fluido Listo</b></span>
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <button onclick="window.App.consumeBidon(1); window.PokaYokeScanner.resetScanner();" class="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20">
            <i data-lucide="minus-circle" class="w-4 h-4"></i> Consumir 1 Bidón en Piso (-1)
          </button>
          <button onclick="window.PokaYokeScanner.resetScanner()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">
            Cerrar
          </button>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  simulate(type, id) {
    if (type === 'cdu') {
      this.handleScan(`CDU:${id}`);
    } else if (type === 'bote') {
      this.handleScan(`BOTE:${id}`);
    } else if (type === 'veolia') {
      const activeBatch = window.App.getActiveBatch();
      this.handleScan(`VEOLIA|${activeBatch.week}|${activeBatch.dosingDate}|${activeBatch.responsible}`);
    }
  }
};

window.PokaYokeScanner = PokaYokeScanner;
