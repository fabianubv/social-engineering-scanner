/*
 * Los cuatro ejemplos guiados. Solo datos: el nivel y las palabras
 * encontradas no se escriben aquí, siempre los calcula el motor.
 *
 * Orden pensado para contar una historia:
 *   1. Correo limpio   → el detector acierta. Punto de partida.
 *   2. CEO Fraud       → el detector acierta. Caso real.
 *   3. Falso positivo  → el detector falla: alerta en un mensaje legítimo.
 *   4. Bypass          → el detector falla: deja pasar una estafa.
 *
 * Las opciones de predicción tienen un rango de puntos (min, max) o, si la
 * pregunta no es de números, un campo `correcta` con su explicación.
 * Las "ocultas" son frases que una persona reconoce y el detector no.
 */
(function (raiz) {
  'use strict';

  var CASOS = [
    {
      id: 'limpio',
      numero: 1,
      titulo: 'Correo limpio',
      resumen: 'El detector no encuentra nada',
      tono: 'ok',
      realidad: 'Legítimo',
      intro: 'Un newsletter real. No hay intención de engañar.',
      pregunta: '¿Qué esperas que detecte el script?',
      opciones: [
        { texto: 'Nada', min: 0, max: 0 },
        { texto: 'Algunas señales', min: 1, max: 3 },
        { texto: 'Muchas señales', min: 4 }
      ],
      de: 'Equipo de contenidos',
      asunto: 'Novedades de la semana',
      mensaje:
        'Hola,\n\n' +
        'Esta semana en la plataforma: nuevos cursos de Python, diseño UX\n' +
        'y fundamentos de redes. También publicamos el resumen del mes\n' +
        'con los contenidos más vistos por la comunidad.\n\n' +
        'Puedes gestionar tus preferencias o cancelar la suscripción\n' +
        'en cualquier momento desde tu perfil.\n\n' +
        'Equipo de contenidos',
      comentario: 'Este mensaje es un newsletter legítimo. En este caso, no encontrar nada es la respuesta correcta.',
      ocultas: [],
      lecciones: [
        {
          titulo: 'Qué ocurrió',
          tono: 'ok',
          parrafos: [
            'El detector funcionó bien.',
            'El texto no tiene palabras de urgencia, autoridad ni promesas. Es solo información: no hay nada que atrapar.'
          ]
        },
        {
          titulo: 'La pregunta que importa',
          tono: 'neutro',
          parrafos: [
            '¿Puede un estafador escribir un mensaje igual de limpio? Sí.',
            'Por eso «sin señales» no significa «seguro». Solo significa que no usó las palabras de la lista.'
          ]
        }
      ]
    },

    {
      id: 'ceo',
      numero: 2,
      titulo: 'CEO Fraud',
      resumen: 'El detector lo atrapa',
      tono: 'peligro',
      realidad: 'Estafa',
      intro: 'Alguien finge ser el jefe y pide una transferencia. Es uno de los fraudes más costosos para las empresas. El FBI lo llama Business Email Compromise (BEC).',
      pregunta: '¿Cuántas señales crees que va a detectar?',
      opciones: [
        { texto: 'Ninguna', min: 0, max: 0 },
        { texto: 'Entre 1 y 3', min: 1, max: 3 },
        { texto: '4 o más', min: 4 }
      ],
      de: 'Roberto Sánchez',
      asunto: 'Transferencia pendiente',
      mensaje:
        'Hola, soy Roberto Sánchez, gerente general.\n\n' +
        'Estoy en reunión con el directorio y no puedo hablar\n' +
        'por teléfono ahora.\n\n' +
        'Necesito que hagas una transferencia hoy antes del\n' +
        'cierre bancario a un proveedor nuevo.\n\n' +
        'El monto es de $2.800.000 y está relacionado con los\n' +
        'bonos aprobados para el cierre del trimestre.\n\n' +
        'Te voy a enviar los datos de la cuenta por este medio.\n\n' +
        'No lo comentes todavía con el resto del equipo hasta\n' +
        'que esté cerrado.\n\n' +
        'Gracias',
      comentario: 'Este mensaje es un CEO Fraud. El detector lo atrapó porque el atacante usó palabras que están dentro de sus reglas.',
      ocultas: [
        { frase: 'No lo comentes todavía con el resto del equipo', nota: 'Aislamiento: que no le preguntes a nadie.' },
        { frase: 'no puedo hablar\npor teléfono', nota: 'Cierra el canal para verificar.' },
        { frase: 'un proveedor nuevo', nota: 'Una cuenta que nadie conoce todavía.' }
      ],
      lecciones: [
        {
          titulo: 'Qué ocurrió',
          tono: 'peligro',
          parrafos: [
            'El detector funcionó aquí.',
            'Autoridad: «gerente», «directorio». Urgencia: «hoy», «ahora», «cierre». Beneficio: «bonos».'
          ]
        },
        {
          titulo: 'La señal que el script no detecta',
          tono: 'aviso',
          parrafos: [
            '«No lo comentes todavía con el resto del equipo.»',
            'Eso se llama aislamiento. Es la señal más característica del CEO Fraud: impedir que la víctima pueda verificar con alguien antes de actuar.',
            'El detector lo atrapó por las palabras. Pero el verdadero peligro estaba en el aislamiento.'
          ]
        }
      ]
    },

    {
      id: 'falso-positivo',
      numero: 3,
      titulo: 'Falso positivo',
      resumen: 'Correo legítimo que activa alertas',
      tono: 'aviso',
      realidad: 'Legítimo',
      intro: 'Un correo completamente legítimo de un banco. No hay engaño. Es marketing bancario.',
      pregunta: '¿Lo va a marcar como peligroso?',
      opciones: [
        { texto: 'Sí, señales fuertes', min: 4 },
        { texto: 'Un poco, señales leves', min: 1, max: 3 },
        { texto: 'No, sin señales', min: 0, max: 0 }
      ],
      de: 'Banco del Pacífico',
      asunto: 'Tu tasa preferencial',
      mensaje:
        'Estimado cliente,\n\n' +
        'Tu oferta de tasa preferencial vence hoy.\n\n' +
        'Si contratas el crédito antes del cierre de operaciones,\n' +
        'el banco aplica la tasa especial del 0,8% mensual.\n\n' +
        'Esta oferta es exclusiva para clientes seleccionados.\n\n' +
        'Para más información comunícate con tu ejecutivo\n' +
        'o visita nuestra sucursal más cercana.\n\n' +
        'Banco del Pacífico · Área Comercial',
      comentario: 'Esto es un falso positivo. El correo es real: es marketing de un banco.',
      ocultas: [
        { frase: 'visita nuestra sucursal más cercana', nota: 'Te invita a verificar por otro canal. Un estafador rara vez lo hace.' }
      ],
      lecciones: [
        {
          titulo: 'Qué ocurrió',
          tono: 'aviso',
          parrafos: [
            'El detector activó una alerta, pero el mensaje no es una estafa.',
            'Esto se llama falso positivo.'
          ]
        },
        {
          titulo: 'Por qué ocurrió',
          tono: 'neutro',
          parrafos: [
            'El detector no entiende contexto.',
            'No sabe si «banco» es el remitente real o alguien intentando imitarlo. No sabe si «vence hoy» es una oferta comercial o presión artificial de un estafador.',
            'Solo cuenta palabras.'
          ]
        },
        {
          titulo: 'Por qué importa',
          tono: 'info',
          parrafos: [
            'Si el detector falla así con frecuencia, las personas dejan de confiar en él.',
            'Y cuando dejan de confiar, lo ignoran. También cuando acierta.'
          ]
        },
        {
          titulo: 'Cómo se enfrenta',
          tono: 'info',
          items: [
            {
              etiqueta: 'técnica',
              titulo: 'Clasificador con machine learning',
              texto: 'Entrenar un modelo con miles de ejemplos reales. El modelo aprende que «vence hoy» de un banco tiene una distribución estadística distinta a «vence hoy» en un mensaje anónimo.'
            },
            {
              etiqueta: 'técnica',
              titulo: 'Verificar el origen del mensaje',
              texto: 'SPF confirma que el servidor tiene permiso para enviar desde ese dominio. DKIM es una firma digital que verifica que el mensaje no fue alterado en el camino. DMARC coordina SPF y DKIM, y define qué hacer si alguno falla.'
            }
          ]
        }
      ]
    },

    {
      id: 'bypass',
      numero: 4,
      titulo: 'Bypass',
      resumen: 'Estafa que evade el detector',
      tono: 'evasion',
      realidad: 'Estafa',
      intro: 'Un mensaje diseñado para evadir este detector. Si lo lees, es claramente una estafa. El script no va a encontrar nada.',
      pregunta: '¿Por qué crees que lo va a evadir?',
      opciones: [
        { texto: 'Porque evita todas las palabras de la lista', correcta: true },
        { texto: 'Porque el mensaje es muy corto', correcta: false, nota: 'El largo no importa: el detector solo busca palabras.' },
        { texto: 'Porque no trae ningún enlace', correcta: false, nota: 'Este detector ni siquiera mira los enlaces: solo busca palabras.' }
      ],
      de: 'Carolina · Finanzas',
      asunto: 'Pago a proveedor',
      mensaje:
        'Hola, soy Carolina, del área de finanzas.\n\n' +
        'Necesito que proceses el pago a este proveedor\n' +
        'antes de las 15:00.\n\n' +
        'El monto es de $4.200.000. Te paso los datos\n' +
        'de la cuenta por este medio para que lo hagas\n' +
        'tú directamente.\n\n' +
        'Es para cerrar el trimestre. Habla conmigo después\n' +
        'si necesitas más detalles, pero primero haz\n' +
        'la transferencia.\n\n' +
        'Gracias',
      comentario: 'El detector falló. El atacante evitó todas las palabras de la lista.',
      ocultas: [
        { frase: 'del área de finanzas', nota: 'Autoridad, sin decir «gerente».' },
        { frase: 'antes de las 15:00', nota: 'Urgencia, sin decir «urgente» ni «hoy».' },
        { frase: 'pero primero haz\nla transferencia', nota: 'Primero actúa, después pregunta.' },
        { frase: 'para que lo hagas\ntú directamente', nota: 'Que nadie más revise el pago.' }
      ],
      lecciones: [
        {
          titulo: 'Qué ocurrió',
          tono: 'evasion',
          parrafos: [
            'El detector no encontró señales. Pero el mensaje es una estafa.',
            'Esto se llama bypass (evasión).'
          ]
        },
        {
          titulo: 'Por qué ocurrió',
          tono: 'neutro',
          parrafos: [
            'El atacante conoce cómo funciona el detector.',
            'No usó «urgente». No mencionó «gerente». No ofreció premios. Usó lenguaje cotidiano de oficina.',
            'Las reglas fijas son predecibles. Si el atacante sabe qué activa el detector, puede escribir el mensaje para evitarlo.'
          ]
        },
        {
          titulo: 'Cómo se enfrenta',
          tono: 'info',
          items: [
            {
              etiqueta: 'técnica',
              titulo: 'Clasificador con machine learning',
              texto: 'Un modelo entrenado con miles de ejemplos aprende patrones estadísticos completos, no palabras sueltas. Un atacante que evita «urgente» no evita el patrón del fraude.'
            },
            {
              etiqueta: 'técnica',
              titulo: 'Modelos de lenguaje (LLM)',
              texto: 'Interpretan el significado del mensaje completo, más parecido a como lo lee una persona. ChatGPT y Claude son ejemplos de esta tecnología.'
            },
            {
              etiqueta: 'proceso',
              titulo: 'Separar la detección de la ejecución',
              texto: 'Para transferencias y acciones de alto riesgo, ningún detector debería ser la única barrera. Siempre verificar por un canal distinto. Esto no es código: es una política.'
            }
          ]
        }
      ]
    }
  ];

  // ¿La opción elegida coincide con lo que calculó el motor?
  function acierta(opcion, puntos) {
    if (typeof opcion.correcta === 'boolean') return opcion.correcta;
    var max = typeof opcion.max === 'number' ? opcion.max : Infinity;
    return puntos >= opcion.min && puntos <= max;
  }

  var Casos = { CASOS: CASOS, acierta: acierta };

  if (typeof module === 'object' && module.exports) module.exports = Casos;
  else raiz.Casos = Casos;
})(this);
