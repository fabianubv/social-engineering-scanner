/*
 * Motor del escáner: las reglas y el análisis, sin nada de la página.
 * Es el mismo criterio de scanner.sh; las pruebas revisan que las listas
 * de palabras coincidan en ambos.
 *
 * Funciona como script clásico (deja `Motor` en window) y en Node (require).
 */
(function (raiz) {
  'use strict';

  // Cada palabra suma 1 punto si aparece al menos una vez.
  // Se escriben sin tildes y en minúscula: el texto se normaliza antes.
  var REGLAS = [
    {
      id: 'urgencia',
      nombre: 'Urgencia',
      lema: 'Te meten prisa para que no pienses',
      descripcion: 'Buscan que actúes antes de verificar si el mensaje es real.',
      palabras: [
        'urgente', 'expira', 'inmediato', 'hoy', 'ahora', '24 horas',
        'plazo', 'suspension', 'bloqueo', 'ultimo aviso', 'consecuencias',
        'accion requerida', 'limite', 'rapido', 'vence', 'cierre'
      ]
    },
    {
      id: 'autoridad',
      nombre: 'Autoridad',
      lema: 'Fingen ser alguien con poder',
      descripcion: 'Explotan el respeto a las jerarquías para que obedezcas sin preguntar.',
      palabras: [
        'gerente', 'director', 'directorio', 'ceo', 'legal', 'policia', 'sii', 'hacienda',
        'jefe', 'banco', 'soporte', 'admin', 'seguridad', 'oficial',
        'auditor', 'abogado', 'judicial', 'rrhh', 'superior'
      ]
    },
    {
      id: 'beneficio',
      nombre: 'Promesa de beneficio',
      lema: 'Algo demasiado bueno para ser verdad',
      descripcion: 'Usan recompensas para distraerte del riesgo real.',
      palabras: [
        'ganaste', 'bono', 'premio', 'regalo', 'gratis', 'oferta',
        'reembolso', 'beneficio', 'seleccionado', 'exclusivo',
        'descuento', 'recompensa', 'saldo', 'acreditado'
      ]
    }
  ];

  var NIVELES = [
    {
      id: 'sin',
      nombre: 'Sin señales',
      desde: 0,
      explicacion: 'El detector no encontró coincidencias con sus reglas. Eso no significa que el mensaje sea legítimo. Solo significa que evitó las palabras de la lista.'
    },
    {
      id: 'leves',
      nombre: 'Señales leves',
      desde: 1,
      explicacion: 'El texto contiene palabras que aparecen en mensajes fraudulentos, pero también en mensajes legítimos. El detector no puede distinguir el contexto.'
    },
    {
      id: 'fuertes',
      nombre: 'Señales fuertes',
      desde: 4,
      explicacion: 'El texto activó varias reglas. Eso aumenta la sospecha, pero no prueba que sea fraude. El detector reconoce patrones, no intenciones.'
    }
  ];

  var COMBINANTES = /^[̀-ͯ]+$/;

  // Minúsculas y sin tildes, letra por letra: el resultado tiene el mismo
  // largo que el texto, así las posiciones sirven para resaltar el original.
  function normalizar(texto) {
    var salida = '';
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      var minuscula = c.toLowerCase();
      if (minuscula.length === 1) c = minuscula;
      var separada = c.normalize('NFD');
      if (separada.length > 1 && COMBINANTES.test(separada.slice(1))) c = separada[0];
      salida += c;
    }
    return salida;
  }

  function escaparRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Palabra completa, también en plural y en femenino:
  //   termina en "o"  → raíz + o, a, os, as   ("bono" → "bonos")
  //   cualquier otra  → palabra + s, es        ("oferta" → "ofertas")
  function variantes(palabra) {
    var base = escaparRegex(palabra);
    if (palabra.slice(-1) === 'o') return base.slice(0, -1) + '(?:o|a|os|as)';
    return base + '(?:s|es)?';
  }

  function patron(palabra) {
    return new RegExp('(?<![\\p{L}\\p{N}_])' + variantes(palabra) + '(?![\\p{L}\\p{N}_])', 'gu');
  }

  var PATRONES = {};
  REGLAS.forEach(function (regla) {
    regla.palabras.forEach(function (p) { PATRONES[p] = patron(p); });
  });

  function nivelPara(puntos) {
    var elegido = NIVELES[0];
    NIVELES.forEach(function (n) { if (puntos >= n.desde) elegido = n; });
    return elegido;
  }

  // Analiza un texto y devuelve:
  //   puntos   · cuántas palabras distintas de las listas aparecieron
  //   nivel    · uno de NIVELES
  //   senales  · por regla, las palabras encontradas y su primera forma en el texto
  //   marcas   · cada aparición, con posición, para resaltar (sin solaparse)
  function analizar(entrada) {
    var texto = String(entrada == null ? '' : entrada).normalize('NFC');
    var normal = normalizar(texto);
    var puntos = 0;
    var marcas = [];

    var senales = REGLAS.map(function (regla) {
      var encontradas = [];
      regla.palabras.forEach(function (palabra) {
        var re = PATRONES[palabra];
        re.lastIndex = 0;
        var m, primera = null;
        while ((m = re.exec(normal)) !== null) {
          var inicio = m.index, fin = m.index + m[0].length;
          if (!primera) primera = texto.slice(inicio, fin);
          marcas.push({ regla: regla.id, palabra: palabra, inicio: inicio, fin: fin });
        }
        if (primera) {
          encontradas.push({ palabra: palabra, forma: primera });
          puntos += 1;
        }
      });
      return { regla: regla.id, encontradas: encontradas };
    });

    marcas.sort(function (a, b) { return a.inicio - b.inicio || b.fin - a.fin; });
    var limpias = [], hasta = -1;
    marcas.forEach(function (m) {
      if (m.inicio >= hasta) { limpias.push(m); hasta = m.fin; }
    });

    return { texto: texto, puntos: puntos, nivel: nivelPara(puntos), senales: senales, marcas: limpias };
  }

  function regla(id) {
    for (var i = 0; i < REGLAS.length; i++) if (REGLAS[i].id === id) return REGLAS[i];
    return null;
  }

  var Motor = {
    REGLAS: REGLAS,
    NIVELES: NIVELES,
    normalizar: normalizar,
    analizar: analizar,
    nivelPara: nivelPara,
    regla: regla
  };

  if (typeof module === 'object' && module.exports) module.exports = Motor;
  else raiz.Motor = Motor;
})(this);
