/*
 * La página: casos guiados, prueba libre y reglas.
 * Todo se construye con nodos y textContent; el texto del usuario nunca
 * se interpreta como HTML.
 */
(function () {
  'use strict';

  var Motor = window.Motor;
  var CASOS = window.Casos.CASOS;
  var acierta = window.Casos.acierta;

  var REDUCIR_MOVIMIENTO = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAX_ARCHIVO = 200 * 1024;

  // ── Utilidades ────────────────────────────────────────────────────────────

  // el('p', { class: 'x', text: 'hola', on: { click: fn }, attrs: {...} }, [hijos])
  function el(tag, props, hijos) {
    var n = document.createElement(tag);
    props = props || {};
    if (props['class']) n.className = props['class'];
    if (props.text != null) n.textContent = props.text;
    if (props.attrs) Object.keys(props.attrs).forEach(function (k) {
      if (props.attrs[k] !== false && props.attrs[k] != null) n.setAttribute(k, props.attrs[k]);
    });
    if (props.on) Object.keys(props.on).forEach(function (k) { n.addEventListener(k, props.on[k]); });
    (hijos || []).forEach(function (h) {
      if (h == null || h === false) return;
      n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
    });
    return n;
  }

  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function puntosTexto(n) { return n === 1 ? '1 punto' : n + ' puntos'; }

  function alerta(res) { return res.nivel.id !== 'sin'; }

  // ── Mensaje resaltado ─────────────────────────────────────────────────────
  // Corta el texto en tramos según las palabras detectadas (marcas) y las
  // frases "ocultas", y arma <mark> y <span> sin usar innerHTML.
  function pintarMensaje(pre, res, ocultas) {
    vaciar(pre);
    var texto = res.texto;
    var rangos = [];
    (ocultas || []).forEach(function (o) {
      var i = texto.indexOf(o.frase);
      if (i >= 0) rangos.push({ inicio: i, fin: i + o.frase.length, n: rangos.length + 1 });
    });

    var cortes = [0, texto.length];
    res.marcas.forEach(function (m) { cortes.push(m.inicio, m.fin); });
    rangos.forEach(function (r) { cortes.push(r.inicio, r.fin); });
    cortes = cortes.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });

    var orden = 0;
    for (var k = 0; k < cortes.length - 1; k++) {
      var a = cortes[k], b = cortes[k + 1];
      if (a === b) continue;
      var nodo = document.createTextNode(texto.slice(a, b));
      var marca = null, rango = null;
      res.marcas.forEach(function (m) { if (m.inicio <= a && m.fin >= b) marca = m; });
      rangos.forEach(function (r) { if (r.inicio <= a && r.fin >= b) rango = r; });

      if (marca) {
        var regla = Motor.regla(marca.regla);
        var mk = el('mark', { 'class': 'm m-' + marca.regla, attrs: { title: regla.nombre + ': «' + marca.palabra + '»' } }, [nodo]);
        mk.style.setProperty('--i', orden++);
        nodo = mk;
      }
      if (rango) nodo = el('span', { 'class': 'oculta' }, [nodo]);
      pre.appendChild(nodo);
      if (rango && rango.fin === b) {
        pre.appendChild(el('span', { 'class': 'oculta-num', text: String(rango.n), attrs: { 'aria-hidden': 'true' } }));
      }
    }
    if (!texto) pre.appendChild(el('span', { 'class': 'vacio', text: 'Aquí aparecerá el mensaje con las palabras detectadas.' }));
    return rangos.length;
  }

  // ── Panel de resultado ────────────────────────────────────────────────────
  function escalaNiveles(activo) {
    return el('ol', { 'class': 'escala-mini', attrs: { 'aria-label': 'Escala de niveles' } }, Motor.NIVELES.map(function (n, i) {
      var sig = Motor.NIVELES[i + 1];
      var rango = sig ? (sig.desde - 1 === n.desde ? String(n.desde) : n.desde + '–' + (sig.desde - 1)) : n.desde + ' o más';
      return el('li', {
        'class': 'nivel-paso nivel-' + n.id + (n.id === activo ? ' activo' : ''),
        attrs: { 'aria-current': n.id === activo ? 'true' : null }
      }, [el('span', { 'class': 'nivel-rango', text: rango }), el('span', { text: n.nombre })]);
    }));
  }

  function panelResultado(res) {
    var senales = el('ul', { 'class': 'senales' }, res.senales.map(function (s) {
      var regla = Motor.regla(s.regla);
      var hay = s.encontradas.length > 0;
      return el('li', { 'class': 'senal senal-' + s.regla + (hay ? ' detectada' : '') }, [
        el('div', { 'class': 'senal-cabeza' }, [
          el('span', { 'class': 'senal-nombre', text: regla.nombre }),
          el('span', { 'class': 'senal-estado', text: hay ? 'Detectado · ' + puntosTexto(s.encontradas.length) : 'Sin señales' })
        ]),
        el('p', { 'class': 'senal-lema', text: regla.lema + '. ' + regla.descripcion }),
        hay ? el('ul', { 'class': 'fichas', attrs: { 'aria-label': 'Palabras encontradas' } }, s.encontradas.map(function (e) {
          return el('li', { 'class': 'ficha ficha-' + s.regla, text: e.forma });
        })) : null
      ]);
    }));

    return el('div', { 'class': 'resultado nivel-' + res.nivel.id }, [
      el('div', { 'class': 'resultado-cabeza' }, [
        el('p', { 'class': 'puntaje' }, [
          el('span', { 'class': 'puntaje-num', text: String(res.puntos) }),
          el('span', { 'class': 'puntaje-txt', text: res.puntos === 1 ? 'punto' : 'puntos' })
        ]),
        el('p', { 'class': 'nivel-insignia', text: res.nivel.nombre })
      ]),
      escalaNiveles(res.nivel.id),
      el('p', { 'class': 'resultado-explica', text: res.nivel.explicacion }),
      senales
    ]);
  }

  // ── Casos guiados ─────────────────────────────────────────────────────────
  var estado = {
    actual: 0,
    casos: CASOS.map(function (c) {
      return { prediccion: null, revelado: false, texto: c.mensaje, editando: false, ocultas: false };
    })
  };

  var listaCasos = document.getElementById('lista-casos');
  var vistaCaso = document.getElementById('caso');
  var matriz = document.getElementById('matriz');

  function pintarLista() {
    vaciar(listaCasos);
    CASOS.forEach(function (c, i) {
      var st = estado.casos[i];
      var activo = i === estado.actual;
      listaCasos.appendChild(el('li', {}, [
        el('button', {
          'class': 'paso tono-' + c.tono + (activo ? ' activo' : '') + (st.revelado ? ' visto' : ''),
          attrs: { type: 'button', 'aria-current': activo ? 'step' : null },
          on: { click: function () { elegirCaso(i, false); } }
        }, [
          el('span', { 'class': 'paso-num', text: st.revelado ? '✓' : String(c.numero), attrs: { 'aria-hidden': 'true' } }),
          el('span', { 'class': 'paso-txt' }, [
            el('span', { 'class': 'paso-titulo', text: c.numero + '. ' + c.titulo }),
            el('span', { 'class': 'paso-resumen', text: c.resumen })
          ])
        ])
      ]));
    });
  }

  function elegirCaso(i, mover) {
    estado.actual = i;
    pintarLista();
    pintarCaso(false);
    pintarMatriz();
    if (mover) {
      vistaCaso.scrollIntoView({ behavior: REDUCIR_MOVIMIENTO ? 'auto' : 'smooth', block: 'start' });
      var h = vistaCaso.querySelector('h3');
      if (h) h.focus({ preventScroll: true });
    }
  }

  function predecir(i) {
    var st = estado.casos[estado.actual];
    st.prediccion = i;
    st.revelado = true;
    pintarLista();
    pintarCaso(true);
    pintarMatriz();
    var h = vistaCaso.querySelector('#resultado-titulo');
    if (h) h.focus({ preventScroll: false });
  }

  function cajaPrediccion(c, st, res) {
    if (st.prediccion == null) {
      return el('div', { 'class': 'veredicto neutro' }, [
        el('p', { text: 'Viste el resultado sin predecir. Puedes volver a intentarlo con otro caso.' })
      ]);
    }
    var op = c.opciones[st.prediccion];
    var bien = acierta(op, res.puntos);
    var correcta = c.opciones.filter(function (o) { return acierta(o, res.puntos); })[0];
    var hijos = [
      el('p', { 'class': 'veredicto-titulo', text: bien ? '¡Bien visto!' : 'Esta vez no.' }),
      el('p', {}, ['Dijiste «', el('strong', { text: op.texto }), '». ',
        typeof op.correcta === 'boolean'
          ? (bien ? 'Exacto: no es el largo ni los enlaces, son las palabras.' : 'La respuesta es «' + correcta.texto + '».')
          : 'El detector dio ' + puntosTexto(res.puntos) + ': ' + res.nivel.nombre.toLowerCase() + '.'
      ])
    ];
    if (op.nota) hijos.push(el('p', { 'class': 'veredicto-nota', text: op.nota }));
    return el('div', { 'class': 'veredicto ' + (bien ? 'bien' : 'mal') }, hijos);
  }

  function tarjetaLeccion(l) {
    var cuerpo = [el('h4', { text: l.titulo })];
    (l.parrafos || []).forEach(function (p) { cuerpo.push(el('p', { text: p })); });
    if (l.items) {
      cuerpo.push(el('ul', { 'class': 'leccion-items' }, l.items.map(function (it) {
        return el('li', {}, [
          el('span', { 'class': 'etiqueta-tipo tipo-' + it.etiqueta, text: it.etiqueta }),
          el('strong', { text: it.titulo }),
          el('p', { text: it.texto })
        ]);
      })));
    }
    return el('section', { 'class': 'leccion tono-' + l.tono }, cuerpo);
  }

  function pintarCaso(animar) {
    var c = CASOS[estado.actual];
    var st = estado.casos[estado.actual];
    var res = Motor.analizar(st.texto);
    vaciar(vistaCaso);
    vistaCaso.className = 'caso tono-' + c.tono;

    var cabeza = el('header', { 'class': 'caso-cabeza' }, [
      el('p', { 'class': 'caso-contador', text: 'Caso ' + c.numero + ' de ' + CASOS.length }),
      el('h3', { text: c.titulo, attrs: { tabindex: '-1' } }),
      el('p', { 'class': 'caso-intro', text: c.intro })
    ]);

    // Tarjeta del correo
    var pre = el('pre', { 'class': 'mensaje' });
    var correo = el('div', { 'class': 'tarjeta-correo' + (animar && !REDUCIR_MOVIMIENTO ? ' escaneando' : '') }, [
      el('div', { 'class': 'correo-cabeza' }, [
        el('span', { 'class': 'punto' }), el('span', { 'class': 'punto' }), el('span', { 'class': 'punto' }),
        el('span', { 'class': 'correo-de', text: c.de }),
        el('span', { 'class': 'correo-asunto', text: c.asunto })
      ]),
      pre
    ]);

    if (!st.revelado) {
      pre.textContent = st.texto;
      var opciones = el('div', { 'class': 'opciones', attrs: { role: 'group', 'aria-labelledby': 'pregunta-' + c.id } },
        c.opciones.map(function (o, i) {
          return el('button', { 'class': 'opcion', text: o.texto, attrs: { type: 'button' }, on: { click: function () { predecir(i); } } });
        }));
      vistaCaso.appendChild(cabeza);
      vistaCaso.appendChild(el('div', { 'class': 'caso-cuerpo antes' }, [
        correo,
        el('div', { 'class': 'pregunta' }, [
          el('p', { 'class': 'antetitulo', text: 'Antes de ver el resultado' }),
          el('p', { 'class': 'pregunta-texto', text: c.pregunta, attrs: { id: 'pregunta-' + c.id } }),
          opciones,
          el('button', {
            'class': 'enlace', text: 'Ver el resultado sin predecir', attrs: { type: 'button' },
            on: { click: function () { st.revelado = true; pintarLista(); pintarCaso(true); pintarMatriz(); } }
          })
        ])
      ]));
      vistaCaso.appendChild(navegacion());
      return;
    }

    var numOcultas = 0;
    var panel = el('div', { 'class': 'caso-panel' });
    var notasOcultas = el('ol', { 'class': 'notas-ocultas' });

    function refrescar() {
      res = Motor.analizar(st.texto);
      numOcultas = pintarMensaje(pre, res, st.ocultas ? c.ocultas : []);
      vaciar(panel);
      panel.appendChild(panelResultado(res));
      vaciar(notasOcultas);
      if (st.ocultas) {
        c.ocultas.forEach(function (o) {
          if (st.texto.indexOf(o.frase) >= 0) {
            notasOcultas.appendChild(el('li', {}, [el('q', { text: o.frase.replace(/\n/g, ' ') }), ' — ' + o.nota]));
          }
        });
      }
      avisoEdicion.hidden = st.texto === c.mensaje;
      botonOriginal.disabled = st.texto === c.mensaje;
    }

    var avisoEdicion = el('p', { 'class': 'aviso-edicion', text: 'Estás viendo tu versión del mensaje. El comentario y las lecciones hablan del original.' });

    // Herramientas sobre el mensaje
    var herramientas = el('div', { 'class': 'herramientas' });
    var editor = null;
    if (st.editando) {
      editor = el('textarea', {
        'class': 'editor', attrs: { 'aria-label': 'Editar el mensaje del caso', spellcheck: 'false', rows: '8' },
        on: { input: function () { st.texto = editor.value; refrescar(); } }
      });
      editor.value = st.texto;
    }
    herramientas.appendChild(el('button', {
      'class': 'boton chico', text: st.editando ? 'Cerrar el editor' : 'Editar el mensaje',
      attrs: { type: 'button', 'aria-pressed': st.editando ? 'true' : 'false' },
      on: { click: function () { st.editando = !st.editando; pintarCaso(false); if (st.editando) vistaCaso.querySelector('.editor').focus(); } }
    }));
    var botonOriginal = el('button', {
      'class': 'boton chico', text: 'Volver al original', attrs: { type: 'button' },
      on: { click: function () { st.texto = c.mensaje; pintarCaso(false); } }
    });
    herramientas.appendChild(botonOriginal);
    if (c.ocultas.length) {
      herramientas.appendChild(el('button', {
        'class': 'boton chico ocultas-boton', attrs: { type: 'button', 'aria-pressed': st.ocultas ? 'true' : 'false' },
        text: st.ocultas ? 'Ocultar lo que una persona sí ve' : 'Mostrar lo que una persona sí ve',
        on: { click: function () { st.ocultas = !st.ocultas; pintarCaso(false); } }
      }));
    }

    var realidad = el('div', { 'class': 'realidad ' + (c.realidad === 'Estafa' ? 'es-estafa' : 'es-legitimo') }, [
      el('p', { 'class': 'realidad-titulo' }, ['En realidad, el mensaje es: ', el('strong', { text: c.realidad.toLowerCase() })]),
      el('p', { text: c.comentario })
    ]);

    var bloqueMensaje = el('div', { 'class': 'caso-mensaje' }, [
      correo, herramientas, editor, avisoEdicion,
      st.ocultas ? el('div', { 'class': 'ocultas-caja' }, [
        el('p', { 'class': 'etiqueta', text: 'Lo que el detector no ve' }),
        notasOcultas
      ]) : null
    ]);

    vistaCaso.appendChild(cabeza);
    vistaCaso.appendChild(el('h4', { 'class': 'oculto-visual', text: 'Resultado', attrs: { id: 'resultado-titulo', tabindex: '-1' } }));
    vistaCaso.appendChild(el('div', { 'class': 'caso-cuerpo' }, [
      bloqueMensaje,
      el('div', { 'class': 'caso-lado' }, [cajaPrediccion(c, st, res), panel, realidad])
    ]));
    vistaCaso.appendChild(el('div', { 'class': 'lecciones' }, c.lecciones.map(tarjetaLeccion)));
    vistaCaso.appendChild(navegacion());
    refrescar();

    if (animar && !REDUCIR_MOVIMIENTO) {
      setTimeout(function () { correo.classList.remove('escaneando'); }, 900);
    }
  }

  function navegacion() {
    var i = estado.actual;
    return el('nav', { 'class': 'caso-nav', attrs: { 'aria-label': 'Cambiar de caso' } }, [
      i > 0 ? el('button', {
        'class': 'boton', text: '← ' + CASOS[i - 1].titulo, attrs: { type: 'button' },
        on: { click: function () { elegirCaso(i - 1, true); } }
      }) : el('span'),
      i < CASOS.length - 1 ? el('button', {
        'class': 'boton primario', text: 'Siguiente: ' + CASOS[i + 1].titulo + ' →', attrs: { type: 'button' },
        on: { click: function () { elegirCaso(i + 1, true); } }
      }) : el('a', { 'class': 'boton primario', text: 'Ahora prueba con tu mensaje →', attrs: { href: '#probar' } })
    ]);
  }

  // Tabla de 2×2: lo que dijo el detector contra lo que es el mensaje
  function pintarMatriz() {
    vaciar(matriz);
    var celdas = { 'Estafa-si': [], 'Estafa-no': [], 'Legítimo-si': [], 'Legítimo-no': [] };
    CASOS.forEach(function (c, i) {
      var r = Motor.analizar(c.mensaje);
      celdas[c.realidad + '-' + (alerta(r) ? 'si' : 'no')].push({ caso: c, visto: estado.casos[i].revelado, i: i });
    });
    var vistos = estado.casos.filter(function (s) { return s.revelado; }).length;

    function celda(clave, nombre, explica, tipo) {
      return el('td', { 'class': 'celda celda-' + tipo }, [
        el('span', { 'class': 'celda-nombre', text: nombre }),
        el('span', { 'class': 'celda-explica', text: explica }),
        el('span', { 'class': 'celda-casos' }, celdas[clave].map(function (x) {
          return x.visto
            ? el('button', { 'class': 'ficha-caso', text: x.caso.titulo, attrs: { type: 'button' }, on: { click: function () { elegirCaso(x.i, true); } } })
            : el('span', { 'class': 'ficha-caso pendiente', text: '?', attrs: { title: 'Aún no ves este caso' } });
        }))
      ]);
    }

    matriz.appendChild(el('h3', { text: 'Los cuatro casos en una tabla' }));
    matriz.appendChild(el('p', { 'class': 'matriz-bajada', text: vistos < CASOS.length
      ? 'Se completa a medida que ves los casos (' + vistos + ' de ' + CASOS.length + ').'
      : 'Así se evalúa cualquier detector: no basta con contar aciertos, también hay que mirar sus dos tipos de error.' }));
    matriz.appendChild(el('div', { 'class': 'tabla-scroll' }, [
      el('table', { 'class': 'matriz' }, [
        el('thead', {}, [el('tr', {}, [
          el('td'),
          el('th', { text: 'El detector alerta', attrs: { scope: 'col' } }),
          el('th', { text: 'El detector no alerta', attrs: { scope: 'col' } })
        ])]),
        el('tbody', {}, [
          el('tr', {}, [
            el('th', { text: 'Es una estafa', attrs: { scope: 'row' } }),
            celda('Estafa-si', 'Acierto', 'Atrapa la estafa.', 'bien'),
            celda('Estafa-no', 'Bypass', 'Falso negativo: la estafa pasa.', 'grave')
          ]),
          el('tr', {}, [
            el('th', { text: 'Es legítimo', attrs: { scope: 'row' } }),
            celda('Legítimo-si', 'Falso positivo', 'Alarma un mensaje real.', 'mal'),
            celda('Legítimo-no', 'Acierto', 'Lo deja pasar, como debe.', 'bien')
          ])
        ])
      ])
    ]));
  }

  // ── Prueba libre ──────────────────────────────────────────────────────────
  var entrada = document.getElementById('entrada');
  var vista = document.getElementById('vista');
  var resultadoPropio = document.getElementById('resultado-propio');
  var archivo = document.getElementById('archivo');
  var archivoNota = document.getElementById('archivo-nota');
  var ultimoNivel = null;

  var resumenVivo = document.getElementById('resumen-vivo');

  function analizarPropio() {
    var texto = entrada.value;
    var res = Motor.analizar(texto);
    pintarMensaje(vista, res, []);
    vaciar(resultadoPropio);
    if (!texto.trim()) {
      resultadoPropio.appendChild(el('div', { 'class': 'resultado-vacio' }, [
        el('p', { 'class': 'resultado-vacio-titulo', text: 'Esperando un mensaje' }),
        el('p', { text: 'Puedes partir de uno de los casos y cambiarlo:' }),
        el('div', { 'class': 'partir' }, CASOS.map(function (c) {
          return el('button', {
            'class': 'boton chico', text: c.titulo, attrs: { type: 'button' },
            on: { click: function () { entrada.value = c.mensaje; analizarPropio(); entrada.focus(); } }
          });
        })),
        el('p', { 'class': 'desafio' }, [el('strong', { text: 'Desafío: ' }), 'escribe una estafa convincente que saque 0 puntos. Después piensa qué haría falta para detectarla.'])
      ]));
      ultimoNivel = null;
      resumenVivo.textContent = '';
    } else {
      resultadoPropio.appendChild(panelResultado(res));
      if (ultimoNivel !== res.nivel.id + res.puntos) {
        resumenVivo.textContent = res.nivel.nombre + ', ' + puntosTexto(res.puntos) + '.';
        ultimoNivel = res.nivel.id + res.puntos;
      }
    }
  }

  entrada.addEventListener('input', analizarPropio);
  document.getElementById('limpiar').addEventListener('click', function () {
    entrada.value = '';
    archivoNota.textContent = '';
    analizarPropio();
    entrada.focus();
  });

  archivo.addEventListener('change', function () {
    var f = archivo.files && archivo.files[0];
    archivo.value = '';
    if (!f) return;
    if (f.size > MAX_ARCHIVO) {
      archivoNota.textContent = 'El archivo es muy grande (máximo 200 KB).';
      return;
    }
    var lector = new FileReader();
    lector.onload = function () {
      entrada.value = String(lector.result || '');
      archivoNota.textContent = 'Abriste «' + f.name + '».';
      analizarPropio();
    };
    lector.onerror = function () { archivoNota.textContent = 'No se pudo leer el archivo.'; };
    lector.readAsText(f);
  });

  // ── Reglas ────────────────────────────────────────────────────────────────
  function pintarReglas() {
    var cont = document.getElementById('lista-reglas');
    Motor.REGLAS.forEach(function (r) {
      cont.appendChild(el('section', { 'class': 'regla regla-' + r.id }, [
        el('h3', { text: r.nombre }),
        el('p', { 'class': 'regla-lema', text: r.lema + '.' }),
        el('p', { 'class': 'regla-desc', text: r.descripcion }),
        el('ul', { 'class': 'fichas', attrs: { 'aria-label': 'Palabras de ' + r.nombre } }, r.palabras.map(function (p) {
          return el('li', { 'class': 'ficha ficha-' + r.id, text: p });
        })),
        el('p', { 'class': 'regla-cuenta', text: r.palabras.length + ' palabras, escritas sin tildes' })
      ]));
    });
    var escala = document.getElementById('escala');
    escala.appendChild(el('h4', { text: 'Y lo traduce a un nivel' }));
    escala.appendChild(escalaNiveles(null));
  }

  // ── Portada ───────────────────────────────────────────────────────────────
  function pintarPortada() {
    var muestra = 'Hola, soy Roberto Sánchez, gerente general.\n\n' +
      'Necesito que hagas una transferencia hoy\n' +
      'antes del cierre bancario.\n\n' +
      'No lo comentes todavía con el resto del equipo.';
    var res = Motor.analizar(muestra);
    pintarMensaje(document.getElementById('hero-mensaje'), res, [{ frase: 'No lo comentes todavía con el resto del equipo' }]);
    var pie = document.getElementById('hero-pie');
    pie.appendChild(el('span', { 'class': 'pie-dato', text: puntosTexto(res.puntos) + ' · ' + res.nivel.nombre.toLowerCase() }));
    pie.appendChild(document.createTextNode(' Detecta las palabras, pero no la frase más peligrosa: la última.'));
  }

  // ── Inicio ────────────────────────────────────────────────────────────────
  pintarPortada();
  pintarLista();
  pintarCaso(false);
  pintarMatriz();
  analizarPropio();
  pintarReglas();
})();
