#!/usr/bin/env node
/**
 * Informe del corpus de oraciones.
 *
 *   node scripts/check-prayers.cjs           → resumen y pendientes
 *   node scripts/check-prayers.cjs --review  → vuelca los textos pendientes para cotejarlos
 *
 * Una oración con `verified: false` NO se muestra en la app. Para publicarla:
 * cotéjala contra un misal o devocionario impreso, corrige si hace falta y pon
 * `verified: true` en public/prayers.js.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'public', 'prayers.js');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
const ev = expr => vm.runInContext(expr, ctx);

const PRAYERS = ev('PRAYERS');
const ROSARY_SETS = ev('ROSARY_SETS');
const review = process.argv.includes('--review');

const DENOMS = ['catholic', 'evangelical', 'spiritual'];
const LABEL = { catholic: 'Católico', evangelical: 'Evangélico', spiritual: 'Espiritual' };

let problems = 0;

// ── Integridad estructural ────────────────────────────────────────────────
const ids = new Set();
for (const p of PRAYERS) {
  const where = `oración "${p.id}"`;
  if (ids.has(p.id)) { console.log(`  ERROR  id duplicado: ${p.id}`); problems++; }
  ids.add(p.id);
  for (const lang of ['es', 'en']) {
    if (!p[lang] || !p[lang].title || !p[lang].body) {
      console.log(`  ERROR  ${where} sin título o cuerpo en "${lang}"`); problems++;
    }
  }
  if (!p.denominations || p.denominations.length === 0) {
    console.log(`  ERROR  ${where} sin denominaciones`); problems++;
  }
  for (const d of p.denominations || []) {
    if (!DENOMS.includes(d)) { console.log(`  ERROR  ${where} usa denominación desconocida "${d}"`); problems++; }
  }
  if (!['rv1909', 'vaticano', 'tradicional', 'original'].includes(p.source)) {
    console.log(`  ERROR  ${where} tiene source desconocido "${p.source}"`); problems++;
  }
  if (p.source === 'rv1909' && !p.reference) {
    console.log(`  ERROR  ${where} viene de la Escritura pero no declara referencia`); problems++;
  }
}

// ── Cobertura por denominación ────────────────────────────────────────────
console.log('\n── Oraciones visibles hoy en la app ──');
for (const d of DENOMS) {
  const all = PRAYERS.filter(p => p.denominations.includes(d));
  const live = all.filter(p => p.verified);
  const flag = live.length === 0 ? '  ← el módulo se ve vacío' : '';
  console.log(`  ${LABEL[d].padEnd(12)} ${String(live.length).padStart(2)} de ${all.length}${flag}`);
}

// ── Pendientes de cotejo ──────────────────────────────────────────────────
const pending = PRAYERS.filter(p => !p.verified);
console.log(`\n── Pendientes de cotejo: ${pending.length} ──`);
for (const p of pending) {
  console.log(`  [ ] ${p.es.title.padEnd(36)} (${p.denominations.join(', ')})`);
}

const pendingRosary = Object.entries(ROSARY_SETS).filter(([, s]) => !s.verified);
if (pendingRosary.length) {
  console.log(`\n── Misterios del Rosario pendientes: ${pendingRosary.length} ──`);
  for (const [k, s] of pendingRosary) console.log(`  [ ] ${s.es.title}`);
}

// ── Volcado para revisión ─────────────────────────────────────────────────
if (review) {
  console.log('\n\n══════ TEXTOS PENDIENTES, PARA COTEJAR ══════');
  for (const p of pending) {
    console.log(`\n\n### ${p.es.title}  [id: ${p.id}]`);
    console.log('--- ES ---\n' + p.es.body);
    console.log('--- EN ---\n' + p.en.body);
  }
  console.log('\n\nCuando una esté cotejada, pon verified: true en public/prayers.js');
} else if (pending.length) {
  console.log('\n  Usa --review para volcar los textos y cotejarlos.');
}

console.log(problems ? `\n${problems} ERRORES ESTRUCTURALES\n` : '\nEstructura correcta.\n');
process.exit(problems ? 1 : 0);
