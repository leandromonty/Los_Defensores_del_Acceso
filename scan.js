const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { AxePuppeteer } = require("@axe-core/puppeteer");

const TARGET_URL = process.argv[2] || "https://dequeuniversity.com/demo/mars/";

async function run() {
  console.log(`Escaneando: ${TARGET_URL}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });

    const results = await new AxePuppeteer(page).analyze();

    const outDir = path.join(__dirname, "reportes");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    const outPath = path.join(outDir, "reporte-axe.json");
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

    console.log("\n=== RESUMEN DEL ESCANEO ===");
    console.log(`URL analizada: ${results.url}`);
    console.log(`Violaciones encontradas: ${results.violations.length}`);
    console.log(`Elementos pasados (sin problemas): ${results.passes.length}`);
    console.log(`Necesitan revisión manual: ${results.incomplete.length}`);

    if (results.violations.length > 0) {
      console.log("\n--- Detalle de violaciones ---");
      results.violations.forEach((v, i) => {
        console.log(`${i + 1}. [${v.impact}] ${v.id}: ${v.description}`);
        console.log(`   Ayuda: ${v.helpUrl}`);
        console.log(`   Elementos afectados: ${v.nodes.length}`);
      });
    }

    console.log(`\nReporte completo guardado en: ${outPath}`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Error al ejecutar el escaneo:", err);
  process.exit(1);
});