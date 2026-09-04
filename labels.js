/**
 * labels.js - Impresor Térmico Zebra ZQ630 & Generador ZPL (76mm x 51mm / 3" x 2")
 * CoolingTrack Pro - Calibración Milimétrica sin Desbordes
 */

const LabelsManager = {
  // Generar código QR vectorial en contenedor
  createQRCodeElement(containerId, text, size = 75) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    new QRCode(container, {
      text: text,
      width: size,
      height: size,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  },

  // Generar código ZPL nativo para Zebra ZQ630 (203 DPI, 76x51mm = 608x408 dots)
  generateZPL(type) {
    if (type === 'veolia-bidon') {
      const batch = window.App.getActiveBatch();
      const qrPayload = `VEOLIA|${batch.week}|${batch.dosingDate}|${batch.responsible}`;
      return `^XA
^PW608
^LL408
^LH0,0
^FO25,30^BQN,2,5^FDQA,${qrPayload}^FS
^FO25,235^GB160,135,2^FS
^FO35,290^A0N,20,20^FDEspacio Peca^FS
^FO215,30^A0N,38,38^FDVEOLIA^FS
^FO215,75^A0N,20,20^FDEstatus: Fluido con biocida^FS
^FO215,130^A0N,30,30^FD${batch.week}^FS
^FO215,170^A0N,18,18^FDFecha de dosificacion:^FS
^FO215,195^A0N,28,28^FD${batch.dosingDate}^FS
^FO215,285^A0N,20,20^FDResponsable:^FS
^FO215,315^A0N,22,22^FD${batch.responsible}^FS
^XZ`;
    }

    if (type === 'cdu-labels') {
      const selectedPod = document.getElementById('label-pod-selector')?.value || 'all';
      const cdus = window.App.getCDUsForPrint(selectedPod);
      let fullZpl = '';

      cdus.forEach(cdu => {
        fullZpl += `^XA
^PW608
^LL408
^LH0,0
^FO25,40^BQN,2,5^FDQA,CDU:${cdu.id}^FS
^FO215,30^A0N,20,20^FDFLEX - QUALITY ASSURANCE^FS
^FO215,60^A0N,44,44^FD${cdu.id}^FS
^FO215,120^A0N,24,24^FD${cdu.pod} - CDU #${cdu.cduIndex || '1'}^FS
^FO215,170^A0N,20,20^FDBote Fijo: BOTE-${cdu.id}^FS
^FO215,220^A0N,18,18^FDEspec: pH 8.0-9.5 | ATP <1500 RLU^FS
^FO215,255^A0N,18,18^FDCond: 600-700 uS | TDS <1000 ppm^FS
^FO215,310^A0N,16,16^FD* Poka-Yoke: Validar con Bote *^FS
^XZ
`;
      });
      return fullZpl;
    }

    if (type === 'bote-labels') {
      const selectedPod = document.getElementById('label-pod-selector')?.value || 'all';
      const cdus = window.App.getCDUsForPrint(selectedPod);
      let fullZpl = '';

      cdus.forEach(cdu => {
        fullZpl += `^XA
^PW608
^LL408
^LH0,0
^FO25,40^BQN,2,5^FDQA,BOTE:${cdu.id}^FS
^FO215,30^A0N,20,20^FDCONTENEDOR PERMANENTE QA^FS
^FO215,60^A0N,40,40^FDBOTE ${cdu.id}^FS
^FO215,120^A0N,24,24^FDUso Exclusivo en ${cdu.pod}^FS
^FO215,170^A0N,18,18^FDAsignado a: ${cdu.name}^FS
^FO215,220^A0N,18,18^FD[!] No remover del rack^FS
^FO215,255^A0N,18,18^FD[!] Reutilizar en el mismo CDU^FS
^XZ
`;
      });
      return fullZpl;
    }

    return '';
  },

  downloadZPLFile() {
    const type = document.getElementById('label-type-selector')?.value || 'veolia-bidon';
    const zplContent = this.generateZPL(type);
    const blob = new Blob([zplContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Zebra_${type}_76x51mm.zpl`;
    a.click();
    window.App.showToast(`📄 Archivo .ZPL descargado para Zebra ZQ630 (${type})`, "success");
  },

  copyZPL() {
    const type = document.getElementById('label-type-selector')?.value || 'veolia-bidon';
    const zplContent = this.generateZPL(type);
    navigator.clipboard.writeText(zplContent).then(() => {
      window.App.showToast("📋 Código ZPL copiado al portapapeles", "success");
    });
  },

  // Renderizar la vista previa interactiva en pantalla (Proporción exacta 76mm x 51mm)
  renderPrintSheet(type = 'veolia-bidon') {
    const printContainer = document.getElementById('print-labels-container');
    const zplBox = document.getElementById('zpl-code-preview');
    if (!printContainer) return;
    printContainer.innerHTML = '';

    if (type === 'veolia-bidon') {
      const activeBatch = window.App.getActiveBatch();
      const card = document.createElement('div');
      card.className = 'zebra-label-preview mx-auto';
      
      const qrPayload = `VEOLIA|${activeBatch.week}|${activeBatch.dosingDate}|${activeBatch.responsible}`;
      const qrId = `qr-zebra-veolia`;

      card.innerHTML = `
        <div style="width: 85px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; flex-shrink: 0;">
          <div id="${qrId}" style="width: 75px; height: 75px;"></div>
          <div style="width: 75px; height: 50px; border: 1.5px dashed #64748b; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #64748b; font-weight: 800; text-align: center; line-height: 1.1; background: #f8fafc;">
            Espacio Peca Amarilla
          </div>
        </div>

        <div style="flex: 1; padding-left: 12px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; text-align: left; overflow: hidden;">
          <div>
            <div style="font-size: 20px; font-weight: 900; line-height: 1; color: #000; font-family: Arial, sans-serif; letter-spacing: -0.2px;">VEOLIA</div>
            <div style="font-size: 10.5px; font-weight: 800; white-space: nowrap; color: #000; font-family: Arial, sans-serif; margin-top: 3px;">Estatus: Fluido con biocida</div>
          </div>

          <div style="margin: 2px 0;">
            <div style="font-size: 15px; font-weight: 900; line-height: 1.1; color: #000; font-family: Arial, sans-serif;">${activeBatch.week}</div>
            <div style="font-size: 9.5px; font-weight: bold; color: #333; font-family: Arial, sans-serif; margin-top: 2px;">Fecha de dosificación:</div>
            <div style="font-size: 14px; font-weight: 900; line-height: 1.1; color: #000; font-family: Arial, sans-serif; margin-top: 1px;">${activeBatch.dosingDate}</div>
          </div>

          <div>
            <div style="font-size: 10px; font-weight: 800; color: #000; font-family: Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              Responsable: ${activeBatch.responsible}
            </div>
          </div>
        </div>
      `;

      printContainer.appendChild(card);
      setTimeout(() => this.createQRCodeElement(qrId, qrPayload, 75), 40);

      if (zplBox) {
        zplBox.value = this.generateZPL('veolia-bidon');
      }

    } else if (type === 'cdu-labels') {
      const selectedPod = document.getElementById('label-pod-selector')?.value || 'all';
      const cdusToPrint = window.App.getCDUsForPrint(selectedPod);

      cdusToPrint.forEach((cdu, idx) => {
        const card = document.createElement('div');
        card.className = 'zebra-label-preview mx-auto mb-4';
        const qrId = `qr-cdu-${idx}`;
        const qrPayload = `CDU:${cdu.id}`;

        card.innerHTML = `
          <div style="width: 85px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; flex-shrink: 0;">
            <div id="${qrId}" style="width: 75px; height: 75px;"></div>
            <div style="width: 75px; height: 40px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: #0f172a; text-align: center;">
              ${cdu.pod}
            </div>
          </div>

          <div style="flex: 1; padding-left: 12px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; text-align: left; overflow: hidden;">
            <div>
              <div style="font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase;">FLEX QA - COOLING</div>
              <div style="font-size: 18px; font-weight: 900; color: #000; line-height: 1.1; margin-top: 2px;">${cdu.id}</div>
              <div style="font-size: 11px; font-weight: 800; color: #000;">${cdu.pod} - CDU #${cdu.cduIndex || '1'}</div>
            </div>

            <div style="font-size: 9.5px; font-weight: bold; color: #1e293b; line-height: 1.2;">
              <div>Bote Fijo: <b>BOTE-${cdu.id}</b></div>
              <div style="font-size: 8.5px; color: #475569; margin-top: 1px;">pH: 8.0-9.5 | ATP: &lt;1500 RLU</div>
              <div style="font-size: 8.5px; color: #475569;">Cond: 600-700 µS | TDS: &lt;1000</div>
            </div>

            <div style="font-size: 8px; font-weight: 800; color: #0369a1; text-transform: uppercase;">
              * Validar con bote antes de muestreo *
            </div>
          </div>
        `;
        printContainer.appendChild(card);
        setTimeout(() => this.createQRCodeElement(qrId, qrPayload, 75), 40);
      });

      if (zplBox) {
        zplBox.value = this.generateZPL('cdu-labels');
      }

    } else if (type === 'bote-labels') {
      const selectedPod = document.getElementById('label-pod-selector')?.value || 'all';
      const cdusToPrint = window.App.getCDUsForPrint(selectedPod);

      cdusToPrint.forEach((cdu, idx) => {
        const card = document.createElement('div');
        card.className = 'zebra-label-preview mx-auto mb-4';
        const qrId = `qr-bote-${idx}`;
        const qrPayload = `BOTE:${cdu.id}`;

        card.innerHTML = `
          <div style="width: 85px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; flex-shrink: 0;">
            <div id="${qrId}" style="width: 75px; height: 75px;"></div>
            <div style="width: 75px; height: 40px; background: #faf5ff; border: 1px solid #d8b4fe; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8.5px; font-weight: 900; color: #6b21a8; text-align: center;">
              REUTILIZABLE
            </div>
          </div>

          <div style="flex: 1; padding-left: 12px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; text-align: left; overflow: hidden;">
            <div>
              <div style="font-size: 8.5px; font-weight: 900; color: #6b21a8; text-transform: uppercase;">CONTENEDOR PERMANENTE QA</div>
              <div style="font-size: 16px; font-weight: 900; color: #3b0764; line-height: 1.1; margin-top: 2px;">BOTE ${cdu.id}</div>
              <div style="font-size: 10.5px; font-weight: 800; color: #000;">Uso exclusivo en ${cdu.pod}</div>
            </div>

            <div style="font-size: 9px; font-weight: bold; color: #334155; line-height: 1.2;">
              <div>Asignado a: <b>${cdu.name}</b></div>
              <div style="font-size: 8px; color: #b91c1c; font-weight: 800; margin-top: 2px;">[!] No remover del rack</div>
              <div style="font-size: 8px; color: #475569;">[!] Lavar y reutilizar en el mismo CDU</div>
            </div>

            <div style="font-size: 7.5px; font-weight: bold; color: #64748b;">
              CoolingTrack Pro Poka-Yoke System
            </div>
          </div>
        `;
        printContainer.appendChild(card);
        setTimeout(() => this.createQRCodeElement(qrId, qrPayload, 75), 40);
      });

      if (zplBox) {
        zplBox.value = this.generateZPL('bote-labels');
      }
    }
  },

  // Impresión térmica exacta calibrada (Bloquea la orientación a 76mm x 51mm portrait sin desbordes)
  printLabels() {
    const type = document.getElementById('label-type-selector')?.value || 'veolia-bidon';

    let iframe = document.getElementById('zebra-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'zebra-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();

    let bodyContent = '';

    if (type === 'veolia-bidon') {
      const activeBatch = window.App.getActiveBatch();
      const qrPayload = `VEOLIA|${activeBatch.week}|${activeBatch.dosingDate}|${activeBatch.responsible}`;

      bodyContent = `
        <div class="label-page">
          <div class="label-inner">
            <div class="left-col">
              <div class="qr-wrap" id="iframe-qr-0"></div>
              <div class="dot-space">Espacio Peca Amarilla</div>
            </div>
            <div class="right-col">
              <div>
                <div class="title-veolia">VEOLIA</div>
                <div class="status-line">Estatus: Fluido con biocida</div>
              </div>
              <div class="mid-section">
                <div class="week-title">${activeBatch.week}</div>
                <div class="date-header">Fecha de dosificación:</div>
                <div class="date-value">${activeBatch.dosingDate}</div>
              </div>
              <div>
                <div class="resp-line">Responsable: ${activeBatch.responsible}</div>
              </div>
            </div>
          </div>
        </div>
        <script>
          new QRCode(document.getElementById('iframe-qr-0'), {
            text: "${qrPayload}",
            width: 75,
            height: 75,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        </script>
      `;
    } else if (type === 'cdu-labels') {
      const selectedPod = document.getElementById('label-pod-selector')?.value || 'all';
      const cdus = window.App.getCDUsForPrint(selectedPod);

      let scripts = '';
      cdus.forEach((cdu, idx) => {
        bodyContent += `
          <div class="label-page">
            <div class="label-inner">
              <div class="left-col">
                <div class="qr-wrap" id="iframe-qr-${idx}"></div>
                <div class="dot-space" style="font-size: 8pt; font-weight: 900;">${cdu.pod}</div>
              </div>
              <div class="right-col">
                <div>
                  <div style="font-size: 7.5pt; font-weight: 900; color: #333;">FLEX QA - COOLING</div>
                  <div class="title-veolia" style="font-size: 14pt;">${cdu.id}</div>
                  <div class="status-line">${cdu.pod} - CDU #${cdu.cduIndex || '1'}</div>
                </div>
                <div class="mid-section" style="font-size: 7.5pt; line-height: 1.2;">
                  <div>Bote: <b>BOTE-${cdu.id}</b></div>
                  <div>pH: 8.0-9.5 | ATP: &lt;1500</div>
                  <div>Cond: 600-700 uS | TDS: &lt;1000</div>
                </div>
                <div>
                  <div style="font-size: 6.5pt; font-weight: 900; text-transform: uppercase;">* Validar con Bote *</div>
                </div>
              </div>
            </div>
          </div>
        `;
        scripts += `
          new QRCode(document.getElementById('iframe-qr-${idx}'), {
            text: "CDU:${cdu.id}",
            width: 75,
            height: 75,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        `;
      });
      bodyContent += `<script>${scripts}</script>`;

    } else if (type === 'bote-labels') {
      const selectedPod = document.getElementById('label-pod-selector')?.value || 'all';
      const cdus = window.App.getCDUsForPrint(selectedPod);

      let scripts = '';
      cdus.forEach((cdu, idx) => {
        bodyContent += `
          <div class="label-page">
            <div class="label-inner">
              <div class="left-col">
                <div class="qr-wrap" id="iframe-qr-${idx}"></div>
                <div class="dot-space" style="font-size: 7pt; font-weight: 900;">REUTILIZABLE</div>
              </div>
              <div class="right-col">
                <div>
                  <div style="font-size: 7pt; font-weight: 900;">CONTENEDOR PERMANENTE</div>
                  <div class="title-veolia" style="font-size: 13pt;">BOTE ${cdu.id}</div>
                  <div class="status-line">Exclusivo ${cdu.pod}</div>
                </div>
                <div class="mid-section" style="font-size: 7pt; line-height: 1.2;">
                  <div>Asignado: <b>${cdu.name}</b></div>
                  <div style="font-weight: 900;">[!] No remover del rack</div>
                  <div>[!] Lavar y reutilizar en CDU</div>
                </div>
                <div>
                  <div style="font-size: 6pt; color: #444;">CoolingTrack Pro Poka-Yoke</div>
                </div>
              </div>
            </div>
          </div>
        `;
        scripts += `
          new QRCode(document.getElementById('iframe-qr-${idx}'), {
            text: "BOTE:${cdu.id}",
            width: 75,
            height: 75,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        `;
      });
      bodyContent += `<script>${scripts}</script>`;
    }

    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impresion Zebra ZQ630</title>
        <style>
          @page {
            size: 76mm 51mm portrait;
            margin: 0mm !important;
          }
          *, *:before, *:after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 76mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .label-page {
            width: 76mm !important;
            height: 51mm !important;
            max-width: 76mm !important;
            max-height: 51mm !important;
            page-break-after: always;
            page-break-inside: avoid;
            overflow: hidden !important;
            padding: 2.5mm 3.5mm 2.5mm 3.5mm !important;
            background: #ffffff !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .label-inner {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: stretch !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .left-col {
            width: 21mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            flex-shrink: 0 !important;
          }
          .qr-wrap {
            width: 20mm !important;
            height: 20mm !important;
          }
          .qr-wrap canvas, .qr-wrap img {
            width: 20mm !important;
            height: 20mm !important;
            display: block !important;
          }
          .dot-space {
            width: 20mm !important;
            height: 13.5mm !important;
            border: 1px dashed #000000 !important;
            border-radius: 2px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 6.5pt !important;
            font-weight: 700 !important;
            text-align: center !important;
            line-height: 1 !important;
            color: #000000 !important;
          }
          .right-col {
            width: 46mm !important;
            flex: 1 !important;
            padding-left: 3mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            text-align: left !important;
            overflow: hidden !important;
          }
          .title-veolia {
            font-size: 13pt !important; /* antes 15 pt */
            font-weight: 900 !important;
            line-height: 1 !important;
            color: #000000 !important;
            letter-spacing: -0.2px !important;
          }
          .status-line {
            font-size: 8pt !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
            color: #000000 !important;
          }
          .mid-section {
            margin: 1px 0 !important;
          }
          .week-title {
            font-size: 11.5pt !important;
            font-weight: 900 !important;
            line-height: 1.1 !important;
            color: #000000 !important;
          }
          .date-header {
            font-size: 7.5pt !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            color: #000000 !important;
            margin-top: 1px !important;
          }
          .date-value {
            font-size: 11.5pt !important;
            font-weight: 900 !important;
            line-height: 1.1 !important;
            color: #000000 !important;
            margin-top: 1px !important;
          }
          .resp-line {
            font-size: 7pt !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            color: #000000 !important;
          }
        </style>
      </head>
      <body>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        ${bodyContent}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 280);
  }
};

window.LabelsManager = LabelsManager;
