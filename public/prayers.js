/**
 * ══════════════════════════════════════════════════════════════════════════
 *  CORPUS DE ORACIONES DE ALIVIO — TEXTO FIJO, NUNCA GENERADO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * REGLA #1 (skill alivio-contenido-liturgico §1, política de IA principio 1):
 * las oraciones tradicionales y los textos litúrgicos NO se generan ni se
 * reformulan con IA. Son strings estáticos. En producción este archivo no hace
 * ninguna petición: viaja con la app y funciona offline desde el primer segundo.
 *
 * ── PROCEDENCIA DE CADA TEXTO ─────────────────────────────────────────────
 *
 *   source: 'rv1909'  Reina-Valera 1909 (es) + King James Version (en).
 *                     Ambas de DOMINIO PÚBLICO. Descargadas verbatim de
 *                     getbible.net y bible-api.com el 26 ago 2026 y congeladas
 *                     aquí. Ni una palabra fue redactada por un modelo.
 *
 *   source: 'tradicional'  Oración de la tradición, de dominio público, pero
 *                     SIN fuente legible por máquina de la que copiarla. El
 *                     texto que ves está PENDIENTE DE COTEJO contra un misal o
 *                     devocionario impreso.
 *
 *   source: 'original'  Texto propio de Alivio, no de ninguna tradición. La UI
 *                     lo etiqueta como tal: nunca se presenta como oración
 *                     tradicional (principio 3, etiquetado).
 *
 * ── EL INTERRUPTOR `verified` ─────────────────────────────────────────────
 *
 * `verified: false` OCULTA la oración de la app por completo: no se lista, no
 * se busca, no se abre. Quien reza no puede detectar una palabra equivocada
 * —está rezando, no revisando—, así que nada sin cotejar llega a la pantalla.
 *
 * ESTADO: el propietario cotejó y aprobó todo el corpus el 26 ago 2026, con la
 * redacción del Catecismo de la Iglesia Católica en español. El Padre Nuestro,
 * el Ave María, el Gloria y el Ángel de la Guarda llevan su redacción literal.
 * Todo está publicado.
 *
 * El interruptor se queda por si más adelante se añade una oración nueva: entra
 * con `verified: false`, alguien la cotea contra una fuente impresa, y entonces
 * se pone en `true`. Nunca al revés.
 *
 * Ejecuta  node scripts/check-prayers.cjs  para ver qué queda pendiente.
 * ══════════════════════════════════════════════════════════════════════════
 */

const PRAYER_SOURCE_LABELS = {
  rv1909:      { es: 'Reina-Valera 1909', en: 'King James Version' },
  vaticano:    { es: 'Compendio del Catecismo', en: 'Compendium of the Catechism' },
  tradicional: { es: '', en: '' },
  original:    { es: 'Oración propia de Alivio', en: 'A prayer written for Alivio' }
};

/**
 * Vitral de cabecera por tipo de rezo. Cuatro familias.
 *
 * GUARDARRAÍL: las oraciones de la vertiente `spiritual` van SIEMPRE a 'palabra'
 * —luz y amanecer, sin iconografía religiosa—. Poner una cruz o un motivo mariano
 * sobre una meditación de autocompasión rompe la promesa del selector de vertiente
 * (ver §5 del skill alivio-contenido-liturgico).
 */
const PRAYER_ART = {
  mariano:  ['ave-maria', 'salve', 'magnificat', 'angelus', 'jaculatoria-fatima'],
  cruz:     ['senal-cruz', 'credo-apostolico', 'credo-niceno', 'acto-contricion'],
  angeles:  ['angel-guarda', 'san-miguel', 'ven-espiritu-santo'],
  palabra:  []   // por defecto: Padre Nuestro, salmos, bendiciones y todo lo espiritual
};

const PRAYERS = [

  /* ─────────────────────────── CATÓLICO ─────────────────────────── */

  {
    id: 'senal-cruz',
    denominations: ['catholic'],
    source: 'vaticano',
    verified: true,
    es: {
      title: 'Señal de la Cruz',
      body: 'En el nombre del Padre\ny del Hijo\ny del Espíritu Santo.\n\nAmén.'
    },
    en: {
      title: 'Sign of the Cross',
      body: 'By the sign of the Holy Cross, deliver us from our enemies, O Lord our God.\n\nIn the name of the Father, and of the Son, and of the Holy Spirit. Amen.'
    }
  },

  {
    id: 'padre-nuestro-catolico',
    denominations: ['catholic'],
    source: 'vaticano',
    verified: true,
    es: {
      title: 'Padre Nuestro',
      body: 'Padre nuestro que estás en el cielo,\nsantificado sea tu Nombre;\nvenga a nosotros tu Reino;\nhágase tu voluntad\nen la tierra como en el cielo.\n\nDanos hoy\nnuestro pan de cada día;\nperdona nuestras ofensas,\ncomo también nosotros perdonamos\na los que nos ofenden;\nno nos dejes caer en la tentación,\ny líbranos del mal.\n\nAmén.'
    },
    en: {
      title: 'Our Father',
      body: 'Our Father, who art in heaven,\nhallowed be thy name;\nthy kingdom come;\nthy will be done on earth as it is in heaven.\n\nGive us this day our daily bread;\nand forgive us our trespasses,\nas we forgive those who trespass against us;\nand lead us not into temptation,\nbut deliver us from evil.\n\nAmen.'
    }
  },

  {
    id: 'ave-maria',
    denominations: ['catholic'],
    source: 'vaticano',
    verified: true,
    es: {
      title: 'Ave María',
      body: 'Dios te salve, María,\nllena eres de gracia;\nel Señor es contigo.\nBendita Tú eres\nentre todas las mujeres,\ny bendito es el fruto de tu vientre, Jesús.\n\nSanta María, Madre de Dios,\nruega por nosotros, pecadores,\nahora y en la hora de nuestra muerte.\n\nAmén.'
    },
    en: {
      title: 'Hail Mary',
      body: 'Hail Mary, full of grace,\nthe Lord is with thee.\nBlessed art thou among women,\nand blessed is the fruit of thy womb, Jesus.\n\nHoly Mary, Mother of God,\npray for us sinners,\nnow and at the hour of our death.\n\nAmen.'
    }
  },

  {
    id: 'gloria',
    denominations: ['catholic'],
    source: 'vaticano',
    verified: true,
    es: {
      title: 'Gloria',
      body: 'Gloria al Padre\ny al Hijo\ny al Espíritu Santo.\n\nComo era en el principio,\nahora y siempre,\npor los siglos de los siglos.\n\nAmén.'
    },
    en: {
      title: 'Glory Be',
      body: 'Glory be to the Father, and to the Son, and to the Holy Spirit.\n\nAs it was in the beginning, is now, and ever shall be,\nworld without end.\n\nAmen.'
    }
  },

  {
    id: 'credo-apostolico',
    denominations: ['catholic'],
    source: 'vaticano',
    verified: true,
    es: {
      title: 'Credo de los Apóstoles',
      body: 'Creo en Dios, Padre Todopoderoso,\nCreador del cielo y de la tierra.\n\nCreo en Jesucristo, su único Hijo,\nNuestro Señor,\nque fue concebido por obra y gracia del Espíritu Santo,\nnació de Santa María Virgen,\npadeció bajo el poder de Poncio Pilato,\nfue crucificado, muerto y sepultado,\ndescendió a los infiernos,\nal tercer día resucitó de entre los muertos,\nsubió a los cielos\ny está sentado a la derecha de Dios, Padre todopoderoso.\nDesde allí ha de venir\na juzgar a vivos y muertos.\n\nCreo en el Espíritu Santo,\nla santa Iglesia católica,\nla comunión de los santos,\nel perdón de los pecados,\nla resurrección de la carne\ny la vida eterna.\n\nAmén.'
    },
    en: {
      title: "Apostles' Creed",
      body: 'I believe in God, the Father almighty,\nCreator of heaven and earth,\n\nand in Jesus Christ, his only Son, our Lord,\nwho was conceived by the Holy Spirit,\nborn of the Virgin Mary,\nsuffered under Pontius Pilate,\nwas crucified, died and was buried;\nhe descended into hell;\non the third day he rose again from the dead;\nhe ascended into heaven,\nand is seated at the right hand of God the Father almighty;\nfrom there he will come to judge the living and the dead.\n\nI believe in the Holy Spirit,\nthe holy catholic Church,\nthe communion of saints,\nthe forgiveness of sins,\nthe resurrection of the body,\nand life everlasting.\n\nAmen.'
    }
  },

  {
    id: 'credo-niceno',
    denominations: ['catholic'],
    source: 'tradicional',
    verified: true,
    es: {
      title: 'Credo Niceno-Constantinopolitano',
      body: 'Creo en un solo Dios, Padre todopoderoso,\nCreador del cielo y de la tierra,\nde todo lo visible y lo invisible.\n\nCreo en un solo Señor, Jesucristo,\nHijo único de Dios,\nnacido del Padre antes de todos los siglos:\nDios de Dios, Luz de Luz,\nDios verdadero de Dios verdadero,\nengendrado, no creado,\nde la misma naturaleza del Padre,\npor quien todo fue hecho;\nque por nosotros, los hombres,\ny por nuestra salvación bajó del cielo,\ny por obra del Espíritu Santo\nse encarnó de María, la Virgen, y se hizo hombre;\ny por nuestra causa fue crucificado\nen tiempos de Poncio Pilato;\npadeció y fue sepultado,\ny resucitó al tercer día, según las Escrituras,\ny subió al cielo,\ny está sentado a la derecha del Padre;\ny de nuevo vendrá con gloria\npara juzgar a vivos y muertos,\ny su reino no tendrá fin.\n\nCreo en el Espíritu Santo,\nSeñor y dador de vida,\nque procede del Padre y del Hijo,\nque con el Padre y el Hijo\nrecibe una misma adoración y gloria,\ny que habló por los profetas.\n\nCreo en la Iglesia,\nque es una, santa, católica y apostólica.\nConfieso que hay un solo bautismo\npara el perdón de los pecados.\nEspero la resurrección de los muertos\ny la vida del mundo futuro.\n\nAmén.'
    },
    en: {
      title: 'Nicene Creed',
      body: 'I believe in one God,\nthe Father almighty,\nmaker of heaven and earth,\nof all things visible and invisible.\n\nI believe in one Lord Jesus Christ,\nthe Only Begotten Son of God,\nborn of the Father before all ages.\nGod from God, Light from Light,\ntrue God from true God,\nbegotten, not made, consubstantial with the Father;\nthrough him all things were made.\nFor us men and for our salvation\nhe came down from heaven,\nand by the Holy Spirit was incarnate\nof the Virgin Mary, and became man.\nFor our sake he was crucified under Pontius Pilate,\nhe suffered death and was buried,\nand rose again on the third day\nin accordance with the Scriptures.\nHe ascended into heaven\nand is seated at the right hand of the Father.\nHe will come again in glory\nto judge the living and the dead\nand his kingdom will have no end.\n\nI believe in the Holy Spirit,\nthe Lord, the giver of life,\nwho proceeds from the Father and the Son,\nwho with the Father and the Son is adored and glorified,\nwho has spoken through the prophets.\n\nI believe in one, holy, catholic and apostolic Church.\nI confess one Baptism for the forgiveness of sins\nand I look forward to the resurrection of the dead\nand the life of the world to come.\n\nAmen.'
    }
  },

  {
    id: 'salve',
    denominations: ['catholic'],
    source: 'vaticano',
    verified: true,
    es: {
      title: 'Salve',
      body: 'Dios te salve, Reina\ny Madre de misericordia,\nvida, dulzura y esperanza nuestra;\nDios te salve.\n\nA ti llamamos\nlos desterrados hijos de Eva;\na ti suspiramos, gimiendo y llorando\nen este valle de lágrimas.\n\nEa, pues, Señora, abogada nuestra,\nvuelve a nosotros esos tus ojos\nmisericordiosos;\ny después de este destierro,\nmuéstranos a Jesús,\nfruto bendito de tu vientre.\n\n¡Oh, clementísima, oh piadosa,\noh dulce Virgen María!'
    },
    en: {
      title: 'Hail, Holy Queen',
      body: 'Hail, holy Queen, Mother of mercy,\nour life, our sweetness and our hope.\n\nTo thee do we cry, poor banished children of Eve;\nto thee do we send up our sighs,\nmourning and weeping in this valley of tears.\n\nTurn then, most gracious advocate,\nthine eyes of mercy toward us;\nand after this our exile,\nshow unto us the blessed fruit of thy womb, Jesus.\n\nO clement, O loving, O sweet Virgin Mary.\n\nAmen.'
    }
  },

  {
    id: 'acto-contricion',
    denominations: ['catholic'],
    source: 'tradicional',
    verified: true,
    es: {
      title: 'Acto de Contrición',
      body: 'Señor mío Jesucristo,\nDios y Hombre verdadero,\nCreador, Padre y Redentor mío.\n\nPor ser Tú quien eres, Bondad infinita,\ny porque te amo sobre todas las cosas,\nme pesa de todo corazón haberte ofendido.\n\nTambién me pesa que puedas castigarme\ncon las penas del infierno.\nAyudado de tu divina gracia,\npropongo firmemente nunca más pecar,\nconfesarme y cumplir la penitencia\nque me fuere impuesta.\n\nAmén.'
    },
    en: {
      title: 'Act of Contrition',
      body: 'O my God,\nI am heartily sorry for having offended thee,\nand I detest all my sins\nbecause of thy just punishments,\nbut most of all because they offend thee, my God,\nwho art all good and deserving of all my love.\n\nI firmly resolve, with the help of thy grace,\nto sin no more and to avoid the near occasions of sin.\n\nAmen.'
    }
  },

  {
    id: 'angel-guarda',
    denominations: ['catholic'],
    source: 'tradicional',
    verified: true,
    es: {
      title: 'Ángel de la Guarda',
      body: 'Ángel de mi guarda,\ndulce compañía,\nno me desampares\nni de noche ni de día.\n\nNo me dejes solo\nque me perdería.\n\nAmén.'
    },
    en: {
      title: 'Guardian Angel Prayer',
      body: 'Angel of God,\nmy guardian dear,\nto whom God’s love commits me here,\never this day be at my side,\nto light and guard,\nto rule and guide.\n\nAmen.'
    }
  },

  {
    id: 'san-miguel',
    denominations: ['catholic'],
    source: 'tradicional',
    verified: true,
    es: {
      title: 'Oración a San Miguel Arcángel',
      body: 'San Miguel Arcángel,\ndefiéndenos en la batalla.\nSé nuestro amparo\ncontra la perversidad y asechanzas del demonio.\n\nReprímale Dios, pedimos suplicantes,\ny tú, Príncipe de la milicia celestial,\narroja al infierno con el divino poder\na Satanás y a los otros espíritus malignos\nque andan dispersos por el mundo\npara la perdición de las almas.\n\nAmén.'
    },
    en: {
      title: 'Prayer to St. Michael',
      body: 'Saint Michael the Archangel,\ndefend us in battle.\nBe our protection\nagainst the wickedness and snares of the devil.\n\nMay God rebuke him, we humbly pray;\nand do thou, O Prince of the heavenly host,\nby the power of God,\ncast into hell Satan and all evil spirits\nwho prowl about the world\nseeking the ruin of souls.\n\nAmen.'
    }
  },

  {
    id: 'ven-espiritu-santo',
    denominations: ['catholic'],
    source: 'tradicional',
    verified: true,
    es: {
      title: 'Ven, Espíritu Santo',
      body: 'Ven, Espíritu Santo,\nllena los corazones de tus fieles\ny enciende en ellos el fuego de tu amor.\n\nEnvía tu Espíritu y serán creados,\ny renovarás la faz de la tierra.\n\nOh Dios, que has iluminado los corazones de tus hijos\ncon la luz del Espíritu Santo:\nhaznos dóciles a su inspiración\npara gustar siempre el bien\ny gozar de su consuelo.\n\nPor Jesucristo nuestro Señor. Amén.'
    },
    en: {
      title: 'Come, Holy Spirit',
      body: 'Come, Holy Spirit,\nfill the hearts of thy faithful\nand kindle in them the fire of thy love.\n\nSend forth thy Spirit and they shall be created,\nand thou shalt renew the face of the earth.\n\nO God, who by the light of the Holy Spirit\ndidst instruct the hearts of the faithful:\ngrant that by the same Holy Spirit\nwe may be truly wise\nand ever rejoice in his consolation.\n\nThrough Christ our Lord. Amen.'
    }
  },

  {
    id: 'magnificat',
    denominations: ['catholic'],
    source: 'rv1909',
    reference: { es: 'Lucas 1, 46-55', en: 'Luke 1:46-55' },
    verified: true,
    es: {
      title: 'Magníficat',
      body: 'Entonces María dijo: engrandece mi alma al Señor; Y mi espíritu se alegró en Dios mi Salvador. Porque ha mirado á la bajeza de su criada; porque he aquí, desde ahora me dirán bienaventurada todas las generaciones. Porque me ha hecho grandes cosas el Poderoso; y santo es su nombre. Y su misericordia de generación á generación á los que le temen. Hizo valentía con su brazo: esparció los soberbios del pensamiento de su corazón. Quitó los poderosos de los tronos, y levantó á los humildes. A los hambrientos hinchió de bienes; y á los ricos envió vacíos. Recibió á Israel su siervo, acordándose de la misericordia, Como habló á nuestros padres á Abraham y á su simiente para siempre.'
    },
    en: {
      title: 'Magnificat',
      body: 'And Mary said, My soul doth magnify the Lord, And my spirit hath rejoiced in God my Saviour. For he hath regarded the low estate of his handmaiden: for, behold, from henceforth all generations shall call me blessed. For he that is mighty hath done to me great things; and holy is his name. And his mercy is on them that fear him from generation to generation. He hath shewed strength with his arm; he hath scattered the proud in the imagination of their hearts. He hath put down the mighty from their seats, and exalted them of low degree. He hath filled the hungry with good things; and the rich he hath sent empty away. He hath holpen his servant Israel, in remembrance of his mercy; As he spake to our fathers, to Abraham, and to his seed for ever.'
    }
  },

  {
    id: 'angelus',
    denominations: ['catholic'],
    source: 'vaticano',
    verified: true,
    es: {
      title: 'El Ángelus',
      body: 'V. El ángel del Señor anunció a María.\nR. Y concibió por obra y gracia del Espíritu Santo.\n\n(Dios te salve, María…)\n\nV. He aquí la esclava del Señor.\nR. Hágase en mí según tu palabra.\n\n(Dios te salve, María…)\n\nV. Y el Verbo de Dios se hizo carne.\nR. Y habitó entre nosotros.\n\n(Dios te salve, María…)\n\nV. Ruega por nosotros, Santa Madre de Dios.\nR. Para que seamos dignos de alcanzar las promesas de Jesucristo.\n\nOremos: Infunde, Señor, tu gracia en nuestras almas, para que, los que hemos conocido, por el anuncio del Ángel, la Encarnación de tu Hijo Jesucristo, lleguemos por los Méritos de su Pasión y su Cruz, a la gloria de la Resurrección. Por Jesucristo Nuestro Señor. Amén.\n\n(Gloria al Padre…)'
    },
    en: {
      title: 'The Angelus',
      body: 'V. The Angel of the Lord declared unto Mary.\nR. And she conceived of the Holy Spirit.\n\n(Hail Mary)\n\nV. Behold the handmaid of the Lord.\nR. Be it done unto me according to thy word.\n\n(Hail Mary)\n\nV. And the Word was made flesh.\nR. And dwelt among us.\n\n(Hail Mary)\n\nV. Pray for us, O holy Mother of God.\nR. That we may be made worthy of the promises of Christ.\n\nLet us pray: Pour forth, we beseech thee, O Lord, thy grace into our hearts, that we to whom the Incarnation of Christ thy Son was made known by the message of an angel, may by his Passion and Cross be brought to the glory of his Resurrection. Through the same Christ our Lord. Amen.'
    }
  },

  {
    id: 'bendicion-mesa',
    denominations: ['catholic'],
    source: 'tradicional',
    verified: true,
    es: {
      title: 'Bendición de la mesa',
      body: 'Bendícenos, Señor, y bendice estos alimentos\nque por tu bondad vamos a recibir.\n\nPor Jesucristo nuestro Señor.\n\nAmén.'
    },
    en: {
      title: 'Grace before Meals',
      body: 'Bless us, O Lord, and these thy gifts,\nwhich we are about to receive from thy bounty.\n\nThrough Christ our Lord.\n\nAmen.'
    }
  },

  /* ────────────────────────── EVANGÉLICO ────────────────────────── */

  {
    id: 'padre-nuestro-biblico',
    denominations: ['evangelical'],
    source: 'rv1909',
    reference: { es: 'Mateo 6, 9-13', en: 'Matthew 6:9-13' },
    verified: true,
    es: {
      title: 'Padre Nuestro',
      body: 'Vosotros pues, oraréis así: Padre nuestro que estás en los cielos, santificado sea tu nombre. Venga tu reino. Sea hecha tu voluntad, como en el cielo, así también en la tierra. Danos hoy nuestro pan cotidiano. Y perdónanos nuestras deudas, como también nosotros perdonamos á nuestros deudores. Y no nos metas en tentación, mas líbranos del mal: porque tuyo es el reino, y el poder, y la gloria, por todos los siglos. Amén.'
    },
    en: {
      title: "The Lord's Prayer",
      body: 'After this manner therefore pray ye: Our Father which art in heaven, Hallowed be thy name. Thy kingdom come. Thy will be done in earth, as it is in heaven. Give us this day our daily bread. And forgive us our debts, as we forgive our debtors. And lead us not into temptation, but deliver us from evil: For thine is the kingdom, and the power, and the glory, for ever. Amen.'
    }
  },

  {
    id: 'salmo-23',
    denominations: ['evangelical'],
    source: 'rv1909',
    reference: { es: 'Salmo 23', en: 'Psalm 23' },
    verified: true,
    es: {
      title: 'Salmo 23 — El Señor es mi pastor',
      body: 'JEHOVÁ es mi pastor; nada me faltará. En lugares de delicados pastos me hará yacer: junto á aguas de reposo me pastoreará. Confortará mi alma; guiaráme por sendas de justicia por amor de su nombre. Aunque ande en valle de sombra de muerte, no temeré mal alguno; porque tú estarás conmigo: tu vara y tu cayado me infundirán aliento. Aderezarás mesa delante de mí, en presencia de mis angustiadores: ungiste mi cabeza con aceite: mi copa está rebosando. Ciertamente el bien y la misericordia me seguirán todos los días de mi vida: y en la casa de Jehová moraré por largos días.'
    },
    en: {
      title: 'Psalm 23 — The Lord is my shepherd',
      body: 'The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me. Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over. Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.'
    }
  },

  {
    id: 'salmo-91',
    denominations: ['evangelical'],
    source: 'rv1909',
    reference: { es: 'Salmo 91', en: 'Psalm 91' },
    verified: true,
    es: {
      title: 'Salmo 91 — El que habita al abrigo del Altísimo',
      body: 'EL que habita al abrigo del Altísimo, morará bajo la sombra del Omnipotente. Diré yo á Jehová: Esperanza mía, y castillo mío; mi Dios, en él confiaré. Y él te librará del lazo del cazador: de la peste destruidora. Con sus plumas te cubrirá, y debajo de sus alas estarás seguro: escudo y adarga es su verdad. No tendrás temor de espanto nocturno, ni de saeta que vuele de día; Ni de pestilencia que ande en oscuridad, ni de mortandad que en medio del día destruya. Caerán á tu lado mil, y diez mil á tu diestra: mas á ti no llegará. Ciertamente con tus ojos mirarás, y verás la recompensa de los impíos. Porque tú has puesto á Jehová, que es mi esperanza, al Altísimo por tu habitación, No te sobrevendrá mal, ni plaga tocará tu morada. Pues que á sus ángeles mandará acerca de ti, que te guarden en todos tus caminos. En las manos te llevarán, porque tu pie no tropiece en piedra. Sobre el león y el basilisco pisarás; hollarás al cachorro del león y al dragón. Por cuanto en mí ha puesto su voluntad, yo también lo libraré: pondrélo en alto, por cuanto ha conocido mi nombre. Me invocará, y yo le responderé: con él estaré yo en la angustia: lo libraré, y le glorificaré. Saciarélo de larga vida, y mostraréle mi salud.'
    },
    en: {
      title: 'Psalm 91 — He that dwelleth in the secret place',
      body: 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty. I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust. Surely he shall deliver thee from the snare of the fowler, and from the noisome pestilence. He shall cover thee with his feathers, and under his wings shalt thou trust: his truth shall be thy shield and buckler. Thou shalt not be afraid for the terror by night; nor for the arrow that flieth by day; Nor for the pestilence that walketh in darkness; nor for the destruction that wasteth at noonday. A thousand shall fall at thy side, and ten thousand at thy right hand; but it shall not come nigh thee. Only with thine eyes shalt thou behold and see the reward of the wicked. Because thou hast made the LORD, which is my refuge, even the most High, thy habitation; There shall no evil befall thee, neither shall any plague come nigh thy dwelling. For he shall give his angels charge over thee, to keep thee in all thy ways. They shall bear thee up in their hands, lest thou dash thy foot against a stone. Thou shalt tread upon the lion and adder: the young lion and the dragon shalt thou trample under feet. Because he hath set his love upon me, therefore will I deliver him: I will set him on high, because he hath known my name. He shall call upon me, and I will answer him: I will be with him in trouble; I will deliver him, and honour him. With long life will I satisfy him, and shew him my salvation.'
    }
  },

  {
    id: 'bendicion-aaronica',
    denominations: ['evangelical'],
    source: 'rv1909',
    reference: { es: 'Números 6, 24-26', en: 'Numbers 6:24-26' },
    verified: true,
    es: {
      title: 'Bendición aarónica',
      body: 'Jehová te bendiga, y te guarde: Haga resplandecer Jehová su rostro sobre ti, y haya de ti misericordia: Jehová alce á ti su rostro, y ponga en ti paz.'
    },
    en: {
      title: 'Aaronic Blessing',
      body: 'The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee: The LORD lift up his countenance upon thee, and give thee peace.'
    }
  },

  {
    id: 'oracion-fe',
    denominations: ['evangelical'],
    source: 'original',
    verified: true,
    es: {
      title: 'Oración de fe',
      body: 'Padre, vengo a ti tal como estoy,\ncon lo que entiendo y con lo que no.\n\nCreo que me escuchas.\nCreo que no me sueltas.\nY donde mi fe se queda corta,\nsostenme tú.\n\nEn el nombre de Jesús.\nAmén.'
    },
    en: {
      title: 'Prayer of faith',
      body: 'Father, I come to you as I am,\nwith what I understand and what I do not.\n\nI believe you hear me.\nI believe you will not let go.\nAnd where my faith falls short,\nhold me yourself.\n\nIn Jesus’ name.\nAmen.'
    }
  },

  {
    id: 'oracion-sabiduria',
    denominations: ['evangelical'],
    source: 'original',
    verified: true,
    es: {
      title: 'Oración por sabiduría',
      body: 'Señor, tengo delante una decisión\ny no alcanzo a ver el final del camino.\n\nDame discernimiento para lo que hoy toca,\npaciencia para lo que todavía no,\ny la humildad de pedir consejo\ncuando haga falta.\n\nQue no confunda mi prisa con tu voz.\nAmén.'
    },
    en: {
      title: 'Prayer for wisdom',
      body: 'Lord, a decision is in front of me\nand I cannot see the end of the road.\n\nGive me discernment for what today asks,\npatience for what it does not,\nand the humility to ask for counsel\nwhen I need it.\n\nMay I not mistake my haste for your voice.\nAmen.'
    }
  },

  {
    id: 'oracion-gratitud',
    denominations: ['evangelical'],
    source: 'original',
    verified: true,
    es: {
      title: 'Oración de gratitud',
      body: 'Gracias, Señor, por lo que hoy sí hubo:\nel aire, el pan, alguien que preguntó cómo estoy.\n\nGracias por lo que sostuviste sin que yo lo notara.\n\nEnséñame a ver tu mano\ntambién en los días comunes.\n\nAmén.'
    },
    en: {
      title: 'Prayer of gratitude',
      body: 'Thank you, Lord, for what today did hold:\nthe air, the bread, someone who asked how I am.\n\nThank you for what you carried while I never noticed.\n\nTeach me to see your hand\nin ordinary days too.\n\nAmen.'
    }
  },

  /* ────────────────────────── ESPIRITUAL ────────────────────────── */

  {
    id: 'meditacion-autocompasion',
    denominations: ['spiritual'],
    source: 'original',
    verified: true,
    es: {
      title: 'Meditación de autocompasión',
      body: 'Este es un momento difícil.\n\nEl dolor forma parte de estar vivo,\ny no soy la única persona que lo siente hoy.\n\nQue pueda tratarme con la misma amabilidad\ncon la que trataría a alguien que quiero.\n\nQue pueda darme el permiso\nde no estar bien ahora mismo.\n\nQue pueda estar en paz.'
    },
    en: {
      title: 'Self-compassion meditation',
      body: 'This is a difficult moment.\n\nPain is part of being alive,\nand I am not the only one feeling it today.\n\nMay I treat myself with the same kindness\nI would offer someone I love.\n\nMay I give myself permission\nnot to be okay right now.\n\nMay I be at peace.'
    }
  },

  {
    id: 'intencion-paz',
    denominations: ['spiritual'],
    source: 'original',
    verified: true,
    es: {
      title: 'Intención de paz',
      body: 'Que hoy pueda soltar lo que no me toca cargar.\n\nQue encuentre calma en lo pequeño:\nuna respiración, un vaso de agua,\nla luz entrando por la ventana.\n\nQue quienes hoy sufren cerca de mí\nencuentren también algo de alivio.\n\nQue haya paz. Que empiece aquí.'
    },
    en: {
      title: 'Intention of peace',
      body: 'May I set down today what is not mine to carry.\n\nMay I find calm in small things:\na breath, a glass of water,\nlight coming through the window.\n\nMay those suffering near me today\nfind some relief as well.\n\nMay there be peace. May it begin here.'
    }
  },

  {
    id: 'practica-gratitud',
    denominations: ['spiritual'],
    source: 'original',
    verified: true,
    es: {
      title: 'Práctica de gratitud',
      body: 'Antes de seguir, tres cosas.\n\nUna que hoy me sostuvo,\naunque haya sido mínima.\n\nUna que aprendí,\naunque haya costado.\n\nUna persona a la que quiero,\naunque hoy no se lo haya dicho.\n\nRespira. Eso también cuenta.'
    },
    en: {
      title: 'Gratitude practice',
      body: 'Before moving on, three things.\n\nOne that held me up today,\nhowever small.\n\nOne I learned,\nhowever costly.\n\nOne person I love,\neven if I did not tell them today.\n\nBreathe. That counts too.'
    }
  },

  {
    id: 'oracion-serenidad',
    denominations: ['spiritual', 'evangelical'],
    source: 'tradicional',
    // Atribuida a Reinhold Niebuhr (c. 1932-1943). Su estatus de derechos es
    // discutido y la forma breve circula ampliamente. Revisar antes de publicar.
    verified: true,
    es: {
      title: 'Oración de la serenidad',
      body: 'Concédeme serenidad\npara aceptar las cosas que no puedo cambiar,\nvalor para cambiar aquellas que puedo,\ny sabiduría para reconocer la diferencia.'
    },
    en: {
      title: 'Serenity Prayer',
      body: 'Grant me the serenity\nto accept the things I cannot change,\ncourage to change the things I can,\nand wisdom to know the difference.'
    }
  },
  {
    id: 'jaculatoria-fatima',
    denominations: ['catholic'],
    source: 'tradicional',
    verified: true,
    es: {
      title: 'Jaculatoria de Fátima',
      body: 'Oh Jesús mío,\nperdona nuestros pecados,\nlíbranos del fuego del infierno,\nlleva al cielo a todas las almas,\nespecialmente a las más necesitadas\nde tu misericordia.'
    },
    en: {
      title: 'Fatima Prayer',
      body: 'O my Jesus,\nforgive us our sins,\nsave us from the fires of hell,\nlead all souls to Heaven,\nespecially those in most need\nof thy mercy.'
    }
  }
];

/**
 * Misterios del Rosario por día de la semana.
 * Los nombres de los misterios son de la tradición; los textos de las oraciones
 * que los acompañan (Padre Nuestro, Ave María, Gloria) están arriba.
 */
const ROSARY_MYSTERIES = {
  // 0 = domingo … 6 = sábado
  0: 'gloriosos',
  1: 'gozosos',
  2: 'dolorosos',
  3: 'gloriosos',
  4: 'luminosos',
  5: 'dolorosos',
  6: 'gozosos'
};

const ROSARY_SETS = {
  gozosos: {
    verified: true,
    es: {
      title: 'Misterios Gozosos',
      items: [
        { name: 'La Encarnación del Hijo de Dios', ref: 'Lc 1, 26-38' },
        { name: 'La Visitación de Nuestra Señora a su prima santa Isabel', ref: 'Lc 1, 39-56' },
        { name: 'El Nacimiento del Hijo de Dios en Belén', ref: 'Lc 2, 1-20' },
        { name: 'La Presentación de Jesús en el Templo', ref: 'Lc 2, 22-40' },
        { name: 'El Niño Jesús perdido y hallado en el Templo', ref: 'Lc 2, 41-52' }
      ]
    },
    en: {
      title: 'Joyful Mysteries',
      items: [
        { name: 'The Annunciation', ref: 'Lk 1:26-38' },
        { name: 'The Visitation', ref: 'Lk 1:39-56' },
        { name: 'The Nativity', ref: 'Lk 2:1-20' },
        { name: 'The Presentation in the Temple', ref: 'Lk 2:22-40' },
        { name: 'The Finding in the Temple', ref: 'Lk 2:41-52' }
      ]
    }
  },
  dolorosos: {
    verified: true,
    es: {
      title: 'Misterios Dolorosos',
      items: [
        { name: 'La Oración de Jesús en el Huerto', ref: 'Mt 26, 36-46' },
        { name: 'La Flagelación del Señor', ref: 'Jn 19, 1' },
        { name: 'La Coronación de espinas', ref: 'Mt 27, 27-31' },
        { name: 'Jesús con la Cruz a cuestas camino del Calvario', ref: 'Jn 19, 17' },
        { name: 'La Crucifixión y Muerte de Nuestro Señor', ref: 'Jn 19, 18-30' }
      ]
    },
    en: {
      title: 'Sorrowful Mysteries',
      items: [
        { name: 'The Agony in the Garden', ref: 'Mt 26:36-46' },
        { name: 'The Scourging at the Pillar', ref: 'Jn 19:1' },
        { name: 'The Crowning with Thorns', ref: 'Mt 27:27-31' },
        { name: 'The Carrying of the Cross', ref: 'Jn 19:17' },
        { name: 'The Crucifixion and Death of our Lord', ref: 'Jn 19:18-30' }
      ]
    }
  },
  gloriosos: {
    verified: true,
    es: {
      title: 'Misterios Gloriosos',
      items: [
        { name: 'La Resurrección del Señor', ref: 'Mc 16, 1-8' },
        { name: 'La Ascensión del Señor', ref: 'Hch 1, 6-11' },
        { name: 'La Venida del Espíritu Santo sobre los Apóstoles', ref: 'Hch 2, 1-13' },
        { name: 'La Asunción de Nuestra Señora a los Cielos', ref: '' },
        { name: 'La Coronación de la Santísima Virgen como Reina del Cielo y Tierra', ref: 'Ap 12, 1' }
      ]
    },
    en: {
      title: 'Glorious Mysteries',
      items: [
        { name: 'The Resurrection', ref: 'Mk 16:1-8' },
        { name: 'The Ascension', ref: 'Acts 1:6-11' },
        { name: 'The Descent of the Holy Spirit', ref: 'Acts 2:1-13' },
        { name: 'The Assumption of Our Lady', ref: '' },
        { name: 'The Coronation of the Blessed Virgin Mary', ref: 'Rev 12:1' }
      ]
    }
  },
  luminosos: {
    verified: true,
    es: {
      title: 'Misterios Luminosos',
      items: [
        { name: 'El Bautismo de Jesús en el Jordán', ref: 'Mt 3, 13-17' },
        { name: 'La Autorrevelación de Jesús en las bodas de Caná', ref: 'Jn 2, 1-12' },
        { name: 'El Anuncio del Reino de Dios invitando a la conversión', ref: 'Mc 1, 14-15' },
        { name: 'La Transfiguración del Señor', ref: 'Mt 17, 1-8' },
        { name: 'La Institución de la Eucaristía', ref: 'Mt 26, 26-30' }
      ]
    },
    en: {
      title: 'Luminous Mysteries',
      items: [
        { name: 'The Baptism of Jesus in the Jordan', ref: 'Mt 3:13-17' },
        { name: 'The Wedding at Cana', ref: 'Jn 2:1-12' },
        { name: 'The Proclamation of the Kingdom', ref: 'Mk 1:14-15' },
        { name: 'The Transfiguration', ref: 'Mt 17:1-8' },
        { name: 'The Institution of the Eucharist', ref: 'Mt 26:26-30' }
      ]
    }
  }
};

