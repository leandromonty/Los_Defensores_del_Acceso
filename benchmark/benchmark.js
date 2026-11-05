/**
 * Benchmark antes/después — Sprint 4
 * Grupo 9 — "Los Defensores del Acceso"
 *
 * Mide cuánto tarda la suite ANTERIOR (Sprint 3, 8 análisis de axe) contra la
 * suite NUEVA (Sprint 4, 1 análisis) sobre la MISMA página local y con el MISMO
 * método, y verifica que ambas encuentren exactamente los mismos defectos.
 *
 * Uso:   npm run benchmark                  (5 corridas de cada una)
 *        node benchmark/benchmark.js --corridas=10
 *
 * Por qué una página local: no tiene latencia de red, así que la diferencia que
 * se mide es la de la optimización y no la de internet. Los tiempos absolutos
 * sobre MarsCommuter serán mayores; la comparación relativa es la que vale.
 * Se descarta una corrida de calentamiento por suite (el navegador "en frío"
 * distorsiona la primera medición).
 */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const CORRIDAS = parseInt((process.argv.find((a) => a.startsWith("--corridas=")) || "--corridas=5").split("=")[1], 10);

function estadisticas(valores) {
  const orden = [...valores].sort((a, b) => a - b);
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const mitad = Math.floor(orden.length / 2);
  const mediana = orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
  return { media, mediana, min: orden[0], max: orden[orden.length - 1] };
}

// Asíncrono a propósito: el servidor de la página de prueba vive en ESTE proceso,
// y un spawnSync lo bloquearía (la página nunca respondería).
function correr(etiqueta, argv, outDir) {
  return new Promise((resolve, reject) => {
    const t0 = process.hrtime.bigint();
    const hijo = spawn(process.execPath, argv, {
      cwd: RAIZ,
      env: { ...process.env, SUITE_OUT_DIR: outDir, NO_PROXY: "localhost,127.0.0.1", no_proxy: "localhost,127.0.0.1" },
    });
    let salida = "";
    hijo.stdout.on("data", (d) => (salida += d));
    hijo.stderr.on("data", (d) => (salida += d));
    hijo.on("close", (codigo) => {
      const segundos = Number(process.hrtime.bigint() - t0) / 1e9;
      // Código 0 (sin defectos nuevos) o 1 (hay defectos): ambos son una corrida válida. 2 = error de infraestructura.
      if (codigo !== 0 && codigo !== 1) {
        return reject(new Error(`La corrida de "${etiqueta}" falló (código ${codigo}).\n${salida}`));
      }
      resolve(segundos);
    });
  });
}

function leerNodos(archivo) {
  const j = JSON.parse(fs.readFileSync(archivo, "utf8"));
  return j.resultados.map((r) => `${r.id}:${r.nodos}`).join(",");
}

async function main() {
  const fixture = fs.readFileSync(path.join(__dirname, "fixture", "index.html"));
  const servidor = http.createServer((_, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fixture);
  });
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${servidor.address().port}/`;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bench-"));
  const outAntes = path.join(tmp, "antes");
  const outDespues = path.join(tmp, "despues");

  const suiteAntes = ["benchmark/suite-sprint3.js", url];
  const suiteDespues = ["test-suite.js", `--url=${url}`, "--sin-baseline"];

  console.log(`Benchmark sobre ${url}  (${CORRIDAS} corridas medidas + 1 de calentamiento por suite)\n`);

  try {
    await correr("antes (calentamiento)", suiteAntes, outAntes);
    await correr("después (calentamiento)", suiteDespues, outDespues);

    const tAntes = [];
    const tDespues = [];
    for (let i = 1; i <= CORRIDAS; i++) {
      tAntes.push(await correr("antes", suiteAntes, outAntes));
      tDespues.push(await correr("después", suiteDespues, outDespues));
      console.log(`  corrida ${i}: antes ${tAntes[i - 1].toFixed(2)} s | después ${tDespues[i - 1].toFixed(2)} s`);
    }

    const a = estadisticas(tAntes);
    const d = estadisticas(tDespues);
    const reduccion = (1 - d.mediana / a.mediana) * 100;
    const mismosHallazgos = leerNodos(path.join(outAntes, "resultados-suite.json")) === leerNodos(path.join(outDespues, "resultados-suite.json"));

    console.log("\n=== RESULTADO ===");
    console.log(`Suite anterior (8 análisis): mediana ${a.mediana.toFixed(2)} s | media ${a.media.toFixed(2)} s | min ${a.min.toFixed(2)} | max ${a.max.toFixed(2)}`);
    console.log(`Suite nueva    (1 análisis): mediana ${d.mediana.toFixed(2)} s | media ${d.media.toFixed(2)} s | min ${d.min.toFixed(2)} | max ${d.max.toFixed(2)}`);
    console.log(`Reducción de tiempo (por mediana): ${reduccion.toFixed(1)} %`);
    console.log(`¿Ambas suites encuentran exactamente los mismos defectos?: ${mismosHallazgos ? "SÍ" : "NO (revisar: la optimización cambió los resultados)"}`);

    const salida = { url, corridas: CORRIDAS, antes: { segundos: tAntes, ...a }, despues: { segundos: tDespues, ...d }, reduccionPorcentaje: Number(reduccion.toFixed(1)), mismosHallazgos };
    fs.writeFileSync(path.join(__dirname, "resultado-benchmark.json"), JSON.stringify(salida, null, 2));
    console.log("\nGuardado en benchmark/resultado-benchmark.json");
    if (!mismosHallazgos) process.exitCode = 1;
  } finally {
    servidor.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("Error en el benchmark:", err.message);
  process.exit(2);
});
