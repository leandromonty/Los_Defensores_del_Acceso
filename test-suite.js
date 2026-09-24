const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { AxePuppeteer } = require("@axe-core/puppeteer");

const TARGET_URL = process.argv[2] || "https://dequeuniversity.com/demo/mars/";

// Los 8 casos de prueba documentados en Documento_Sprint2.docx
const CASOS = [
  { id: "CP-01", nombre: "Contraste de color suficiente", axeRule: "color-contrast", wcag: "1.4.3", blocking: true },
  { id: "CP-02", nombre: "Texto alternativo en imágenes", axeRule: "image-alt", wcag: "1.1.1", blocking: true },
  { id: "CP-03", nombre: "Campos de formulario con etiqueta accesible", axeRule: "label", wcag: "1.3.1 / 4.1.2", blocking: true },
  { id: "CP-04", nombre: "Botones con texto discernible", axeRule: "button-name", wcag: "4.1.2", blocking: true },
  { id: "CP-05", nombre: "Enlaces con propósito discernible", axeRule: "link-name", wcag: "2.4.4", blocking: true },
  { id: "CP-06", nombre: "Orden jerárquico correcto de encabezados", axeRule: "heading-order", wcag: "1.3.1", blocking: false },
  { id: "CP-07", nombre: "Idioma del documento declarado", axeRule: "html-has-lang", wcag: "3.1.1", blocking: true },
  { id: "CP-08", nombre: "Atributos ARIA con valores válidos", axeRule: "aria-valid-attr-value", wcag: "4.1.2", blocking: true },
];

function timestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

async function run() {
  const outDir = path.join(__dirname, "reportes");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const logLines = [];
  const log = (line) => {
    console.log(line);
    logLines.push(line);
  };

  log(`=== SUITE DE PRUEBAS DE ACCESIBILIDAD — GRUPO 9 ===`);
  log(`Inicio: ${timestamp()}`);
  log(`Sistema bajo prueba: ${TARGET_URL}`);
  log(`Total de casos a ejecutar: ${CASOS.length}\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const resultados = [];
  let huboFallaBloqueante = false;

  try {
    const page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });

    for (const caso of CASOS) {
      const inicio = timestamp();

      const axeResults = await new AxePuppeteer(page)
        .withRules([caso.axeRule])
        .analyze();

      const violaciones = axeResults.violations.reduce((acc, v) => acc + v.nodes.length, 0);
      const paso = violaciones === 0;
      const estado = paso ? "PASA" : "FALLA";

      if (!paso && caso.blocking) huboFallaBloqueante = true;

      log(
        `[${inicio}] ${caso.id} (${caso.axeRule} · WCAG ${caso.wcag}) — ${estado}` +
        (paso ? "" : ` — ${violaciones} elemento(s) con violación`)
      );

      resultados.push({
        ...caso,
        estado,
        violaciones,
        detalle: axeResults.violations,
        timestamp: inicio,
      });
    }
  } finally {
    await browser.close();
  }

  const fin = timestamp();
  const pasados = resultados.filter((r) => r.estado === "PASA").length;
  const fallados = resultados.length - pasados;

  log(`\n=== RESUMEN ===`);
  log(`Fin: ${fin}`);
  log(`Casos ejecutados: ${resultados.length} | Pasaron: ${pasados} | Fallaron: ${fallados}`);
  log(`Resultado de la suite: ${huboFallaBloqueante ? "FALLA (hay violaciones bloqueantes)" : "OK (sin violaciones bloqueantes)"}`);

  fs.writeFileSync(path.join(outDir, "Ejecucion_Pruebas.log"), logLines.join("\n"));
  fs.writeFileSync(path.join(outDir, "resultados-suite.json"), JSON.stringify(resultados, null, 2));

  console.log(`\nLog guardado en: reportes/Ejecucion_Pruebas.log`);
  console.log(`Detalle guardado en: reportes/resultados-suite.json`);

  
  process.exit(huboFallaBloqueante ? 1 : 0);
}

run().catch((err) => {
  console.error("Error al ejecutar la suite:", err);
  process.exit(1);
});
