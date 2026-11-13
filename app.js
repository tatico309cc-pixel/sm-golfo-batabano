const DB_NAME = "sm-golfo-batabano";
const DB_VERSION = 1;
let db = null;
let currentRecord = null;
let latestEvaluation = null;
let latestPortCheck = null;
let installPrompt = null;

const $ = (id) => document.getElementById(id);
const DEMO_RECORD = {
  id: "demo-scenario-v1",
  mode: "demo",
  source: "ESCENARIO SINTÉTICO DE PRUEBA — NO ES PRONÓSTICO",
  issuedAt: "NO APLICA — DEMOSTRACIÓN",
  validFrom: "NO APLICA",
  validTo: "NO APLICA",
  sector: "SIN_ASIGNAR",
  windDirection: "NE (dato sintético)",
  windBeaufort: 5,
  windKnots: 18,
  seaDouglas: 4,
  waveHeight: 1.6,
  waveDirection: "E (dato sintético)",
  notes: "Valores ficticios únicamente para comprobar el funcionamiento de las reglas. No representan observaciones ni pronósticos reales.",
  createdAt: new Date().toISOString()
};

const PORT_AREAS = {
  manteca: {
    name: "Pasa de la Manteca",
    maxLOA: 120, maxDraft: 3.51, maxWind: 4, daylightOnly: false,
    notes: ["Entradas y salidas en cualquier horario, con vientos no superiores a fuerza 4.", "No pueden navegar dos buques al mismo tiempo dentro de la Pasa.", "Prioridad de cruce según el orden establecido en el Libro de Calados."]
  },
  monterrey: {
    name: "Canal de Monterrey",
    maxLOA: 120, maxDraft: 3.51, maxWind: 4, daylightOnly: false,
    notes: ["Entradas y salidas en cualquier horario, con vientos no superiores a fuerza 4.", "El Libro de Calados indica una separación mínima de 3 cables respecto a las boyas del centro del canal, por la banda de babor."]
  },
  siguanea: {
    name: "Canal de entrada — Siguanea (Nueva Gerona)",
    maxLOA: 180, maxDraft: 5.64, maxWind: 5, daylightOnly: true,
    notes: ["Entradas y salidas en horario diurno.", "Parámetros del acceso; verificar condiciones y autorizaciones vigentes."]
  },
  lasCasas: {
    name: "Canal de entrada — Río Las Casas (Nueva Gerona)",
    maxLOA: 130, maxDraft: 4.45, maxWind: 5, daylightOverLOA: 100,
    notes: ["Viento no superior a fuerza 5.", "Horario diurno obligatorio para embarcaciones de más de 100 m.", "Durante la entrada o salida de catamaranes, no lo hará ningún otro buque."]
  },
  batabanoFerry: {
    name: "Muelle carga general — Ferry (Batabanó)",
    maxLOA: 100, maxDraft: 2.80, ferryDraft: 2.70, maxWind: 3, daylightOnly: true,
    notes: ["No se permiten operaciones nocturnas.", "No maniobrar con vientos superiores a fuerza 3.", "El calado operativo del ferry no será superior a 2,70 m.", "Durante maniobras y permanencia del ferry se restringe la presencia de otras embarcaciones en la zona de atraque indicada en el Libro."]
  },
  cayoAnchorage: {
    name: "Fondeadero internacional — Cayo Largo",
    maxLOA: 200, maxDraft: 6.50, maxWind: 5, daylightOnly: true,
    notes: ["Fondeo y leva en horario diurno.", "Vientos no superiores a fuerza 5.", "El práctico permanecerá a bordo desde la entrada hasta la salida."]
  },
  cayoGeneral: {
    name: "Muelle carga general — Cayo Largo",
    maxLOA: 50, maxDraft: 3.80, maxWind: null, daylightOnly: false,
    notes: ["Velocidad máxima de atraque: 0,08 m/s; ángulo de incidencia no mayor de 10°.", "Catamaranes de pasaje: atraque/desatraque solo cuando no existan otras embarcaciones atracadas.", "No simultanear carga/descarga con operaciones de embarque de pasajeros.", "La ficha recuperada no establece aquí un límite de viento; esto no significa que no existan otras restricciones."]
  },
  cayoAridos: {
    name: "Muelle de áridos — Cayo Largo",
    maxLOA: 30, maxDraft: 3.10, maxWind: null, daylightOnly: true,
    notes: ["Se prohíben maniobras y operaciones en horario nocturno.", "Velocidad máxima de atraque: 0,08 m/s; ángulo de incidencia no mayor de 10°.", "No se recuperó en la ficha consultada un límite de viento específico para este muelle."]
  }
};

function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => node.classList.remove("show"), 2600);
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return resolve(null);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("records")) database.createObjectStore("records", { keyPath: "id" });
      if (!database.objectStoreNames.contains("settings")) database.createObjectStore("settings", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function idbPut(store, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      try {
        const key = store === "records" ? "sm-golfo-records" : "sm-golfo-settings";
        const old = JSON.parse(localStorage.getItem(key) || (store === "records" ? "[]" : "{}"));
        if (store === "records") {
          const idx = old.findIndex(x => x.id === value.id);
          if (idx >= 0) old[idx] = value; else old.push(value);
        } else old[value.key] = value;
        localStorage.setItem(key, JSON.stringify(old));
        resolve(true);
      } catch (e) { reject(e); }
      return;
    }
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    if (!db) {
      try {
        const key = store === "records" ? "sm-golfo-records" : "sm-golfo-settings";
        const value = JSON.parse(localStorage.getItem(key) || (store === "records" ? "[]" : "{}"));
        resolve(store === "records" ? value : Object.values(value));
      } catch (e) { reject(e); }
      return;
    }
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
function idbDelete(store, id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      const key = store === "records" ? "sm-golfo-records" : "sm-golfo-settings";
      const arr = JSON.parse(localStorage.getItem(key) || "[]").filter(x => x.id !== id);
      localStorage.setItem(key, JSON.stringify(arr));
      resolve(true); return;
    }
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

function formatDate(value) {
  if (!value || value === "NO APLICA" || value.startsWith?.("NO APLICA")) return value || "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}
function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function sectorLabel(value) {
  return value === "SIN_ASIGNAR" ? "Sin asignación inequívoca" : (value || "No informado");
}
function updateConnection() {
  const online = navigator.onLine;
  $("connectionBadge").textContent = online ? "En línea" : "Sin conexión";
  $("connectionBadge").className = "status-badge " + (online ? "status-online" : "status-offline");
  $("connectionText").textContent = online ? "En línea" : "Sin conexión";
  $("connectionDetail").textContent = online ? "La red está disponible; no implica feed meteo activo" : "Funciones locales disponibles";
}
function renderWeather() {
  const r = currentRecord;
  if (!r) {
    $("forecastStatus").textContent = "Sin datos";
    $("forecastDetail").textContent = "No hay fuente real conectada";
    $("weatherModeBadge").textContent = "SIN DATOS";
    $("weatherModeBadge").className = "mode-badge";
    $("windValue").textContent = "—";
    $("windMeta").textContent = "Sin registro";
    $("waveValue").textContent = "—";
    $("waveMeta").textContent = "Sin registro";
    $("weatherSource").textContent = "No disponible";
    $("weatherValidity").textContent = "No hay periodo de validez registrado";
    $("lastUpdate").textContent = "—";
    return;
  }
  const demo = r.mode === "demo";
  $("forecastStatus").textContent = demo ? "Demostración" : "Registro manual";
  $("forecastDetail").textContent = demo ? "No es un pronóstico real" : "Transcripción no verificada automáticamente";
  $("weatherModeBadge").textContent = demo ? "DATOS DEMOSTRATIVOS" : "ENTRADA MANUAL";
  $("weatherModeBadge").className = "mode-badge " + (demo ? "warning-badge" : "");
  $("windValue").textContent = `Beaufort ${r.windBeaufort}${r.windKnots != null ? ` · ${r.windKnots} kn` : ""}`;
  $("windMeta").textContent = `${r.windDirection || "Dirección no informada"}`;
  $("waveValue").textContent = `Douglas ${r.seaDouglas}${r.waveHeight != null ? ` · ${r.waveHeight} m` : ""}`;
  $("waveMeta").textContent = `${r.waveDirection || "Dirección no informada"}`;
  $("weatherSource").textContent = r.source || "No informada";
  $("weatherValidity").textContent = demo ? "Sin periodo real de validez" : `${formatDate(r.validFrom)} — ${formatDate(r.validTo)} · Sector ${sectorLabel(r.sector)}`;
  $("lastUpdate").textContent = demo ? "Escenario demo" : formatDate(r.createdAt);
}
async function renderRecords() {
  const records = (await idbGetAll("records")).sort((a,b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  $("recordCount").textContent = records.length;
  if (!records.length) {
    $("recordsList").innerHTML = '<p class="muted">Todavía no hay registros locales.</p>';
    return;
  }
  $("recordsList").innerHTML = records.slice(0,12).map(r => `
    <div class="record-item">
      <div><strong>${safe(r.source)}</strong><small>${safe(r.mode === "demo" ? "Escenario demostrativo" : `${formatDate(r.issuedAt)} · Sector ${sectorLabel(r.sector)}`)}</small></div>
      <span class="record-chip ${r.mode === "demo" ? "demo" : ""}">${r.mode === "demo" ? "DEMO" : "MANUAL"}</span>
    </div>`).join("");
}
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${tab}`));
  if (tab === "informes") renderReportPreview();
}
function classifyVessel(gt, loa) {
  if (!Number.isFinite(gt) || !Number.isFinite(loa)) return null;
  return (gt < 100 || loa < 24) ? "reducida" : "resto";
}
function evaluateSecurity() {
  const gt = Number($("vesselGT").value);
  const loa = Number($("vesselLOA").value);
  const r = currentRecord;
  const node = $("evaluationResult");
  if (!r || !Number.isFinite(gt) || !Number.isFinite(loa) || $("vesselGT").value === "" || $("vesselLOA").value === "") {
    latestEvaluation = {status:"incompleto", message:"No es posible evaluar: faltan el registro de viento/oleaje o los datos de arqueo bruto y eslora."};
    node.className = "result-card empty-result";
    node.innerHTML = `<strong>Datos insuficientes</strong><p>${safe(latestEvaluation.message)}</p>`;
    return;
  }
  const category = classifyVessel(gt, loa);
  const windLimit = category === "reducida" ? 4 : 5;
  const seaLimit = category === "reducida" ? 3 : 4;
  const windKnown = Number.isFinite(Number(r.windBeaufort));
  const seaKnown = Number.isFinite(Number(r.seaDouglas));
  if (!windKnown || !seaKnown) {
    latestEvaluation = {status:"incompleto", message:"Falta la fuerza Beaufort del viento o la fuerza Douglas del estado de la mar."};
    node.className = "result-card empty-result";
    node.innerHTML = `<strong>Evaluación incompleta</strong><p>${safe(latestEvaluation.message)}</p>`;
    return;
  }
  const windExceeds = Number(r.windBeaufort) > windLimit;
  const seaExceeds = Number(r.seaDouglas) > seaLimit;
  const demoNote = r.mode === "demo" ? " ATENCIÓN: se utilizaron valores sintéticos de demostración, no un pronóstico real." : " La entrada es una transcripción manual no verificada automáticamente.";
  const details = [
    `Clase aplicada: ${category === "reducida" ? "GT < 100 o eslora < 24 m" : "resto de los buques"}.`,
    `Viento: Beaufort ${r.windBeaufort}; criterio: no superar fuerza ${windLimit} (se activa si es superior).`,
    `Estado de la mar: Douglas ${r.seaDouglas}; criterio: no superar fuerza ${seaLimit} (se activa si es superior).`,
    `Resultado: ${windExceeds ? "supera el criterio de viento" : "no supera el criterio de viento"}; ${seaExceeds ? "supera el criterio de mar" : "no supera el criterio de mar"}.`
  ];
  let status = "dentro";
  let title = "No se observa superación de los umbrales comparados";
  let paragraph = "Esta conclusión se limita a los dos criterios de DSIM 05/2008 aquí comparados. No significa riesgo nulo ni sustituye la valoración de rachas, tormentas, visibilidad, maniobra, exposición, estado del buque y demás restricciones.";
  let cls = "good";
  if (windExceeds || seaExceeds) {
    status = "supera";
    title = "Se detecta superación de un criterio de referencia";
    paragraph = "Recomendación técnica: no iniciar o revisar preventivamente la navegación en el sector y periodo evaluados, hasta nueva evaluación con información oficial. La decisión corresponde a la autoridad marítima competente.";
    cls = "danger";
  }
  latestEvaluation = {status, title, paragraph, category, windLimit, seaLimit, windExceeds, seaExceeds, details, demo:r.mode === "demo", source:r.source};
  node.className = `result-card ${cls}`;
  node.innerHTML = `<strong>${safe(title)}</strong><p>${safe(paragraph + demoNote)}</p><ul>${details.map(x=>`<li>${safe(x)}</li>`).join("")}</ul>`;
}
function selectedPort() {
  return PORT_AREAS[$("portArea").value];
}
function renderPortReference() {
  const p = selectedPort();
  const lines = [
    `<strong>${safe(p.name)}</strong>`,
    `Eslora máxima: ${p.maxLOA.toFixed(2)} m · Calado máximo: ${p.maxDraft.toFixed(2)} m`,
    p.maxWind == null ? "No se recuperó un límite de viento específico para esta ficha." : `Viento: no superior a fuerza ${p.maxWind} Beaufort`,
    ...(p.daylightOnly ? ["Horario diurno obligatorio."] : []),
    ...p.notes
  ];
  $("portReference").innerHTML = `<h3>Referencia transcrita</h3><ul>${lines.slice(1).map(x=>`<li>${safe(x)}</li>`).join("")}</ul><small>Libro de Calados 2026. Parámetros sujetos a verificación de edición, certificado, actualizaciones y autorización local.</small>`;
}
function checkPort() {
  const p = selectedPort();
  const loa = Number($("portLOA").value);
  const draft = Number($("portDraft").value);
  const windRaw = $("portWind").value;
  const wind = windRaw === "" ? null : Number(windRaw);
  const daylight = $("daylightCheck").checked;
  const noTraffic = $("noTrafficCheck").checked;
  const type = $("portVesselType").value;
  const result = [];
  if ($("portLOA").value === "" || $("portDraft").value === "") {
    latestPortCheck = {status:"incompleto", items:["Faltan eslora y/o calado del buque."]};
    $("portResult").className = "result-card empty-result";
    $("portResult").innerHTML = "<strong>Datos insuficientes</strong><p>Introduce eslora y calado antes de comprobar.</p>";
    return;
  }
  if (loa > p.maxLOA) result.push(`Eslora ${loa.toFixed(2)} m superior al máximo ${p.maxLOA.toFixed(2)} m.`);
  else result.push(`Eslora dentro del máximo recuperado (${p.maxLOA.toFixed(2)} m).`);
  let draftLimit = p.maxDraft;
  if ($("portArea").value === "batabanoFerry" && type === "ferry") draftLimit = p.ferryDraft;
  if (draft > draftLimit) result.push(`Calado ${draft.toFixed(2)} m superior al máximo aplicable ${draftLimit.toFixed(2)} m.`);
  else result.push(`Calado dentro del máximo aplicado (${draftLimit.toFixed(2)} m).`);
  if (p.maxWind != null) {
    if (wind == null) result.push(`Falta viento Beaufort para comprobar el límite de fuerza ${p.maxWind}.`);
    else if (wind > p.maxWind) result.push(`Viento fuerza ${wind}: supera el máximo ${p.maxWind}.`);
    else result.push(`Viento fuerza ${wind}: dentro del máximo recuperado ${p.maxWind}.`);
  }
  if (p.daylightOnly || (p.daylightOverLOA && loa > p.daylightOverLOA)) {
    if (!daylight) result.push("Condición horaria no confirmada: el acceso requiere horario diurno para este caso.");
    else result.push("Condición horaria diurna declarada.");
  }
  if ($("portArea").value === "manteca") {
    if (!noTraffic) result.push("No está confirmada la condición de no simultaneidad de dos buques dentro de la Pasa.");
    else result.push("Condición de no simultaneidad declarada por el usuario.");
  }
  if ($("portArea").value === "batabanoFerry" && type === "ferry" && draft > p.ferryDraft) result.push("El calado operativo del ferry no debe superar 2,70 m.");
  const hardFail = loa > p.maxLOA || draft > draftLimit || (p.maxWind != null && wind != null && wind > p.maxWind);
  const unresolved = (p.maxWind != null && wind == null) || ((p.daylightOnly || (p.daylightOverLOA && loa > p.daylightOverLOA)) && !daylight) || ($("portArea").value === "manteca" && !noTraffic);
  const cls = hardFail ? "danger" : unresolved ? "alert" : "good";
  const title = hardFail ? "Se detecta incumplimiento de un parámetro introducido" : unresolved ? "Comprobación parcial: faltan condiciones por confirmar" : "Parámetros numéricos dentro de los límites transcritos";
  latestPortCheck = {status:hardFail ? "supera" : unresolved ? "incompleto" : "dentro", area:p.name, items:result};
  $("portResult").className = `result-card ${cls}`;
  $("portResult").innerHTML = `<strong>${safe(title)}</strong><ul>${result.map(x=>`<li>${safe(x)}</li>`).join("")}</ul><p>Esta comprobación no valida sondajes actuales, marea, batimetría, certificados vigentes, avisos a los navegantes ni autorización del práctico o autoridad portuaria.</p>`;
}
function renderReportPreview() {
  const r = currentRecord;
  const evalText = latestEvaluation ? latestEvaluation.title || latestEvaluation.message : "No se ha ejecutado una evaluación.";
  $("reportPreview").innerHTML = `<span class="eyebrow">VISTA PREVIA</span><h3>Informe de evaluación hidrometeorológica</h3><p><strong>Registro:</strong> ${r ? safe(r.mode === "demo" ? "Demostrativo — NO REAL" : r.source) : "Sin pronóstico registrado"}.</p><p><strong>Viento:</strong> ${r ? `Beaufort ${safe(r.windBeaufort)}` : "No disponible"} · <strong>Mar:</strong> ${r ? `Douglas ${safe(r.seaDouglas)}` : "No disponible"}.</p><p><strong>Evaluación:</strong> ${safe(evalText)}</p><p class="muted">El DOCX incluye las limitaciones documentales y la advertencia de que no es una orden administrativa.</p>`;
}
function xmlEscape(value) {
  return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
function docParagraph(text, style="Normal") {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i=0;i<bytes.length;i++) {
    crc ^= bytes[i];
    for (let j=0;j<8;j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipStore(files) {
  const enc = new TextEncoder();
  const localParts = [], centralParts = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name);
    const data = enc.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true); lv.setUint16(6,0x0800,true);
    lv.setUint16(8,0,true); lv.setUint16(10,0,true); lv.setUint16(12,0x0021,true);
    lv.setUint32(14,crc,true); lv.setUint32(18,data.length,true); lv.setUint32(22,data.length,true);
    lv.setUint16(26,nameBytes.length,true); lv.setUint16(28,0,true); local.set(nameBytes,30);
    localParts.push(local,data);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true); cv.setUint16(10,0,true); cv.setUint16(12,0,true); cv.setUint16(14,0x0021,true);
    cv.setUint32(16,crc,true); cv.setUint32(20,data.length,true); cv.setUint32(24,data.length,true);
    cv.setUint16(28,nameBytes.length,true); cv.setUint16(30,0,true); cv.setUint16(32,0,true);
    cv.setUint16(34,0,true); cv.setUint16(36,0,true); cv.setUint32(38,0,true); cv.setUint32(42,offset,true);
    central.set(nameBytes,46); centralParts.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centralParts.reduce((s,p)=>s+p.length,0);
  const count = Object.keys(files).length;
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(4,0,true); ev.setUint16(6,0,true);
  ev.setUint16(8,count,true); ev.setUint16(10,count,true); ev.setUint32(12,centralSize,true);
  ev.setUint32(16,offset,true); ev.setUint16(20,0,true);
  return new Blob([...localParts,...centralParts,end], {type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
function generateDocx() {
  const r = currentRecord;
  const gt = $("vesselGT").value || "No informado";
  const loa = $("vesselLOA").value || "No informado";
  const parts = [];
  parts.push(docParagraph("SM-GOLFO-BATABANÓ", "Title"));
  parts.push(docParagraph("INFORME TÉCNICO DE EVALUACIÓN HIDROMETEOROLÓGICA", "Subtitle"));
  parts.push(docParagraph("Documento generado localmente por el prototipo PWA 0.1.0. No constituye una orden administrativa ni sustituye la decisión de la autoridad marítima.", "Normal"));
  parts.push(docParagraph("1. IDENTIFICACIÓN", "Heading1"));
  parts.push(docParagraph(`Fecha de generación: ${new Date().toLocaleString("es-ES")}`));
  parts.push(docParagraph(`Buque — arqueo bruto: ${gt} GT`));
  parts.push(docParagraph(`Buque — eslora: ${loa} m`));
  parts.push(docParagraph("Ruta de referencia: Nueva Gerona — Surgidero de Batabanó — Cayo Largo del Sur."));
  parts.push(docParagraph("2. FUENTE Y VIGENCIA DEL PRONÓSTICO", "Heading1"));
  if (r) {
    parts.push(docParagraph(`Fuente registrada: ${r.source}`));
    parts.push(docParagraph(`Tipo de registro: ${r.mode === "demo" ? "ESCENARIO DEMOSTRATIVO SINTÉTICO — NO ES UN PRONÓSTICO REAL" : "Transcripción manual local; autenticidad no verificada por la aplicación"}`));
    parts.push(docParagraph(`Emisión: ${r.issuedAt}`));
    parts.push(docParagraph(`Periodo de validez: ${r.validFrom} a ${r.validTo}`));
    parts.push(docParagraph(`Sector: ${sectorLabel(r.sector)}`));
  } else {
    parts.push(docParagraph("No existe pronóstico real ni registro meteorológico almacenado. No se emite conclusión meteorológica."));
  }
  parts.push(docParagraph("3. VIENTO Y ESTADO DE LA MAR", "Heading1"));
  if (r) {
    parts.push(docParagraph(`Viento: fuerza Beaufort ${r.windBeaufort}; dirección ${r.windDirection || "no informada"}; velocidad ${r.windKnots ?? "no informada"} nudos.`));
    parts.push(docParagraph(`Estado de la mar: fuerza Douglas ${r.seaDouglas}; altura ${r.waveHeight ?? "no informada"} m; dirección ${r.waveDirection || "no informada"}.`));
    parts.push(docParagraph(`Observaciones: ${r.notes || "Sin observaciones."}`));
  } else {
    parts.push(docParagraph("Viento y oleaje: no disponibles."));
  }
  parts.push(docParagraph("4. EVALUACIÓN SEGÚN DSIM 05/2008, ARTÍCULO 4", "Heading1"));
  if (latestEvaluation && latestEvaluation.details) {
    parts.push(docParagraph(`Resultado: ${latestEvaluation.title}`));
    latestEvaluation.details.forEach(x => parts.push(docParagraph(x)));
    parts.push(docParagraph(latestEvaluation.paragraph));
    if (latestEvaluation.demo) parts.push(docParagraph("ADVERTENCIA: la evaluación utiliza exclusivamente datos sintéticos de demostración; no tiene validez como análisis de condiciones reales."));
  } else {
    parts.push(docParagraph("No se ha ejecutado una evaluación completa. Se requieren datos meteorológicos y arqueo bruto/eslora."));
  }
  parts.push(docParagraph("Criterios incorporados: buques con GT < 100 o eslora < 24 m: mar superior a fuerza 3 Douglas o viento superior a fuerza 4 Beaufort. Resto: mar superior a fuerza 4 Douglas o viento superior a fuerza 5 Beaufort."));
  parts.push(docParagraph("5. COMPROBACIÓN DE PUERTOS Y CALADOS", "Heading1"));
  if (latestPortCheck) {
    parts.push(docParagraph(`Área: ${latestPortCheck.area || "No informada"}; estado: ${latestPortCheck.status}.`));
    (latestPortCheck.items || []).forEach(x => parts.push(docParagraph(x)));
  } else {
    parts.push(docParagraph("No se ha ejecutado comprobación de parámetros portuarios en esta sesión."));
  }
  parts.push(docParagraph("6. LIMITACIONES Y RECOMENDACIÓN", "Heading1"));
  parts.push(docParagraph("La aplicación no está conectada a ECMWF, NOAA, Copernicus Marine ni al Centro de Pronóstico de la Isla de la Juventud. No consulta cartas, avisos, observaciones ni pronósticos vigentes."));
  parts.push(docParagraph("La sectorización A–F se presenta de forma esquemática y no georreferenciada. Faltan los límites cartográficos oficiales completos."));
  parts.push(docParagraph("Los parámetros portuarios se transcribieron del Libro de Calados 2026; debe verificarse su edición vigente, certificados, actualizaciones, batimetría, marea y autorización de la autoridad/práctico."));
  parts.push(docParagraph("La Instrucción DSIM 05/2008 se incorpora conforme a la indicación del usuario de que es la referencia vigente y de que la Instrucción 1/2025 fue desechada. No se dispone en este expediente de evidencia formal que documente esa situación jurídica."));
  parts.push(docParagraph("La recomendación generada por el prototipo es exclusivamente técnica. No constituye cierre de puerto, suspensión legal de navegación ni autorización de salida."));
  parts.push(docParagraph("FIN DEL DOCUMENTO", "Heading1"));
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${parts.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="0B2942"/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="176B91"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="176B91"/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Informe SM-GOLFO-BATABANÓ</dc:title><dc:creator>Prototipo SM-GOLFO-BATABANÓ</dc:creator></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SM-GOLFO-BATABANÓ PWA</Application></Properties>`;
  const blob = zipStore({
    "[Content_Types].xml":contentTypes,
    "_rels/.rels":rels,
    "word/document.xml":documentXml,
    "word/styles.xml":stylesXml,
    "docProps/core.xml":core,
    "docProps/app.xml":app
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "Informe_SM-GOLFO-BATABANO.docx";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast("Informe DOCX generado en el dispositivo.");
}
async function exportJSON() {
  const records = await idbGetAll("records");
  const payload = {application:"SM-GOLFO-BATABANÓ",version:"0.1.0",exportedAt:new Date().toISOString(),records};
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="SM-GOLFO-BATABANO_datos_locales.json"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function setCurrentRecord(record, persist=false) {
  currentRecord = record;
  if (persist) await idbPut("records", record);
  renderWeather();
  await renderRecords();
  renderReportPreview();
}
function setDefaultDates() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $("issuedInput").value = local;
  $("validFromInput").value = local;
  const later = new Date(now.getTime() + 6*3600000 - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $("validToInput").value = later;
}
async function init() {
  try { db = await openDB(); } catch(e) { db = null; toast("IndexedDB no disponible; se intentará almacenamiento local alternativo."); }
  const records = await idbGetAll("records").catch(()=>[]);
  if (records.length) {
    records.sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
    currentRecord = records[0];
  }
  updateConnection();
  renderWeather();
  await renderRecords();
  renderPortReference();
  setDefaultDates();
  renderReportPreview();
  await registerOfflineSupport();
}

async function registerOfflineSupport() {
  const status = $("pwaStatus");
  const detail = $("pwaDetail");
  if (!("serviceWorker" in navigator)) {
    status.textContent = "Este navegador no admite Service Worker.";
    detail.textContent = "Prueba con una versión actualizada de Google Chrome para Android.";
    return;
  }
  const secureContext = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!secureContext) {
    status.textContent = "Se necesita HTTPS para activar el modo instalable.";
    detail.textContent = "Publica la aplicación en un alojamiento HTTPS y vuelve a abrirla en Chrome.";
    return;
  }
  try {
    await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
    await navigator.serviceWorker.ready;
    status.textContent = navigator.serviceWorker.controller ? "Modo offline activo en esta sesión." : "Service Worker instalado; recarga una vez para tomar el control.";
    detail.textContent = "La caché se prepara con los recursos locales. Aún debe probarse desconectando la red del teléfono.";
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      status.textContent = "Modo offline activo en esta sesión.";
    });
  } catch (error) {
    status.textContent = "No se pudo activar el modo offline.";
    detail.textContent = `Detalle del navegador: ${error.message || "error de registro"}`;
  }
}

async function checkOfflineCache() {
  const output = $("cacheStatus");
  if (!("caches" in window)) {
    output.textContent = "Cache Storage no está disponible en este navegador.";
    return;
  }
  try {
    const names = await caches.keys();
    const appCache = names.find(name => name === "sm-golfo-batabano-v020");
    if (!appCache) {
      output.textContent = "No se encontró la caché v0.2.0. Abre la aplicación con Internet y espera a que termine la primera carga.";
      return;
    }
    const cache = await caches.open(appCache);
    const requests = await cache.keys();
    output.textContent = `Caché v0.2.0 encontrada: ${requests.length} recursos guardados en este dispositivo.`;
  } catch (error) {
    output.textContent = `No se pudo consultar la caché: ${error.message || "error"}`;
  }
}
document.querySelectorAll(".tab").forEach(button => button.addEventListener("click",()=>showTab(button.dataset.tab)));
$("goMeteoButton").addEventListener("click",()=>showTab("meteorologia"));
$("loadDemoButton").addEventListener("click",async()=>{ await setCurrentRecord({...DEMO_RECORD, createdAt:new Date().toISOString()}, true); toast("Escenario sintético cargado. No es un pronóstico real."); });
$("clearWeatherButton").addEventListener("click",()=>{ currentRecord=null; latestEvaluation=null; latestPortCheck=null; renderWeather(); renderReportPreview(); $("evaluationResult").className="result-card empty-result"; $("evaluationResult").innerHTML="<strong>Evaluación pendiente</strong><p>No hay datos meteorológicos seleccionados.</p>"; toast("Panel meteorológico limpiado. Los registros guardados se conservan."); });
$("forecastForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const record = {
    id: `manual-${Date.now()}`, mode:"manual", source:$("sourceInput").value.trim(),
    issuedAt:$("issuedInput").value, validFrom:$("validFromInput").value, validTo:$("validToInput").value,
    sector:$("sectorInput").value, windDirection:$("windDirInput").value.trim(),
    windBeaufort:Number($("windBInput").value), windKnots:$("windKnotsInput").value===""?null:Number($("windKnotsInput").value),
    seaDouglas:Number($("seaDInput").value), waveHeight:$("waveHeightInput").value===""?null:Number($("waveHeightInput").value),
    waveDirection:$("waveDirInput").value.trim(), notes:$("notesInput").value.trim(), createdAt:new Date().toISOString()
  };
  if (new Date(record.validTo) < new Date(record.validFrom)) { toast("La validez hasta no puede ser anterior a la validez desde."); return; }
  await setCurrentRecord(record,true);
  e.target.reset(); setDefaultDates();
  toast("Registro guardado localmente en este teléfono.");
});
$("resetForecastForm").addEventListener("click",()=>setTimeout(setDefaultDates,0));
$("evaluateButton").addEventListener("click",evaluateSecurity);
$("portArea").addEventListener("change",renderPortReference);
$("checkPortButton").addEventListener("click",checkPort);
$("generateDocxButton").addEventListener("click",generateDocx);
$("exportJsonButton").addEventListener("click",exportJSON);
window.addEventListener("online",updateConnection);
window.addEventListener("offline",updateConnection);
$("checkOfflineButton").addEventListener("click",checkOfflineCache);
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installButton").classList.remove("hidden");});
$("installButton").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("installButton").classList.add("hidden");});
init();
