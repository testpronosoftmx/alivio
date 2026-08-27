#!/usr/bin/env node
/**
 * Lanza el lote de imágenes del Evangelio del Día contra /api/generate-batch.
 *
 *   node scripts/run-batch.cjs                          → de hoy al 31 de diciembre
 *   node scripts/run-batch.cjs --from=2027-01-01 --to=2027-12-31
 *   node scripts/run-batch.cjs --base=http://localhost:3000
 *
 * El endpoint procesa una tanda por invocación (le cabe lo que le cabe en los 60
 * segundos de la función) y devuelve `nextDate`. Este script solo repite la
 * llamada hasta que dice `complete`. Es reanudable: si se corta a mitad, se
 * vuelve a lanzar y salta lo que ya está hecho.
 *
 * El secreto sale de CRON_SECRET (entorno o .env). Sin él no hay nada que hacer:
 * el endpoint falla cerrado.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_BASE = 'https://alivio.pronosoftmx.com';

function readEnvFile() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
}

(async () => {
  const env = readEnvFile();
  const secret = process.env.CRON_SECRET || env.CRON_SECRET;
  if (!secret) {
    console.error('❌ Falta CRON_SECRET (en el entorno o en .env). El endpoint falla cerrado sin él.');
    process.exit(1);
  }

  const base = arg('base', DEFAULT_BASE).replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const from = arg('from', today);
  const to = arg('to', from.slice(0, 4) + '-12-31');

  const limit = arg('limit', '2');

  console.log('🎨 Lote de imágenes · ' + from + ' → ' + to + ' (límite por tanda: ' + limit + ')');
  console.log('   ' + base + '/api/generate-batch\n');

  let cursor = from;
  let generadas = 0, fallidas = 0, saltadas = 0, tandas = 0;
  const fallidasDetalle = [];

  while (cursor) {
    tandas++;
    const url = base + '/api/generate-batch?from=' + cursor + '&to=' + to + '&limit=' + limit;

    // Un tropiezo puntual del endpoint o de la red no debe tirar un lote de
    // horas: se reintenta la misma tanda un par de veces antes de rendirse. Es
    // seguro porque el endpoint es idempotente — lo ya hecho se salta.
    let res = null;
    for (let intento = 1; intento <= 3; intento++) {
      try {
        res = await fetch(url, { headers: { Authorization: 'Bearer ' + secret } });
        if (res.ok) break;
        const cuerpo = await res.text();
        console.warn('   ⚠️ tanda ' + tandas + ' devolvió ' + res.status +
          (intento < 3 ? ' · reintento ' + intento + '/2' : '') + ': ' + cuerpo.slice(0, 160));
      } catch (e) {
        console.warn('   ⚠️ tanda ' + tandas + ' no salió' +
          (intento < 3 ? ' · reintento ' + intento + '/2' : '') + ': ' + e.message);
        res = null;
      }
      if (intento === 3) {
        console.error('\n❌ Tanda ' + tandas + ' falló tres veces seguidas. Se corta; relanzar reanuda donde quedó.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 5000 * intento));
    }

    const data = await res.json();
    generadas += data.generated;
    fallidas += data.failed;
    saltadas += data.skipped;   // cada tanda arranca en el cursor: no recuenta lo de antes
    if (data.failedDates && data.failedDates.length) fallidasDetalle.push(...data.failedDates);

    console.log('   tanda ' + tandas + ': +' + data.generated + ' generadas, ' +
      data.failed + ' sin fila, ' + Math.round(data.elapsedMs / 1000) + ' s' +
      (data.nextDate ? ' · sigue en ' + data.nextDate : ' · fin'));

    cursor = data.complete ? null : data.nextDate;
    if (cursor && data.generated === 0 && data.failed === 0) {
      console.error('❌ Una tanda no avanzó ninguna fecha. Se corta para no girar en vacío.');
      process.exit(1);
    }
  }

  console.log('\n✅ ' + generadas + ' imágenes generadas, ' + saltadas + ' ya estaban, ' + fallidas + ' sin fila.');
  if (fallidasDetalle.length) {
    console.log('   Sin fila (caen al escalón 2, la imagen del tiempo litúrgico):');
    console.log('   ' + fallidasDetalle.join(', '));
    console.log('   Volver a lanzar el script reintenta solo esas fechas.');
  }
})().catch((e) => {
  console.error('❌ ' + e.message);
  process.exit(1);
});
