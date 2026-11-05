/**
 * Suite del Sprint 2/3, CONGELADA para el benchmark (no usar para otra cosa).
 * Es la versión "antes": un análisis de axe-core POR CASO (8 en total),
 * sin reintentos y sin baseline. Se conserva para poder medir el "antes"
 * contra el "después" (test-suite.js) con la misma página y el mismo método.
 *
 * Uso: node benchmark/suite-sprint3.js <url>
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { AxePuppeteer } = require("@axe-core/puppeteer");

const TARGET_URL = process.argv[2] || "https://dequeuniversity.com/demo/mars/";

const CASOS = [
  { id: "CP-01", axeRule: "color-contrast", blocking: true },
  { id: "CP-02", axeRule: "image-alt", blocking: true },
  { id: "CP-03", axeRule: "label", blocking: true },
  { id: "CP-04", axeRule: "button-name", blocking: true },
  { id: "CP-05", axeRule: "link-name", blocking: true },
  { id: "CP-06", axeRule: "heading-order", blocking: false },
  { id: "CP-07", axeRule: "html-has-lang", blocking: true },
  { id: "CP-08", axeRule: "aria-valid-attr-value", blocking: true },
];

async function run() {
  const outDir = process.env.SUITE_OUT_DIR || path.join(__dirname, "reportes");
  fs.mkdirSync(outDir, { recursive: true });

  const logLines = [];
  const resultados = [];
  let huboFallaBloqueante = false;

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("body");
    await new Promise((r) => setTimeout(r, 1500));

    for (const caso of CASOS) {
      const axeResults = await new AxePuppeteer(page).withRules([caso.axeRule]).analyze(); // 1 análisis por caso
      const violaciones = axeResults.violations.reduce((acc, v) => acc + v.nodes.length, 0);
      if (violaciones > 0 && caso.blocking) huboFallaBloqueante = true;
      logLines.push(`${caso.id} ${caso.axeRule} ${violaciones === 0 ? "PASA" : "FALLA"} ${violaciones}`);
      resultados.push({ id: caso.id, nodos: violaciones });
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(outDir, "Ejecucion_Pruebas.log"), logLines.join("\n"));
  fs.writeFileSync(path.join(outDir, "resultados-suite.json"), JSON.stringify({ resultados }, null, 2));
  process.exit(huboFallaBloqueante ? 1 : 0);
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(2);
});
