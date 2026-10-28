/**
 * Genera el reporte HTML automático de la suite — Sprint 4.
 * Es una función pura (recibe datos, devuelve texto) para poder probarla
 * sin navegador y sin escribir a disco.
 */

function esc(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ETIQUETAS = {
  PASA: "Pasa",
  DEFECTO_CONOCIDO: "Defecto conocido",
  REGRESION: "Regresión",
  FALLA: "Falla",
};

function generarHtml({ url, modo, inicio, fin, duracionMs, resultados, resumen, cobertura, metricas }) {
  const filas = resultados
    .map(
      (r) => `
      <tr class="${esc(r.estado)}">
        <td>${esc(r.id)}</td>
        <td>${esc(r.nombre)}<br><small>${esc(r.axeRule)} · WCAG ${esc(r.wcag)} · ${esc(r.principio)}</small></td>
        <td><strong>${esc(ETIQUETAS[r.estado] || r.estado)}</strong>${r.mejora ? " (mejoró)" : ""}</td>
        <td>${r.nodos}</td>
        <td>${r.baseline}</td>
        <td>${r.bloquea ? "Sí" : "No"}</td>
      </tr>`
    )
    .join("");

  const veredicto =
    resumen.exitCode === 0
      ? "OK — sin regresiones ni fallas bloqueantes"
      : `FALLA — bloquean: ${resumen.bloqueantes.join(", ")}`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte de accesibilidad — Grupo 9</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #1b2631; background: #fff; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; margin-top: 1.6rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #b7b7b7; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #2e4053; color: #fff; }
  tr.PASA td:nth-child(3) { background: #d5f5e3; }
  tr.DEFECTO_CONOCIDO td:nth-child(3) { background: #fcf3cf; }
  tr.REGRESION td:nth-child(3), tr.FALLA td:nth-child(3) { background: #fadbd8; }
  .veredicto { padding: 10px 14px; border: 2px solid #2e4053; display: inline-block; font-weight: bold; }
  small { color: #555; }
</style>
</head>
<body>
<h1>Reporte de la suite de accesibilidad — Grupo 9 "Los Defensores del Acceso"</h1>
<p>Sistema bajo prueba: <a href="${esc(url)}">${esc(url)}</a><br>
Modo: <strong>${esc(modo)}</strong> · Inicio: ${esc(inicio)} · Fin: ${esc(fin)} · Duración: ${(duracionMs / 1000).toFixed(1)} s</p>
<p class="veredicto">${esc(veredicto)}</p>

<h2>Resultados por caso</h2>
<table>
  <tr><th>Caso</th><th>Qué verifica</th><th>Estado</th><th>Elementos afectados</th><th>Baseline</th><th>Bloquea el pipeline</th></tr>
  ${filas}
</table>

<h2>Resumen</h2>
<ul>
  <li>Casos: ${resumen.total} · Pasan: ${resumen.pasan} · Defectos conocidos: ${resumen.conocidos} · Regresiones: ${resumen.regresiones} · Fallas (modo estricto): ${resumen.fallas}</li>
  <li>Cobertura: ${cobertura.principios.length} de ${cobertura.totalPrincipios} principios POUR (${esc(cobertura.principios.join(", "))}); criterios WCAG: ${esc(cobertura.criteriosWcag.join(", "))}</li>
  <li>Análisis de axe-core ejecutados: ${metricas.analisisEjecutados} · Reintentos usados: ${metricas.reintentos}</li>
  <li>Tiempo de carga de página: ${(metricas.cargaMs / 1000).toFixed(1)} s · Tiempo de análisis: ${(metricas.analisisMs / 1000).toFixed(1)} s</li>
</ul>
</body>
</html>
`;
}

module.exports = { generarHtml, esc };
