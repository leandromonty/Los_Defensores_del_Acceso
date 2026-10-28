/**
 * Tests unitarios de la lógica de evaluación — Sprint 4.
 * Corren con: npm run test:unit  (usa node:test, viene incluido en Node, sin instalar nada)
 *
 * Qué demuestran: que la suite FALLA cuando tiene que fallar y NO falla cuando
 * no corresponde (criterio "suite estable y confiable": sin falsos positivos
 * ni falsos negativos).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { contarNodos, evaluarCaso, resumir, calcularCobertura } = require("../lib/evaluar");
const { generarHtml, esc } = require("../lib/reporte");

const caso = { id: "CP-01", nombre: "Contraste", axeRule: "color-contrast", wcag: "1.4.3", principio: "Perceptible", blocking: true };
const casoNoBloq = { ...caso, id: "CP-06", axeRule: "heading-order", blocking: false };
const baseline = { "color-contrast": 7, "heading-order": 0 };

// ---------- contarNodos ----------
test("contarNodos suma los elementos de la regla pedida", () => {
  const violations = [
    { id: "color-contrast", nodes: [{}, {}, {}] },
    { id: "image-alt", nodes: [{}] },
  ];
  assert.equal(contarNodos(violations, "color-contrast"), 3);
  assert.equal(contarNodos(violations, "image-alt"), 1);
});

test("contarNodos devuelve 0 si la regla no tiene violaciones o la entrada es inválida", () => {
  assert.equal(contarNodos([], "label"), 0);
  assert.equal(contarNodos(undefined, "label"), 0);
  assert.equal(contarNodos([{ id: "label" }], "label"), 0); // sin nodes
});

// ---------- evaluarCaso, modo baseline ----------
test("baseline: 0 violaciones => PASA y no bloquea", () => {
  const r = evaluarCaso(caso, 0, baseline, "baseline");
  assert.equal(r.estado, "PASA");
  assert.equal(r.bloquea, false);
});

test("baseline: violaciones iguales al baseline => DEFECTO_CONOCIDO, no bloquea (sin falso positivo)", () => {
  const r = evaluarCaso(caso, 7, baseline, "baseline");
  assert.equal(r.estado, "DEFECTO_CONOCIDO");
  assert.equal(r.bloquea, false);
});

test("baseline: menos violaciones que el baseline => DEFECTO_CONOCIDO marcado como mejora", () => {
  const r = evaluarCaso(caso, 5, baseline, "baseline");
  assert.equal(r.estado, "DEFECTO_CONOCIDO");
  assert.equal(r.mejora, true);
  assert.equal(r.bloquea, false);
});

test("baseline: más violaciones que el baseline => REGRESION y bloquea (sin falso negativo)", () => {
  const r = evaluarCaso(caso, 8, baseline, "baseline");
  assert.equal(r.estado, "REGRESION");
  assert.equal(r.bloquea, true);
});

test("baseline: una regla sin entrada en el baseline se trata como baseline 0", () => {
  const r = evaluarCaso({ ...caso, axeRule: "regla-nueva" }, 1, baseline, "baseline");
  assert.equal(r.estado, "REGRESION");
  assert.equal(r.baseline, 0);
});

test("una regresión en un caso NO bloqueante no bloquea el pipeline", () => {
  const r = evaluarCaso(casoNoBloq, 3, baseline, "baseline");
  assert.equal(r.estado, "REGRESION");
  assert.equal(r.bloquea, false);
});

// ---------- evaluarCaso, modo estricto ----------
test("estricto: cualquier violación => FALLA y bloquea, aunque esté en el baseline", () => {
  const r = evaluarCaso(caso, 1, baseline, "estricto");
  assert.equal(r.estado, "FALLA");
  assert.equal(r.bloquea, true);
});

test("estricto: 0 violaciones => PASA", () => {
  assert.equal(evaluarCaso(caso, 0, baseline, "estricto").estado, "PASA");
});

// ---------- validación de entradas ----------
test("evaluarCaso rechaza un modo inválido", () => {
  assert.throws(() => evaluarCaso(caso, 0, baseline, "inventado"), /Modo inválido/);
});

test("evaluarCaso rechaza cantidades de nodos inválidas", () => {
  assert.throws(() => evaluarCaso(caso, -1, baseline), /inválida/);
  assert.throws(() => evaluarCaso(caso, 2.5, baseline), /inválida/);
  assert.throws(() => evaluarCaso(caso, "3", baseline), /inválida/);
});

// ---------- resumir ----------
test("resumir: exitCode 0 cuando solo hay PASA y DEFECTO_CONOCIDO", () => {
  const rs = [evaluarCaso(caso, 0, baseline), evaluarCaso(caso, 7, baseline)];
  const res = resumir(rs);
  assert.equal(res.exitCode, 0);
  assert.equal(res.pasan, 1);
  assert.equal(res.conocidos, 1);
  assert.deepEqual(res.bloqueantes, []);
});

test("resumir: exitCode 1 y lista de bloqueantes cuando hay una regresión", () => {
  const rs = [evaluarCaso(caso, 9, baseline), evaluarCaso(casoNoBloq, 0, baseline)];
  const res = resumir(rs);
  assert.equal(res.exitCode, 1);
  assert.deepEqual(res.bloqueantes, ["CP-01"]);
  assert.equal(res.regresiones, 1);
});

// ---------- cobertura ----------
test("calcularCobertura cuenta principios POUR y criterios WCAG únicos", () => {
  const casos = [
    { ...caso, principio: "Perceptible", wcag: "1.4.3" },
    { ...caso, principio: "Robusto", wcag: "1.3.1 / 4.1.2" },
    { ...caso, principio: "Robusto", wcag: "4.1.2" },
  ];
  const c = calcularCobertura(casos);
  assert.equal(c.casos, 3);
  assert.deepEqual(c.principios, ["Perceptible", "Robusto"]);
  assert.deepEqual(c.criteriosWcag, ["1.3.1", "1.4.3", "4.1.2"]);
});

// ---------- reporte HTML ----------
test("esc neutraliza caracteres peligrosos en el HTML", () => {
  assert.equal(esc('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("generarHtml incluye casos, veredicto y no deja pasar HTML inyectado", () => {
  const resultados = [evaluarCaso({ ...caso, nombre: "<b>malo</b>" }, 9, baseline)];
  const resumen = resumir(resultados);
  const html = generarHtml({
    url: "https://ejemplo.com/?a=1&b=2",
    modo: "baseline",
    inicio: "2026-10-23 10:00:00",
    fin: "2026-10-23 10:00:05",
    duracionMs: 5000,
    resultados,
    resumen,
    cobertura: calcularCobertura([caso]),
    metricas: { analisisEjecutados: 1, reintentos: 0, cargaMs: 3000, analisisMs: 1000 },
  });
  assert.match(html, /CP-01/);
  assert.match(html, /FALLA — bloquean: CP-01/);
  assert.doesNotMatch(html, /<b>malo<\/b>/);
  assert.match(html, /&lt;b&gt;malo&lt;\/b&gt;/);
});
