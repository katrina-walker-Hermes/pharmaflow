import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { seedData } from './data/seed';
import { normalizeCategoryName } from './utils/categoryOrder';

export interface Transaction {
  id: string;
  date: string;
  type: 'entree' | 'sortie';
  quantite: number;
  origineDestination: string;
  datePeremption?: string;
  numeroLot?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  isImportant: boolean;
  stockSecurite: number;
  quantiteMoyenneMensuelle: number;
  enRuptureHopital: boolean;
  transactions: Transaction[];
}

export interface OrderItem {
  productId: string;
  productName: string;
  category: string;
  quantiteDemandee: number;
  quantiteRecue?: number;
  datePeremption?: string;
  numeroLot?: string;
}

export type OrderStatus = 'brouillon' | 'en_cours' | 'livree' | 'annulee';

export interface PharmacyOrder {
  id: string;
  numeroCommande: string;
  dateCreation: string;
  dateLivraisonPrevue?: string;
  dateReception?: string;
  dateAnnulation?: string;
  statut: OrderStatus;
  serviceDemandeur: string;
  destinataire: string;
  motifAnnulation?: string;
  items: OrderItem[];
  commentaires?: string;
}

export const ENTREE_ORIGINES = ['Pharmacie hospitalière', 'Pharmacie Centrale', 'Échange'] as const;
export type EntreeOrigine = typeof ENTREE_ORIGINES[number];

export const SORTIE_DESTINATIONS = ['Service', 'Décharge périmé', 'Perte'] as const;
export type SortieDestination = typeof SORTIE_DESTINATIONS[number];

export interface BonDangerEntry {
  id: string;
  productName: 'Fentanyl 100 µg' | 'Fentanyl 500 µg' | string;
  lotNumber: string;
  quantite: number; // Quantité d'ampoules délivrées/sorties
  quantiteVideRecu: number; // Quantité du vide reçu (ampoules vides restituées)
  nomIAR: string; // Nom de l'Infirmier Anesthésiste Réanimateur
  date: string; // YYYY-MM-DD
  heure?: string;
  salle?: string;
  observations?: string;
}

export interface BonDangerDocument {
  id: string;
  date: string; // Date du document / scan
  reference: string; // Référence / N° de bon physique (ex: BC-STUP-2026-001)
  iarName: string; // Nom de l'IAR ou prescripteur
  productTarget?: string; // Fentanyl 100 µg, Fentanyl 500 µg, ou les deux
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string; // Base64 data URI
  uploadDate: string;
  notes?: string;
}

export interface AppBackupData {
  version: number;
  exportDate: string;
  appName: string;
  hospital: string;
  service: string;
  products: Product[];
  orders: PharmacyOrder[];
  bonDangerEntries: BonDangerEntry[];
  bonDangerDocuments: BonDangerDocument[];
}

interface NewProductInput {
  name: string;
  category: string;
  isImportant: boolean;
  stockSecurite: number;
  quantiteMoyenneMensuelle: number;
  enRuptureHopital: boolean;
  initialStock?: number;
  initialDatePeremption?: string;
  initialNumeroLot?: string;
  initialOrigine?: string;
}

interface AppState {
  products: Product[];
  orders: PharmacyOrder[];
  bonDangerEntries: BonDangerEntry[];
  bonDangerDocuments: BonDangerDocument[];
  bonDangerInitialized?: boolean;
  
  addProduct: (product: NewProductInput) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addTransaction: (productId: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (productId: string, transactionId: string) => void;
  resetAllStocksToBlank: () => void;
  setInitialProductStock: (productId: string, quantite: number, datePeremption?: string, origine?: string, numeroLot?: string) => void;
  seedDatabase: () => void;
  
  // Order actions
  createOrder: (order: Omit<PharmacyOrder, 'id' | 'numeroCommande' | 'dateCreation'>) => string;
  updateOrder: (id: string, updates: Partial<PharmacyOrder>) => void;
  updateOrderItemQuantity: (orderId: string, productId: string, quantiteDemandee: number) => void;
  updateOrderItems: (orderId: string, items: OrderItem[]) => void;
  cancelOrder: (id: string, motif?: string) => void;
  resumeCancelledOrder: (id: string) => void;
  receiveOrder: (id: string, receipts?: { productId: string; quantiteRecue: number; datePeremption?: string; numeroLot?: string }[]) => void;
  deleteOrder: (id: string) => void;

  // Le Bon Danger actions (Fentanyl 100 µg & 500 µg)
  addBonDangerEntry: (entry: Omit<BonDangerEntry, 'id'>) => void;
  updateBonDangerEntry: (id: string, updates: Partial<BonDangerEntry>) => void;
  deleteBonDangerEntry: (id: string) => void;
  addBonDangerDocument: (doc: Omit<BonDangerDocument, 'id' | 'uploadDate'>) => void;
  deleteBonDangerDocument: (id: string) => void;
  resetBonDanger: (options?: { resetEntries?: boolean; resetDocuments?: boolean }) => void;
  restoreSampleBonDanger: () => void;

  // JSON Backup & Import actions
  exportAllData: () => AppBackupData;
  importAllData: (rawPayload: any, mode?: 'replace' | 'merge') => { success: boolean; message: string; count: number };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      products: [],
      orders: [],
      bonDangerEntries: [],
      bonDangerDocuments: [],
      bonDangerInitialized: false,
      
      addProduct: (input) => set((state) => {
        const productId = uuidv4();
        const transactions: Transaction[] = [];

        if (input.initialStock && input.initialStock > 0) {
          transactions.push({
            id: uuidv4(),
            date: new Date().toISOString(),
            type: 'entree',
            quantite: Number(input.initialStock) || 0,
            origineDestination: input.initialOrigine || 'Inventaire initial',
            datePeremption: input.initialDatePeremption || undefined,
            numeroLot: input.initialNumeroLot?.trim() || undefined,
          });
        }

        const newProd: Product = {
          id: productId,
          name: input.name.trim(),
          category: normalizeCategoryName(input.category),
          isImportant: input.isImportant,
          stockSecurite: Number(input.stockSecurite) || 0,
          quantiteMoyenneMensuelle: Number(input.quantiteMoyenneMensuelle) || 0,
          enRuptureHopital: input.enRuptureHopital || false,
          transactions,
        };

        return { products: [newProd, ...state.products] };
      }),
      
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map(p => {
          if (p.id !== id) return p;
          const merged = { ...p, ...updates };
          if (updates.category) {
            merged.category = normalizeCategoryName(updates.category);
          }
          return merged;
        })
      })),
      
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter(p => p.id !== id)
      })),
      
      addTransaction: (productId, transaction) => set((state) => ({
        products: state.products.map(p => {
          if (p.id === productId) {
            const currentTransactions = Array.isArray(p.transactions) ? p.transactions : [];
            return {
              ...p,
              transactions: [...currentTransactions, { ...transaction, id: uuidv4() }]
            };
          }
          return p;
        })
      })),
      
      deleteTransaction: (productId, transactionId) => set((state) => ({
        products: state.products.map(p => {
          if (p.id === productId) {
            const currentTransactions = Array.isArray(p.transactions) ? p.transactions : [];
            return {
              ...p,
              transactions: currentTransactions.filter(t => t.id !== transactionId)
            };
          }
          return p;
        })
      })),

      resetAllStocksToBlank: () => set((state) => ({
        products: state.products.map(p => ({
          ...p,
          transactions: [] // completely blank stocks for clean initial inventory
        }))
      })),

      setInitialProductStock: (productId, quantite, datePeremption, origine, numeroLot) => set((state) => ({
        products: state.products.map(p => {
          if (p.id === productId) {
            const newTransactions: Transaction[] = quantite > 0 ? [{
              id: uuidv4(),
              date: new Date().toISOString(),
              type: 'entree',
              quantite: Number(quantite) || 0,
              origineDestination: origine || 'Inventaire initial',
              datePeremption: datePeremption || undefined,
              numeroLot: numeroLot?.trim() || undefined,
            }] : [];

            return {
              ...p,
              transactions: newTransactions
            };
          }
          return p;
        })
      })),

      // Orders functionality
      createOrder: (orderInput) => {
        const id = uuidv4();
        const currentYear = new Date().getFullYear();
        const orderCount = get().orders.length + 1;
        const numeroCommande = `BC-${currentYear}-${String(orderCount).padStart(3, '0')}`;

        const newOrder: PharmacyOrder = {
          ...orderInput,
          id,
          numeroCommande,
          dateCreation: new Date().toISOString(),
        };

        set((state) => ({
          orders: [newOrder, ...state.orders]
        }));

        return id;
      },

      updateOrder: (id, updates) => {
        const order = get().orders.find(o => o.id === id);
        if (updates.statut === 'livree' && order && order.statut !== 'livree') {
          get().receiveOrder(id);
          return;
        }
        set((state) => ({
          orders: state.orders.map(o => o.id === id ? { ...o, ...updates } : o)
        }));
      },

      updateOrderItemQuantity: (orderId, productId, quantiteDemandee) => set((state) => ({
        orders: state.orders.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              items: o.items.map((it) =>
                it.productId === productId ? { ...it, quantiteDemandee: Math.max(0, quantiteDemandee) } : it
              ),
            };
          }
          return o;
        }),
      })),

      updateOrderItems: (orderId, items) => set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, items } : o)),
      })),

      cancelOrder: (id, motif) => set((state) => ({
        orders: state.orders.map(o => {
          if (o.id === id) {
            return {
              ...o,
              statut: 'annulee',
              dateAnnulation: new Date().toISOString(),
              motifAnnulation: motif || 'Annulée par le service du bloc'
            };
          }
          return o;
        })
      })),

      resumeCancelledOrder: (id) => set((state) => ({
        orders: state.orders.map(o => {
          if (o.id === id) {
            return {
              ...o,
              statut: 'en_cours',
              dateAnnulation: undefined,
              motifAnnulation: undefined
            };
          }
          return o;
        })
      })),

      receiveOrder: (id, receipts) => {
        const order = get().orders.find(o => o.id === id);
        if (!order) return;

        // Automatically record incoming items in the respective fiches de poste / fiches de stock
        set((state) => {
          let updatedProducts = [...state.products];
          const receptionDateIso = new Date().toISOString();

          const itemsToReceive = receipts && receipts.length > 0 
            ? receipts 
            : order.items.map(it => ({
                productId: it.productId,
                quantiteRecue: it.quantiteDemandee,
                datePeremption: it.datePeremption,
                numeroLot: it.numeroLot,
              }));

          itemsToReceive.forEach(rec => {
            const qty = Number(rec.quantiteRecue) || 0;
            if (qty > 0) {
              const orderItem = order.items.find(it => it.productId === rec.productId);
              const prodIndex = updatedProducts.findIndex(p => 
                p.id === rec.productId || 
                (orderItem && p.name.trim().toLowerCase() === orderItem.productName.trim().toLowerCase())
              );

              // Exactly as requested: entry into fiche de poste from the hospital pharmacy with lot and expiration date
              const entryTransaction: Transaction = {
                id: uuidv4(),
                date: receptionDateIso,
                type: 'entree',
                quantite: qty,
                origineDestination: `Pharmacie hospitalière (BC N° ${order.numeroCommande})`,
                datePeremption: rec.datePeremption || undefined,
                numeroLot: rec.numeroLot?.trim() || undefined,
              };

              if (prodIndex >= 0) {
                const p = updatedProducts[prodIndex];
                const currentTrans = Array.isArray(p.transactions) ? p.transactions : [];
                updatedProducts[prodIndex] = {
                  ...p,
                  transactions: [...currentTrans, entryTransaction]
                };
              } else if (orderItem) {
                // If product was somehow deleted or not yet present, automatically create its fiche de poste
                updatedProducts.push({
                  id: rec.productId,
                  name: orderItem.productName,
                  category: normalizeCategoryName(orderItem.category),
                  isImportant: true,
                  stockSecurite: 5,
                  quantiteMoyenneMensuelle: 0,
                  enRuptureHopital: false,
                  transactions: [entryTransaction]
                });
              }
            }
          });

          const updatedOrders = state.orders.map(o => {
            if (o.id === id) {
              return {
                ...o,
                statut: 'livree' as OrderStatus,
                dateReception: receptionDateIso,
                items: o.items.map(it => {
                  const r = itemsToReceive.find(x => x.productId === it.productId);
                  return {
                    ...it,
                    quantiteRecue: r ? r.quantiteRecue : it.quantiteDemandee,
                    datePeremption: r?.datePeremption || it.datePeremption,
                    numeroLot: r?.numeroLot?.trim() || it.numeroLot,
                  };
                })
              };
            }
            return o;
          });

          return {
            products: updatedProducts,
            orders: updatedOrders
          };
        });
      },

      deleteOrder: (id) => set((state) => ({
        orders: state.orders.filter(o => o.id !== id)
      })),

      // Le Bon Danger actions
      addBonDangerEntry: (entry) => set((state) => ({
        bonDangerEntries: [
          {
            ...entry,
            id: uuidv4()
          },
          ...(state.bonDangerEntries || [])
        ]
      })),

      updateBonDangerEntry: (id, updates) => set((state) => ({
        bonDangerEntries: (state.bonDangerEntries || []).map((e) =>
          e.id === id ? { ...e, ...updates } : e
        )
      })),

      deleteBonDangerEntry: (id) => set((state) => ({
        bonDangerEntries: (state.bonDangerEntries || []).filter((e) => e.id !== id)
      })),

      addBonDangerDocument: (doc) => set((state) => ({
        bonDangerDocuments: [
          {
            ...doc,
            id: uuidv4(),
            uploadDate: new Date().toISOString()
          },
          ...(state.bonDangerDocuments || [])
        ]
      })),

      deleteBonDangerDocument: (id) => set((state) => ({
        bonDangerDocuments: (state.bonDangerDocuments || []).filter((d) => d.id !== id)
      })),

      resetBonDanger: (options = { resetEntries: true, resetDocuments: false }) => set((state) => {
        const resetEntries = options?.resetEntries !== undefined ? options.resetEntries : true;
        const resetDocuments = options?.resetDocuments !== undefined ? options.resetDocuments : false;
        return {
          bonDangerEntries: resetEntries ? [] : (state.bonDangerEntries || []),
          bonDangerDocuments: resetDocuments ? [] : (state.bonDangerDocuments || []),
          bonDangerInitialized: true
        };
      }),

      restoreSampleBonDanger: () => set(() => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0];

        return {
          bonDangerInitialized: true,
          bonDangerEntries: [
            {
              id: uuidv4(),
              productName: 'Fentanyl 100 µg',
              lotNumber: 'FTN-2025-A12',
              quantite: 5,
              quantiteVideRecu: 5,
              nomIAR: 'IAR EL ALAOUI Mohamed',
              date: twoDaysAgo,
              heure: '08:30',
              salle: 'Salle 1 (Chirurgie Générale)',
              observations: 'Conforme - 5 ampoules vides restituées et vérifiées'
            },
            {
              id: uuidv4(),
              productName: 'Fentanyl 500 µg',
              lotNumber: 'FTN-500-B04',
              quantite: 2,
              quantiteVideRecu: 2,
              nomIAR: 'IAR BENALI Fatima',
              date: yesterday,
              heure: '10:15',
              salle: 'Salle 2 (Traumatologie)',
              observations: 'Conforme - Restitution totale'
            },
            {
              id: uuidv4(),
              productName: 'Fentanyl 100 µg',
              lotNumber: 'FTN-2025-A12',
              quantite: 4,
              quantiteVideRecu: 2,
              nomIAR: 'IAR TAZI Rachid',
              date: today,
              heure: '09:00',
              salle: 'Salle 1 (Urgences Bloc)',
              observations: 'Intervention en cours - 2 ampoules vides en attente de restitution'
            }
          ]
        };
      }),

      seedDatabase: () => set((state) => {
        let currentProducts = state.products;

        if (currentProducts.length === 0) {
          const newProducts: Product[] = [];
          seedData.forEach(cat => {
            cat.products.forEach(prodName => {
              newProducts.push({
                id: uuidv4(),
                name: prodName,
                category: cat.category,
                isImportant: true,
                stockSecurite: 5,
                quantiteMoyenneMensuelle: 0,
                enRuptureHopital: false,
                transactions: [] // Blank stocks for inventory
              });
            });
          });
          currentProducts = newProducts;
        }

        // Ensure all products have transactions array and valid fields
        currentProducts = currentProducts.map(p => ({
          ...p,
          id: p.id || uuidv4(),
          name: p.name || 'Produit sans nom',
          category: normalizeCategoryName(p.category || 'Général'),
          isImportant: p.isImportant ?? true,
          stockSecurite: Number(p.stockSecurite) || 0,
          quantiteMoyenneMensuelle: Number(p.quantiteMoyenneMensuelle) || 0,
          enRuptureHopital: Boolean(p.enRuptureHopital),
          transactions: Array.isArray(p.transactions) ? p.transactions : []
        }));

        // Seed sample orders if empty
        let currentOrders = state.orders;
        if (currentOrders.length === 0 && currentProducts.length > 5) {
          const p1 = currentProducts[0];
          const p2 = currentProducts[1];
          const p3 = currentProducts[2];
          const p4 = currentProducts[3];

          const currentYear = new Date().getFullYear();

          currentOrders = [
            {
              id: uuidv4(),
              numeroCommande: `BC-${currentYear}-001`,
              dateCreation: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
              dateAnnulation: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
              statut: 'annulee',
              serviceDemandeur: 'Bloc Opératoire',
              destinataire: 'Pharmacie Hospitalière Centrale',
              motifAnnulation: 'Commande suspendue temporairement - En attente de reprise',
              commentaires: 'Commande d\'anesthésiques et solutés d\'urgence',
              items: [
                {
                  productId: p1.id,
                  productName: p1.name,
                  category: p1.category,
                  quantiteDemandee: 20
                },
                {
                  productId: p2.id,
                  productName: p2.name,
                  category: p2.category,
                  quantiteDemandee: 15
                }
              ]
            },
            {
              id: uuidv4(),
              numeroCommande: `BC-${currentYear}-002`,
              dateCreation: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
              statut: 'en_cours',
              serviceDemandeur: 'Bloc Opératoire',
              destinataire: 'Pharmacie Hospitalière Centrale',
              commentaires: 'Réapprovisionnement hebdomadaire',
              items: [
                {
                  productId: p3.id,
                  productName: p3.name,
                  category: p3.category,
                  quantiteDemandee: 10
                },
                {
                  productId: p4.id,
                  productName: p4.name,
                  category: p4.category,
                  quantiteDemandee: 25
                }
              ]
            }
          ];
        }

        // Seed initial Bon Danger records only if not already initialized
        let currentBonDanger = state.bonDangerEntries;
        if (!state.bonDangerInitialized && (!currentBonDanger || currentBonDanger.length === 0)) {
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
          const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0];

          currentBonDanger = [
            {
              id: uuidv4(),
              productName: 'Fentanyl 100 µg',
              lotNumber: 'FTN-2025-A12',
              quantite: 5,
              quantiteVideRecu: 5,
              nomIAR: 'IAR EL ALAOUI Mohamed',
              date: twoDaysAgo,
              heure: '08:30',
              salle: 'Salle 1 (Chirurgie Générale)',
              observations: 'Conforme - 5 ampoules vides restituées et vérifiées'
            },
            {
              id: uuidv4(),
              productName: 'Fentanyl 500 µg',
              lotNumber: 'FTN-500-B04',
              quantite: 2,
              quantiteVideRecu: 2,
              nomIAR: 'IAR BENALI Fatima',
              date: yesterday,
              heure: '10:15',
              salle: 'Salle 2 (Traumatologie)',
              observations: 'Conforme - Restitution totale'
            },
            {
              id: uuidv4(),
              productName: 'Fentanyl 100 µg',
              lotNumber: 'FTN-2025-A12',
              quantite: 4,
              quantiteVideRecu: 2,
              nomIAR: 'IAR TAZI Rachid',
              date: today,
              heure: '09:00',
              salle: 'Salle 1 (Urgences Bloc)',
              observations: 'Intervention en cours - 2 ampoules vides en attente de restitution'
            }
          ];
        }
        
        return { 
          products: currentProducts,
          orders: currentOrders,
          bonDangerEntries: currentBonDanger || [],
          bonDangerDocuments: state.bonDangerDocuments || [],
          bonDangerInitialized: true
        };
      }),

      exportAllData: () => {
        const state = get();
        return {
          version: 1,
          exportDate: new Date().toISOString(),
          appName: 'Gestion Pharmacie Bloc Opératoire',
          hospital: 'Centre Hospitalier Provincial SIDI IFNI',
          service: 'Service du Bloc Opératoire',
          products: state.products || [],
          orders: state.orders || [],
          bonDangerEntries: state.bonDangerEntries || [],
          bonDangerDocuments: state.bonDangerDocuments || [],
        };
      },

      importAllData: (rawPayload: any, mode = 'replace') => {
        if (!rawPayload) {
          return { success: false, message: 'Le fichier sélectionné est vide ou invalide.', count: 0 };
        }

        let importedProducts: any[] = [];
        let importedOrders: any[] = [];
        let importedBonDangerEntries: any[] = [];
        let importedBonDangerDocuments: any[] = [];

        if (Array.isArray(rawPayload)) {
          // Direct array of products
          importedProducts = rawPayload;
        } else if (typeof rawPayload === 'object') {
          if (Array.isArray(rawPayload.products)) {
            importedProducts = rawPayload.products;
          }
          if (Array.isArray(rawPayload.orders)) {
            importedOrders = rawPayload.orders;
          }
          if (Array.isArray(rawPayload.bonDangerEntries)) {
            importedBonDangerEntries = rawPayload.bonDangerEntries;
          }
          if (Array.isArray(rawPayload.bonDangerDocuments)) {
            importedBonDangerDocuments = rawPayload.bonDangerDocuments;
          }
        }

        if (importedProducts.length === 0 && importedOrders.length === 0 && importedBonDangerEntries.length === 0) {
          return {
            success: false,
            message: 'Aucune donnée exploitable (produits, commandes ou fiches) détectée dans ce fichier JSON.',
            count: 0,
          };
        }

        // Clean & normalize imported products
        const sanitizedProducts: Product[] = importedProducts.map((p: any) => ({
          id: p.id || uuidv4(),
          name: String(p.name || 'Produit sans nom').trim(),
          category: normalizeCategoryName(p.category || 'Général'),
          isImportant: Boolean(p.isImportant),
          stockSecurite: Number(p.stockSecurite) || 0,
          quantiteMoyenneMensuelle: Number(p.quantiteMoyenneMensuelle) || 0,
          enRuptureHopital: Boolean(p.enRuptureHopital),
          transactions: Array.isArray(p.transactions)
            ? p.transactions.map((t: any) => ({
                id: t.id || uuidv4(),
                date: t.date || new Date().toISOString(),
                type: (t.type === 'entree' || t.type === 'sortie') ? t.type : 'entree',
                quantite: Number(t.quantite) || 0,
                origineDestination: String(t.origineDestination || 'Non spécifié').trim(),
                datePeremption: t.datePeremption || undefined,
                numeroLot: t.numeroLot || undefined,
              }))
            : [],
        }));

        // Clean & normalize imported orders
        const sanitizedOrders: PharmacyOrder[] = importedOrders.map((o: any) => ({
          id: o.id || uuidv4(),
          numeroCommande: o.numeroCommande || `BC-${new Date().getFullYear()}-001`,
          dateCreation: o.dateCreation || new Date().toISOString(),
          dateLivraisonPrevue: o.dateLivraisonPrevue,
          dateReception: o.dateReception,
          dateAnnulation: o.dateAnnulation,
          statut: o.statut || 'en_cours',
          serviceDemandeur: o.serviceDemandeur || 'Bloc Opératoire',
          destinataire: o.destinataire || 'Pharmacie Centrale',
          motifAnnulation: o.motifAnnulation,
          commentaires: o.commentaires,
          items: Array.isArray(o.items)
            ? o.items.map((it: any) => ({
                productId: it.productId || uuidv4(),
                productName: it.productName || 'Article',
                category: normalizeCategoryName(it.category || 'Général'),
                quantiteDemandee: Number(it.quantiteDemandee) || 1,
                quantiteRecue: it.quantiteRecue !== undefined ? Number(it.quantiteRecue) : undefined,
                datePeremption: it.datePeremption,
                numeroLot: it.numeroLot,
              }))
            : [],
        }));

        if (mode === 'replace') {
          set({
            products: sanitizedProducts,
            orders: sanitizedOrders,
            bonDangerEntries: importedBonDangerEntries,
            bonDangerDocuments: importedBonDangerDocuments,
            bonDangerInitialized: true,
          });

          return {
            success: true,
            message: `Restauration complète réussie : ${sanitizedProducts.length} fiches de stock, ${sanitizedOrders.length} commandes et ${importedBonDangerEntries.length} registres Bon Danger importés.`,
            count: sanitizedProducts.length,
          };
        } else {
          // Merge mode (Fusion intelligente)
          set((state) => {
            const existingProds = [...state.products];

            sanitizedProducts.forEach((newProd) => {
              const existingIndex = existingProds.findIndex(
                (p) => p.id === newProd.id || p.name.trim().toLowerCase() === newProd.name.trim().toLowerCase()
              );

              if (existingIndex >= 0) {
                const existing = existingProds[existingIndex];
                const existingTxIds = new Set(existing.transactions.map((t) => t.id));
                const mergedTx = [...existing.transactions];

                newProd.transactions.forEach((tx) => {
                  if (!existingTxIds.has(tx.id)) {
                    mergedTx.push(tx);
                  }
                });

                existingProds[existingIndex] = {
                  ...existing,
                  transactions: mergedTx,
                  stockSecurite: Math.max(existing.stockSecurite, newProd.stockSecurite),
                  quantiteMoyenneMensuelle: Math.max(existing.quantiteMoyenneMensuelle, newProd.quantiteMoyenneMensuelle),
                };
              } else {
                existingProds.push(newProd);
              }
            });

            // Merge orders
            const existingOrders = [...state.orders];
            const existingOrderIds = new Set(existingOrders.map((o) => o.id));
            sanitizedOrders.forEach((o) => {
              if (!existingOrderIds.has(o.id)) {
                existingOrders.push(o);
              }
            });

            // Merge Bon Danger
            const existingBonDanger = [...state.bonDangerEntries];
            const existingBDEntryIds = new Set(existingBonDanger.map((e) => e.id));
            importedBonDangerEntries.forEach((e) => {
              if (!existingBDEntryIds.has(e.id)) {
                existingBonDanger.push(e);
              }
            });

            // Merge Bon Danger Documents
            const existingDocs = [...state.bonDangerDocuments];
            const existingDocIds = new Set(existingDocs.map((d) => d.id));
            importedBonDangerDocuments.forEach((d) => {
              if (!existingDocIds.has(d.id)) {
                existingDocs.push(d);
              }
            });

            return {
              products: existingProds,
              orders: existingOrders,
              bonDangerEntries: existingBonDanger,
              bonDangerDocuments: existingDocs,
              bonDangerInitialized: true,
            };
          });

          return {
            success: true,
            message: `Fusion réussie : ${sanitizedProducts.length} fiches et enregistrements associés intégrés.`,
            count: sanitizedProducts.length,
          };
        }
      },
    }),
    {
      name: 'pharmacie-stock-storage',
      version: 7,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;
        const products = Array.isArray(persistedState.products)
          ? persistedState.products.map((p: any) => ({
              ...p,
              category: normalizeCategoryName(p.category || 'Général'),
              transactions: Array.isArray(p.transactions) ? p.transactions : []
            }))
          : [];
        const orders = Array.isArray(persistedState.orders)
          ? persistedState.orders.map((o: any) => ({
              ...o,
              items: Array.isArray(o.items)
                ? o.items.map((it: any) => ({
                    ...it,
                    category: normalizeCategoryName(it.category || 'Général')
                  }))
                : []
            }))
          : [];
        const bonDangerEntries = Array.isArray(persistedState.bonDangerEntries) ? persistedState.bonDangerEntries : [];
        const bonDangerDocuments = Array.isArray(persistedState.bonDangerDocuments) ? persistedState.bonDangerDocuments : [];
        const bonDangerInitialized = Boolean(persistedState.bonDangerInitialized);
        return {
          ...persistedState,
          products,
          orders,
          bonDangerEntries,
          bonDangerDocuments,
          bonDangerInitialized
        } as AppState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (Array.isArray(state.products)) {
          let modified = false;
          const updated = state.products.map((p) => {
            const canonical = normalizeCategoryName(p.category);
            if (p.category !== canonical) {
              modified = true;
              return { ...p, category: canonical };
            }
            return p;
          });
          if (modified) {
            useStore.setState({ products: updated });
          }
        }
      }
    }
  )
);

export const getCurrentStock = (product?: Product | null): number => {
  if (!product || !Array.isArray(product.transactions)) return 0;
  return product.transactions.reduce((acc, curr) => {
    if (!curr) return acc;
    const qty = Number(curr.quantite) || 0;
    if (curr.type === 'entree') return acc + qty;
    if (curr.type === 'sortie') return acc - qty;
    return acc;
  }, 0);
};
