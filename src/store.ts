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
  cancelOrder: (id: string, motif?: string) => void;
  resumeCancelledOrder: (id: string) => void;
  receiveOrder: (id: string, receipts?: { productId: string; quantiteRecue: number; datePeremption?: string }[]) => void;
  deleteOrder: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      products: [],
      orders: [],
      
      addProduct: (input) => set((state) => {
        const productId = uuidv4();
        const transactions: Transaction[] = [];

        if (input.initialStock && input.initialStock > 0) {
          transactions.push({
            id: uuidv4(),
            date: new Date().toISOString(),
            type: 'entree',
            quantite: input.initialStock,
            origineDestination: input.initialOrigine || 'Inventaire initial',
            datePeremption: input.initialDatePeremption || undefined,
          });
        }

        const newProd: Product = {
          id: productId,
          name: input.name.trim(),
          category: input.category.trim(),
          isImportant: input.isImportant,
          stockSecurite: input.stockSecurite || 0,
          quantiteMoyenneMensuelle: input.quantiteMoyenneMensuelle || 0,
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
            return {
              ...p,
              transactions: [...p.transactions, { ...transaction, id: uuidv4() }]
            };
          }
          return p;
        })
      })),
      
      deleteTransaction: (productId, transactionId) => set((state) => ({
        products: state.products.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              transactions: p.transactions.filter(t => t.id !== transactionId)
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
              quantite,
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
            const qty = rec.quantiteRecue;
            if (qty > 0) {
              updatedProducts = updatedProducts.map(p => {
                if (p.id === rec.productId) {
                  return {
                    ...p,
                    transactions: [
                      ...p.transactions,
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

        // If orders are empty, seed 1 sample cancelled order and 1 active order for easy immediate demonstration
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
        
        return { 
          products: currentProducts,
          orders: currentOrders 
        };
      })
    }),
    {
      name: 'pharmacie-stock-storage',
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;
        const products = Array.isArray(persistedState.products)
          ? (version < 2 ? persistedState.products.map((p: any) => ({ ...p, transactions: [] })) : persistedState.products)
          : [];
        const orders = Array.isArray(persistedState.orders) ? persistedState.orders : [];
        return {
          ...persistedState,
          products,
          orders
        } as AppState;
      }
    }
  )
);

export const getCurrentStock = (product: Product): number => {
  return product.transactions.reduce((acc, curr) => {
    if (curr.type === 'entree') return acc + curr.quantite;
    if (curr.type === 'sortie') return acc - curr.quantite;
    return acc;
  }, 0);
};
