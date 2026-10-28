/**
 * Lógica de evaluación de la suite — Sprint 4
 * Grupo 9 — "Los Defensores del Acceso"
 *
 * Esta lógica está separada de test-suite.js A PROPÓSITO: no depende de
 * ningún navegador, así que se puede probar con tests unitarios
 * (npm run test:unit) en milisegundos y sin red.
 *
 * Estados posibles de un caso:
 *   PASA              -> 0 violaciones.
 *   DEFECTO_CONOCIDO  -> hay violaciones, pero no más que las del baseline
 *                        (defectos ya documentados del sitio de práctica).
 *   REGRESION         -> hay MÁS violaciones que el baseline (algo empeoró).
 *   FALLA             -> modo estricto: cualquier violación.
 */

const MODOS = ["baseline", "estricto"];

const ESTADOS_BLOQUEANTES = ["REGRESION", "FALLA"];

/** Suma los elementos (nodos) afectados por una regla en el resultado de axe. */
function contarNodos(violations, ruleId) {
  if (!Array.isArray(violations)) return 0;
  return violations
    .filter((v) => v && v.id === ruleId)
    .reduce((acc, v) => acc + (Array.isArray(v.nodes) ? v.nodes.length : 0), 0);
}

/**
 * Evalúa UN caso.
 * @param {object} caso      {id, axeRule, blocking, ...}
 * @param {number} nodos     elementos con violación encontrados en esta corrida
 * @param {object} baseline  {"<axeRule>": cantidadConocida}
 * @param {string} modo      "baseline" | "estricto"
 */
function evaluarCaso(caso, nodos, baseline = {}, modo = "baseline") {
  if (!MODOS.includes(modo)) {
    throw new Error(`Modo inválido: "${modo}". Usar: ${MODOS.join(" | ")}`);
  }
  if (!Number.isInteger(nodos) || nodos < 0) {
    throw new Error(`Cantidad de nodos inválida para ${caso.id}: ${nodos}`);
  }

  const conocido = Number.isInteger(baseline[caso.axeRule]) ? baseline[caso.axeRule] : 0;
  let estado;
  let mejora = false;

  if (nodos === 0) {
    estado = "PASA";
  } else if (modo === "estricto") {
    estado = "FALLA";
  } else if (nodos > conocido) {
    estado = "REGRESION";
  } else {
    estado = "DEFECTO_CONOCIDO";
    mejora = nodos < conocido;
  }

  return {
    id: caso.id,
    nombre: caso.nombre,
    axeRule: caso.axeRule,
    wcag: caso.wcag,
    principio: caso.principio,
    blocking: !!caso.blocking,
    nodos,
    baseline: conocido,
    estado,
    mejora,
    bloquea: !!caso.blocking && ESTADOS_BLOQUEANTES.includes(estado),
  };
}

/** Resume una lista de resultados y calcula el código de salida (0 ó 1). */
function resumir(resultados) {
  const cuenta = (e) => resultados.filter((r) => r.estado === e).length;
  const bloqueantes = resultados.filter((r) => r.bloquea);
  return {
    total: resultados.length,
    pasan: cuenta("PASA"),
    conocidos: cuenta("DEFECTO_CONOCIDO"),
    regresiones: cuenta("REGRESION"),
    fallas: cuenta("FALLA"),
    bloqueantes: bloqueantes.map((r) => r.id),
    exitCode: bloqueantes.length > 0 ? 1 : 0,
  };
}

/** Cobertura: cuántos principios POUR y criterios WCAG toca la suite. */
function calcularCobertura(casos) {
  const principios = [...new Set(casos.map((c) => c.principio))].sort();
  const criterios = new Set();
  casos.forEach((c) =>
    String(c.wcag)
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((n) => criterios.add(n))
  );
  return {
    casos: casos.length,
    principios,
    totalPrincipios: 4,
    criteriosWcag: [...criterios].sort(),
  };
}

module.exports = { MODOS, contarNodos, evaluarCaso, resumir, calcularCobertura };
