/*
 * La página es una lección en cuatro capítulos, en orden:
 *   01 Cómo funciona          · el detector por dentro, con un mensaje de ejemplo
 *   02 Cuatro casos           · dos aciertos y dos fallos, uno detrás de otro
 *   03 Más allá de las reglas · qué usan los sistemas reales
 *   04 Pruébalo tú            · escribir un mensaje y ver qué detecta
 *
 * Todas las pantallas forman una sola secuencia: Enter avanza, ← vuelve,
 * Esc lleva al inicio y los números eligen una opción.
 *
 * Todo se construye con nodos y textContent; el texto del usuario nunca
 * se interpreta como HTML.
 */
(function () {
  'use strict';

  var Motor = window.Motor;
  var CASOS = window.Casos.CASOS;
  var CAPAS = window.Casos.CAPAS;
  var acierta = window.Casos.acierta;

  var MAX_ARCHIVO = 200 * 1024;
  var EJEMPLO = 'Último aviso: el gerente aprobó tu bono. Confírmalo hoy.';
  var pantalla = document.getElementById('pantalla');
  var nav = document.getElementById('capitulos');

  var CAPITULOS = [
    { num: '01', nombre: 'Cómo funciona', desc: 'el detector por dentro' },
    { num: '02', nombre: 'Cuatro casos', desc: 'dos aciertos, dos fallos' },
    { num: '03', nombre: 'Más allá de las reglas', desc: 'lo que usan los sistemas reales' },
    { num: '04', nombre: 'Pruébalo tú', desc: 'intenta engañarlo' }
  ];

  var PASOS_FUNCIONA = ['idea', 'normaliza', 'compara', 'suma'];

  function pasosCaso(c) {
    var pasos = ['predice', 'analisis', 'resultado'];
    if (c.ocultas.length) pasos.push('persona');
    pasos.push('lecciones');
    return pasos;
  }

  // La secuencia completa de pantallas, de principio a fin
  var SECUENCIA = [{ vista: 'inicio' }];
  PASOS_FUNCIONA.forEach(function (_, k) { SECUENCIA.push({ vista: 'funciona', paso: k }); });
  CASOS.forEach(function (c, i) {
    pasosCaso(c).forEach(function (_, k) { SECUENCIA.push({ vista: 'caso', caso: i, paso: k }); });
  });
  SECUENCIA.push({ vista: 'resumen' }, { vista: 'capas' }, { vista: 'libre' });

  var CAPITULO_DE = { inicio: -1, funciona: 0, caso: 1, resumen: 1, capas: 2, libre: 3 };

  var estado = {
    pos: 0,
    prediccion: CASOS.map(function () { return null; }),
    textoLibre: ''
  };
  function actual() { return SECUENCIA[estado.pos]; }

  var teclas = {};

  // ── Utilidades ────────────────────────────────────────────────────────────

  function el(tag, props, hijos) {
    var n = document.createElement(tag);
    props = props || {};
    if (props['class']) n.className = props['class'];
    if (props.text != null) n.textContent = props.text;
    if (props.attrs) Object.keys(props.attrs).forEach(function (k) {
      if (props.attrs[k] != null && props.attrs[k] !== false) n.setAttribute(k, props.attrs[k]);
    });
    if (props.on) Object.keys(props.on).forEach(function (k) { n.addEventListener(k, props.on[k]); });
    (hijos || []).forEach(function (h) {
      if (h == null || h === false) return;
      n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
    });
    return n;
  }

  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function p(texto, clase) { return el('p', { 'class': clase, text: texto }); }
  function h1(texto) { return el('h1', { text: texto, attrs: { tabindex: '-1' } }); }

  function boton(texto, accion, opciones) {
    opciones = opciones || {};
    return el('button', {
      'class': 'boton' + (opciones.principal ? ' principal' : ''),
      attrs: { type: 'button' }, on: { click: accion }
    }, [texto, opciones.tecla ? el('kbd', { text: opciones.tecla, attrs: { 'aria-hidden': 'true' } }) : null]);
  }

  function chip(regla) {
    return el('span', { 'class': 'chip c-' + regla, text: regla });
  }

  // Cómo le fue al detector con un caso
  function lugar(c) {
    var alerta = Motor.analizar(c.mensaje).nivel.id !== 'sin';
    var bien = (c.realidad === 'Estafa') === alerta;
    return { alerta: alerta, bien: bien, etiqueta: bien ? 'acierta' : (alerta ? 'alarma de más' : 'se le escapa') };
  }

  // Código con un resaltado mínimo: comentarios, textos y palabras clave
  function codigo(texto, origen) {
    var pre = el('pre', { 'class': 'codigo' });
    var re = /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*')|\b(function|return|const|let|for|of|if)\b/g;
    var ultimo = 0, m;
    while ((m = re.exec(texto)) !== null) {
      if (m.index > ultimo) pre.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
      pre.appendChild(el('span', { 'class': m[1] ? 'tk-com' : m[2] ? 'tk-str' : 'tk-kw', text: m[0] }));
      ultimo = re.lastIndex;
    }
    pre.appendChild(document.createTextNode(texto.slice(ultimo)));
    return el('figure', { 'class': 'bloque-codigo' }, [el('figcaption', { text: origen }), pre]);
  }

  // ── Mensaje resaltado ─────────────────────────────────────────────────────
  // Corta el texto en tramos según las palabras detectadas y las frases
  // "ocultas", y arma <mark> y <span> sin usar innerHTML.
  function mensaje(texto, opciones) {
    opciones = opciones || {};
    var pre = el('pre', { 'class': 'mensaje' + (opciones.corto ? ' corto' : '') });
    var res = Motor.analizar(texto);
    var marcas = opciones.marcas ? res.marcas : [];
    var rangos = [];
    (opciones.ocultas || []).forEach(function (o) {
      var i = res.texto.indexOf(o.frase);
      if (i >= 0) rangos.push({ inicio: i, fin: i + o.frase.length, n: rangos.length + 1 });
    });

    var cortes = [0, res.texto.length];
    marcas.forEach(function (m) { cortes.push(m.inicio, m.fin); });
    rangos.forEach(function (r) { cortes.push(r.inicio, r.fin); });
    cortes = cortes.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });

    // En los casos, los saltos de línea simples vienen del ancho de la terminal:
    // aquí se cambian por espacios (mismo largo) para que el texto fluya.
    // normalizar() conserva el largo, así que las posiciones siguen sirviendo.
    var base = opciones.normalizado ? Motor.normalizar(res.texto) : res.texto;
    var mostrar = opciones.fluido ? base.replace(/([^\n])\n(?!\n)/g, '$1 ') : base;

    var orden = 0;
    for (var k = 0; k < cortes.length - 1; k++) {
      var a = cortes[k], b = cortes[k + 1];
      var nodo = document.createTextNode(mostrar.slice(a, b));
      var marca = null, rango = null;
      marcas.forEach(function (m) { if (m.inicio <= a && m.fin >= b) marca = m; });
      rangos.forEach(function (r) { if (r.inicio <= a && r.fin >= b) rango = r; });
      if (marca) {
        nodo = el('mark', { 'class': 'c-' + marca.regla, attrs: { title: Motor.regla(marca.regla).nombre } }, [nodo]);
        nodo.style.setProperty('--i', orden++);
      }
      if (rango) nodo = el('span', { 'class': 'oculta' }, [nodo]);
      pre.appendChild(nodo);
      if (rango && rango.fin === b) pre.appendChild(el('sup', { 'class': 'num', text: String(rango.n) }));
    }
    if (!res.texto) pre.appendChild(el('span', { 'class': 'tenue', text: 'Aquí aparecerá el mensaje.' }));
    return pre;
  }

  // Una línea por regla: [detectado] urgencia  hoy, ahora
  function senales(res) {
    return el('ul', { 'class': 'senales' }, res.senales.map(function (s) {
      var hay = s.encontradas.length > 0;
      return el('li', { 'class': hay ? '' : 'sin' }, [
        el('span', { 'class': 'estado', text: hay ? '[detectado]' : '[nada]' }),
        el('span', { 'class': 'regla c-' + s.regla, text: s.regla }),
        el('span', { 'class': 'palabras', text: s.encontradas.map(function (e) { return e.forma; }).join(', ') })
      ]);
    }));
  }

  function nivel(res) {
    return el('div', { 'class': 'nivel n-' + res.nivel.id }, [
      el('span', { 'class': 'nivel-num', text: String(res.puntos) }),
      el('span', { 'class': 'nivel-txt' }, [
        el('span', { 'class': 'tenue', text: res.puntos === 1 ? 'punto' : 'puntos' }),
        el('span', { 'class': 'nivel-nombre', text: res.nivel.nombre })
      ])
    ]);
  }

  // 0 · 1 a 3 · 4 o más, con el nivel del mensaje encendido
  function escala(activo) {
    var tramos = [['sin', '0', 'sin señales'], ['leves', '1 a 3', 'señales leves'], ['fuertes', '4 o más', 'señales fuertes']];
    return el('div', { 'class': 'escala' }, tramos.map(function (t) {
      return el('div', { 'class': 'tramo n-' + t[0] + (t[0] === activo ? ' activo' : '') }, [
        el('span', { 'class': 'tramo-num', text: t[1] }),
        el('span', { 'class': 'tramo-txt', text: t[2] })
      ]);
    }));
  }

  // normaliza → compara → suma → nivel
  function tuberia(activas) {
    var hijos = [];
    ['normaliza', 'compara', 'suma', 'nivel'].forEach(function (e, i) {
      if (i) hijos.push(el('span', { 'class': 'flecha', text: '→', attrs: { 'aria-hidden': 'true' } }));
      hijos.push(el('span', { 'class': 'etapa' + (activas.indexOf(i) >= 0 ? ' activa' : ''), text: e }));
    });
    return el('p', { 'class': 'tuberia' }, hijos);
  }

  // Tono de cada lección: color, ícono y una palabra, para que acierto y
  // fallo no dependan solo del color.
  var TONOS = {
    bien: { etiqueta: 'acierto', lector: 'El detector acierta', trazo: 'M5 12.5l4.5 4.5L19 7.5' },
    mal: { etiqueta: 'fallo', lector: 'El detector falla', trazo: 'M7 7l10 10M17 7L7 17' },
    aviso: { etiqueta: 'riesgo', lector: 'Riesgo', trazo: 'M12 6.5v7M12 17.5v.01' },
    neutro: { etiqueta: null, lector: null, trazo: 'M12 11v6.5M12 7v.01' }
  };

  function icono(tono) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var trazo = document.createElementNS(NS, 'path');
    trazo.setAttribute('d', (TONOS[tono] || TONOS.neutro).trazo);
    svg.appendChild(trazo);
    return el('span', { 'class': 'icono' }, [svg]);
  }

  // ── Pantallas ─────────────────────────────────────────────────────────────

  function vistaInicio() {
    teclas = { Enter: siguiente };
    CAPITULOS.forEach(function (_, i) { teclas[String(i + 1)] = function () { irCapitulo(i); }; });
    return el('section', { 'class': 'inicio' }, [
      el('p', { 'class': 'marcador' }, [el('span', { 'class': 'prompt', text: '>' }), ' una lección en cuatro partes']),
      el('h1', { attrs: { tabindex: '-1' } }, [
        el('span', { 'class': 'titulo-grande', text: 'Cómo funciona un detector de phishing por reglas' }),
        el('span', { 'class': 'titulo-verde' }, ['y por qué no es suficiente', el('span', { 'class': 'cursor', attrs: { 'aria-hidden': 'true' } })])
      ]),
      p('Vas a desarmar un detector simple: ver cómo lee un mensaje, verlo acertar y fallar con cuatro casos, y entender qué usan los sistemas de verdad.', 'bajada'),
      el('ol', { 'class': 'mapa' }, CAPITULOS.map(function (c, i) {
        return el('li', {}, [el('button', { 'class': 'mapa-cap', attrs: { type: 'button' }, on: { click: function () { irCapitulo(i); } } }, [
          el('span', { 'class': 'mapa-num', text: c.num }),
          el('span', { 'class': 'mapa-nombre', text: c.nombre }),
          el('span', { 'class': 'mapa-desc', text: c.desc })
        ])]);
      })),
      el('div', { 'class': 'acciones' }, [boton('Empezar', siguiente, { principal: true, tecla: '↵' })])
    ]);
  }

  function vistaFunciona(k) {
    var paso = PASOS_FUNCIONA[k];
    var res = Motor.analizar(EJEMPLO);
    var cuerpo = [];
    var textoSig = 'Seguir';

    if (paso === 'idea') {
      cuerpo.push(h1('Un detector que no lee: compara'));
      cuerpo.push(p('Este escáner no entiende lo que dice un mensaje. Hace cuatro cosas, siempre las mismas, y al final da un número.', 'centro suave'));
      cuerpo.push(tuberia([0, 1, 2, 3]));
      cuerpo.push(p('Vamos a seguir este mensaje por cada paso:', 'centro'));
      cuerpo.push(mensaje(EJEMPLO, { corto: true }));
      textoSig = 'Paso 1: normaliza';
    }

    if (paso === 'normaliza') {
      cuerpo.push(h1('Normaliza el texto'));
      cuerpo.push(tuberia([0]));
      cuerpo.push(p('Pasa todo a minúsculas y le quita las tildes, letra por letra. Así «ÚLTIMO AVISO» y «ultimo aviso» cuentan igual, y nadie esquiva la lista solo con mayúsculas.', 'centro suave'));
      cuerpo.push(codigo(
        "function normalizar(texto) {\n" +
        "  // minúsculas y sin tildes: 'Último' → 'ultimo'\n" +
        "  return texto.toLowerCase()\n" +
        "    .normalize('NFD')\n" +
        "    .replace(/[\\u0300-\\u036f]/g, '');\n" +
        "}", 'js/motor.js · simplificado'));
      cuerpo.push(el('div', { 'class': 'antes-despues' }, [
        el('span', { 'class': 'etiqueta', text: 'antes' }), mensaje(EJEMPLO, { corto: true }),
        el('span', { 'class': 'etiqueta', text: 'después' }), mensaje(EJEMPLO, { corto: true, normalizado: true })
      ]));
      textoSig = 'Paso 2: compara';
    }

    if (paso === 'compara') {
      cuerpo.push(h1('Lo compara con tres listas'));
      cuerpo.push(tuberia([1]));
      cuerpo.push(p('Tiene una lista de palabras por cada truco típico de la ingeniería social. Solo cuenta palabras enteras: si en la lista está «banco», no lo encuentra dentro de «bancario», porque es otra palabra. Sí acepta plural y femenino: «bono» también encuentra «bonos».', 'centro suave'));
      cuerpo.push(codigo(
        "const REGLAS = {\n" +
        "  urgencia:  ['urgente', 'hoy', 'ahora', 'ultimo aviso', …],\n" +
        "  autoridad: ['gerente', 'director', 'banco', 'jefe', …],\n" +
        "  beneficio: ['bono', 'premio', 'gratis', 'oferta', …],\n" +
        "};", 'js/motor.js · resumido'));
      cuerpo.push(el('ul', { 'class': 'trucos' }, Motor.REGLAS.map(function (r) {
        return el('li', {}, [chip(r.id), el('span', { 'class': 'suave', text: r.lema })]);
      })));
      cuerpo.push(mensaje(EJEMPLO, { corto: true, marcas: true }));
      textoSig = 'Paso 3: suma';
    }

    if (paso === 'suma') {
      cuerpo.push(h1('Suma puntos y da un nivel'));
      cuerpo.push(tuberia([2, 3]));
      cuerpo.push(p('Cada palabra encontrada suma 1 punto, aunque aparezca varias veces. Con el total elige un nivel.', 'centro suave'));
      cuerpo.push(codigo(
        "let puntos = 0;\n" +
        "for (const palabra of todasLasListas) {\n" +
        "  if (aparece(palabra, texto)) puntos += 1;\n" +
        "}\n" +
        "// 0 → sin señales · 1 a 3 → leves · 4 o más → fuertes", 'js/motor.js · simplificado'));
      cuerpo.push(senales(res));
      cuerpo.push(escala(res.nivel.id));
      cuerpo.push(el('div', { 'class': 'remate' }, [
        p('Eso es todo el detector. No sabe quién envió el mensaje ni qué te está pidiendo: solo cuenta palabras.'),
        el('p', { 'class': 'pregunta-grande', text: '¿Alcanza con eso?' })
      ]));
      textoSig = 'Ver los cuatro casos';
    }

    return tarjeta([cabecera('01 · cómo funciona', PASOS_FUNCIONA.length, k)].concat(cuerpo), textoSig);
  }

  function vistaCaso(i, k) {
    var c = CASOS[i];
    var pasos = pasosCaso(c);
    var paso = pasos[k];
    var res = Motor.analizar(c.mensaje);
    var cuerpo = [];
    var textoSig = 'Seguir';

    if (paso === 'predice') {
      cuerpo.push(h1(c.titulo));
      cuerpo.push(p(c.intro, 'centro suave'));
      cuerpo.push(el('p', { 'class': 'pregunta', text: c.pregunta, attrs: { id: 'pregunta' } }));
      cuerpo.push(el('div', { 'class': 'opciones', attrs: { role: 'group', 'aria-labelledby': 'pregunta' } }, c.opciones.map(function (o, j) {
        var elegir = function () { estado.prediccion[i] = j; siguiente(); };
        teclas[String(j + 1)] = elegir;
        return el('button', {
          'class': 'opcion' + (estado.prediccion[i] === j ? ' elegida' : ''), attrs: { type: 'button' }, on: { click: elegir }
        }, [el('kbd', { text: String(j + 1), attrs: { 'aria-hidden': 'true' } }), o.texto]);
      })));
      textoSig = null;
    }

    if (paso === 'analisis') {
      cuerpo.push(h1('El escáner lee el mensaje'));
      cuerpo.push(el('p', { 'class': 'remite' }, [el('span', { 'class': 'tenue', text: 'de ' }), c.de, el('span', { 'class': 'tenue', text: ' · ' + c.asunto })]));
      cuerpo.push(el('p', { 'class': 'analizando', attrs: { 'aria-hidden': 'true' } }, [
        '> analizando ', el('span', { 'class': 'puntos-anim' }), el('span', { 'class': 'listo', text: ' listo' })
      ]));
      cuerpo.push(mensaje(c.mensaje, { marcas: true, fluido: true }));
      cuerpo.push(senales(res));
      textoSig = 'Ver el resultado';
    }

    if (paso === 'resultado') {
      var pr = estado.prediccion[i];
      cuerpo.push(h1('Resultado'));
      cuerpo.push(nivel(res));
      cuerpo.push(p(res.nivel.explicacion, 'centro suave'));
      var filas = [];
      if (pr != null) {
        var op = c.opciones[pr];
        var bien = acierta(op, res.puntos);
        filas.push(el('div', { 'class': 'fila-dato' }, [
          el('span', { 'class': 'tenue', text: 'tu predicción' }),
          el('span', {}, ['«' + op.texto + '» ', el('span', { 'class': bien ? 'ok' : 'error', text: bien ? '✓ acertaste' : '✗ no era eso' })])
        ]));
        if (op.nota) filas.push(el('div', { 'class': 'fila-dato' }, [el('span'), el('span', { 'class': 'suave', text: op.nota })]));
      }
      var l = lugar(c);
      filas.push(el('div', { 'class': 'fila-dato' }, [
        el('span', { 'class': 'tenue', text: 'en realidad' }),
        el('span', {}, [el('strong', { text: c.realidad === 'Estafa' ? 'es una estafa' : 'es legítimo' }), ' · ',
          el('span', { 'class': l.bien ? 'ok' : 'error', text: 'el detector ' + l.etiqueta })])
      ]));
      cuerpo.push(el('div', { 'class': 'datos' }, filas));
      cuerpo.push(p(c.comentario, 'centro'));
    }

    if (paso === 'persona') {
      var ocultas = c.ocultas.slice().sort(function (a, b) { return c.mensaje.indexOf(a.frase) - c.mensaje.indexOf(b.frase); });
      cuerpo.push(h1('Lo que una persona sí ve'));
      cuerpo.push(p('El escáner cuenta palabras. Una persona atenta lee intenciones.', 'centro suave'));
      cuerpo.push(mensaje(c.mensaje, { ocultas: ocultas, fluido: true }));
      cuerpo.push(el('ol', { 'class': 'notas' }, ocultas.map(function (o) {
        return el('li', {}, [el('span', { 'class': 'frase', text: '«' + o.frase.replace(/\n/g, ' ') + '»' }), ' ', o.nota]);
      })));
    }

    if (paso === 'lecciones') {
      cuerpo.push(h1('Por qué pasó'));
      c.lecciones.forEach(function (lec) {
        var tono = TONOS[lec.tono] || TONOS.neutro;
        var hijos = [el('div', { 'class': 'leccion-cab' }, [
          icono(lec.tono),
          el('h2', {}, [tono.lector ? el('span', { 'class': 'oculto-visual', text: tono.lector + ': ' }) : null, lec.titulo]),
          tono.etiqueta ? el('span', { 'class': 'tono-tag', text: tono.etiqueta, attrs: { 'aria-hidden': 'true' } }) : null
        ])];
        (lec.parrafos || []).forEach(function (t) { hijos.push(p(t)); });
        cuerpo.push(el('section', { 'class': 'leccion t-' + (TONOS[lec.tono] ? lec.tono : 'neutro') }, hijos));
      });
      textoSig = i < CASOS.length - 1 ? 'Caso ' + (i + 2) + ': ' + CASOS[i + 1].titulo : 'Ver el resumen';
    }

    return tarjeta([cabecera('02 · caso ' + c.numero + ' de ' + CASOS.length, pasos.length, k)].concat(cuerpo), textoSig,
      paso === 'predice' ? el('button', { 'class': 'enlace', text: 'Seguir sin predecir', attrs: { type: 'button' }, on: { click: function () { estado.prediccion[i] = null; siguiente(); } } }) : null);
  }

  function vistaResumen() {
    var filas = CASOS.map(function (c, i) {
      var l = lugar(c);
      var pr = estado.prediccion[i];
      var tuya = pr == null ? null : acierta(c.opciones[pr], Motor.analizar(c.mensaje).puntos);
      return el('li', { 'class': 'resumen-fila' }, [
        el('span', { 'class': 'resumen-num', text: String(c.numero) }),
        el('span', { 'class': 'resumen-caso' }, [
          el('strong', { text: c.titulo }),
          el('span', { 'class': 'tenue', text: (c.realidad === 'Estafa' ? 'estafa' : 'legítimo') + ' · ' + (l.alerta ? 'alerta' : 'no alerta') +
            (tuya == null ? '' : ' · tu predicción ' + (tuya ? '✓' : '✗')) })
        ]),
        el('span', { 'class': 'resumen-res ' + (l.bien ? 'ok' : 'error'), text: l.etiqueta })
      ]);
    });
    return tarjeta([
      cabecera('02 · resumen'),
      h1('Dos aciertos, dos fallos'),
      el('ol', { 'class': 'resumen' }, filas),
      p('Los dos fallos son de distinto tipo. El falso positivo cansa: si alarma de más, la gente deja de hacerle caso. El bypass es peor: la estafa pasa sin que nadie lo note.', 'centro'),
      p('Y agregar más palabras a la lista no arregla ninguno de los dos, porque más palabras no le dan contexto. «Vence hoy» seguiría sonando a estafa en el correo del banco, y al atacante le basta con escribir otras palabras.', 'centro suave')
    ], 'Más allá de las reglas');
  }

  function vistaCapas() {
    return tarjeta([
      cabecera('03 · más allá de las reglas'),
      h1('Lo que usan los sistemas reales'),
      p('Un detector por palabras sirve para lo obvio. Los sistemas reales lo usan como una capa más, junto a otras que cubren lo que las reglas no ven.', 'centro suave'),
      el('ol', { 'class': 'capas' }, CAPAS.map(function (c, i) {
        return el('li', { 'class': 'capa' }, [
          el('span', { 'class': 'capa-num', text: String(i + 1) }),
          el('div', {}, [
            el('span', { 'class': 'etiqueta', text: c.tipo }),
            el('h2', { text: c.titulo }),
            p(c.texto, 'suave'),
            el('p', { 'class': 'resuelve' }, [el('span', { 'class': 'flecha', text: '→ ', attrs: { 'aria-hidden': 'true' } }), c.resuelve])
          ])
        ]);
      })),
      el('div', { 'class': 'remate' }, [
        p('Ninguna capa es perfecta sola. Juntas, cada una cubre los fallos de las otras.'),
        el('p', { 'class': 'pregunta-grande', text: '¿Te animas a engañar al detector?' })
      ])
    ], 'Pruébalo tú');
  }

  function vistaLibre() {
    var entrada = el('textarea', {
      'class': 'entrada',
      attrs: { id: 'entrada', rows: '7', spellcheck: 'false', placeholder: 'Hola, soy del área de finanzas. Necesito que…', 'aria-describedby': 'nota-libre' }
    });
    entrada.value = estado.textoLibre;
    var salida = el('div', { 'class': 'salida', attrs: { 'aria-live': 'polite' } });
    var nota = el('span', { 'class': 'tenue', attrs: { role: 'status' } });
    var archivo = el('input', { 'class': 'oculto-visual', attrs: { type: 'file', id: 'archivo', accept: '.txt,text/plain' } });

    function pintarSalida() {
      estado.textoLibre = entrada.value;
      vaciar(salida);
      if (!entrada.value.trim()) return;
      var res = Motor.analizar(entrada.value);
      salida.appendChild(nivel(res));
      salida.appendChild(mensaje(entrada.value, { marcas: true }));
      salida.appendChild(senales(res));
      if (res.puntos === 0) salida.appendChild(p('0 puntos. Si esto es una estafa, acabas de hacer un bypass.', 'ok centro'));
    }

    entrada.addEventListener('input', pintarSalida);
    archivo.addEventListener('change', function () {
      var f = archivo.files && archivo.files[0];
      archivo.value = '';
      if (!f) return;
      if (f.size > MAX_ARCHIVO) { nota.textContent = 'El archivo es muy grande (máximo 200 KB).'; return; }
      var lector = new FileReader();
      lector.onload = function () { entrada.value = String(lector.result || ''); nota.textContent = 'Abriste «' + f.name + '».'; pintarSalida(); };
      lector.onerror = function () { nota.textContent = 'No se pudo leer el archivo.'; };
      lector.readAsText(f);
    });
    pintarSalida();

    var reglas = el('details', { 'class': 'reglas' }, [
      el('summary', { text: 'Ver todas las palabras que busca' }),
      el('div', { 'class': 'reglas-cuerpo' }, Motor.REGLAS.map(function (r) {
        return el('div', { 'class': 'regla-lista' }, [chip(r.id), el('p', { 'class': 'lista', text: r.palabras.join(' · ') })]);
      }))
    ]);

    return tarjeta([
      cabecera('04 · pruébalo tú'),
      h1('Engaña al escáner'),
      el('p', { 'class': 'centro suave', attrs: { id: 'nota-libre' } }, ['Escribe una estafa que saque ', el('strong', { text: '0 puntos' }), ', o pega un mensaje real. El texto no sale de tu navegador.']),
      el('label', { 'class': 'oculto-visual', text: 'Mensaje', attrs: { 'for': 'entrada' } }),
      entrada,
      el('div', { 'class': 'herramientas' }, [
        el('label', { 'class': 'enlace', attrs: { 'for': 'archivo' } }, ['Abrir .txt']),
        archivo,
        el('button', { 'class': 'enlace', text: 'Borrar', attrs: { type: 'button' }, on: { click: function () { entrada.value = ''; nota.textContent = ''; pintarSalida(); entrada.focus(); } } }),
        nota
      ]),
      salida,
      reglas
    ], null, boton('Volver al inicio', irInicio));
  }

  // Línea de arriba de cada tarjeta: el capítulo y, si tiene pasos, los puntos
  function cabecera(texto, total, paso) {
    return el('div', { 'class': 'progreso' }, [
      el('span', { text: texto }),
      total ? el('span', { 'class': 'puntos-prog', attrs: { role: 'img', 'aria-label': 'paso ' + (paso + 1) + ' de ' + total } },
        Array.apply(null, Array(total)).map(function (_, j) { return el('span', { 'class': 'punto' + (j <= paso ? ' lleno' : '') }); })) : null
    ]);
  }

  // La tarjeta, con el botón para seguir y, abajo, el enlace para volver
  function tarjeta(cuerpo, textoSig, extra) {
    var acciones = [];
    if (textoSig) {
      acciones.push(boton(textoSig, siguiente, { principal: true, tecla: '↵' }));
      teclas.Enter = siguiente;
    }
    if (extra) acciones.push(extra);
    return el('section', { 'class': 'tarjeta' }, cuerpo.concat([
      el('div', { 'class': 'acciones' }, acciones),
      el('div', { 'class': 'volver' }, [el('button', { 'class': 'atras', attrs: { type: 'button' }, on: { click: anterior } }, ['← atrás'])])
    ]));
  }

  // ── Navegación ────────────────────────────────────────────────────────────

  function irA(pos) {
    estado.pos = Math.max(0, Math.min(pos, SECUENCIA.length - 1));
    pintar();
  }
  function siguiente() { irA(estado.pos + 1); }
  function anterior() { irA(estado.pos - 1); }
  function irInicio() { irA(0); }
  function irCapitulo(n) {
    for (var i = 0; i < SECUENCIA.length; i++) {
      if (CAPITULO_DE[SECUENCIA[i].vista] === n) { irA(i); return; }
    }
  }

  function pintar() {
    var v = actual();
    teclas = { '←': anterior };
    var vista;
    if (v.vista === 'inicio') vista = vistaInicio();
    else if (v.vista === 'funciona') vista = vistaFunciona(v.paso);
    else if (v.vista === 'caso') vista = vistaCaso(v.caso, v.paso);
    else if (v.vista === 'resumen') vista = vistaResumen();
    else if (v.vista === 'capas') vista = vistaCapas();
    else vista = vistaLibre();

    vaciar(pantalla);
    pantalla.appendChild(vista);
    pantalla.classList.remove('entra');
    void pantalla.offsetWidth;
    pantalla.classList.add('entra');

    var cap = CAPITULO_DE[v.vista];
    nav.hidden = cap < 0;
    Array.prototype.forEach.call(nav.querySelectorAll('button'), function (b, i) {
      b.setAttribute('aria-current', i === cap ? 'step' : 'false');
    });

    window.scrollTo(0, 0);
    var foco = v.vista === 'libre' ? pantalla.querySelector('textarea') : pantalla.querySelector('h1');
    if (foco) foco.focus({ preventScroll: true });
  }

  document.getElementById('ir-inicio').addEventListener('click', irInicio);
  Array.prototype.forEach.call(nav.querySelectorAll('button'), function (b, i) {
    b.addEventListener('click', function () { irCapitulo(i); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    var t = e.target;
    if (e.key === 'Escape') {
      if (estado.pos !== 0) { e.preventDefault(); irInicio(); }
      return;
    }
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return;
    // Enter sobre un botón o un enlace ya lo activa el navegador
    if (e.key === 'Enter' && t && /^(BUTTON|A|LABEL|SUMMARY)$/.test(t.tagName)) return;
    var tecla = e.key === 'ArrowLeft' ? '←' : e.key;
    if (teclas[tecla]) { e.preventDefault(); teclas[tecla](); }
  });

  pintar();
})();
