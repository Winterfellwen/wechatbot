/**
 * 批量给德语词汇添加IPA音标和语法属性
 * 运行: node scripts/add-german-grammar.js
 */

const fs = require('fs');
const path = require('path');

// 德语IPA音标映射表（常见规则）
const germanIPAMap = {
  // 元音
  'a': 'a', 'aa': 'aː', 'ah': 'aː',
  'e': 'ɛ', 'ee': 'eː', 'eh': 'eː',
  'i': 'ɪ', 'ie': 'iː', 'ih': 'iː',
  'o': 'ɔ', 'oo': 'oː', 'oh': 'oː',
  'u': 'ʊ', 'uh': 'uː',
  'ä': 'ɛː', 'ö': 'øː', 'ü': 'yː',
  'y': 'ʏ',
  // 变元音
  'ae': 'ɛː', 'oe': 'øː', 'ue': 'yː',
  // 双元音
  'ei': 'aɪ', 'ai': 'aɪ',
  'eu': 'ɔɪ', 'äu': 'ɔɪ',
  'au': 'aʊ',
  // 辅音
  'b': 'b', 'd': 'd', 'f': 'f', 'g': 'ɡ',
  'h': 'h', 'j': 'j', 'k': 'k', 'l': 'l',
  'm': 'm', 'n': 'n', 'p': 'p', 'q': 'k',
  'r': 'ʁ', 's': 'z', 'ß': 's', 'ss': 's',
  't': 't', 'v': 'f', 'w': 'v', 'x': 'ks',
  'z': 't͡s', 'ch': 'ç', 'sch': 'ʃ',
  'ng': 'ŋ', 'nk': 'ŋk',
};

// 常见德语单词的IPA音标（手动校对的高频词）
const knownIPA = {
  'hallo': '[ˈhalo]', 'Guten Tag': '[ˈɡuːtn̩ taːk]', 'Tschüss': '[t͡ʃʏs]',
  'ja': '[jaː]', 'nein': '[naɪn]', 'danke': '[ˈdaŋkə]', 'Bitte': '[ˈbɪtə]',
  'Entschuldigung': '[ɛntˈʃʊldɪɡʊŋ]', 'Ich': '[ɪç]', 'du': '[duː]', 'er': '[eːɐ]',
  'sie': '[ziː]', 'es': '[ɛs]', 'wir': '[viːɐ]', 'ihr': '[iːɐ]',
  'heißen': '[ˈhaɪsn̩]', 'kommen': '[ˈkɔmən]', 'sein': '[zaɪn]', 'haben': '[ˈhaːbn̩]',
  'machen': '[ˈmaxn̩]', 'eins': '[aɪns]', 'zwei': '[t͡svaɪ]', 'drei': '[dʁaɪ]',
  'vier': '[fiːɐ]', 'fünf': '[fʏnf]', 'sechs': '[zɛks]', 'sieben': '[ˈziːbn̩]',
  'acht': '[axt]', 'neun': '[nɔɪn]', 'zehn': '[t͡seːn]',
  'Vater': '[ˈfaːtɐ]', 'Mutter': '[ˈmʊtɐ]', 'Bruder': '[ˈbʁuːdɐ]', 'Schwester': '[ˈʃvɛstɐ]',
  'Sohn': '[zoːn]', 'Tochter': '[ˈtɔxtɐ]', 'Eltern': '[ˈɛltɐn]', 'Kind': '[kɪnt]',
  'Familie': '[faˈmiːliə]', 'Mann': '[man]', 'Frau': '[fʁaʊ]',
  'Morgen': '[ˈmɔʁɡn̩]', 'Tag': '[taːk]', 'Abend': '[ˈaːbn̩t]', 'Nacht': '[naxt]',
  'heute': '[ˈhɔɪtə]', 'morgen': '[ˈmɔʁɡn̩]', 'gestern': '[ˈɡɛstɐn]', 'jetzt': '[jɛt͡st]',
  'schlafen': '[ˈʃlaːfn̩]', 'essen': '[ˈɛsn̩]', 'trinken': '[ˈtʁɪŋkn̩]',
  'sprechen': '[ˈʃpʁɛçn̩]', 'hören': '[ˈhøːʁən]', 'sehen': '[ˈzeːən]',
  'lesen': '[ˈleːzn̩]', 'schreiben': '[ˈʃʁaɪbn̩]', 'arbeiten': '[ˈaʁbaɪtn̩]',
  'lernen': '[ˈlɛʁnən]', 'rot': '[ʁoːt]', 'blau': '[blaʊ]', 'grün': '[ɡʁyːn]',
  'gelb': '[ɡɛlp]', 'schwarz': '[ʃvaʁts]', 'weiß': '[vaɪs]',
  'groß': '[ɡʁoːs]', 'klein': '[klaɪn]', 'neu': '[nɔɪ]', 'alt': '[alt]',
  'gut': '[ɡuːt]', 'schlecht': '[ʃlɛçt]', 'schnell': '[ʃnɛl]', 'langsam': '[ˈlaŋzaːm]',
  'hier': '[hiːɐ]', 'da': '[daː]', 'wo': '[voː]', 'nach': '[naːx]',
  'von': '[fɔn]', 'mit': '[mɪt]', 'ohne': '[ˈoːnə]', 'in': '[ɪn]',
  'auf': '[aʊf]', 'unter': '[ˈʊntɐ]', 'neben': '[ˈneːbn̩]', 'zwischen': '[ˈt͡svɪʃn̩]',
  'der': '[deːɐ]', 'die': '[diː]', 'das': '[das]', 'ein': '[aɪn]', 'eine': '[ˈaɪnə]',
  'Apfel': '[ˈapfəl]', 'Wasser': '[ˈvasɐ]', 'Brot': '[bʁoːt]', 'Käse': '[ˈkɛːzə]',
  'Milch': '[mɪlç]', 'Kaffee': '[kaˈfeː]', 'Tee': '[teː]', 'Fleisch': '[flaɪʃ]',
  'Fisch': '[fɪʃ]', 'Gemüse': '[ɡəˈmyːzə]', 'Obst': '[oːpst]', 'Reis': '[ʁaɪs]',
  'Suppe': '[ˈzʊpə]', 'Salat': '[zaˈlaːt]', 'Arzt': '[aːɐtst]', 'Lehrer': '[ˈleːʁɐ]',
  'Student': '[ʃtuˈdɛnt]', 'Arbeiter': '[ˈaʁbaɪtɐ]', 'Koch': '[kɔx]', 'Schneider': '[ˈʃnaɪdɐ]',
  'Kaufmann': '[ˈkaʊfman]', 'Sekretärin': '[zɛkʁeˈtɛːʁɪn]', 'Ingenieur': '[ɪnʒeˈnjøːɐ]',
  'Wetter': '[ˈvɛtɐ]', 'Sonne': '[ˈzɔnə]', 'Mond': '[moːnt]', 'Stern': '[ʃtɛʁn]',
  'Wolke': '[ˈvɔlkə]', 'Regen': '[ˈʁeːɡn̩]', 'Schnee': '[ʃneː]', 'Wind': '[vɪnt]',
  'Sommer': '[ˈzɔmɐ]', 'Winter': '[ˈvɪntɐ]', 'Frühling': '[ˈfʁyːlɪŋ]', 'Herbst': '[hɛʁpst]',
  'China': '[ˈçiːna]', 'Deutschland': '[ˈdɔɪt͡ʃlant]', 'Österreich': '[ˈøːstɐʁaɪç]',
  'Schweiz': '[ʃvaɪts]', 'Berlin': '[bɛɐˈliːn]', 'München': '[ˈmʏnçn̩]',
  'Hamburg': '[ˈhambʊʁk]', 'Wien': '[viːn]', 'Zürich': '[ˈt͡syːʁɪç]',
  'Straße': '[ˈʃtʁaːsə]', 'Platz': '[plat͡s]', 'Gebäude': '[ɡəˈbɔɪdə]',
  'Haus': '[haʊs]', 'Wohnung': '[ˈvoːnʊŋ]', 'Zimmer': '[ˈt͡sɪmɐ]',
  'Tür': '[tyːɐ]', 'Fenster': '[ˈfɛnstɐ]', 'Tisch': '[tɪʃ]', 'Stuhl': '[ʃtuːl]',
  'Bett': '[bɛt]', 'Schrank': '[ʃʁaŋk]', 'Bus': '[bʊs]', 'Zug': '[t͡suːk]',
  'Auto': '[ˈaʊto]', 'Fahrrad': '[ˈfaːʁaːt]', 'Flugzeug': '[ˈfluːk͡t͡sɔɪk]',
  'Schiff': '[ʃɪf]', 'Bahnhof': '[ˈbaːnhoːf]', 'Flughafen': '[ˈfluːkhaːfn̩]',
  'Hafen': '[ˈhaːfn̩]', 'Telefon': '[tɛləˈfoːn]', 'Handy': '[ˈhɛndi]',
  'Computer': '[kɔmˈpjuːtɐ]', 'Internet': '[ˈɪntɐnɛt]', 'E-Mail': '[ˈiːmeːl]',
  'Brief': '[bʁiːf]', 'Buch': '[buːx]', 'Zeitung': '[ˈt͡saɪtʊŋ]',
  'Zeitschrift': '[ˈt͡saɪtʃʁɪft]', 'Film': '[fɪlm]', 'Musik': '[ˈmuːzɪk]',
  'Sport': '[ʃpɔʁt]', 'spielen': '[ˈʃpiːlən]', 'schwimmen': '[ˈʃvɪmən]',
  'tanzen': '[ˈtant͡sn̩]', 'lesen': '[ˈleːzn̩]', 'kochen': '[ˈkɔxn̩]',
  'reisen': '[ˈʁaɪzn̩]', 'Freund': '[fʁɔɪnt]', 'Freundin': '[ˈfʁɔɪntɪn]',
  'Nachbar': '[ˈnaːxbaːɐ]', 'Kollege': '[kɔˈleːɡə]', 'Name': '[ˈnaːmə]',
  'Alter': '[ˈaltɐ]', 'Adresse': '[aˈdʁɛsə]', 'Nummer': '[ˈnʊmɐ]',
  'E-Mail-Adresse': '[ˈiːmeːl aˈdʁɛsə]', 'Geburtstag': '[ɡəˈbʊʁt͡staːk]',
  'Nationalität': '[natsionaliˈtɛːt]', 'beruf': '[bəˈʁuːf]', 'Hobby': '[ˈhɔbi]',
  'Interesse': '[ɪntəˈʁɛsə]', 'Sprache': '[ˈʃpʁaːxə]', 'Deutsch': '[dɔɪt͡ʃ]',
  'Englisch': '[ˈɛŋlɪʃ]', 'Chinesisch': '[çiˈneːzɪʃ]', 'Monat': '[ˈmoːnat]',
  'Jahr': '[jaːɐ]', 'Stunde': '[ˈʃtʊndə]', 'Minute': '[miˈnuːtə]',
  'Sekunde': '[zəˈkʊndə]', 'Meter': '[ˈmeːtɐ]', 'Kilometer': '[kiˈloːmeːtɐ]',
  'Kilogramm': '[ˈkiːloɡʁam]', 'Euro': '[ˈɔɪʁo]', 'Cent': '[t͡sɛnt]',
  'Preis': '[pʁaɪs]', 'Geld': '[ɡɛlt]', 'Karte': '[ˈkaʁtə]',
  'Fahrkarte': '[ˈfaːɐkaʁtə]', 'Eintrittskarte': '[ˈaɪntʁɪt͡skaʁtə]',
  'Restaurant': '[ʁɛstoˈʁɑ̃ː]', 'Café': '[kaˈfeː]', 'Hotel': '[hoˈtɛl]',
  'Krankenhaus': '[ˈkʁaŋkn̩haʊs]', 'Apotheke': '[apoˈteːkə]', 'Bank': '[baŋk]',
  'Post': '[pɔst]', 'Polizei': '[poliˈt͡saɪ]', 'Bibliothek': '[biblioˈteːk]',
  'Museum': '[muˈzeːʊm]', 'Theater': '[teˈaːtɐ]', 'Kino': '[ˈkiːno]',
  'Schwimmbad': '[ˈʃvɪmbaːt]', 'Sportplatz': '[ˈʃpɔʁtplat͡s]', 'Park': '[paʁk]',
  'Garten': '[ˈɡaʁtn̩]', 'Schule': '[ˈʃuːlə]', 'Universität': '[univɛʁziˈtɛːt]',
  'Institut': '[ˈɪnstituːt]', 'Klasse': '[ˈklasə]', 'Lehrer': '[ˈleːʁɐ]',
  'Schüler': '[ˈʃyːlɐ]', 'Kurs': '[kʊʁs]', 'Unterricht': '[ˈʊntɐʁɪçt]',
  'Aufgabe': '[ˈaʊfɡaːbə]', 'Prüfung': '[ˈpʁyːfʊŋ]', 'Note': '[ˈnoːtə]',
  'Zeugnis': '[ˈt͡sɔɪɡnɪs]',
};

// 词性判断规则
function detectGender(word) {
  const w = word.toLowerCase();
  
  // 动词判断
  if (w.endsWith('en') || w.endsWith('eln') || w.endsWith('ern') ||
      w === 'sein' || w === 'haben' || w === 'werden' ||
      w === 'können' || w === 'müssen' || w === 'dürfen' ||
      w === 'wollen' || w === 'sollen' || w === 'mögen' || w === 'möchten') {
    return { gender: null, pos: 'Verb', plural: null };
  }
  
  // 形容词判断
  if (w.endsWith('ig') || w.endsWith('lich') || w.endsWith('isch') ||
      w.endsWith('bar') || w.endsWith('sam') || w.endsWith('haft') ||
      w.endsWith('los') || w.endsWith('voll') || w.endsWith('ern') ||
      ['rot', 'blau', 'grün', 'gelb', 'schwarz', 'weiß', 'groß', 'klein',
       'neu', 'alt', 'gut', 'schlecht', 'schnell', 'langsam', 'wichtig',
       'einfach', 'schwierig', 'gemütlich', 'freundlich', 'höflich', 'nett',
       'traurig', 'glücklich', 'zufrieden', 'beschäftigt', 'bekannt', 'beliebt',
       'gemeinsam', 'überrascht', 'enttäuscht', 'besorgt', 'neugierig', 'stolz',
       'eifersüchtig', 'langweilig', 'interessant', 'aufregend', 'ruhig', 'laut',
       'billig', 'teuer', 'früh', 'spät', 'täglich', 'wöchentlich', 'monatlich',
       'jährlich', 'sofort', 'plötzlich', 'manchmal', 'oft', 'selten', 'zuerst',
       'danach', 'später', 'vorher', 'pünktlich', 'notwendig', 'möglich',
       'sinnvoll', 'effizient', 'nachhaltig', 'entscheidend', 'zuverlässig',
       'ausführlich', 'deutlich', 'angemessen', 'umfassend', 'wirtschaftlich',
       'gesellschaftlich', 'individuell', 'wesentlich', 'verantwortlich',
       'verständlich', 'ernst', 'mutig', 'geeignet', 'gestresst', 'flexibel',
       'erfolgreich', 'häufig', 'kaum', 'schließlich', 'bereits', 'zunächst',
       'anschließend', 'dennoch', 'ohnehin', 'folglich', 'hingegen'].includes(w)) {
    return { gender: null, pos: 'Adj', plural: null };
  }
  
  // 副词判断
  if (['hier', 'da', 'wo', 'heute', 'morgen', 'gestern', 'jetzt',
       'schon', 'noch', 'nur', 'auch', 'sehr', 'zu', 'so', 'dann',
       'immer', 'nie', 'oft', 'manchmal', 'schon', 'noch', 'bald',
       'sofort', 'plötzlich', 'zuerst', 'danach', 'später', 'vorher',
       'inzwischen', 'schließlich', 'bereits', 'zunächst', 'anschließend',
       'dennoch', 'ohnehin', 'folglich', 'hingegen', 'außerdem', 'deshalb',
       'trotzdem', 'allerdings', 'sowohl', 'kaum', 'häufig', 'selten'].includes(w)) {
    return { gender: null, pos: 'Adv', plural: null };
  }
  
  // 介词判断
  if (['nach', 'von', 'mit', 'ohne', 'in', 'auf', 'unter', 'neben',
       'zwischen', 'für', 'durch', 'gegen', 'um', 'über', 'vor',
       'hinter', 'an', 'bei', 'aus', 'bis', 'seit', 'wegen',
       'trotz', 'während', 'statt', 'außer', 'innerhalb', 'außerhalb'].includes(w)) {
    return { gender: null, pos: 'Präp', plural: null };
  }
  
  // 代词判断
  if (['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man',
       'mich', 'dich', 'ihn', 'uns', 'euch', 'ihnen',
       'mein', 'dein', 'sein', 'ihr', 'unser', 'euer',
       'der', 'die', 'das', 'ein', 'eine', 'kein', 'keine',
       'welcher', 'welche', 'welches', 'dieser', 'diese', 'dieses',
       'jeder', 'jede', 'jedes', 'alle', 'viele', 'wenige',
       'mancher', 'manche', 'manches', 'solcher', 'solche', 'solches'].includes(w)) {
    return { gender: null, pos: 'Pron', plural: null };
  }
  
  // 数词判断
  if (['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht',
       'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn',
       'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'hundert', 'tausend',
       'erste', 'zweite', 'dritte', 'vierte', 'fünfte'].includes(w)) {
    return { gender: null, pos: 'Num', plural: null };
  }
  
  // 连词判断
  if (['und', 'oder', 'aber', 'sondern', 'denn', 'weil', 'dass', 'wenn',
       'als', 'ob', 'obwohl', 'damit', 'sodass', 'während', 'bevor',
       'nachdem', 'seitdem', 'bis', 'sobald', 'sowie', 'indem',
       'außerdem', 'deshalb', 'trotzdem', 'allerdings', 'zum Beispiel',
       'einerseits', 'andererseits', 'sowohl', 'als auch', 'nicht nur',
       'sondern auch', 'inzwischen', 'schließlich', 'dennoch', 'folglich',
       'hingegen', 'im Gegensatz zu'].includes(w)) {
    return { gender: null, pos: 'Konj', plural: null };
  }
  
  // 感叹词
  if (['hallo', 'tschüss', 'danke', 'bitte', 'ja', 'nein',
       'prost', 'zum Wohl', 'schade', 'hurra', 'ach', 'oh'].includes(w)) {
    return { gender: null, pos: 'Interj', plural: null };
  }
  
  // 先检查已知的名词列表（避免词尾规则误判）
  const knownFeminine = ['mutter', 'schwester', 'tochter', 'frau', 'freundin', 'sekretärin',
    'lehrerin', 'ärztin', 'stadt', 'straße', 'wolke', 'sonne',
    'nacht', 'woche', 'stunde', 'minute', 'sekunde', 'sprache',
    'nation', 'natur', 'kultur', 'musik', 'zeitung', 'zeitschrift',
    'apotheke', 'bank', 'post', 'polizei', 'bibliothek', 'schule',
    'universität', 'klasse', 'aufgabe', 'prüfung', 'note', 'wohnung',
    'tür', 'waschmaschine', 'heizung', 'kasse', 'quittung', 'tüte',
    'menge', 'qualität', 'größe', 'farbe', 'kreditkarte',
    'rechnung', 'miete', 'kaution', 'nebenkosten', 'einladung',
    'feier', 'bewerbung', 'stelle', 'kündigung', 'beförderung',
    'pension', 'gewerkschaft', 'gesundheit', 'krankheit', 'untersuchung',
    'behandlung', 'operation', 'genesung', 'allergie', 'erkältung',
    'verletzung', 'diagnose', 'symptom', 'tablette', 'bewegung',
    'ernährung', 'versicherung', 'reise', 'buchung', 'führung',
    'besichtigung', 'sehenswürdigkeit', 'unterkunft', 'reservierung',
    'richtung', 'umfrage', 'nachricht', 'nachrichten', 'werbung',
    'schlagzeile', 'quelle', 'information',
    'diskussion', 'kritik', 'reaktion', 'wirkung', 'meinung',
    'erfahrung', 'verantwortung', 'entscheidung', 'veränderung',
    'möglichkeit', 'beziehung', 'kommunikation', 'situation',
    'lösung', 'zukunft', 'gemeinschaft', 'zusammenarbeit',
    'konflikt', 'kontakt', 'vorschlag', 'bedeutung', 'vertrauen',
    'toleranz', 'freiheit', 'gerechtigkeit', 'demokratie', 'politik',
    'wirtschaft', 'umwelt', 'nachhaltigkeit', 'natur', 'klima',
    'energie', 'verschmutzung', 'literatur', 'kunst', 'malerei',
    'ausstellung', 'premiere', 'gesellschaft', 'voraussetzung',
    'unterstützung', 'fähigkeit', 'konsequenz', 'maßnahme',
    'bevölkerung', 'wahrnehmung', 'auffassung', 'gleichberechtigung',
    'integration', 'migration', 'solidarität', 'weiterbildung',
    'fortbildung', 'dissertation', 'wissenschaft', 'forschung',
    'erfindung', 'theorie', 'praxis', 'vorlesung', 'prüfung',
    'behandlung', 'therapie', 'psychologie', 'depression',
    'werbung', 'schlagzeile', 'quelle', 'meinungsfreiheit',
    'zensur', 'medien', 'plattform', 'rezension', 'ausstellung',
    'theaterstück', 'drehbuch', 'kritiker', 'publikum',
    'bevölkerung', 'nachhaltigkeit', 'solidarität', 'toleranz',
    'vorstellungsgespräch', 'arbeitsverhältnis', 'arbeitsbedingungen',
    'qualifikation', 'kompetenz', 'referenz', 'ausbildung',
    'dissertation', 'lehrstuhl', 'wissenschaft', 'forschung',
    'erfindung', 'theorie', 'praxis', 'vorlesung', 'prüfung',
    'behandlung', 'therapie', 'psychologie', 'depression',
    'werbung', 'schlagzeile', 'quelle', 'meinungsfreiheit',
    'zensur', 'medien', 'plattform', 'rezension', 'ausstellung',
    'theaterstück', 'drehbuch', 'kritiker', 'publikum',
    'wohlfefinden', 'schlafmangel', 'sucht', 'selbstbewusstsein',
    'behandlung', 'überweisung', 'psychologie', 'therapie',
    'behandlung', 'untersuchung', 'rezept', 'notfall', 'versicherung',
    'bewegung', 'verletzung', 'behauptung', 'vermutung', 'begründung',
    'überzeugung', 'analyse', 'diskussion', 'kritik', 'unterscheidung',
    'ablehnung', 'annahme', 'bestätigung', 'verschiebung', 'absage',
    'zusage', 'versprechung', 'entscheidung', 'voraussetzung',
    'berücksichtigung', 'zurückführung', 'auswirkung',
    'politik', 'regierung', 'gesetz', 'wahl', 'partei', 'demokratie',
    'recht', 'gericht', 'strafe', 'verfassung', 'bürger', 'nation',
    'koalition', 'opposition', 'kabinett', 'minister', 'präsident',
    'parlament', 'gewalt', 'wirtschaft', 'markt', 'unternehmen',
    'produkt', 'technologie', 'software', 'daten', 'forschung',
    'innovation', 'investition', 'konsum', 'währung', 'inflation',
    'rezession', 'steuer', 'gewinn', 'verlust', 'konkurrenz',
    'branche', 'natur', 'umwelt', 'klima', 'energie', 'recycling',
    'nachhaltigkeit', 'verschmutzung', 'klimawandel', 'erderwärmung',
    'solarenergie', 'windenergie', 'umweltschutz', 'artenschutz',
    'literatur', 'roman', 'gedicht', 'kunst', 'malerei', 'musik',
    'komponist', 'ausstellung', 'theaterstück', 'drehbuch',
    'kritiker', 'publikum', 'rezension', 'premiere', 'kunstwerk'];
  
  const knownMasculine = ['tag', 'monat', 'name', 'mann', 'vater', 'bruder', 'sohn', 'freund',
    'lehrer', 'arzt', 'student', 'arbeit', 'kollege', 'chef', 'kunde',
    'nachbar', 'gast', 'besucher', 'beruf', 'arbeitgeber', 'arbeitnehmer',
    'vermieter', 'balkon', 'keller', 'dach', 'briefkasten', 'schrank',
    'tisch', 'stuhl', 'bahnhof', 'flughafen', 'hafen', 'telefon',
    'computer', 'brief', 'film', 'sport', 'park', 'garten', 'kurs',
    'unterricht', 'preis', 'pass', 'koffer', 'rucksack', 'fahrplan',
    'anschluss', 'gleis', 'sitzplatz', 'schalter', 'wartesaal',
    'abfahrt', 'ankunft', 'flug', 'urlaub', 'ausflug', 'konzert',
    'theater', 'sportplatz', 'schwimmbad', 'kino', 'museum',
    'supermarkt', 'rabatt', 'angebot', 'pfand', 'regal',
    'einkaufswagen', 'müll', 'strom',
    'schmerz', 'fieber', 'husten', 'notfall', 'termin', 'schlaf',
    'jahr', 'morgen', 'abend', 'mittag', 'sommer',
    'winter', 'frühling', 'herbst', 'januar', 'februar', 'märz',
    'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober',
    'november', 'dezember', 'montag', 'dienstag', 'mittwoch',
    'donnerstag', 'freitag', 'samstag', 'sonntag',
    'vorteil', 'nachteil', 'erfolg', 'ziel', 'stress', 'bereich',
    'hintergrund', 'zusammenhang', 'kontakt', 'argument', 'inhalt',
    'fortschritt', 'einfluss', 'verhalten', 'wert', 'bürger', 'staat',
    'krieg', 'frieden', 'markt', 'produkt', 'export', 'import',
    'kunde', 'anbieter', 'wettbewerb', 'start-up',
    'hund', 'vogel', 'fisch', 'pferd', 'hase', 'bär', 'wolf',
    'arztbesuch', 'schlafmangel', 'selbstbewusstsein',
    'beweis', 'vorschlag', 'antrag', 'nutzen', 'vergleich',
    'staat', 'bürger', 'krieg', 'frieden', 'minister', 'präsident',
    'markt', 'produkt', 'export', 'import', 'kunde', 'anbieter',
    'hund', 'vogel', 'fisch', 'pferd', 'hase', 'bär', 'wolf'];
  
  const knownNeuter = ['kind', 'mädchen', 'fräulein', 'büchlein', 'männlein',
    'haus', 'gebäude', 'zimmer', 'fenster', 'bett', 'auto',
    'fahrrad', 'flugzeug', 'schiff', 'bus', 'zug',
    'internet', 'e-mail', 'buch', 'zeugnis', 'institut', 'museum',
    'theater', 'kino', 'schwimmbad', 'restaurant', 'café', 'hotel',
    'krankenhaus', 'brot', 'wasser', 'käse', 'fleisch', 'fisch',
    'gemüse', 'obst', 'reis', 'geld', 'euro', 'cent',
    'wetter', 'mond', 'stern', 'regen', 'schnee', 'wind',
    'land', 'meer', 'feuer', 'licht', 'bild', 'wort',
    'beispiel', 'ende', 'interesse', 'hobby', 'thema', 'problem',
    'ergebnis', 'studium', 'fach', 'semester',
    'vorlesung', 'hausaufgabe', 'campus',
    'apfel', 'salat', 'suppe',
    'datum', 'beispiel', 'zeugnis', 'interesse', 'ergebnis',
    'studium', 'museum', 'theater', 'kino', 'restaurant',
    'krankenhaus', 'schwimmbad', 'büro', 'konto', 'paket',
    'visum', 'gepäck', 'wort', 'bild', 'ende', 'jahr',
    'licht', 'feuer', 'meer', 'land',
    'wohnbefinden', 'wohlbefinden', 'schlafmangel', 'sucht',
    'selbstbewusstsein', 'interesse', 'ergebnis', 'konsequenz',
    'maßnahme', 'hintergrund', 'zusammenhang', 'beziehung',
    'wort', 'bild', 'ende', 'beispiel', 'licht', 'feuer', 'meer', 'land',
    'datum', 'beispiel', 'zeugnis', 'interesse', 'ergebnis',
    'studium', 'museum', 'theater', 'kino', 'restaurant',
    'krankenhaus', 'schwimmbad', 'büro', 'konto', 'paket',
    'visum', 'gepäck', 'wort', 'bild', 'ende', 'jahr',
    'licht', 'feuer', 'meer', 'land'];
  
  if (knownFeminine.includes(w)) {
    return { gender: 'f', pos: 'Nomen', plural: guessPlural(w, 'f') };
  }
  
  if (knownMasculine.includes(w)) {
    return { gender: 'm', pos: 'Nomen', plural: guessPlural(w, 'm') };
  }
  
  if (knownNeuter.includes(w)) {
    return { gender: 'n', pos: 'Nomen', plural: guessPlural(w, 'n') };
  }
  
  // 名词词性判断（基于词尾规则）
  // 阴性词尾
  if (w.endsWith('ung') || w.endsWith('heit') || w.endsWith('keit') ||
      w.endsWith('schaft') || w.endsWith('tion') || w.endsWith('sion') ||
      w.endsWith('tät') || w.endsWith('ur') ||
      w.endsWith('ei') || w.endsWith('ie') || w.endsWith('in') ||
      w.endsWith('ade') || w.endsWith('age') || w.endsWith('anz') ||
      w.endsWith('enz') || w.endsWith('ette') || w.endsWith('ine') ||
      w.endsWith('isse') || w.endsWith('ive') || w.endsWith('ose') ||
      w.endsWith('üre') || w.endsWith('itis')) {
    return { gender: 'f', pos: 'Nomen', plural: guessPlural(w, 'f') };
  }
  
  // 中性词尾
  if (w.endsWith('chen') || w.endsWith('lein') || w.endsWith('ment') ||
      w.endsWith('tum') || w.endsWith('nis') || w.endsWith('sal') ||
      w.endsWith('ma') || w.endsWith('o')) {
    return { gender: 'n', pos: 'Nomen', plural: guessPlural(w, 'n') };
  }
  
  // 阳性词尾
  if (w.endsWith('ling') || w.endsWith('ich') ||
      w.endsWith('or') || w.endsWith('ismus') ||
      w.endsWith('ant') || w.endsWith('ent') || w.endsWith('ist') ||
      w.endsWith('loge') || w.endsWith('nom') || w.endsWith('graph')) {
    return { gender: 'm', pos: 'Nomen', plural: guessPlural(w, 'm') };
  }
  
  // 默认阳性（德语名词约60%为阳性）
  return { gender: 'm', pos: 'Nomen', plural: guessPlural(w, 'm') };
  
  // 默认阳性
  return { gender: 'm', pos: 'Nomen', plural: guessPlural(w, 'm') };
}

// 猜测复数形式
function guessPlural(word, gender) {
  const w = word.toLowerCase();
  
  // 以-chen, -lein结尾（小称，复数不变）
  if (w.endsWith('chen') || w.endsWith('lein')) {
    return word;
  }
  
  // 以-er结尾的阳性/中性名词（通常加-）
  if (w.endsWith('er') && (gender === 'm' || gender === 'n')) {
    return word + ' (Pl. -)';
  }
  
  // 以-e结尾的阴性名词（通常加-n）
  if (w.endsWith('e') && gender === 'f') {
    return word + 'n';
  }
  
  // 以-ung, -heit, -keit, -schaft结尾（加-en）
  if (w.endsWith('ung') || w.endsWith('heit') || w.endsWith('keit') || w.endsWith('schaft')) {
    return word + 'en';
  }
  
  // 以-ion, -tion, -sion结尾（加-en）
  if (w.endsWith('ion') || w.endsWith('tion') || w.endsWith('sion')) {
    return word + 'en';
  }
  
  // 以-tät结尾（加-en）
  if (w.endsWith('tät')) {
    return word.slice(0, -1) + 'en';
  }
  
  // 以-nis结尾（加-se）
  if (w.endsWith('nis')) {
    return word + 'se';
  }
  
  // 以-tum结尾（加-ä）
  if (w.endsWith('tum')) {
    return word.slice(0, -1) + 'er';
  }
  
  // 以-a结尾的外来词（加-e或-en）
  if (w.endsWith('a')) {
    return word + 's';
  }
  
  // 以-o结尾（加-s）
  if (w.endsWith('o')) {
    return word + 's';
  }
  
  // 以-um结尾的拉丁词（变-um为-a）
  if (w.endsWith('um')) {
    return word.slice(0, -2) + 'a';
  }
  
  // 以-us结尾（变-us为-i或加-e）
  if (w.endsWith('us')) {
    return word.slice(0, -2) + 'i';
  }
  
  // 以-in结尾（变-in为-innen）
  if (w.endsWith('in')) {
    return word + 'nen';
  }
  
  // 阳性名词常见复数规则
  if (gender === 'm') {
    if (w.endsWith('el') || w.endsWith('en') || w.endsWith('er')) {
      return word + ' (Pl. -)';
    }
    // Umlaut + -e
    if (['apfel', 'vater', 'bruder', 'mutter', 'tochter', 'garten',
         'stadt', 'wald', 'ball', 'fall', 'grab', 'salz'].includes(w)) {
      return applyUmlaut(word) + 'e';
    }
    return word + 'e';
  }
  
  // 阴性名词常见复数规则
  if (gender === 'f') {
    if (w.endsWith('e')) {
      return word + 'n';
    }
    if (w.endsWith('in')) {
      return word + 'nen';
    }
    // Umlaut + -e
    if (['hand', 'wand', 'nacht', 'stadt', 'bank', 'maus',
         'brust', 'wurst', 'kraft', 'schaft', 'tochter'].includes(w)) {
      return applyUmlaut(word) + 'e';
    }
    if (w.endsWith('el') || w.endsWith('er') || w.endsWith('en')) {
      return word + ' (Pl. -)';
    }
    return word + 'en';
  }
  
  // 中性名词常见复数规则
  if (gender === 'n') {
    if (w.endsWith('chen') || w.endsWith('lein')) {
      return word + ' (Pl. -)';
    }
    if (w.endsWith('el') || w.endsWith('en') || w.endsWith('er') || w.endsWith('nis')) {
      return word + ' (Pl. -)';
    }
    // Umlaut + -er
    if (['bild', 'kind', 'lied', 'wort', 'glas', 'haus',
         'buch', 'dorf', 'loch', 'boot', 'rad', 'land',
         'ei', 'kleid', 'reich', 'schloss'].includes(w)) {
      return applyUmlaut(word) + 'er';
    }
    return word + 'e';
  }
  
  return word + 'e';
}

// 应用变音
function applyUmlaut(word) {
  return word
    .replace(/a([^e])/g, 'ä$1')
    .replace(/o([^e])/g, 'ö$1')
    .replace(/u([^e])/g, 'ü$1')
    .replace(/a$/, 'ä')
    .replace(/o$/, 'ö')
    .replace(/u$/, 'ü');
}

// 获取IPA音标
function getIPA(word) {
  if (knownIPA[word]) {
    return knownIPA[word];
  }
  
  // 简单规则生成IPA（仅作备用）
  let ipa = word.toLowerCase()
    .replace(/sch/g, 'ʃ')
    .replace(/ch/g, 'ç')
    .replace(/ng/g, 'ŋ')
    .replace(/nk/g, 'ŋk')
    .replace(/ie/g, 'iː')
    .replace(/ei/g, 'aɪ')
    .replace(/eu/g, 'ɔɪ')
    .replace(/äu/g, 'ɔɪ')
    .replace(/au/g, 'aʊ')
    .replace(/ä/g, 'ɛː')
    .replace(/ö/g, 'øː')
    .replace(/ü/g, 'yː')
    .replace(/ß/g, 's')
    .replace(/st/g, 'ʃt')
    .replace(/sp/g, 'ʃp')
    .replace(/th/g, 't')
    .replace(/ph/g, 'f')
    .replace(/qu/g, 'kv')
    .replace(/x/g, 'ks')
    .replace(/z/g, 't͡s')
    .replace(/v/g, 'f')
    .replace(/w/g, 'v')
    .replace(/j/g, 'j')
    .replace(/c([^h]|$)/g, 'k$1')
    .replace(/y/g, 'ʏ')
    // 基础字母映射（必须放在组合规则之后）
    .replace(/r/g, 'ʁ')
    .replace(/g/g, 'ɡ')
    .replace(/s(?=[aeiouäöüy])/g, 'z')
    .replace(/e(?![iː])/g, 'ɛ')
    .replace(/o(?![ːu])/g, 'ɔ')
    .replace(/u(?![ː])/g, 'ʊ')
    .replace(/i(?![ː])/g, 'ɪ')
    .replace(/a(?![ːu])/g, 'a');
  
  // 处理重音标记（简单规则：双音节词重音在首音节，多音节在倒数第三音节）
  const syllables = ipa.split(/[aɛiouɔyøɪʊəɐː]/).filter(Boolean);
  if (syllables.length >= 2) {
    ipa = 'ˈ' + ipa;
  }
  
  return '[' + ipa + ']';
}

// 处理单个词汇条目
function processEntry(entry) {
  const word = entry.word;
  const grammar = detectGender(word);
  
  return {
    ...entry,
    ipa: entry.ipa || getIPA(word),
    gender: grammar.gender,
    pos: grammar.pos,
    plural: grammar.plural
  };
}

// 处理文件
function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 提取词汇数组
  const match = content.match(/module\.exports\s*=\s*(\[.*?\]);/s);
  if (!match) {
    console.log(`  Could not find module.exports in ${filePath}`);
    return;
  }
  
  let vocab;
  try {
    vocab = eval(match[1]);
  } catch (e) {
    console.log(`  Error parsing ${filePath}: ${e.message}`);
    return;
  }
  
  // 处理每个条目（保留已有的ipa字段）
  const processed = vocab.map(entry => {
    const grammar = detectGender(entry.word);
    return {
      ...entry,
      ipa: entry.ipa || getIPA(entry.word),
      gender: grammar.gender,
      pos: grammar.pos,
      plural: grammar.plural
    };
  });
  
  // 生成新文件内容（保持原始格式）
  const entries = processed.map(entry => {
    const fields = [];
    fields.push(`  word: "${entry.word}"`);
    fields.push(`  translation: "${entry.translation}"`);
    fields.push(`  phonetic: "${entry.phonetic}"`);
    if (entry.ipa) fields.push(`  ipa: "${entry.ipa}"`);
    if (entry.gender) fields.push(`  gender: "${entry.gender}"`);
    if (entry.pos) fields.push(`  pos: "${entry.pos}"`);
    if (entry.plural) fields.push(`  plural: "${entry.plural}"`);
    fields.push(`  example: "${entry.example}"`);
    return `  {\n    ${fields.join(',\n    ')}\n  }`;
  });
  
  const output = `module.exports = [\n${entries.join(',\n')}\n];\n`;
  
  // 写入新文件
  fs.writeFileSync(filePath, output, 'utf-8');
  console.log(`  Processed ${processed.length} entries`);
}

// 主程序
const dataDir = path.join(__dirname, '..', 'german', 'data');
const levels = ['a1', 'a2', 'b1', 'b2'];

console.log('=== German Grammar & IPA Auto-Generator ===\n');

for (const level of levels) {
  const vocabFile = path.join(dataDir, level, 'vocab.js');
  if (fs.existsSync(vocabFile)) {
    processFile(vocabFile);
  } else {
    console.log(`File not found: ${vocabFile}`);
  }
}

console.log('\n=== Done ===');
