const player = document.getElementById("player");
const cuerpo = document.getElementById("cuerpo-animado");
const pelo = document.getElementById("pelo-rulos");
const svg = document.getElementById("game");

const modalReglas = document.getElementById("modal-reglas");
const modalPregunta = document.getElementById("modal-pregunta");
const textoPregunta = document.getElementById("texto-pregunta");
const opcionesContainer = document.getElementById("opciones-container");
const mensajeError = document.getElementById("mensaje-error");
const temporizador = document.getElementById("temporizador");


let modalAbierto = false;
let bloqueoPorError = false;

let ultimoTema = null;
let ultimoNivel = null;

let posX = 100;
let posY = 300;
let velX = 0;
let velY = 0;

const speed = 0.6;
const gravity = 0.6;
const jumpForce = -12;
const groundY = 300;

let puertasDesbloqueadas = {};
let sensoresUsados = {};
let tiempoSobreBoton = {};


let scaleX = 1;
let scaleY = 1;
let hairRotation = 0;

/* INPUT */
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

/*  INICIO */
function iniciarJuego() {
    modalReglas.classList.remove("activo");
    gameLoop();
}

/*PRINCIPAL*/
function gameLoop() {
    if (!modalAbierto && !bloqueoPorError) {
        moverJugador();
        animarJugador();
        detectarBotones();
        detectarPuertas();
        actualizarCamara();
    }
    requestAnimationFrame(gameLoop);
}

function moverJugador() {
    if (keys["ArrowRight"]) velX += speed;
    if (keys["ArrowLeft"]) velX -= speed;

    velX = Math.max(-4, Math.min(velX, 4));
    velX *= 0.88;
    velY += gravity;

    if (keys["ArrowUp"] && posY >= groundY) {
        velY = jumpForce;
    }

    posX += velX;
    posY += velY;

    if (posY > groundY) {
        posY = groundY;
        velY = 0;
    }
    player.setAttribute("transform", `translate(${posX}, ${posY})`);
}

function animarJugador() {
    let targetScaleX = 1, targetScaleY = 1;
    if (velY < -1) { targetScaleX = 0.95; targetScaleY = 1.1; }
    else if (velY > 3) { targetScaleX = 1.1; targetScaleY = 0.9; }
    else if (Math.abs(velX) > 0.3) { targetScaleX = 1.05; targetScaleY = 0.95; }

    scaleX += (targetScaleX - scaleX) * 0.15;
    scaleY += (targetScaleY - scaleY) * 0.15;
    cuerpo.setAttribute("transform", `scale(${scaleX}, ${scaleY})`);

    hairRotation += (velX * -3 - hairRotation) * 0.12;
    pelo.setAttribute("transform", `rotate(${hairRotation})`);
}

function actualizarCamara() {
    const offset = Math.max(0, posX - 400);
    svg.setAttribute("viewBox", `${offset} 0 800 600`);
}

/* BOTONES  */
function detectarBotones() {
    if (modalAbierto || bloqueoPorError) return;

    document.querySelectorAll(".boton").forEach(boton => {
        const nivel = boton.parentElement;
        const id = nivel.id;
        const tema = nivel.dataset.tema;

        const tNivel = nivel.getAttribute("transform") || "";
        const mNivel = tNivel.match(/translate\(([^, ]+)/);
        const nivelX = mNivel ? parseFloat(mNivel[1]) : 0;

        const tBoton = boton.getAttribute("transform") || "";
        const mBoton = tBoton.match(/translate\(([^,]+),([^)]+)\)/);
        const gx = mBoton ? parseFloat(mBoton[1]) : 0;
        const gy = mBoton ? parseFloat(mBoton[2]) : 0;

        const bx = nivelX + gx;
        const by = gy;
        const rect = boton.querySelector(".boton-base");
        const bw = parseFloat(rect.getAttribute("width"));
        const bh = parseFloat(rect.getAttribute("height"));

        const playerLeft = posX - 35;
        const playerRight = posX + 35;
        const playerFeet = posY + 40;

        const encima = playerRight > bx && 
                       playerLeft < bx + bw && 
                       playerFeet >= by && 
                       playerFeet <= by + bh;

        if (sensoresUsados[id]) {
            boton.classList.add("activado");
            if (encima && velY >= 0) {
                posY = by - 40;
                velY = 0;
            }
            return;
        }

        if (encima && velY >= 0) {
            boton.classList.add("presionando");
            posY = by - 40;
            velY = 0;
            tiempoSobreBoton[id] = (tiempoSobreBoton[id] || 0) + 1;

            if (tiempoSobreBoton[id] > 8) {
                sensoresUsados[id] = true;
                abrirPregunta(tema, id);
            }
        } else {
            tiempoSobreBoton[id] = 0;
            boton.classList.remove("presionando");
        }
    });
}

/*PUERTAS */
function detectarPuertas() {
    document.querySelectorAll(".puerta").forEach(puerta => {
        const nivel = puerta.parentElement;
        const id = nivel.id;
        if (puertasDesbloqueadas[id]) return;

        const tNivel = nivel.getAttribute("transform") || "";
        const mNivel = tNivel.match(/translate\(([^, ]+)/);
        const nivelX = mNivel ? parseFloat(mNivel[1]) : 0;

        const px = nivelX + parseFloat(puerta.getAttribute("x"));
        const pw = parseFloat(puerta.getAttribute("width"));

        if (posX + 30 > px && posX - 30 < px + pw) {

            if (velX >= 0) posX = px - 35;
            else posX = px + pw + 35;
            velX = 0;
        }
    });
}

/* MODA L*/
function abrirPregunta(tema, nivelID) {
    modalAbierto = true;
    ultimoTema = tema;
    ultimoNivel = nivelID;

    mensajeError.style.display = "none";
    temporizador.style.display = "none";

    const lista = preguntas.filter(p => p.tema === tema);
    const pregunta = lista[Math.floor(Math.random() * lista.length)];

    textoPregunta.innerText = pregunta.texto;
    opcionesContainer.innerHTML = "";

    pregunta.opciones.forEach((op, i) => {
        const btn = document.createElement("button");
        btn.className = "opcion-btn";
        btn.innerText = op;
        btn.onclick = () => evaluarRespuesta(i, pregunta.correcta, nivelID);
        opcionesContainer.appendChild(btn);
    });

    modalPregunta.classList.add("activo");
}

function evaluarRespuesta(opcion, correcta, nivelID) {
    if (bloqueoPorError) return;

    if (opcion === correcta) {
        puertasDesbloqueadas[nivelID] = true;
        abrirPuertaVisual(nivelID);
        cerrarPregunta();
    } else {
        iniciarBloqueo();
    }
}

function abrirPuertaVisual(id) {
    const nivel = document.getElementById(id);
    const puerta = nivel.querySelector(".puerta");
    puerta.style.transform = "translateY(-220px)";
    puerta.style.opacity = "0.3";
}

function iniciarBloqueo() {
    bloqueoPorError = true;
    modalAbierto = true;
    mensajeError.style.display = "block";
    temporizador.style.display = "block";

    let t = 30;
    temporizador.innerText = t;

    const i = setInterval(() => {
        t--;
        temporizador.innerText = t;
        if (t <= 0) {
            clearInterval(i);
            bloqueoPorError = false;
            abrirPregunta(ultimoTema, ultimoNivel);
        }
    }, 1000);
}

function cerrarPregunta() {
    modalAbierto = false;
    modalPregunta.classList.remove("activo");
}

/*PREGUNTAS (TODAS TUS PREGUNTAS MANTENIDAS)*/
const preguntas = [
    // computo
    { tema:"computacion", texto:"¿Cuál será el resultado de: console.log(typeof []) en JavaScript?", opciones:["'array'","'object'","'list'","'undefined'"], correcta:1 },
    { tema:"computacion", texto:"¿Quién es el creador del lenguaje Java (lanzado en 1995)?", opciones:["Brendan Eich","James Gosling","Guido van Rossum","Bjarne Stroustrup"], correcta:1 },
    { tema:"computacion", texto:"¿Qué puerto permite la transmisión de video y audio digital de alta definición?", opciones:["VGA","PS/2","HDMI","SATA"], correcta:2 },
    { tema:"computacion", texto:"¿Qué valor devuelve la expresión: '5' + 2 en JS?", opciones:["7","52","NaN","Error"], correcta:1 },
    { tema:"computacion", texto:"¿En qué año se lanzó la primera versión de JavaScript?", opciones:["1991","1995","2000","1989"], correcta:1 },
    { tema:"computacion", texto:"Tipo de memoria volátil que utiliza el procesador para almacenar datos temporales de gran velocidad:", opciones:["SSD","Memoria Caché","Disco Duro","BIOS"], correcta:1 },
    { tema:"computacion", texto:"¿Cuál de estas entradas es reversible y soporta carga, datos y video?", opciones:["Micro USB","USB Type-C","Mini HDMI","DisplayPort"], correcta:1 },
    { tema:"computacion", texto:"¿Qué método de JS se usa para agregar un elemento al final de un array?", opciones:[".pop()",".shift()",".push()",".concat()"], correcta:2 },
    // ingles

   { tema:"ingles", texto:"Choose the correct option: 'If I ___ more time, I would travel around the world.'", opciones:["have","had","will have","would have"], correcta:1 },
    { tema:"ingles", texto:"Identify the synonym of 'STUBBORN':", opciones:["Flexible","Obstinate","Cheerful","Weak"], correcta:1 },
    { tema:"ingles", texto:"Complete: 'The students ___ the exam when the lights went out.'", opciones:["take","were taking","have taken","are taking"], correcta:1 },
    { tema:"ingles", texto:"Choose the connector: '___ it was raining, they decided to play football.'", opciones:["Despite","However","Although","Because"], correcta:2 },
    { tema:"ingles", texto:"What is the correct passive voice for: 'Alexander Fleming discovered Penicillin'?", opciones:["Penicillin is discovered by Fleming","Penicillin was discovered by Fleming","Fleming was discovered by Penicillin","Penicillin has been discovered"], correcta:1 },
    // religíon

   { tema:"religion", texto:"¿Cuál fue el primer Concilio Ecuménico de la Iglesia Católica (año 325)?", opciones:["Concilio de Trento","Concilio de Nicea","Concilio Vaticano II","Concilio de Éfeso"], correcta:1 },
    { tema:"religion", texto:"¿En qué día de la creación, según el Génesis, fueron creados los luminares (Sol y Luna)?", opciones:["Primer día","Tercer día","Cuarto día","Sexto día"], correcta:2 },
    { tema:"religion", texto:"¿Cuál es el libro más largo de la Biblia por número de capítulos?", opciones:["Génesis","Isaías","Salmos","Apocalipsis"], correcta:2 },
    { tema:"religion", texto:"¿Quién es considerado el último de los profetas en el Antiguo Testamento?", opciones:["Malaquías","Elías","Jeremías","Ezequiel"], correcta:0 },
    { tema:"religion", texto:"Idioma original en el que fue escrito casi todo el Nuevo Testamento:", opciones:["Hebreo","Arameo","Griego Koiné","Latín"], correcta:2 },
    // historia universal

    { tema:"historia-universal", texto:"¿En qué país surgió la Revolución Industrial?", opciones:["Francia","EE.UU.","Inglaterra","Alemania"], correcta:2 },
    { tema:"historia-universal", texto:"¿Cuál fue el evento que inició la Edad Moderna en 1453?", opciones:["Descubrimiento de América","Caída de Constantinopla","Revolución Francesa","Caída de Roma"], correcta:1 },
    { tema:"historia-universal", texto:"La 'Noche de los Cristales Rotos' ocurrió en el contexto de:", opciones:["Revolución Rusa","Alemania Nazi","Guerra Civil Española","Guerra Fría"], correcta:1 },
    { tema:"historia-universal", texto:"¿Quién fue el líder de la Revolución Rusa de 1917?", opciones:["Stalin","Lenin","Trotsky","Nicolás II"], correcta:1 },
    { tema:"historia-universal", texto:"La cultura que nos dejó la democracia, la filosofía y las olimpiadas fue:", opciones:["Roma","Egipto","Grecia","Mesopotamia"], correcta:2 },
    { tema:"historia-universal", texto:"¿En qué año terminó la Segunda Guerra Mundial?", opciones:["1918","1945","1939","1950"], correcta:1 },
    { tema:"historia-universal", texto:"El Código de Hammurabi perteneció a la civilización:", opciones:["Egipcia","Babilónica","Fenicia","Persa"], correcta:1 },
    { tema:"historia-universal", texto:"La toma de la Bastilla (1789) es el símbolo de:", opciones:["Revolución Francesa","Independencia de EE.UU.","Comuna de París","Renacimiento"], correcta:0 },
    { tema:"historia-universal", texto:"¿Qué imperio construyó el Coliseo y el Panteón?", opciones:["Griego","Bizantino","Romano","Persa"], correcta:2 },
    { tema:"historia-universal", texto:"La escritura cuneiforme fue inventada por los:", opciones:["Sumerios","Egipcios","Chinos","Incas"], correcta:0 },
    { tema:"historia-universal", texto:"¿Cuál era la principal actividad económica en la Edad Media?", opciones:["Comercio","Industria","Agricultura (Feudalismo)","Minería"], correcta:2 },
    { tema:"historia-universal", texto:"¿Qué explorador dio la primera vuelta al mundo (iniciada en 1519)?", opciones:["Colón","Vasco da Gama","Magallanes-Elcano","Drake"], correcta:2 },
    { tema:"historia-universal", texto:"La guerra entre EE.UU. y la URSS sin enfrentamiento directo se llamó:", opciones:["Guerra de Secesión","Guerra de los 100 años","Guerra Fría","Guerra de Corea"], correcta:2 },
    { tema:"historia-universal", texto:"¿Qué civilización construyó las pirámides de Giza?", opciones:["Azteca","Maya","Egipcia","Mesopotámica"], correcta:2 },
    { tema:"historia-universal", texto:"El Renacimiento tuvo su origen principal en la ciudad de:", opciones:["Roma","París","Florencia","Madrid"], correcta:2 },

    // razonamiento matematico

    { tema:"razonamiento", texto:"¿Qué número sigue: 2, 6, 12, 20, ...?", opciones:["28","30","32","26"], correcta:1 },
    { tema:"razonamiento", texto:"Si 5 obreros hacen una obra en 10 días, ¿cuántos obreros harán la misma obra en 2 días?", opciones:["25","15","20","50"], correcta:0 },
    { tema:"razonamiento", texto:"¿Qué parentesco tiene conmigo el hijo del hermano de mi padre?", opciones:["Mi hermano","Mi sobrino","Mi primo","Mi tío"], correcta:2 },
    { tema:"razonamiento", texto:"En una granja hay 20 animales entre gallinas y conejos. Si hay 50 patas, ¿cuántos conejos hay?", opciones:["5","10","15","8"], correcta:0 },
    { tema:"razonamiento", texto:"Si hoy es lunes, ¿qué día será el mañana del pasado mañana de hace 2 días?", opciones:["Lunes","Martes","Miércoles","Domingo"], correcta:1 },
    { tema:"razonamiento", texto:"Halle el valor de 'x': 3, 5, 9, 17, x", opciones:["33","25","35","31"], correcta:0 },
    { tema:"razonamiento", texto:"¿Cuál es el 20% del 50% de 200?", opciones:["10","20","40","50"], correcta:1 },
    { tema:"razonamiento", texto:"Si A es a B como 2 es a 3, y A+B = 20, ¿cuánto vale B?", opciones:["8","12","10","15"], correcta:1 },
    { tema:"razonamiento", texto:"Repartir 100 en partes proporcionales a 2 y 3. La parte mayor es:", opciones:["50","60","40","70"], correcta:1 },
    { tema:"razonamiento", texto:"¿Cuántos cortes se deben dar a una soga de 10m para tener trozos de 2m?", opciones:["5","4","6","3"], correcta:1 },
    { tema:"razonamiento", texto:"Un reloj da 3 campanadas en 3 segundos. ¿Cuánto tarda en dar 9 campanadas?", opciones:["9s","12s","10s","8s"], correcta:1 },
    { tema:"razonamiento", texto:"Si subo una escalera de 2 en 2 doy 5 pasos más que de 3 en 3. ¿Cuántos escalones tiene?", opciones:["30","15","20","25"], correcta:0 },
    { tema:"razonamiento", texto:"¿Qué palabra sobra: Lunes, Martes, Enero, Jueves?", opciones:["Lunes","Enero","Martes","Jueves"], correcta:1 },
    { tema:"razonamiento", texto:"¿Cuántos triángulos hay en un cuadrado con sus dos diagonales trazadas?", opciones:["4","6","8","10"], correcta:2 },
    { tema:"razonamiento", texto:"Si 3 gatos cazan 3 ratones en 3 min. ¿En cuánto tiempo 10 gatos cazan 10 ratones?", opciones:["10 min","3 min","30 min","1 min"], correcta:1 },

    // civica

    { tema:"civica", texto:"¿Cuál es la norma jurídica de mayor jerarquía en el Perú?", opciones:["Ley Orgánica","Decreto Supremo","La Constitución","Ordenanza Municipal"], correcta:2 },
    { tema:"civica", texto:"¿A qué edad se adquiere la ciudadanía en el Perú?", opciones:["16 años","21 años","18 años","17 años"], correcta:2 },
    { tema:"civica", texto:"El órgano encargado de interpretar la Constitución es:", opciones:["Poder Judicial","Congreso","Tribunal Constitucional","Fiscalía"], correcta:2 },
    { tema:"civica", texto:"¿Cuántos congresistas integran el Congreso de la República?", opciones:["120","100","130","150"], correcta:2 },
    { tema:"civica", texto:"La defensa de los derechos constitucionales y fundamentales es tarea de:", opciones:["El Ejército","La Defensoría del Pueblo","La SUNAT","El RENIEC"], correcta:1 },
    { tema:"civica", texto:"¿Quién es el Jefe Supremo de las Fuerzas Armadas?", opciones:["Ministro del Interior","General del Ejército","Presidente de la República","Presidente del Congreso"], correcta:2 },
    { tema:"civica", texto:"El documento que registra los nacimientos, matrimonios y defunciones es el:", opciones:["DNI","Pasaporte","RENIEC","ONPE"], correcta:2 },
    { tema:"civica", texto:"¿Cuál es la unidad básica de la sociedad según la Constitución?", opciones:["El Individuo","La Familia","El Estado","La Escuela"], correcta:1 },
    { tema:"civica", texto:"El voto en el Perú es obligatorio hasta los:", opciones:["65 años","80 años","70 años","No tiene límite"], correcta:2 },
    { tema:"civica", texto:"¿Qué organismo organiza y ejecuta los procesos electorales?", opciones:["JNE","ONPE","RENIEC","Ministerio Público"], correcta:1 },
    { tema:"civica", texto:"¿Cuál es la capital histórica del Perú según la Constitución?", opciones:["Lima","Cusco","Arequipa","Trujillo"], correcta:1 },
    { tema:"civica", texto:"La libertad de conciencia y religión es un derecho de tipo:", opciones:["Social","Económico","Fundamental","Político"], correcta:2 },
    { tema:"civica", texto:"¿Quién nombra a los jueces y fiscales en el Perú?", opciones:["El Presidente","Junta Nacional de Justicia","El Congreso","El Poder Judicial"], correcta:1 },
    { tema:"civica", texto:"¿Qué forma de gobierno tiene el Perú?", opciones:["Monarquía","República Democrática","Dictadura","Teocracia"], correcta:1 },
    { tema:"civica", texto:"La actual Constitución Política del Perú fue promulgada en:", opciones:["1979","1993","1933","2000"], correcta:1 },

    // historia del perú

    { tema:"historia-peru", texto:"¿Qué cultura preinca es famosa por sus Trepanaciones Craneanas?", opciones:["Nazca","Paracas","Moche","Chavín"], correcta:1 },
    { tema:"historia-peru", texto:"El Tahuantinsuyo fue dividido en 4 suyos por:", opciones:["Manco Cápac","Pachacútec","Huayna Cápac","Atahualpa"], correcta:1 },
    { tema:"historia-peru", texto:"¿Quién fue el 'Héroe de Angamos'?", opciones:["Francisco Bolognesi","Miguel Grau","Alfonso Ugarte","Andrés A. Cáceres"], correcta:1 },
    { tema:"historia-peru", texto:"La Capitulación de Ayacucho selló la independencia tras la batalla de:", opciones:["Junín","Ayacucho","Pichincha","Maipú"], correcta:1 },
    { tema:"historia-peru", texto:"¿Quién fue el autor de la corriente libertadora del Sur?", opciones:["Simón Bolívar","José de San Martín","Antonio José de Sucre","Bernardo O'Higgins"], correcta:1 },
    { tema:"historia-peru", texto:"Cultura conocida como 'Los mejores maestros constructores de ciudades':", opciones:["Chimú","Chachapoyas","Tiahuanaco","Wari"], correcta:0 },
    { tema:"historia-peru", texto:"¿Qué presidente abolió la esclavitud en el Perú?", opciones:["Ramón Castilla","José Pardo","Augusto B. Leguía","Alan García"], correcta:0 },
    { tema:"historia-peru", texto:"El 'Oncenio' fue el periodo de gobierno de:", opciones:["Manuel Odría","Augusto B. Leguía","Velasco Alvarado","Prado Ugarteche"], correcta:1 },
    { tema:"historia-peru", texto:"¿En qué año se proclamó la Independencia del Perú?", opciones:["1821","1824","1810","1814"], correcta:0 },
    { tema:"historia-peru", texto:"¿Quién descubrió la Ciudadela de Machu Picchu en 1911?", opciones:["Hiram Bingham","Max Uhle","Julio C. Tello","Federico Kauffmann"], correcta:0 },
    { tema:"historia-peru", texto:"La máxima autoridad en el Virreinato del Perú era:", opciones:["El Rey","El Virrey","El Corregidor","El Intendente"], correcta:1 },
    { tema:"historia-peru", texto:"¿Quién lideró la mayor rebelión indígena en el siglo XVIII?", opciones:["Juan Santos Atahualpa","Túpac Amaru II","Manco Inca","Mateo Pumacahua"], correcta:1 },
    { tema:"historia-peru", texto:"¿Cuál fue la capital del Imperio Incaico?", opciones:["Lima","Cusco","Quito","Puno"], correcta:1 },
    { tema:"historia-peru", texto:"La Guerra con Chile (Guerra del Pacífico) inició en:", opciones:["1879","1883","1821","1941"], correcta:0 },
    { tema:"historia-peru", texto:"Considerado el 'Padre de la Arqueología Peruana':", opciones:["Max Uhle","Julio C. Tello","Ruth Shady","Hiram Bingham"], correcta:1 },

    // quimica

    { tema:"quimica", texto:"¿Cuál es el número atómico (Z) del Carbono?", opciones:["12","14","6","8"], correcta:2 },
    { tema:"quimica", texto:"¿Qué tipo de enlace se forma por transferencia de electrones?", opciones:["Covalente","Iónico","Metálico","Puente de Hidrógeno"], correcta:1 },
    { tema:"quimica", texto:"El estado de agregación de la materia con volumen y forma definida es:", opciones:["Líquido","Gaseoso","Sólido","Plasmático"], correcta:2 },
    { tema:"quimica", texto:"¿Cuál es la fórmula del ácido sulfúrico?", opciones:["H2SO4","HCl","HNO3","H2CO3"], correcta:0 },
    { tema:"quimica", texto:"Los isótopos son átomos con igual número de protones pero distinto número de:", opciones:["Electrones","Neutrones","Niveles","Positrones"], correcta:1 },
    { tema:"quimica", texto:"¿Qué elemento es un gas noble?", opciones:["Oxígeno","Nitrógeno","Argón","Flúor"], correcta:2 },
    { tema:"quimica", texto:"La suma de protones y neutrones nos da el:", opciones:["Número atómico","Número de masa","Peso equivalente","Valencia"], correcta:1 },
    { tema:"quimica", texto:"¿Cuál es el pH de una sustancia neutra a 25°C?", opciones:["0","14","7","1"], correcta:2 },
    { tema:"quimica", texto:"¿Quién es el autor de la primera tabla periódica basada en pesos atómicos?", opciones:["Mendeleiev","Dalton","Rutherford","Lavoisier"], correcta:0 },
    { tema:"quimica", texto:"¿Cuál es el principal componente del gas natural?", opciones:["Propano","Butano","Metano","Etano"], correcta:2 },
    { tema:"quimica", texto:"Una mezcla uniforme donde no se distinguen sus componentes es:", opciones:["Heterogénea","Homogénea","Coloide","Suspensión"], correcta:1 },
    { tema:"quimica", texto:"¿Qué partícula subatómica tiene carga negativa?", opciones:["Protón","Neutrón","Electrón","Núcleo"], correcta:2 },
    { tema:"quimica", texto:"El proceso de pérdida de electrones se denomina:", opciones:["Reducción","Oxidación","Neutralización","Hidratación"], correcta:1 },
    { tema:"quimica", texto:"¿Cuál es el símbolo químico del Oro?", opciones:["Ag","Or","Au","Fe"], correcta:2 },
    { tema:"quimica", texto:"¿Qué gas es indispensable para la combustión?", opciones:["Nitrógeno","Oxígeno","Hidrógeno","Helio"], correcta:1 },

    // fisica

    { tema:"fisica", texto:"Un móvil parte del reposo con a=2m/s². ¿Qué distancia recorre en 4s?", opciones:["8m","16m","32m","4m"], correcta:1 },
    { tema:"fisica", texto:"La Primera Ley de Newton también es conocida como la Ley de:", opciones:["Acción y Reacción","Fuerza","Inercia","Gravitación"], correcta:2 },
    { tema:"fisica", texto:"¿Cuál es la unidad de la potencia en el Sistema Internacional?", opciones:["Joule","Newton","Watt","Pascal"], correcta:2 },
    { tema:"fisica", texto:"Si un cuerpo se lanza verticalmente hacia arriba, en su punto más alto su velocidad es:", opciones:["Máxima","9.8 m/s","0","Infinita"], correcta:2 },
    { tema:"fisica", texto:"La energía asociada al movimiento de los cuerpos se llama:", opciones:["Potencial","Cinética","Térmica","Elástica"], correcta:1 },
    { tema:"fisica", texto:"¿Qué instrumento mide la presión atmosférica?", opciones:["Termómetro","Barómetro","Ohmímetro","Densímetro"], correcta:1 },
    { tema:"fisica", texto:"La ley de Ohm establece la relación entre:", opciones:["V, I, R","P, V, T","F, m, a","W, F, d"], correcta:0 },
    { tema:"fisica", texto:"¿Cuál es el valor aproximado de la aceleración de la gravedad en la Tierra?", opciones:["10 m/s²","5 m/s²","20 m/s²","1 m/s²"], correcta:0 },
    { tema:"fisica", texto:"El cambio de dirección que sufre la luz al pasar de un medio a otro es:", opciones:["Reflexión","Refracción","Difracción","Dispersión"], correcta:1 },
    { tema:"fisica", texto:"¿A cuántos Kelvin equivalen 0° Celsius?", opciones:["273 K","100 K","0 K","373 K"], correcta:0 },
    { tema:"fisica", texto:"La resistencia eléctrica de un conductor depende de:", opciones:["Su color","Su longitud y material","Su peso","El clima"], correcta:1 },
    { tema:"fisica", texto:"¿Qué parte de la física estudia el movimiento sin considerar las causas?", opciones:["Dinámica","Estática","Cinemática","Termodinámica"], correcta:2 },
    { tema:"fisica", texto:"Un vector queda definido por su magnitud y su:", opciones:["Color","Sentido solamente","Dirección","Masa"], correcta:2 },
    { tema:"fisica", texto:"El fenómeno por el cual un cuerpo sólido pasa a estado gaseoso directamente es:", opciones:["Evaporación","Sublimación","Fusión","Condensación"], correcta:1 },
    { tema:"fisica", texto:"¿Quién propuso la Teoría de la Relatividad?", opciones:["Newton","Einstein","Tesla","Galileo"], correcta:1 },

    // matematica

    { tema:"matematicas", texto:"¿Cuál es el valor de 'x' en: log2(x + 3) = 5?", opciones:["29","32","25","16"], correcta:0 },
    { tema:"matematicas", texto:"En un triángulo rectángulo, si un ángulo es 30°, ¿cuánto mide el cateto opuesto si la hipotenusa es 10?", opciones:["5","5√3","10","2.5"], correcta:0 },
    { tema:"matematicas", texto:"Calcule la suma de las raíces de la ecuación: x² - 7x + 12 = 0", opciones:["12","7","-7","-12"], correcta:1 },
    { tema:"matematicas", texto:"¿Cuál es el residuo de dividir 2^40 entre 7?", opciones:["1","2","4","0"], correcta:1 },
    { tema:"matematicas", texto:"Si A y B son conjuntos disjuntos, su intersección es:", opciones:["Conjunto Universal","Conjunto A","Conjunto Vacío","Conjunto B"], correcta:2 },
    { tema:"matematicas", texto:"¿A qué es igual (a + b)² - (a - b)²?", opciones:["2a² + 2b²","4ab","2ab","a² + b²"], correcta:1 },
    { tema:"matematicas", texto:"Determine el área de un círculo cuyo diámetro es 8u.", opciones:["64π","8π","16π","4π"], correcta:2 },
    { tema:"matematicas", texto:"¿Cuál es el suplemento del complemento de 30°?", opciones:["60°","120°","150°","90°"], correcta:1 },
    { tema:"matematicas", texto:"En una progresión aritmética: 5, 8, 11... ¿cuál es el término 10?", opciones:["32","35","29","27"], correcta:1 },
    { tema:"matematicas", texto:"¿Cuál es el valor de tan(45°) + sen(30°)?", opciones:["1","1.5","2","0.5"], correcta:1 },
    { tema:"matematicas", texto:"Si el MCD(A, B) = 1, se dice que los números son:", opciones:["Primos entre sí (PESI)","Pares","Compuestos","Divisibles"], correcta:0 },
    { tema:"matematicas", texto:"¿Cuántos grados sexagesimales equivalen a π/4 radianes?", opciones:["45°","90°","180°","60°"], correcta:0 },
    { tema:"matematicas", texto:"Simplifique: (x³ * x⁵) / x²", opciones:["x⁶","x¹⁰","x¹⁵","x⁸"], correcta:0 },
    { tema:"matematicas", texto:"¿Cuál es la media aritmética de 12, 16 y 20?", opciones:["16","15","14","18"], correcta:0 },
    { tema:"matematicas", texto:"¿Cuántas diagonales tiene un hexágono?", opciones:["6","9","12","5"], correcta:1 }


    ];


    /* FUNCIONES DE RECOMPENSA */
function abrirCofre() {
    const tapa = document.getElementById("cofre-tapa");
    const btn = document.getElementById("btn-recompensa");
    const espada = document.getElementById("espada-final");

    // Animación de la tapa
    tapa.style.transition = "transform 0.5s ease";
    tapa.style.transformOrigin = "top";
    tapa.style.transform = "rotateX(-110deg) translateY(-20px)";
    
    // Desaparecer botón
    btn.style.display = "none";

    // Mostrar y animar espada
    espada.style.display = "block";
    espada.classList.add("espada-girando");
}

function mostrarMensajeFinal() {
    modalAbierto = true;
    const modalFinal = document.getElementById("modal-final");
    modalFinal.classList.add("activo");
    
 
    const container = document.getElementById("container-gif");
    container.innerHTML = '<img src="celebracion.gif" width="50%">';
}
