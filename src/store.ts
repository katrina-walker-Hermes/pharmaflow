import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { seedData } from './data/seed';

export interface Transaction {
  id: string;
  date: string;
  type: 'entree' | 'sortie';
  quantite: number;
  origineDestination: string;
  datePeremption?: string;
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

export const ENTREE_ORIGINES = ['Pharmacie Centrale', 'Échange'] as const;
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

interface NewProductInput {
  name: string;
  category: string;
  isImportant: boolean;
  stockSecurite: number;
  quantiteMoyenneMensuelle: number;
  enRuptureHopital: boolean;
  initialStock?: number;
  initialDatePeremption?: string;
  initialOrigine?: string;
}

interface AppState {
  products: Product[];
  orders: PharmacyOrder[];
  bonDangerEntries: BonDangerEntry[];
  bonDangerDocuments: BonDangerDocument[];
  
  addProduct: (product: NewProductInput) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addTransaction: (productId: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (productId: string, transactionId: string) => void;
  resetAllStocksToBlank: () => void;
  setInitialProductStock: (productId: string, quantite: number, datePeremption?: string, origine?: string) => void;
  seedDatabase: () => void;
  
  // Order actions
  createOrder: (order: Omit<PharmacyOrder, 'id' | 'numeroCommande' | 'dateCreation'>) => string;
  updateOrder: (id: string, updates: Partial<PharmacyOrder>) => void;
  updateOrderItemQuantity: (orderId: string, productId: string, quantiteDemandee: number) => void;
  updateOrderItems: (orderId: string, items: OrderItem[]) => void;
  cancelOrder: (id: string, motif?: string) => void;
  resumeCancelledOrder: (id: string) => void;
  receiveOrder: (id: string, receipts?: { productId: string; quantiteRecue: number; datePeremption?: string }[]) => void;
  deleteOrder: (id: string) => void;

  // Le Bon Danger actions (Fentanyl 100 µg & 500 µg)
  addBonDangerEntry: (entry: Omit<BonDangerEntry, 'id'>) => void;
  updateBonDangerEntry: (id: string, updates: Partial<BonDangerEntry>) => void;
  deleteBonDangerEntry: (id: string) => void;
  addBonDangerDocument: (doc: Omit<BonDangerDocument, 'id' | 'uploadDate'>) => void;
  deleteBonDangerDocument: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      products: [],
      orders: [],
      bonDangerEntries: [],
      bonDangerDocuments: [],
      
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
          });
        }

        const newProd: Product = {
          id: productId,
          name: input.name.trim(),
          category: input.category.trim(),
          isImportant: input.isImportant,
          stockSecurite: Number(input.stockSecurite) || 0,
          quantiteMoyenneMensuelle: Number(input.quantiteMoyenneMensuelle) || 0,
          enRuptureHopital: input.enRuptureHopital || false,
          transactions,
        };

        return { products: [newProd, ...state.products] };
      }),
      
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
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

      setInitialProductStock: (productId, quantite, datePeremption, origine) => set((state) => ({
        products: state.products.map(p => {
          if (p.id === productId) {
            const newTransactions: Transaction[] = quantite > 0 ? [{
              id: uuidv4(),
              date: new Date().toISOString(),
              type: 'entree',
              quantite: Number(quantite) || 0,
              origineDestination: origine || 'Inventaire initial',
              datePeremption: datePeremption || undefined,
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

      updateOrder: (id, updates) => set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...updates } : o)
      })),

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

        // Apply incoming stocks into each product's fiche de stock
        set((state) => {
          let updatedProducts = [...state.products];

          const itemsToReceive = receipts && receipts.length > 0 
            ? receipts 
            : order.items.map(it => ({
                productId: it.productId,
                quantiteRecue: it.quantiteDemandee,
                datePeremption: undefined
              }));

          itemsToReceive.forEach(rec => {
            const qty = Number(rec.quantiteRecue) || 0;
            if (qty > 0) {
              updatedProducts = updatedProducts.map(p => {
                if (p.id === rec.productId) {
                  const currentTrans = Array.isArray(p.transactions) ? p.transactions : [];
                  return {
                    ...p,
                    transactions: [
                      ...currentTrans,
                      {
                        id: uuidv4(),
                        date: new Date().toISOString(),
                        type: 'entree',
                        quantite: qty,
                        origineDestination: `Commande ${order.numeroCommande} (Pharmacie Centrale)`,
                        datePeremption: rec.datePeremption || undefined,
                      }
                    ]
                  };
                }
                return p;
              });
            }
          });

          const updatedOrders = state.orders.map(o => {
            if (o.id === id) {
              return {
                ...o,
                statut: 'livree' as OrderStatus,
                dateReception: new Date().toISOString(),
                items: o.items.map(it => {
                  const r = itemsToReceive.find(x => x.productId === it.productId);
                  return {
                    ...it,
                    quantiteRecue: r ? r.quantiteRecue : it.quantiteDemandee
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
          category: p.category || 'Général',
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

        // Seed initial Bon Danger records if empty
        let currentBonDanger = state.bonDangerEntries;
        if (!currentBonDanger || currentBonDanger.length === 0) {
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
          bonDangerEntries: currentBonDanger,
          bonDangerDocuments: state.bonDangerDocuments || []
        };
      })
    }),
    {
      name: 'pharmacie-stock-storage',
      version: 5,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;
        const products = Array.isArray(persistedState.products)
          ? persistedState.products.map((p: any) => ({
              ...p,
              transactions: Array.isArray(p.transactions) ? p.transactions : []
            }))
          : [];
        const orders = Array.isArray(persistedState.orders) ? persistedState.orders : [];
        const bonDangerEntries = Array.isArray(persistedState.bonDangerEntries) ? persistedState.bonDangerEntries : [];
        const bonDangerDocuments = Array.isArray(persistedState.bonDangerDocuments) ? persistedState.bonDangerDocuments : [];
        return {
          ...persistedState,
          products,
          orders,
          bonDangerEntries,
          bonDangerDocuments
        } as AppState;
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
