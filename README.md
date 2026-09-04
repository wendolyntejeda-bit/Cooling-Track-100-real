# CoolingTrack Pro - Sistema Poka-Yoke para 120 CDUs & Lotes Masivos Veolia

Sistema especializado para la validación a prueba de errores humanos (Poka-Yoke) en el muestreo semanal de **120 CDUs** distribuidos en **20 PODs**, y el control de lotes masivos de bidones con biocida (**Veolia**) con formato de etiqueta para impresora **Zebra ZQ630**.

---

## 🚀 Módulos y Funcionalidades

### 1. 📱 Escáner Poka-Yoke de Match Seguro (0 Errores en Piso)
* **Validación de Bote Fijo Reutilizable:**
  - El técnico escanea el código del CDU (ej. `CDU-P03-02`).
  - Escanea el bote permanente asignado a ese CDU.
  - **✅ MATCH CORRECTO:** Pantalla Verde con confirmación acústica agradable $\rightarrow$ Actualiza automáticamente el cumplimiento de muestreo semanal.
  - **🛑 ERROR POKA-YOKE:** Pantalla Roja con alarma estridente $\rightarrow$ *"¡Bote Equivocado! Este bote pertenece al CDU-P01-04 y estás en el CDU-P03-02"*.
* **Verificador de Bidón Veolia:**
  - Operadores de Manufactura y Pruebas pueden escanear cualquier bidón para verificar que el biocida esté activo (`Week #34 - Wendolyn Tejeda`) antes de alimentar los 16 trays en los racks.
  - Botón de 1-clic para descontar el consumo del stock general (~13 bidones/día).

### 2. 🗺️ Mapa de Planta: 120 CDUs en 20 PODs
* Visualización en cuadrícula con semáforo semanal:
  - 🟢 **Al Día:** Muestreado en los últimos 5 días.
  - 🟡 **Próximo:** Muestreado hace 5 a 7 días.
  - 🔴 **Vencido:** Más de 7 días sin muestreo semanal.
* Filtro instantáneo por POD (del POD-01 al POD-20).

### 3. 🛢️ Lotes Masivos Veolia & Control de Stock
* Alta ágil de lotes masivos preparados por Calidad (~120 bidones/día).
* Contador de inventario en tiempo real con botones de descuento rápido (-1 bidón o -13 bidones del día).

### 4. 🏷️ Generador de Etiquetas Zebra ZQ630
* Réplica exacta del formato de **ZebraDesigner**:
  - **VEOLIA**
  - **Estatus:** Fluido con biocida
  - **Week #XX**
  - **Fecha de dosificación:** DD/MM/YYYY
  - **Responsable:** Wendolyn Tejeda
  - Código QR de alta resolución compatible con el escáner del sistema.
* Generador de etiquetas para CDUs y Botes permanentes organizados por POD.

---

## 🛠️ Cómo Usar

1. Abre el archivo `index.html` en cualquier navegador web en tu computadora, celular o tablet.
2. En la pestaña **📱 Escáner Poka-Yoke**, enciende la cámara o usa los botones de prueba rápida para simular escaneos de CDUs, Botes y Bidones.
3. En la pestaña **🏷️ Etiquetas Zebra ZQ630**, selecciona el formato y haz clic en **"Imprimir en Zebra"**.
