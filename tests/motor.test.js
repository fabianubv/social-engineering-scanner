// Pruebas del motor y de los casos. Uso: node --test
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const Motor = require('../js/motor.js');
const { CASOS, acierta } = require('../js/casos.js');

const SCRIPT = path.join(__dirname, '..', 'scanner.sh');

function palabrasDe(res) {
  return res.senales.flatMap((s) => s.encontradas.map((e) => e.forma.toLowerCase()));
}

function caso(id) {
  return CASOS.find((c) => c.id === id);
}

test('los cuatro casos dan lo que cuenta la historia', () => {
  const esperado = {
    limpio: { puntos: 0, nivel: 'sin' },
    ceo: { puntos: 6, nivel: 'fuertes' },
    'falso-positivo': { puntos: 7, nivel: 'fuertes' },
    bypass: { puntos: 0, nivel: 'sin' }
  };
  for (const c of CASOS) {
    const r = Motor.analizar(c.mensaje);
    assert.equal(r.puntos, esperado[c.id].puntos, c.id);
    assert.equal(r.nivel.id, esperado[c.id].nivel, c.id);
  }
});

test('CEO Fraud: detecta justo las palabras que nombra la lección', () => {
  const r = Motor.analizar(caso('ceo').mensaje);
  assert.deepEqual(palabrasDe(r).sort(), ['ahora', 'bonos', 'cierre', 'directorio', 'gerente', 'hoy']);
  const leccion = caso('ceo').lecciones[0].parrafos.join(' ');
  for (const p of palabrasDe(r)) assert.ok(leccion.includes('«' + p + '»'), p);
});

test('palabras completas: "bancario" no es "banco" y "directorio" no es "director"', () => {
  assert.equal(Motor.analizar('cierre bancario').puntos, 1);
  const r = Motor.analizar('el directorio');
  assert.deepEqual(palabrasDe(r), ['directorio']);
  assert.equal(Motor.analizar('prehoy hoyo').puntos, 0);
});

test('plural y femenino', () => {
  assert.deepEqual(palabrasDe(Motor.analizar('Bonos y ofertas exclusivas')).sort(), ['bonos', 'exclusivas', 'ofertas']);
  assert.equal(Motor.analizar('seleccionadas').puntos, 1);
  // "director" no termina en o: su femenino se escapa (otra forma de evasión)
  assert.equal(Motor.analizar('la directora').puntos, 0);
});

test('mayúsculas y tildes no esquivan las reglas', () => {
  const r = Motor.analizar('ÚLTIMO AVISO: ACCIÓN REQUERIDA en Policía');
  assert.deepEqual(palabrasDe(r).sort(), ['acción requerida', 'policía', 'último aviso']);
});

test('cada palabra suma una sola vez aunque se repita', () => {
  const r = Motor.analizar('hoy, hoy y hoy');
  assert.equal(r.puntos, 1);
  assert.equal(r.marcas.length, 3);
});

test('niveles: 0, de 1 a 3 y 4 o más', () => {
  assert.equal(Motor.nivelPara(0).id, 'sin');
  assert.equal(Motor.nivelPara(1).id, 'leves');
  assert.equal(Motor.nivelPara(3).id, 'leves');
  assert.equal(Motor.nivelPara(4).id, 'fuertes');
});

test('la normalización conserva el largo y las marcas apuntan al texto original', () => {
  const t = 'Ñandú URGENTE: Última OFERTA ½ 🎁 regalo';
  assert.equal(Motor.normalizar(t).length, t.length);
  const r = Motor.analizar(t);
  for (const m of r.marcas) {
    assert.equal(Motor.normalizar(r.texto.slice(m.inicio, m.fin)).replace(/s$|es$/, '').length > 0, true);
  }
  assert.deepEqual(r.marcas.map((m) => r.texto.slice(m.inicio, m.fin)), ['URGENTE', 'OFERTA', 'regalo']);
});

test('texto vacío o raro no rompe nada', () => {
  assert.equal(Motor.analizar('').puntos, 0);
  assert.equal(Motor.analizar(null).puntos, 0);
  assert.equal(Motor.analizar('<script>alert(1)</script>').puntos, 0);
});

test('las frases "ocultas" existen en su mensaje', () => {
  for (const c of CASOS) {
    for (const o of c.ocultas) assert.ok(c.mensaje.includes(o.frase), c.id + ': ' + o.frase);
  }
});

test('cada caso tiene exactamente una opción correcta', () => {
  for (const c of CASOS) {
    const r = Motor.analizar(c.mensaje);
    assert.equal(c.opciones.filter((o) => acierta(o, r.puntos)).length, 1, c.id);
  }
});

test('las listas de palabras son las mismas en scanner.sh', () => {
  const sh = fs.readFileSync(SCRIPT, 'utf8');
  const listas = { urgencia: 'URGENCIA', autoridad: 'AUTORIDAD', beneficio: 'BENEFICIO' };
  for (const regla of Motor.REGLAS) {
    const bloque = sh.match(new RegExp('^' + listas[regla.id] + '=\\(([\\s\\S]*?)^\\)', 'm'));
    assert.ok(bloque, regla.id);
    const palabras = [...bloque[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(palabras, regla.palabras, regla.id);
  }
});

test('scanner.sh da los mismos puntos que el motor', { skip: process.platform === 'win32' }, () => {
  const extra = [
    'ÚLTIMO AVISO de la Directora: ACCIÓN REQUERIDA',
    'Bonos y ofertas exclusivas, cierre bancario, el directorio'
  ];
  const textos = CASOS.map((c) => c.mensaje).concat(extra);
  for (const t of textos) {
    const entrada = '5\n' + t + '\nfin\n\n\n\n\n7\n';
    const salida = execFileSync('bash', [SCRIPT], {
      input: entrada,
      env: { PATH: process.env.PATH, TERM: 'dumb' },
      encoding: 'utf8'
    });
    const m = salida.match(/\((\d+) puntos\)/);
    assert.ok(m, 'sin resultado para: ' + t.slice(0, 30));
    assert.equal(Number(m[1]), Motor.analizar(t).puntos, t.slice(0, 30));
  }
});
