/**
 * Suite final de accesibilidad — Sprint 4
 * Grupo 9 — "Los Defensores del Acceso"
 *
 * Qué cambió respecto del Sprint 2/3 (ver Documento_Sprint4):
 *   1. UN solo análisis de axe-core con las 8 reglas (antes: 8 análisis).
 *   2. Reintentos en la carga de la página (antes: un error de red tiraba todo).
 *   3. Baseline de defectos conocidos: la suite distingue "defecto que ya
 *      sabíamos" de "regresión nueva". Solo la regresión rompe el pipeline.
 *   4. Códigos de salida distintos: 0 = OK, 1 = hallazgos bloqueantes,
 *      2 = error de infraestructura (sitio caído, navegador roto).
 *   5. Reportes automáticos: log, JSON y HTML con métricas.
 *
 * Uso:
 *   node test-suite.js                      -> modo baseline, sitio por defecto
 *   node test-suite.js --modo=estricto      -> cualquier violación falla
 *   node test-suite.js --url=https://otro   -> otro sitio
 *   node test-suite.js --sin-baseline       -> ignora baseline.json
 *
 * Variables de entorno equivalentes (útiles en CI): SUITE_MODO, SUITE_URL.
 */

const fs = require("fs");
const path = require("path");
const { contarNodos, evaluarCaso, resumir, calcularCobertura, MODOS } = require("./lib/evaluar");
const { generarHtml } = require("./lib/reporte");

// ---------- Argumentos ----------
function leerArg(nombre, porDefecto) {
  const prefijo = `--${nombre}=`;
  const arg = process.argv.find((a) => a.startsWith(prefijo));
  return arg ? arg.slice(prefijo.length) : porDefecto;
}

const URL_OBJETIVO = leerArg("url", process.env.SUITE_URL || "https://dequeuniversity.com/demo/mars/");
const MODO = leerArg("modo", process.env.SUITE_MODO || "baseline");
const USAR_BASELINE = !process.argv.includes("--sin-baseline");

// ---------- Los 8 casos (documentados en Documento_Sprint2) ----------
const CASOS = [
  { id: "CP-01", nombre: "Contraste de color suficiente", axeRule: "color-contrast", wcag: "1.4.3", principio: "Perceptible", blocking: true },
  { id: "CP-02", nombre: "Texto alternativo en imágenes", axeRule: "image-alt", wcag: "1.1.1", principio: "Perceptible", blocking: true },
  { id: "CP-03", nombre: "Campos de formulario con etiqueta accesible", axeRule: "label", wcag: "1.3.1 / 4.1.2", principio: "Robusto", blocking: true },
  { id: "CP-04", nombre: "Botones con texto discernible", axeRule: "button-name", wcag: "4.1.2", principio: "Robusto", blocking: true },
  { id: "CP-05", nombre: "Enlaces con propósito discernible", axeRule: "link-name", wcag: "2.4.4", principio: "Operable", blocking: true },
  { id: "CP-06", nombre: "Orden jerárquico correcto de encabezados", axeRule: "heading-order", wcag: "1.3.1", principio: "Perceptible", blocking: false },
  { id: "CP-07", nombre: "Idioma del documento declarado", axeRule: "html-has-lang", wcag: "3.1.1", principio: "Comprensible", blocking: true },
  { id: "CP-08", nombre: "Atributos ARIA con valores válidos", axeRule: "aria-valid-attr-value", wcag: "4.1.2", principio: "Robusto", blocking: true },
];

const MAX_INTENTOS = 3;
const ESPERA_ASENTAR_MS = 1500; // evita "Page/Frame is not ready" (Sprint 2)

function timestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ejecuta fn hasta MAX_INTENTOS veces. Devuelve {valor, reintentos}. */
async function conReintentos(descripcion, fn, log, metricas) {
  let ultimoError;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      return await fn();
    } catch (err) {
      ultimoError = err;
      if (intento < MAX_INTENTOS) {
        metricas.reintentos++;
        log(`  (!) ${descripcion} falló (intento ${intento}/${MAX_INTENTOS}): ${err.message}. Reintentando...`);
        await esperar(2000 * intento);
      }
    }
  }
  throw new Error(`${descripcion} falló tras ${MAX_INTENTOS} intentos: ${ultimoError.message}`);
}

async function run() {
  if (!MODOS.includes(MODO)) {
    console.error(`Modo inválido "${MODO}". Usar: ${MODOS.join(" | ")}`);
    process.exit(2);
  }

  const outDir = path.join(__dirname, "reportes");
  fs.mkdirSync(outDir, { recursive: true });

  const baseline = USAR_BASELINE
    ? JSON.parse(fs.readFileSync(path.join(__dirname, "baseline.json"), "utf8"))
    : {};

  const logLines = [];
  const log = (linea) => {
    console.log(linea);
    logLines.push(linea);
  };

  const t0 = Date.now();
  const inicio = timestamp();
  const metricas = { analisisEjecutados: 0, reintentos: 0, cargaMs: 0, analisisMs: 0 };

  log(`=== SUITE FINAL DE ACCESIBILIDAD — GRUPO 9 ===`);
  log(`Inicio: ${inicio}`);
  log(`Sistema bajo prueba: ${URL_OBJETIVO}`);
  log(`Modo: ${MODO}${USAR_BASELINE ? " (con baseline.json)" : " (sin baseline)"}`);
  log(`Casos a evaluar: ${CASOS.length}\n`);

  // Se cargan acá (y no arriba) para que los tests unitarios no necesiten puppeteer.
  const puppeteer = require("puppeteer");
  const { AxePuppeteer } = require("@axe-core/puppeteer");

  let browser;
  let axeResults;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // 1) Carga de la página con reintentos
    const tCarga = Date.now();
    await conReintentos(
      "Carga de la página",
      async () => {
        await page.goto(URL_OBJETIVO, { waitUntil: "networkidle2", timeout: 30000 });
        await page.waitForSelector("body");
        await esperar(ESPERA_ASENTAR_MS);
      },
      log,
      metricas
    );
    metricas.cargaMs = Date.now() - tCarga;

    // 2) UN solo análisis con las 8 reglas (optimización principal del Sprint 4)
    const tAnalisis = Date.now();
    axeResults = await conReintentos(
      "Análisis de axe-core",
      async () => {
        metricas.analisisEjecutados++;
        return new AxePuppeteer(page).withRules(CASOS.map((c) => c.axeRule)).analyze();
      },
      log,
      metricas
    );
    metricas.analisisMs = Date.now() - tAnalisis;
  } catch (err) {
    // Error de infraestructura: NO es un hallazgo de accesibilidad.
    log(`\nERROR DE INFRAESTRUCTURA: ${err.message}`);
    log(`Esto no significa que el sitio tenga o no problemas de accesibilidad: la suite no pudo medirlos.`);
    fs.writeFileSync(path.join(outDir, "Ejecucion_Pruebas.log"), logLines.join("\n"));
    if (browser) await browser.close();
    process.exit(2);
  }
  await browser.close();

  // 3) Evaluación (lógica pura, probada con tests unitarios)
  const resultados = CASOS.map((caso) => {
    const nodos = contarNodos(axeResults.violations, caso.axeRule);
    const r = evaluarCaso(caso, nodos, baseline, MODO);
    log(
      `[${timestamp()}] ${r.id} (${r.axeRule} · WCAG ${r.wcag}) — ${r.estado}` +
        (r.nodos > 0 ? ` — ${r.nodos} elemento(s) (baseline: ${r.baseline})` : "") +
        (r.mejora ? " — MEJORÓ respecto del baseline" : "") +
        (r.bloquea ? " — BLOQUEA" : "")
    );
    return r;
  });

  const resumen = resumir(resultados);
  const cobertura = calcularCobertura(CASOS);
  const fin = timestamp();
  const duracionMs = Date.now() - t0;

  log(`\n=== RESUMEN ===`);
  log(`Fin: ${fin} · Duración total: ${(duracionMs / 1000).toFixed(1)} s`);
  log(
    `Casos: ${resumen.total} | Pasan: ${resumen.pasan} | Defectos conocidos: ${resumen.conocidos} | ` +
      `Regresiones: ${resumen.regresiones} | Fallas (estricto): ${resumen.fallas}`
  );
  log(`Cobertura: ${cobertura.principios.length}/${cobertura.totalPrincipios} principios POUR; criterios WCAG: ${cobertura.criteriosWcag.join(", ")}`);
  log(`Análisis de axe ejecutados: ${metricas.analisisEjecutados} | Reintentos: ${metricas.reintentos}`);
  log(
    `Resultado de la suite: ${
      resumen.exitCode === 0 ? "OK (sin regresiones ni fallas bloqueantes)" : "FALLA — bloquean: " + resumen.bloqueantes.join(", ")
    }`
  );

  // 4) Reportes automáticos
  const salida = { url: URL_OBJETIVO, modo: MODO, inicio, fin, duracionMs, metricas, cobertura, resumen, resultados };
  fs.writeFileSync(path.join(outDir, "Ejecucion_Pruebas.log"), logLines.join("\n"));
  fs.writeFileSync(path.join(outDir, "resultados-suite.json"), JSON.stringify(salida, null, 2));
  fs.writeFileSync(
    path.join(outDir, "reporte.html"),
    generarHtml({ url: URL_OBJETIVO, modo: MODO, inicio, fin, duracionMs, resultados, resumen, cobertura, metricas })
  );

  // Resumen para la pestaña de la corrida en GitHub Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [
      `## Suite de accesibilidad — ${resumen.exitCode === 0 ? "OK" : "FALLA"}`,
      `Modo: **${MODO}** · Duración: ${(duracionMs / 1000).toFixed(1)} s`,
      "",
      "| Caso | Regla | Estado | Elementos | Baseline |",
      "|---|---|---|---|---|",
      ...resultados.map((r) => `| ${r.id} | ${r.axeRule} | ${r.estado} | ${r.nodos} | ${r.baseline} |`),
    ].join("\n");
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  }

  log(`\nReportes en: reportes/Ejecucion_Pruebas.log, resultados-suite.json, reporte.html`);
  process.exit(resumen.exitCode);
}

run().catch((err) => {
  console.error("Error inesperado en la suite:", err);
  process.exit(2);
});
