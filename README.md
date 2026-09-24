# Sprint 1 — Grupo 9 — "Los Defensores del Acceso"

Testing de accesibilidad web con **axe-core** y **Lighthouse**.

## Sistema bajo prueba

- **Sitio:** MarsCommuter Demo (Deque University)
- **URL:** https://dequeuniversity.com/demo/mars/
- Sitio público diseñado explícitamente por Deque para practicar auditorías de accesibilidad — no requiere autorización adicional para ser testeado.

## Requisitos

- Node.js 18 o superior ([nodejs.org](https://nodejs.org))
- Google Chrome (para usar Lighthouse desde DevTools)
- Opcional: extensión [axe DevTools](https://chromewebstore.google.com/) para Chrome

## Instalación

```bash
git clone <https://github.com/leandromonty/Los_Defensores_del_Acceso>
npm install
```

## Ejecución del primer artefacto (escaneo automatizado con axe-core)

```bash
npm run scan
```

Esto abre el sitio MarsCommuter en un navegador headless, corre axe-core sobre el DOM, imprime un resumen en consola y guarda el reporte completo en `reportes/reporte-axe.json`.

Para escanear otra URL:

```bash
node scan.js 
```


## Escaneo manual con Lighthouse (complementario)

1. Abrir el sitio en Google Chrome.
2. Abrir DevTools (`F12`) → pestaña **Lighthouse**.
3. Tildar únicamente la categoría **Accessibility**.
4. Click en **Analyze page load**.
5. Exportar el reporte (HTML o JSON) a la carpeta `reportes/`.

## Escaneo manual con axe DevTools (complementario)

1. Instalar la extensión axe DevTools en Chrome.
2. Abrir el sitio y la pestaña **axe DevTools** dentro de DevTools.
3. Click en **Scan ALL of my page**.
4. Exportar el resultado a `reportes/`.


