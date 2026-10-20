/**
 * Dictionnaire de mots courants français (longueur entre 6 et 10 caractères,
 * en minuscules, sans accents ni caractères spéciaux).
 */
export const FRENCH_WORDS = [
  'abricot', 'acajou', 'agneau', 'aimable', 'allumette', 'amande', 'ampoule', 'ananas', 'ancre',
  'anneau', 'ardoise', 'argile', 'armoire', 'artiste', 'astronaute', 'aubergine', 'aurore', 'automne',
  'avalanche', 'aventure', 'bambou', 'banane', 'banquise', 'barque', 'basilic', 'bateau', 'belette',
  'biberon', 'biscuit', 'boussole', 'bouton', 'brouillard', 'buffle', 'buisson', 'cabane', 'cactus',
  'cahier', 'camion', 'canard', 'caravane', 'cardinal', 'carotte', 'cascade', 'casque', 'cerise',
  'cerveau', 'chameau', 'chamois', 'chapeau', 'chariot', 'chateau', 'chemise', 'chenille', 'cheval',
  'chevre', 'chiffon', 'chocolat', 'cigale', 'cigogne', 'citron', 'clarinette', 'clavier', 'cloche',
  'coccinelle', 'coffre', 'colibri', 'collier', 'colline', 'comete', 'compas', 'coquillage', 'corbeau',
  'couronne', 'coussin', 'couteau', 'crapaud', 'cravate', 'crayon', 'crevette', 'cristal', 'croissant',
  'cuillere', 'dauphin', 'dessin', 'diamant', 'dinde', 'dinosaure', 'domino', 'dragon', 'drapeau',
  'eclair', 'ecluse', 'ecureuil', 'epee', 'eponge', 'escargot', 'espace', 'etoile', 'falaise',
  'faucon', 'fenetre', 'feuille', 'ficelle', 'flamme', 'flaque', 'fleche', 'fleuve', 'flotteur',
  'foret', 'fougere', 'foulard', 'fourmi', 'fraise', 'framboise', 'fromage', 'fusee', 'galet',
  'galaxie', 'gazelle', 'geode', 'gibier', 'girafe', 'glaive', 'glaire', 'glacier', 'goulot',
  'goutte', 'graine', 'grenouille', 'grillon', 'guitare', 'hamac', 'hameau', 'hamster', 'haricot',
  'harmonica', 'harpe', 'herisson', 'hibou', 'hirondelle', 'horloge', 'horizon', 'housse', 'igloo',
  'iguane', 'ilot', 'image', 'indien', 'iris', 'ivoire', 'jacinthe', 'jaguar', 'jambon',
  'jardin', 'jonquille', 'jouet', 'journal', 'jumelles', 'jungle', 'jupon', 'kangourou', 'kayak',
  'koala', 'labyrinthe', 'lac', 'lampe', 'lapin', 'laurier', 'lezard', 'libellule', 'licorne',
  'lierre', 'limace', 'limonade', 'lionceau', 'livre', 'loutre', 'luciole', 'lumiere', 'lunettes',
  'machine', 'magnolia', 'maison', 'mandarine', 'mangouste', 'manteau', 'marais', 'marguerite', 'marmotte',
  'marteau', 'matelot', 'melon', 'merle', 'mouette', 'mouton', 'muguer', 'muguet', 'musique',
  'myrtille', 'nageoire', 'navire', 'nenuphar', 'noisette', 'nuage', 'oasis', 'ocean', 'ogre',
  'oiseau', 'orange', 'oranger', 'orchestre', 'orchidee', 'oreiller', 'orignal', 'otarie', 'ouragan',
  'ourson', 'palmier', 'panthere', 'pantoufle', 'papillon', 'paquebot', 'parapluie', 'parfum', 'pastèque',
  'pasteque', 'patin', 'pelican', 'pendule', 'perroquet', 'pecheur', 'petale', 'piano', 'pigeon',
  'pinceau', 'pingouin', 'pinson', 'piolet', 'pirogue', 'piscine', 'planete', 'plongeon', 'plume',
  'poireau', 'poisson', 'polar', 'polochon', 'pomme', 'pont', 'porcelaine', 'poulpe', 'poussin',
  'prairie', 'prince', 'princesse', 'pyramide', 'quiche', 'quille', 'radeau', 'radis', 'raisin',
  'rameau', 'ranche', 'ravin', 'rayure', 'refuge', 'renard', 'requin', 'rideau', 'riviere',
  'robot', 'rocher', 'roseau', 'rossignol', 'roulotte', 'ruche', 'ruisseau', 'sablier', 'safari',
  'saphir', 'sapin', 'sardine', 'saule', 'saumon', 'saxophone', 'sculpteur', 'serpent', 'sifflet',
  'sirène', 'sirene', 'soleil', 'sorbet', 'souris', 'statue', 'stylo', 'sucette', 'tableau',
  'tabouret', 'tambour', 'tamis', 'tanche', 'tapir', 'tarte', 'taupe', 'taureau', 'tempete',
  'terrasse', 'tigre', 'timbre', 'toboggan', 'tomate', 'tonneau', 'tornade', 'tortue', 'toucan',
  'tourbillon', 'tournesol', 'traineau', 'tribord', 'trompette', 'tulipe', 'tunnel', 'vague', 'valise',
  'vallon', 'vanille', 'vase', 'velours', 'vent', 'verger', 'verre', 'veste', 'viaduc',
  'vibraphone', 'village', 'violon', 'voilier', 'voiture', 'volcan', 'voyage', 'wagon', 'xylophone',
  'yacht', 'zebre', 'zenith', 'zephir'
].filter(w => w.length >= 6 && w.length <= 10 && !/[éèêëàâäôöûüïîç]/i.test(w));

/**
 * Génère un mot de passe aléatoire de 6 à 10 lettres en minuscules
 */
export function generateRandomPassword() {
  const index = Math.floor(Math.random() * FRENCH_WORDS.length);
  return FRENCH_WORDS[index];
}
