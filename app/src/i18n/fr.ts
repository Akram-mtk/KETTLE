/**
 * Every user-visible string, in one place.
 *
 * Not an i18n library — the app is French-only. Keeping the strings together
 * is what stops the same action being called « Enregistrer » on one screen and
 * « Valider » on the next, and makes a second language a new file rather than
 * a rewrite.
 */
export const t = {
  app: {
    name: 'KETTLE',
    loading: 'Chargement…',
    retry: 'Réessayer',
    error: 'Une erreur est survenue',
    empty: 'Rien à afficher',
  },

  tabs: {
    today: "Aujourd'hui",
    sales: 'Ventes',
    stock: 'Stock',
    receipts: 'Reçus',
    more: 'Plus',
  },

  actions: {
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Enregistré',
    cancel: 'Annuler',
    close: 'Fermer',
    add: 'Ajouter',
    rename: 'Renommer',
    archive: 'Archiver',
    restore: 'Réactiver',
    back: 'Retour',
    confirm: 'Confirmer',
    up: 'Monter',
    down: 'Descendre',
  },

  day: {
    previous: 'Jour précédent',
    next: 'Jour suivant',
    today: "Aujourd'hui",
    goToToday: "Aller à aujourd'hui",
  },

  today: {
    title: 'Production du jour',
    subtitle: 'Combien avez-vous fabriqué ?',
    produced: 'Fabriqué',
    inStock: 'En stock',
    saved: 'Production enregistrée',
    noProducts: "Aucun produit. Ajoutez-en dans l'onglet Plus.",
    totalMade: 'Total fabriqué',
  },

  sales: {
    title: 'Ventes',
    nothing: '—',
    items: (n: number) => (n === 1 ? '1 article' : `${n} articles`),
    dayTotal: 'Total du jour',
    openGrid: 'Voir le tableau',
    noCustomers: "Aucun client. Ajoutez-en dans l'onglet Plus.",
    sheetTitle: 'Vente',
    quantity: 'Qté',
    price: 'Prix',
    available: 'stock',
    lineTotal: 'Total ligne',
    total: 'Total',
    priceRequired: 'Prix requis pour',
    quantityRequired: 'Quantité requise pour',
    overStock: 'Stock insuffisant pour',
    saved: 'Vente enregistrée',
    generateReceipt: 'Générer le reçu',
    viewReceipt: 'Voir le reçu',
  },

  matrix: {
    title: 'Tableau du jour',
    subtitle: 'Produits en lignes, clients en colonnes',
    product: 'Produit',
    total: 'Total',
    empty: 'Aucune vente ce jour.',
    hint: 'Touchez une case pour modifier la vente du client.',
    showAmounts: 'Afficher les montants',
    showQuantities: 'Afficher les quantités',
  },

  stock: {
    title: 'Stock',
    onHand: 'Disponible',
    produced: 'Fabriqué',
    sold: 'Vendu',
    adjusted: 'Écarts',
    count: 'Comptage réel',
    countTitle: 'Comptage réel',
    expected: 'Attendu',
    counted: 'Compté',
    delta: 'Écart',
    reason: 'Motif (optionnel)',
    reasonPlaceholder: 'ex. 3 sacs déchirés',
    countHelp: "Saisissez la quantité réellement présente. L'écart est enregistré et corrige le stock.",
    history: 'Historique des écarts',
    noHistory: 'Aucun écart enregistré.',
    saved: 'Comptage enregistré',
    noChange: 'Le comptage correspond déjà au stock attendu.',
  },

  receipts: {
    title: 'Reçus',
    number: (n: number) => `Reçu N° ${n}`,
    status: { DRAFT: 'Brouillon', ISSUED: 'Émis' },
    outOfSync: 'Désynchronisé',
    outOfSyncHelp:
      'Les ventes ont changé depuis l’émission de ce reçu. Le document reste figé ; régénérez-le pour le mettre à jour.',
    regenerate: 'Régénérer',
    issue: 'Émettre',
    issued: 'Émis le',
    none: 'Aucun reçu.',
    noSales: 'Aucune vente pour ce client à cette date.',
    lineProduct: 'Produit',
    lineQuantity: 'Qté',
    linePrice: 'P.U.',
    lineTotal: 'Total',
    grandTotal: 'Total à payer',
    customer: 'Client',
    date: 'Date',
  },

  catalogue: {
    products: 'Produits',
    customers: 'Clients',
    newProduct: 'Nouveau produit',
    newCustomer: 'Nouveau client',
    namePlaceholder: 'Nom',
    nameRequired: 'Nom requis',
    archived: 'Archivés',
    showArchived: 'Afficher les archivés',
    hideArchived: 'Masquer les archivés',
    archiveHelp: "Un produit archivé n'apparaît plus à la saisie, mais l'historique est conservé.",
    empty: 'Aucun élément.',
    confirmArchive: (name: string) => `Archiver « ${name} » ?`,
  },

  more: {
    title: 'Plus',
    catalogue: 'Catalogue',
    about: 'À propos',
    aboutText: 'KETTLE — production, stock, ventes et reçus.',
  },
} as const;
