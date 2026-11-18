#!/bin/bash
# =============================================================================
# Escáner de ingeniería social (versión terminal)
# Herramienta interactiva de estudio · Licencia MIT
#
# Busca palabras asociadas a técnicas de ingeniería social y les asigna puntos.
# La idea es verlo funcionar en vivo y entender por qué acierta y por qué falla.
#
# Requiere: Bash 3.2 o superior. Sin dependencias externas.
# Las reglas son las mismas de la versión web (js/motor.js).
# =============================================================================


# ── Colores ──────────────────────────────────────────────────────────────────
ROJO='\033[1;31m'
VERDE='\033[1;32m'
AMARILLO='\033[1;33m'
AZUL='\033[1;34m'
MAGENTA='\033[1;35m'
CYAN='\033[1;36m'
BLANCO='\033[1;37m'
GRIS='\033[0;37m'
NC='\033[0m'

# ── Estado ───────────────────────────────────────────────────────────────────
PUNTOS=0
TEXTO=""
LECCION_FINAL=""
COMENTARIO_GUIADO=""   # Comentario extra en los ejemplos guiados


# ── Reglas ───────────────────────────────────────────────────────────────────
# Cada palabra suma 1 punto si aparece al menos una vez.
# Cuenta como palabra completa, también en plural y en femenino:
# "bono" detecta "bonos"; "exclusivo" detecta "exclusiva".
# Se escriben sin tildes: el texto se normaliza antes de buscar.

URGENCIA=(
    "urgente" "expira" "inmediato" "hoy" "ahora" "24 horas"
    "plazo" "suspension" "bloqueo" "ultimo aviso" "consecuencias"
    "accion requerida" "limite" "rapido" "vence" "cierre"
)

AUTORIDAD=(
    "gerente" "director" "directorio" "ceo" "legal" "policia" "sii" "hacienda"
    "jefe" "banco" "soporte" "admin" "seguridad" "oficial"
    "auditor" "abogado" "judicial" "rrhh" "superior"
)

BENEFICIO=(
    "ganaste" "bono" "premio" "regalo" "gratis" "oferta"
    "reembolso" "beneficio" "seleccionado" "exclusivo"
    "descuento" "recompensa" "saldo" "acreditado"
)


# ── Interfaz ─────────────────────────────────────────────────────────────────

cabecera() {
    clear
    echo -e "${CYAN}┌─────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC}  ${BLANCO}Escáner de ingeniería social${NC}                       ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}  ${GRIS}herramienta interactiva de estudio${NC}                 ${CYAN}│${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────────┘${NC}"
    echo ""
}

pausar() {
    echo ""
    echo -e "${GRIS}[ presiona Enter para continuar ]${NC}"
    read -r
}

pausar_seccion() {
    # Pausa entre etapas del análisis, más visible que pausar()
    echo ""
    echo -e "${CYAN}·····················································${NC}"
    echo -e "${GRIS}  [ Enter para continuar ]${NC}"
    echo -e "${CYAN}·····················································${NC}"
    read -r
    cabecera
}

separador() {
    echo -e "${AZUL}──────────────────────────────────────────────────────${NC}"
}

titulo_seccion() {
    echo ""
    echo -e "${MAGENTA}▌ $1${NC}"
    separador
}

linea_bloque() {
    echo -e "$1│${NC}  $2"
}

linea_vacia() {
    echo -e "$1│${NC}"
}

# Muestra texto ajeno (pegado o de un archivo) sin interpretar secuencias de
# escape: un mensaje no puede cambiar colores, el título ni nada de la terminal.
mostrar_seguro() {
    printf '%s\n' "$1" | LC_ALL=C tr -d '\000-\010\013\014\016-\037\177'
}


# ── Normalización ────────────────────────────────────────────────────────────
# Minúsculas y sin tildes, para que "URGENTE" o "último" no esquiven las reglas.
# Funciona igual en cualquier configuración regional de la terminal.
normalizar() {
    printf '%s\n' "$1" \
        | LC_ALL=C tr 'A-Z' 'a-z' \
        | LC_ALL=C sed -e 's/á/a/g; s/é/e/g; s/í/i/g; s/ó/o/g; s/ú/u/g; s/ü/u/g; s/ñ/n/g' \
                       -e 's/Á/a/g; s/É/e/g; s/Í/i/g; s/Ó/o/g; s/Ú/u/g; s/Ü/u/g; s/Ñ/n/g'
}


# ── Motor de búsqueda ────────────────────────────────────────────────────────
# Devuelve la forma encontrada en el texto (por ejemplo "bonos"), o nada.
buscar_palabra() {
    local texto="$1" palabra="$2" variantes

    case "$palabra" in
        *o) variantes="${palabra%o}(o|a|os|as)" ;;
        *)  variantes="${palabra}(s|es)?" ;;
    esac

    printf '%s\n' "$texto" \
        | LC_ALL=C grep -oE "(^|[^[:alnum:]_])${variantes}([^[:alnum:]_]|$)" \
        | head -n 1 \
        | LC_ALL=C sed -E 's/^[^[:alnum:]]+//; s/[^[:alnum:]]+$//'
}

# Revisa una lista de palabras, muestra lo encontrado y suma los puntos.
buscar_senales() {
    local nombre="$1" descripcion="$2"
    shift 2
    local encontradas="" forma palabra

    for palabra in "$@"; do
        forma=$(buscar_palabra "$texto_normalizado" "$palabra")
        if [ -n "$forma" ]; then
            encontradas="${encontradas}${AMARILLO}'${forma}'${NC} "
            PUNTOS=$((PUNTOS + 1))
        fi
    done

    if [ -n "$encontradas" ]; then
        echo -e "${ROJO}  [ DETECTADO ]  $nombre${NC}"
        echo -e "      ${GRIS}$descripcion${NC}"
        echo -e "      Palabras encontradas: $encontradas"
    else
        echo -e "${VERDE}  [ sin señales ]  $nombre${NC}"
    fi
    echo ""
}


# ── Análisis completo, por etapas ────────────────────────────────────────────
analizar() {
    PUNTOS=0
    texto_normalizado=$(normalizar "$TEXTO")

    # Etapa 1: el texto
    titulo_seccion "TEXTO ANALIZADO"
    echo -ne "${GRIS}"
    mostrar_seguro "${TEXTO:0:600}"
    echo -ne "${NC}"
    if [ ${#TEXTO} -gt 600 ]; then
        echo -e "${GRIS}[continúa: el motor analizó el mensaje completo]${NC}"
    fi

    pausar_seccion

    # Etapa 2: señales
    echo ""
    echo -ne "${AMARILLO}  Analizando "
    for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do echo -ne "·"; sleep 0.03; done
    echo -e " listo${NC}"

    titulo_seccion "SEÑALES DETECTADAS"

    # Urgencia: presión para actuar antes de verificar
    buscar_senales \
        "URGENCIA: te meten prisa para que no pienses" \
        "Buscan que actúes antes de verificar si el mensaje es real." \
        "${URGENCIA[@]}"

    # Autoridad: se hacen pasar por alguien con poder para que obedezcas
    buscar_senales \
        "AUTORIDAD: fingen ser alguien con poder" \
        "Explotan el respeto a las jerarquías para que obedezcas sin preguntar." \
        "${AUTORIDAD[@]}"

    # Beneficio: ofrecen algo inesperado para que bajes la guardia
    buscar_senales \
        "PROMESA DE BENEFICIO: algo demasiado bueno para ser verdad" \
        "Usan recompensas para distraerte del riesgo real." \
        "${BENEFICIO[@]}"

    pausar_seccion

    # Etapa 3: resultado (siempre el que calculó el motor)
    echo ""
    echo -e "${MAGENTA}▌ RESULTADO${NC}"
    separador

    if [ "$PUNTOS" -eq 0 ]; then
        echo -e "  Nivel:  ${VERDE}SIN SEÑALES${NC}  ($PUNTOS puntos)"
        echo ""
        echo -e "  ${GRIS}El detector no encontró coincidencias con sus reglas."
        echo -e "  Eso no significa que el mensaje sea legítimo."
        echo -e "  Solo significa que evitó las palabras de la lista.${NC}"
    elif [ "$PUNTOS" -le 3 ]; then
        echo -e "  Nivel:  ${AMARILLO}SEÑALES LEVES${NC}  ($PUNTOS puntos)"
        echo ""
        echo -e "  ${GRIS}El texto contiene palabras que aparecen en mensajes"
        echo -e "  fraudulentos, pero también en mensajes legítimos."
        echo -e "  El detector no puede distinguir el contexto.${NC}"
    else
        echo -e "  Nivel:  ${ROJO}SEÑALES FUERTES${NC}  ($PUNTOS puntos)"
        echo ""
        echo -e "  ${GRIS}El texto activó varias reglas."
        echo -e "  Eso aumenta la sospecha, pero no prueba que sea fraude."
        echo -e "  El detector reconoce patrones, no intenciones.${NC}"
    fi

    if [ -n "$COMENTARIO_GUIADO" ]; then
        echo ""
        echo -e "$COMENTARIO_GUIADO"
    fi

    separador

    # Etapa 4: lección (solo en los ejemplos guiados)
    if [ -n "$LECCION_FINAL" ]; then
        pausar_seccion
        echo -e "$LECCION_FINAL"
    fi
}


# =============================================================================
# EJEMPLOS GUIADOS
#
# Orden pensado para contar una historia:
#   1. Correo limpio    → el detector acierta. Punto de partida.
#   2. CEO Fraud        → el detector acierta. Caso real.
#   3. Falso positivo   → el detector falla: alerta en un mensaje legítimo.
#   4. Bypass           → el detector falla: deja pasar una estafa.
# =============================================================================

ejemplo_limpio() {
    echo ""
    echo -e "${VERDE}┌─ Qué vas a ver ─────────────────────────────────────${NC}"
    linea_vacia "$VERDE"
    linea_bloque "$VERDE" "Un newsletter real. No hay intención de engañar."
    linea_vacia "$VERDE"
    linea_bloque "$VERDE" "${GRIS}Pregunta antes de ver el resultado:${NC}"
    linea_bloque "$VERDE" "${BLANCO}¿qué esperas que detecte el script?${NC}"
    linea_vacia "$VERDE"
    echo -e "${VERDE}└─────────────────────────────────────────────────────${NC}"
    pausar

    TEXTO="Hola,

Esta semana en la plataforma: nuevos cursos de Python, diseño UX
y fundamentos de redes. También publicamos el resumen del mes
con los contenidos más vistos por la comunidad.

Puedes gestionar tus preferencias o cancelar la suscripción
en cualquier momento desde tu perfil.

Equipo de contenidos"

    COMENTARIO_GUIADO="  ${GRIS}Este mensaje es un newsletter legítimo.
  En este caso, no encontrar nada es la respuesta correcta.${NC}"

    LECCION_FINAL="
${VERDE}┌─ Qué ocurrió ───────────────────────────────────────${NC}
${VERDE}│${NC}
${VERDE}│${NC}  El detector funcionó bien.
${VERDE}│${NC}
${VERDE}│${NC}  El texto no tiene palabras de urgencia,
${VERDE}│${NC}  autoridad ni promesas.
${VERDE}│${NC}  Es solo información: no hay nada que atrapar.
${VERDE}│${NC}
${VERDE}└─────────────────────────────────────────────────────${NC}

${GRIS}┌─ La pregunta que importa ───────────────────────────${NC}
${GRIS}│${NC}
${GRIS}│${NC}  ¿Puede un estafador escribir un mensaje
${GRIS}│${NC}  igual de limpio?
${GRIS}│${NC}
${GRIS}│${NC}  Sí.
${GRIS}│${NC}
${GRIS}│${NC}  Por eso 'sin señales' no significa 'seguro'.
${GRIS}│${NC}  Solo significa que no usó las palabras de la lista.
${GRIS}│${NC}
${GRIS}└─────────────────────────────────────────────────────${NC}"

    analizar
}

ejemplo_ceo_fraud() {
    echo ""
    echo -e "${ROJO}┌─ Qué vas a ver ─────────────────────────────────────${NC}"
    linea_vacia "$ROJO"
    linea_bloque "$ROJO" "Alguien finge ser el jefe y pide una transferencia."
    linea_vacia "$ROJO"
    linea_bloque "$ROJO" "Es uno de los fraudes más costosos para las empresas."
    linea_bloque "$ROJO" "El FBI lo llama Business Email Compromise (BEC)."
    linea_vacia "$ROJO"
    linea_bloque "$ROJO" "${GRIS}Pregunta antes de ver el resultado:${NC}"
    linea_bloque "$ROJO" "${BLANCO}¿cuántas señales crees que va a detectar?${NC}"
    linea_vacia "$ROJO"
    echo -e "${ROJO}└─────────────────────────────────────────────────────${NC}"
    pausar

    TEXTO="Hola, soy Roberto Sánchez, gerente general.

Estoy en reunión con el directorio y no puedo hablar
por teléfono ahora.

Necesito que hagas una transferencia hoy antes del
cierre bancario a un proveedor nuevo.

El monto es de \$2.800.000 y está relacionado con los
bonos aprobados para el cierre del trimestre.

Te voy a enviar los datos de la cuenta por este medio.

No lo comentes todavía con el resto del equipo hasta
que esté cerrado.

Gracias"

    COMENTARIO_GUIADO="  ${GRIS}Este mensaje es un CEO Fraud.
  El detector lo atrapó porque el atacante usó palabras
  que están dentro de sus reglas.${NC}"

    LECCION_FINAL="
${ROJO}┌─ Qué ocurrió ───────────────────────────────────────${NC}
${ROJO}│${NC}
${ROJO}│${NC}  El detector funcionó aquí.
${ROJO}│${NC}
${ROJO}│${NC}  Autoridad:   'gerente', 'directorio'
${ROJO}│${NC}  Urgencia:    'hoy', 'ahora', 'cierre'
${ROJO}│${NC}  Beneficio:   'bonos'
${ROJO}│${NC}
${ROJO}└─────────────────────────────────────────────────────${NC}

${AMARILLO}┌─ La señal que el script no detecta ────────────────${NC}
${AMARILLO}│${NC}
${AMARILLO}│${NC}  'No lo comentes todavía con el resto del equipo.'
${AMARILLO}│${NC}
${AMARILLO}│${NC}  Eso se llama aislamiento.
${AMARILLO}│${NC}  Es la señal más característica del CEO Fraud:
${AMARILLO}│${NC}  impedir que la víctima pueda verificar con alguien
${AMARILLO}│${NC}  antes de actuar.
${AMARILLO}│${NC}
${AMARILLO}│${NC}  El detector lo atrapó por las palabras.
${AMARILLO}│${NC}  Pero el verdadero peligro estaba en el aislamiento.
${AMARILLO}│${NC}
${AMARILLO}└─────────────────────────────────────────────────────${NC}"

    analizar
}

ejemplo_falso_positivo() {
    echo ""
    echo -e "${AMARILLO}┌─ Qué vas a ver ─────────────────────────────────────${NC}"
    linea_vacia "$AMARILLO"
    linea_bloque "$AMARILLO" "Un correo ${BLANCO}completamente legítimo${NC} de un banco."
    linea_vacia "$AMARILLO"
    linea_bloque "$AMARILLO" "No hay engaño. Es marketing bancario."
    linea_vacia "$AMARILLO"
    linea_bloque "$AMARILLO" "${GRIS}Pregunta antes de ver el resultado:${NC}"
    linea_bloque "$AMARILLO" "${BLANCO}¿lo va a marcar como peligroso?${NC}"
    linea_vacia "$AMARILLO"
    echo -e "${AMARILLO}└─────────────────────────────────────────────────────${NC}"
    pausar

    TEXTO="Estimado cliente,

Tu oferta de tasa preferencial vence hoy.

Si contratas el crédito antes del cierre de operaciones,
el banco aplica la tasa especial del 0,8% mensual.

Esta oferta es exclusiva para clientes seleccionados.

Para más información comunícate con tu ejecutivo
o visita nuestra sucursal más cercana.

Banco del Pacífico · Área Comercial"

    COMENTARIO_GUIADO="  ${AMARILLO}Esto es un falso positivo.${NC}
  ${GRIS}El correo es real: es marketing de un banco.${NC}"

    LECCION_FINAL="
${AMARILLO}┌─ Qué ocurrió ───────────────────────────────────────${NC}
${AMARILLO}│${NC}
${AMARILLO}│${NC}  El detector activó una alerta.
${AMARILLO}│${NC}  El mensaje no es una estafa.
${AMARILLO}│${NC}
${AMARILLO}│${NC}  Esto se llama falso positivo.
${AMARILLO}│${NC}
${AMARILLO}└─────────────────────────────────────────────────────${NC}

${GRIS}┌─ Por qué ocurrió ──────────────────────────────────${NC}
${GRIS}│${NC}
${GRIS}│${NC}  El detector no entiende contexto.
${GRIS}│${NC}
${GRIS}│${NC}  No sabe si 'banco' es el remitente real
${GRIS}│${NC}  o alguien intentando imitarlo.
${GRIS}│${NC}
${GRIS}│${NC}  No sabe si 'vence hoy' es una oferta comercial
${GRIS}│${NC}  o presión artificial de un estafador.
${GRIS}│${NC}
${GRIS}│${NC}  Solo cuenta palabras.
${GRIS}│${NC}
${GRIS}└─────────────────────────────────────────────────────${NC}

${CYAN}┌─ Por qué importa ──────────────────────────────────${NC}
${CYAN}│${NC}
${CYAN}│${NC}  Si el detector falla así con frecuencia,
${CYAN}│${NC}  las personas dejan de confiar en él.
${CYAN}│${NC}
${CYAN}│${NC}  Y cuando dejan de confiar, lo ignoran.
${CYAN}│${NC}  También cuando acierta.
${CYAN}│${NC}
${CYAN}└─────────────────────────────────────────────────────${NC}

${CYAN}┌─ Cómo se enfrenta ─────────────────────────────────${NC}
${CYAN}│${NC}
${CYAN}│${NC}  · [técnica] Clasificador con machine learning:
${CYAN}│${NC}
${CYAN}│${NC}    Entrenar un modelo con miles de ejemplos reales.
${CYAN}│${NC}    El modelo aprende que 'vence hoy' de un banco
${CYAN}│${NC}    tiene una distribución estadística distinta
${CYAN}│${NC}    a 'vence hoy' en un mensaje anónimo.
${CYAN}│${NC}
${CYAN}│${NC}  · [técnica] Verificar el origen del mensaje:
${CYAN}│${NC}
${CYAN}│${NC}    SPF: confirma que el servidor tiene permiso
${CYAN}│${NC}    para enviar desde ese dominio.
${CYAN}│${NC}
${CYAN}│${NC}    DKIM: firma digital que verifica que el mensaje
${CYAN}│${NC}    no fue alterado en el camino.
${CYAN}│${NC}
${CYAN}│${NC}    DMARC: coordina SPF y DKIM, y define qué
${CYAN}│${NC}    hacer si alguno falla.
${CYAN}│${NC}
${CYAN}└─────────────────────────────────────────────────────${NC}"

    analizar
}

ejemplo_bypass() {
    echo ""
    echo -e "${MAGENTA}┌─ Qué vas a ver ─────────────────────────────────────${NC}"
    linea_vacia "$MAGENTA"
    linea_bloque "$MAGENTA" "Un mensaje diseñado para ${BLANCO}evadir este detector${NC}."
    linea_vacia "$MAGENTA"
    linea_bloque "$MAGENTA" "Si lo lees, es claramente una estafa."
    linea_bloque "$MAGENTA" "El script no va a encontrar nada."
    linea_vacia "$MAGENTA"
    linea_bloque "$MAGENTA" "${GRIS}Pregunta antes de ver el resultado:${NC}"
    linea_bloque "$MAGENTA" "${BLANCO}¿por qué crees que lo va a evadir?${NC}"
    linea_vacia "$MAGENTA"
    echo -e "${MAGENTA}└─────────────────────────────────────────────────────${NC}"
    pausar

    TEXTO="Hola, soy Carolina, del área de finanzas.

Necesito que proceses el pago a este proveedor
antes de las 15:00.

El monto es de \$4.200.000. Te paso los datos
de la cuenta por este medio para que lo hagas
tú directamente.

Es para cerrar el trimestre. Habla conmigo después
si necesitas más detalles, pero primero haz
la transferencia.

Gracias"

    COMENTARIO_GUIADO="  ${MAGENTA}Pero el mensaje es una estafa: el detector falló.${NC}
  ${GRIS}El atacante evitó todas las palabras de la lista.${NC}"

    LECCION_FINAL="
${MAGENTA}┌─ Qué ocurrió ───────────────────────────────────────${NC}
${MAGENTA}│${NC}
${MAGENTA}│${NC}  El detector no encontró señales.
${MAGENTA}│${NC}  Pero el mensaje es una estafa.
${MAGENTA}│${NC}
${MAGENTA}│${NC}  Esto se llama bypass (evasión).
${MAGENTA}│${NC}
${MAGENTA}└─────────────────────────────────────────────────────${NC}

${GRIS}┌─ Por qué ocurrió ──────────────────────────────────${NC}
${GRIS}│${NC}
${GRIS}│${NC}  El atacante conoce cómo funciona el detector.
${GRIS}│${NC}
${GRIS}│${NC}  No usó 'urgente'. No mencionó 'gerente'.
${GRIS}│${NC}  No ofreció premios.
${GRIS}│${NC}  Usó lenguaje cotidiano de oficina.
${GRIS}│${NC}
${GRIS}│${NC}  Las reglas fijas son predecibles.
${GRIS}│${NC}  Si el atacante sabe qué activa el detector,
${GRIS}│${NC}  puede escribir el mensaje para evitarlo.
${GRIS}│${NC}
${GRIS}└─────────────────────────────────────────────────────${NC}

${CYAN}┌─ Cómo se enfrenta ─────────────────────────────────${NC}
${CYAN}│${NC}
${CYAN}│${NC}  · [técnica] Clasificador con machine learning:
${CYAN}│${NC}
${CYAN}│${NC}    Un modelo entrenado con miles de ejemplos
${CYAN}│${NC}    aprende patrones estadísticos completos,
${CYAN}│${NC}    no palabras sueltas. Un atacante que evita
${CYAN}│${NC}    'urgente' no evita el patrón del fraude.
${CYAN}│${NC}
${CYAN}│${NC}  · [técnica] Modelos de lenguaje (LLM):
${CYAN}│${NC}
${CYAN}│${NC}    Interpretan el significado del mensaje completo,
${CYAN}│${NC}    más parecido a como lo lee una persona.
${CYAN}│${NC}    ChatGPT y Claude son ejemplos de esta tecnología.
${CYAN}│${NC}
${CYAN}│${NC}  · [proceso] Separar la detección de la ejecución:
${CYAN}│${NC}
${CYAN}│${NC}    Para transferencias y acciones de alto riesgo,
${CYAN}│${NC}    ningún detector debería ser la única barrera.
${CYAN}│${NC}    Siempre verificar por un canal distinto.
${CYAN}│${NC}    Esto no es código: es una política.
${CYAN}│${NC}
${CYAN}└─────────────────────────────────────────────────────${NC}"

    analizar
}


# =============================================================================
# MENÚ PRINCIPAL
# =============================================================================

while true; do
    cabecera

    echo -e "${BLANCO}  Selecciona qué quieres hacer:${NC}"
    echo ""
    echo -e "  ${VERDE}1)${NC} Correo limpio          ${GRIS}· el detector no encuentra nada${NC}"
    echo -e "  ${ROJO}2)${NC} CEO Fraud              ${GRIS}· el detector lo atrapa${NC}"
    echo -e "  ${AMARILLO}3)${NC} Falso positivo         ${GRIS}· correo legítimo que activa alertas${NC}"
    echo -e "  ${MAGENTA}4)${NC} Bypass                 ${GRIS}· estafa que evade el detector${NC}"
    echo ""
    echo -e "  ${AZUL}5)${NC} Analizar texto propio  ${GRIS}· pega un mensaje${NC}"
    echo -e "  ${AZUL}6)${NC} Analizar archivo       ${GRIS}· carga un .txt${NC}"
    echo ""
    echo -e "  ${GRIS}7) Salir${NC}"
    echo ""

    read -rp "  Opción (1-7): " opcion
    echo ""

    case $opcion in
        1)
            cabecera
            echo -e "  ${CYAN}── EJEMPLO 1 · Correo limpio ──${NC}"
            ejemplo_limpio
            pausar
            ;;
        2)
            cabecera
            echo -e "  ${CYAN}── EJEMPLO 2 · CEO Fraud ──${NC}"
            ejemplo_ceo_fraud
            pausar
            ;;
        3)
            cabecera
            echo -e "  ${CYAN}── EJEMPLO 3 · Falso positivo ──${NC}"
            ejemplo_falso_positivo
            pausar
            ;;
        4)
            cabecera
            echo -e "  ${CYAN}── EJEMPLO 4 · Bypass ──${NC}"
            ejemplo_bypass
            pausar
            ;;
        5)
            cabecera
            echo -e "  ${AZUL}── Texto propio ──${NC}"
            echo ""
            echo -e "${AMARILLO}  Pega el texto.${NC}"
            echo -e "${GRIS}  Escribe 'fin' en una línea aparte para analizarlo.${NC}"
            echo -e "${GRIS}  Escribe 'cancelar' para volver al menú.${NC}"
            echo ""
            TEXTO=""
            while IFS= read -r linea; do
                [ "$linea" = "cancelar" ] && { TEXTO=""; break; }
                [ "$linea" = "fin" ] && break
                TEXTO="$TEXTO$linea"$'\n'
            done
            if [ -z "$TEXTO" ]; then
                echo -e "${GRIS}  Volviendo al menú.${NC}"
                sleep 1
            else
                analizar
                pausar
            fi
            ;;
        6)
            cabecera
            echo -e "  ${AZUL}── Cargar archivo ──${NC}"
            echo ""
            echo -e "${GRIS}  Escribe 'cancelar' para volver al menú.${NC}"
            echo ""
            read -rp "  Ruta del archivo .txt: " archivo
            if [ "$archivo" = "cancelar" ] || [ -z "$archivo" ]; then
                echo -e "${GRIS}  Volviendo al menú.${NC}"
                sleep 1
            elif [ -f "$archivo" ]; then
                TEXTO=$(cat -- "$archivo")
                if [ -z "$TEXTO" ]; then
                    echo -e "${ROJO}  El archivo está vacío.${NC}"
                    sleep 2
                else
                    analizar
                    pausar
                fi
            else
                echo -ne "${ROJO}  Archivo no encontrado: "
                mostrar_seguro "$archivo"
                echo -ne "${NC}"
                echo -e "${GRIS}  Revisa la ruta e intenta de nuevo.${NC}"
                sleep 2
            fi
            ;;
        7)
            echo -e "  ${GRIS}Saliendo.${NC}"
            echo ""
            exit 0
            ;;
        *)
            echo -e "  ${ROJO}Opción inválida.${NC}"
            sleep 1
            ;;
    esac

    # Limpia el estado para el siguiente análisis
    PUNTOS=0
    TEXTO=""
    LECCION_FINAL=""
    COMENTARIO_GUIADO=""
done
