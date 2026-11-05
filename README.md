# Los Defensores del Acceso — Testing de accesibilidad automatizado

Grupo 9 · IES Alfredo Coviello · Sprint 4 (final)
Integrantes: Juan García, Nahuel González, Leandro Montivero, Juan Sosa.
Cliente: QualityTech Solutions · Sistema bajo prueba: MarsCommuter (https://dequeuniversity.com/demo/mars/)

Suite de accesibilidad con axe-core y Puppeteer: 8 casos (4 principios POUR, 6 criterios WCAG 2.2),
con baseline de defectos conocidos, reintentos, reportes automáticos y pipeline en GitHub Actions.

## Uso

    npm install
    npm run test:unit     # 17 pruebas unitarias (lógica de evaluación)
    npm run test:suite    # suite sobre MarsCommuter (modo baseline)
    npm run test:strict   # modo estricto: cualquier violación falla
    npm run benchmark     # compara la suite anterior (8 análisis) con la nueva (1 análisis)

Opciones: `--url=<sitio>`, `--modo=baseline|estricto`, `--sin-baseline`.
Variables: `SUITE_MODO`, `SUITE_URL`, `SUITE_OUT_DIR`.

## Códigos de salida

| Código | Significado |
|---|---|
| 0 | Sin regresiones ni fallas bloqueantes |
| 1 | Regresión (o falla en modo estricto) |
| 2 | Error de infraestructura (sitio caído, navegador roto) |

## Estados de cada caso

PASA · DEFECTO_CONOCIDO (igual o menos que `baseline.json`) · REGRESIÓN (más que el baseline, bloquea) · FALLA (modo estricto, bloquea).

## Reportes

Se generan en `reportes/`: `Ejecucion_Pruebas.log`, `resultados-suite.json` y `reporte.html`.

## CI/CD

`.github/workflows/accesibilidad.yml` se ejecuta en cada push y pull request a `main`, todos los lunes
a las 12:00 UTC y manualmente (con selección de modo). Instala dependencias y Chrome, corre los tests
unitarios, corre la suite, publica los reportes como artefacto y termina en error si hubo regresión.

## Resultados medidos

- Ejecución real sobre MarsCommuter (28/10/2026): 3 pasan, 5 defectos conocidos, 0 regresiones, 1 análisis de axe, 0 reintentos, 16,3 s.
- Pruebas unitarias: 17/17.
- Benchmark (página local, sin latencia de red, mediana de 5 corridas): suite anterior 6,50 s, suite nueva 3,96 s (−39 %), mismos hallazgos.

## Estructura

    test-suite.js            suite final
    lib/evaluar.js           lógica de evaluación (probada sin navegador)
    lib/reporte.js           generador del reporte HTML
    baseline.json            defectos conocidos de MarsCommuter
    test/evaluar.test.js     pruebas unitarias
    benchmark/               suite anterior congelada, página de prueba y script de medición
    .github/workflows/       pipeline de CI/CD
