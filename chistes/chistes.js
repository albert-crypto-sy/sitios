// Chistes originales. Cada uno: categoría, planteamiento y remate.
window.CATEGORIAS = {
  dice: "¿Qué le dice…?",
  idiomas: "¿Cómo se dice…?",
  vandos: "Van dos…",
  doctor: "Doctor, doctor",
  colmos: "Colmos",
  habia: "Había una vez",
  mama: "Mamá, mamá",
  llamas: "Llamas",
  varios: "Variados"
};

window.CHISTES = [
  // ¿Qué le dice…?
  ["dice", "¿Qué le dice una cebolla al cocinero?", "Si me cortas, lloramos los dos."],
  ["dice", "¿Qué le dice un recogedor a una escoba?", "Siempre me echas a mí la basura."],
  ["dice", "¿Qué le dice el wifi a la contraseña?", "Sin ti no me conecto con nadie."],
  ["dice", "¿Qué le dice el calendario al reloj?", "Tú tienes las horas contadas; yo, los días."],
  ["dice", "¿Qué le dice un paraguas cerrado a uno abierto?", "Qué estirado te has vuelto desde que llueve."],
  ["dice", "¿Qué le dice un GPS a otro GPS?", "Creo que tenemos que recalcular lo nuestro."],
  ["dice", "¿Qué le dice una tostada a otra por la mañana?", "Hoy me he levantado con el pie untado."],
  ["dice", "¿Qué le dice el queso a la pizza?", "Me derrito por ti."],
  ["dice", "¿Qué le dice una lámpara a un interruptor?", "No sé qué tienes, pero me enciendes."],
  ["dice", "¿Qué le dice una taza a la cafetera un lunes?", "Lléname, que hoy vengo vacía por dentro."],

  // ¿Cómo se dice…?
  ["idiomas", "¿Cómo se dice «me he dejado las llaves dentro» en japonés?", "Yasí Nokentro."],
  ["idiomas", "¿Cómo se dice «lunes» en ruso?", "Otravez Atrabajov."],
  ["idiomas", "¿Cómo se dice «wifi lento» en japonés?", "Kargando Kargando Kasí."],
  ["idiomas", "¿Cómo se dice «aparcar fatal» en francés?", "Le Coche Detravés."],
  ["idiomas", "¿Cómo se dice «ascensor averiado» en alemán?", "Subirlas Andandenhausen."],
  ["idiomas", "¿Cómo se dice «calcetín perdido» en árabe?", "Andestá Elotro."],
  ["idiomas", "¿Cómo se dice «despertador» en japonés?", "Sinko Minutitos Masuki."],
  ["idiomas", "¿Cómo se dice «tengo frío» en chino?", "Tiri Tón."],

  // Van dos…
  ["vandos", "Van dos fantasmas por la calle y uno le dice al otro:", "—Oye, ¿tú crees en las personas?"],
  ["vandos", "Van dos patatas por la calle. —Vaya día llevo —dice una. —¿Cansada?", "—Hecha puré."],
  ["vandos", "Van dos pingüinos en un ascensor. —¿A qué planta vas?", "—A ninguna, yo soy animal."],
  ["vandos", "Van dos sillas por la calle y una le dice a la otra:", "—¿Nos sentamos un rato?"],
  ["vandos", "Van dos imanes y uno le dice al otro: —No sé qué me pasa contigo.", "—Pues que tenemos química. Bueno, física."],
  ["vandos", "Van dos relojes por el desierto y uno dice: —Tengo una sed…", "—Aguanta, que en un segundo llegamos."],

  // Doctor, doctor
  ["doctor", "—Doctor, doctor, tengo complejo de Wikipedia. —¿Y eso?", "—Todo el mundo me consulta, pero nadie me cita."],
  ["doctor", "—Doctor, doctor, creo que soy un GPS. —Siéntese, por favor.", "—En cuanto pueda, gire a la derecha."],
  ["doctor", "—Doctor, doctor, no paro de cantar «Despacito».", "—Tranquilo, eso se le pasa… poco a poco."],
  ["doctor", "—Doctor, doctor, ¿es grave lo mío?", "—Digamos que yo, de usted, empezaría una serie corta."],
  ["doctor", "—Doctor, doctor, creo que soy una persiana.", "—Pues súbase a la camilla, que le veo muy bajo."],
  ["doctor", "—Doctor, doctor, me siento como un yogur.", "—Normal, está usted en la fecha límite de la consulta."],

  // Colmos
  ["colmos", "¿Cuál es el colmo de un informático?", "Que su pareja le pida espacio y le regale un disco duro."],
  ["colmos", "¿Cuál es el colmo de un astronauta?", "Que le digan que tiene la cabeza en las nubes y se ofenda porque la tiene mucho más arriba."],
  ["colmos", "¿Cuál es el colmo de un reloj?", "Tener todo el tiempo del mundo y no tener ni un minuto libre."],
  ["colmos", "¿Cuál es el colmo de un cartero?", "Que le dejen en visto."],
  ["colmos", "¿Cuál es el colmo de una oveja?", "Que la pillen contando personas para dormirse."],
  ["colmos", "¿Cuál es el colmo de un dentista?", "Reírse de dientes para fuera."],
  ["colmos", "¿Cuál es el colmo de un panadero?", "Que su hijo le salga integral y él quería uno de pueblo."],

  // Había una vez
  ["habia", "Había una vez un caracol tan lento, tan lento…", "…que cuando llegó a la fiesta ya era la del año siguiente."],
  ["habia", "Había una vez un niño tan educado, tan educado…", "…que cuando se cayó por la escalera pidió perdón a cada escalón."],
  ["habia", "Había una vez un hombre tan alto, tan alto…", "…que cuando estornudaba en enero le decían «¡Jesús!» en febrero."],
  ["habia", "Había una vez un señor tan bajito, tan bajito…", "…que cuando llovía se enteraba el último."],
  ["habia", "Había una vez un pirata tan ahorrador, tan ahorrador…", "…que se puso un parche para gastar solo medias gafas."],
  ["habia", "Había una vez una nube tan tímida, tan tímida…", "…que cada vez que la miraban se ponía a llover de vergüenza."],

  // Mamá, mamá
  ["mama", "—Mamá, mamá, ¿puedo ver la tele?", "—Sí, hijo, pero no la enciendas."],
  ["mama", "—Mamá, mamá, ¿cuándo seré mayor?", "—Cuando dejes de preguntarlo."],
  ["mama", "—Mamá, mamá, en el cole me dicen que soy muy exagerado.", "—Pues díselo a los diez millones de niños que te lo dicen."],
  ["mama", "—Mamá, mamá, ¿qué hay de cenar?", "—Lo mismo que de comer, pero de noche."],

  // Llamas
  ["llamas", "—¿Cómo te llamas? —Llama. —¿Y tu hermana?", "—También llama, pero no contesta nadie."],
  ["llamas", "¿Por qué las llamas no juegan al escondite?", "Porque con ese cuello siempre se las ve venir."],
  ["llamas", "¿Qué hace una llama en una fiesta?", "Animarla, que es muy de fuego."],
  ["llamas", "¿Cómo se llama una llama que llama por teléfono?", "Llamada en espera."],

  // Variados
  ["varios", "¿Qué le pasa a un pan que se apunta al gimnasio?", "Que se pone hecho una barra."],
  ["varios", "¿Qué hace un pulpo en una oficina?", "Contestar ocho llamadas a la vez y aun así decir que no le da la vida."],
  ["varios", "¿Por qué el café no se fía del azúcar?", "Porque en cuanto hay problemas, se disuelve."],
  ["varios", "¿Qué música escucha una montaña?", "Rock."],
  ["varios", "¿Cómo se llama un dinosaurio que siempre llega tarde?", "Tardisaurio."],
  ["varios", "¿Por qué la escoba siempre llega tarde?", "Porque se queda barriendo para casa."],
  ["varios", "¿Qué hace un caracol en una autopista?", "Mirar los coches y pensar: «Qué estrés de vida»."],
  ["varios", "¿Por qué el libro de cocina no tiene amigos?", "Porque siempre va con recetas."]
];
