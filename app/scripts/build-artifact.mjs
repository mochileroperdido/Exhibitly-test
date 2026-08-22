import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const assets = join(dist, 'assets');
const jsFile = readdirSync(assets).find((f) => f.endsWith('.js'));
const cssFile = readdirSync(assets).find((f) => f.endsWith('.css'));

let js = readFileSync(join(assets, jsFile), 'utf8');
const css = readFileSync(join(assets, cssFile), 'utf8');

// Embed the GLB as a data URI so the page has zero external fetches.
const glb = readFileSync(join(dist, 'models', 'drill-new.glb'));
const glbUri = `data:model/gltf-binary;base64,${glb.toString('base64')}`;
const before = js.length;
js = js.split('/models/drill-new.glb').join(glbUri);
console.log('model url replaced:', before !== js.length);

const html = `<title>Exhibly Kiosk</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;

const out = 'dist/exhibly-artifact.html';
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024 / 1024).toFixed(2), 'MB');
