import { useState } from 'react';
import { useStore, PharmacyOrder, OrderItem, getCurrentStock } from '../store';
import { 
  ClipboardList, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  AlertOctagon, 
  Clock, 
  Printer, 
  Search, 
  Eye, 
  Trash2, 
  X, 
  Check, 
  PackagePlus,
  FileDown,
  Edit3,
  Save,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { downloadOrderPdf } from '../utils/generateOrderPdf';
import { sortProductsByCategoryAndName } from '../utils/categoryOrder';

export default function Commandes() {
  const orders = useStore((state) => state.orders);
  const products = useStore((state) => state.products);
  const createOrder = useStore((state) => state.createOrder);
  const updateOrder = useStore((state) => state.updateOrder);
  const updateOrderItems = useStore((state) => state.updateOrderItems);
  const cancelOrder = useStore((state) => state.cancelOrder);
  const resumeCancelledOrder = useStore((state) => state.resumeCancelledOrder);
  const receiveOrder = useStore((state) => state.receiveOrder);
  const deleteOrder = useStore((state) => state.deleteOrder);

  const [activeTab, setActiveTab] = useState<'all' | 'en_cours' | 'annulee' | 'livree'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // Edit order items modal/mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [editProductSearch, setEditProductSearch] = useState('');

  // Delete confirmation modal state
  const [orderToDelete, setOrderToDelete] = useState<PharmacyOrder | null>(null);

  // New order form state
  const [newOrderDestinataire, setNewOrderDestinataire] = useState('Pharmacie Hospitalière Centrale');
  const [newOrderService, setNewOrderService] = useState('Service du Bloc Opératoire');
  const [newOrderComments, setNewOrderComments] = useState('');
  const [newOrderItems, setNewOrderItems] = useState<{ productId: string; quantiteDemandee: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Cancellation modal state
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelMotif, setCancelMotif] = useState('');

  // Receive modal state
  const [receiveModalOrder, setReceiveModalOrder] = useState<PharmacyOrder | null>(null);
  const [receiptInputs, setReceiptInputs] = useState<Record<string, { qty: number; expiry: string }>>({});

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesTab = activeTab === 'all' ? true : o.statut === activeTab;
    const matchesSearch = 
      o.numeroCommande.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.commentaires && o.commentaires.toLowerCase().includes(searchTerm.toLowerCase())) ||
      o.items.some((it) => it.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const cancelledOrders = orders.filter((o) => o.statut === 'annulee');
  const pendingOrders = orders.filter((o) => o.statut === 'en_cours');
  const deliveredOrders = orders.filter((o) => o.statut === 'livree');

  const triggerSuccessBanner = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 4500);
  };

  const handleResume = (orderId: string, orderNumber: string) => {
    resumeCancelledOrder(orderId);
    triggerSuccessBanner(`La commande ${orderNumber} a été reprise et réactivée avec succès !`);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, statut: 'en_cours', motifAnnulation: undefined, dateAnnulation: undefined });
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelModalOrderId) return;
    cancelOrder(cancelModalOrderId, cancelMotif || 'Annulée par le bloc opératoire');
    const orderNum = orders.find(o => o.id === cancelModalOrderId)?.numeroCommande || '';
    setCancelModalOrderId(null);
    setCancelMotif('');
    triggerSuccessBanner(`La commande ${orderNum} a été annulée.`);
    if (selectedOrder && selectedOrder.id === cancelModalOrderId) {
      setSelectedOrder({ ...selectedOrder, statut: 'annulee', motifAnnulation: cancelMotif || 'Annulée par le bloc opératoire', dateAnnulation: new Date().toISOString() });
    }
  };

  const handleConfirmDelete = () => {
    if (!orderToDelete) return;
    const num = orderToDelete.numeroCommande;
    deleteOrder(orderToDelete.id);
    if (selectedOrder?.id === orderToDelete.id) {
      setSelectedOrder(null);
      setIsEditMode(false);
    }
    setOrderToDelete(null);
    triggerSuccessBanner(`Le bon de commande ${num} a été supprimé avec succès.`);
  };

  const handleDownloadPdf = async (order: PharmacyOrder) => {
    setGeneratingPdfId(order.id);
    try {
      await downloadOrderPdf(order);
      triggerSuccessBanner(`PDF du bon ${order.numeroCommande} généré sur le canevas officiel !`);
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Une erreur est survenue lors de la création du PDF.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleStartEdit = (order: PharmacyOrder) => {
    setEditingItems(order.items.map(it => ({ ...it })));
    setIsEditMode(true);
  };

  const handleSaveEditedItems = () => {
    if (!selectedOrder) return;
    if (editingItems.length === 0) {
      alert('Le bon de commande doit contenir au moins un produit.');
      return;
    }

    const sorted = sortProductsByCategoryAndName(
      editingItems.map((it) => ({ ...it, name: it.productName }))
    ).map((it) => ({ ...it, productName: it.name }));

    updateOrderItems(selectedOrder.id, sorted);
    const updated = { ...selectedOrder, items: sorted };
    setSelectedOrder(updated);
    setIsEditMode(false);
    triggerSuccessBanner(`Les quantités du bon ${selectedOrder.numeroCommande} ont été mises à jour.`);
  };

  const handleAddAutoItems = () => {
    const needyProducts = products.filter((p) => {
      const stock = getCurrentStock(p);
      return stock <= p.stockSecurite || p.enRuptureHopital;
    });

    const sortedNeedy = sortProductsByCategoryAndName(needyProducts);

    const newItems = sortedNeedy.map((p) => {
      const neededQty = Math.max(p.quantiteMoyenneMensuelle || p.stockSecurite * 2 || 10, 5);
      return { productId: p.id, quantiteDemandee: neededQty };
    });

    setNewOrderItems(newItems);
  };

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrderItems.length === 0) {
      alert('Veuillez ajouter au moins un produit à la commande.');
      return;
    }

    const mappedItems: OrderItem[] = newOrderItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: prod ? prod.name : 'Produit inconnu',
        category: prod ? prod.category : 'Général',
        quantiteDemandee: Math.max(1, item.quantiteDemandee),
      };
    });

    const items: OrderItem[] = sortProductsByCategoryAndName(
      mappedItems.map((it) => ({ ...it, name: it.productName }))
    ).map((it) => ({ ...it, productName: it.name }));

    const newId = createOrder({
      serviceDemandeur: newOrderService,
      destinataire: newOrderDestinataire,
      commentaires: newOrderComments,
      statut: 'en_cours',
      items,
    });

    setIsCreateModalOpen(false);
    setNewOrderItems([]);
    setNewOrderComments('');
    setActiveTab('en_cours');
    triggerSuccessBanner(`Le bon de commande a été créé avec succès.`);
  };

  const handleOpenReceiveModal = (order: PharmacyOrder) => {
    const initialInputs: Record<string, { qty: number; expiry: string }> = {};
    order.items.forEach((it) => {
      initialInputs[it.productId] = {
        qty: it.quantiteDemandee,
        expiry: '',
      };
    });
    setReceiptInputs(initialInputs);
    setReceiveModalOrder(order);
  };

  const handleConfirmReceive = () => {
    if (!receiveModalOrder) return;

    const receipts = receiveModalOrder.items.map((it) => {
      const inp = receiptInputs[it.productId];
      return {
        productId: it.productId,
        quantiteRecue: inp ? Number(inp.qty) : it.quantiteDemandee,
        datePeremption: inp && inp.expiry ? new Date(inp.expiry).toISOString() : undefined,
      };
    });

    receiveOrder(receiveModalOrder.id, receipts);
    triggerSuccessBanner(`La commande ${receiveModalOrder.numeroCommande} a été réceptionnée. Les stocks ont été incrémentés.`);
    setReceiveModalOrder(null);
    if (selectedOrder && selectedOrder.id === receiveModalOrder.id) {
      setSelectedOrder({ ...selectedOrder, statut: 'livree', dateReception: new Date().toISOString() });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Bons de Commande & Réapprovisionnement</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Commandes du bloc opératoire auprès de la pharmacie centrale (Centre Hospitalier Sidi Ifni)
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewOrderItems([]);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nouveau Bon de Commande
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-900 shadow-2xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-semibold text-xs sm:text-sm">{successBanner}</span>
        </div>
      )}

      {/* Alert for Cancelled Orders with Quick Resume Action */}
      {cancelledOrders.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-rose-600 p-2.5 text-white shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                {cancelledOrders.length} commande{cancelledOrders.length > 1 ? 's' : ''} annulée{cancelledOrders.length > 1 ? 's' : ''} en attente
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Une commande annulée peut être reprise à tout moment pour la réactiver et envoyer la demande de réapprovisionnement.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cancelledOrders.slice(0, 2).map((co) => (
              <button
                key={co.id}
                type="button"
                onClick={() => handleResume(co.id, co.numeroCommande)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-800 transition-all shadow-2xs active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reprendre {co.numeroCommande}
              </button>
            ))}
            {cancelledOrders.length > 2 && (
              <button
                onClick={() => setActiveTab('annulee')}
                className="text-xs font-semibold text-rose-800 hover:underline px-2"
              >
                Voir les {cancelledOrders.length}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0",
              activeTab === 'all'
                ? "bg-teal-700 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Toutes ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('en_cours')}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0",
              activeTab === 'en_cours'
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            En cours ({pendingOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('annulee')}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0",
              activeTab === 'annulee'
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            Annulées ({cancelledOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('livree')}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0",
              activeTab === 'livree'
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Livrées ({deliveredOrders.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par n° de bon ou produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-600 outline-none"
          />
        </div>
      </div>

      {/* Orders List Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs -mx-3 sm:mx-0">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase">
                N° Bon / Date
              </th>
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase">
                Destinataire & Service
              </th>
              <th scope="col" className="px-5 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase">
                Articles
              </th>
              <th scope="col" className="px-5 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase">
                Statut
              </th>
              <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredOrders.map((order) => {
              const totalItemsCount = order.items.reduce((s, it) => s + it.quantiteDemandee, 0);
              const isDownloading = generatingPdfId === order.id;

              return (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-bold text-sm text-slate-900 block">{order.numeroCommande}</span>
                    <span className="text-xs text-slate-500">
                      {format(parseISO(order.dateCreation), 'dd/MM/yyyy à HH:mm')}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold text-slate-800 block">{order.destinataire}</span>
                    <span className="text-[11px] text-slate-500">{order.serviceDemandeur}</span>
                  </td>

                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {order.items.length} réf. ({totalItemsCount} unités)
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    {order.statut === 'annulee' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                        <AlertOctagon className="h-3 w-3" />
                        Annulée
                      </span>
                    ) : order.statut === 'en_cours' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                        <Clock className="h-3 w-3" />
                        En attente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Livrée & En stock
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* PDF DOWNLOAD BUTTON (OFFICIAL CANEVAS) */}
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleDownloadPdf(order)}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-600/30 bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs disabled:opacity-50"
                        title="Télécharger le bon au format PDF officiel (Canevas CHP Sidi Ifni)"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-700" />
                        ) : (
                          <FileDown className="h-3.5 w-3.5 text-teal-700" />
                        )}
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      {/* If Cancelled: Show RESUME BUTTON */}
                      {order.statut === 'annulee' && (
                        <button
                          type="button"
                          onClick={() => handleResume(order.id, order.numeroCommande)}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition-colors shadow-2xs"
                          title="Reprendre cette commande annulée pour la réactiver"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">Reprendre</span>
                        </button>
                      )}

                      {/* If In Progress: Show Receive button */}
                      {order.statut === 'en_cours' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenReceiveModal(order)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                            title="Réceptionner la commande (entrée en stock)"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Réception</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalOrderId(order.id);
                              setCancelMotif('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                            title="Annuler temporairement ce bon de commande"
                          >
                            Annuler
                          </button>
                        </>
                      )}

                      {/* View / Edit Details button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsEditMode(false);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        title="Consulter et modifier les quantités du bon"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Détails</span>
                      </button>

                      {/* DELETE ORDER BUTTON */}
                      <button
                        type="button"
                        onClick={() => setOrderToDelete(order)}
                        className="inline-flex items-center p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                        title="Supprimer définitivement ce bon de commande"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Aucune commande trouvée</p>
            <p className="text-xs text-slate-400 mt-1">
              Vous pouvez créer un nouveau bon de commande pour la pharmacie centrale.
            </p>
          </div>
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-100 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-teal-800 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-700 p-2 text-teal-200">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Nouveau Bon de Commande Pharmacie</h2>
                  <p className="text-xs text-teal-200">Demande d'approvisionnement pour le bloc opératoire</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-teal-200 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Demandeur</label>
                  <input
                    type="text"
                    required
                    value={newOrderService}
                    onChange={(e) => setNewOrderService(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destinataire</label>
                  <input
                    type="text"
                    required
                    value={newOrderDestinataire}
                    onChange={(e) => setNewOrderDestinataire(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Automatic import helper */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-teal-950">Approvisionnement automatique suggéré</p>
                  <p className="text-[11px] text-teal-800">
                    Ajouter automatiquement les produits en rupture ou sous le stock de sécurité.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAutoItems}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 shrink-0"
                >
                  <PackagePlus className="h-4 w-4" />
                  Importer ruptures & stocks bas
                </button>
              </div>

              {/* Items Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    Articles commandés ({newOrderItems.length})
                  </h3>
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Ajouter un produit..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-600"
                    />
                    {productSearch && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                        {products
                          .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                          .slice(0, 8)
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (!newOrderItems.some((it) => it.productId === p.id)) {
                                  setNewOrderItems([
                                    ...newOrderItems,
                                    { productId: p.id, quantiteDemandee: p.quantiteMoyenneMensuelle || 10 },
                                  ]);
                                }
                                setProductSearch('');
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 border-b border-slate-100 flex justify-between items-center"
                            >
                              <span className="font-medium text-slate-800">{p.name}</span>
                              <span className="text-[10px] text-slate-400">{p.category}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Produit</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Catégorie</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 w-32">Quantité</th>
                        <th className="px-4 py-2.5 text-center font-semibold text-slate-600 w-16">Suppr.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {newOrderItems.map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId);
                        return (
                          <tr key={item.productId}>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{prod?.name}</td>
                            <td className="px-4 py-2.5 text-slate-500">{prod?.category}</td>
                            <td className="px-4 py-2.5 text-right">
                              <input
                                type="number"
                                min="1"
                                value={item.quantiteDemandee}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  const updated = [...newOrderItems];
                                  updated[idx].quantiteDemandee = val;
                                  setNewOrderItems(updated);
                                }}
                                className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs font-semibold text-slate-900 focus:border-teal-600 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setNewOrderItems(newOrderItems.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {newOrderItems.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                            Aucun produit sélectionné. Utilisez la recherche ci-dessus ou l'import automatique.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commentaires / Urgence</label>
                <textarea
                  rows={2}
                  placeholder="Notes, urgence opératoire, justification..."
                  value={newOrderComments}
                  onChange={(e) => setNewOrderComments(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800 shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Valider et Enregistrer le Bon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL / QUANTITY MODIFICATION & OFFICIAL CANEVAS PDF */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-100 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-teal-700 p-2 text-white">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Bon de Commande Officiel
                  </span>
                  <h2 className="text-lg font-black text-slate-900">{selectedOrder.numeroCommande}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* PDF Download Button with official template */}
                <button
                  type="button"
                  disabled={generatingPdfId === selectedOrder.id}
                  onClick={() => handleDownloadPdf(selectedOrder)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 shadow-2xs transition-colors disabled:opacity-50"
                  title="Télécharger le document PDF conforme au canevas Sidi Ifni"
                >
                  {generatingPdfId === selectedOrder.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  <span>Télécharger PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  title="Imprimer"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    setIsEditMode(false);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content formatted like Official Hospital Order */}
            <div className="p-6 space-y-6">
              {/* Header Box */}
              <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-900">Royaume du Maroc — Ministère de la Santé</p>
                  <p className="font-semibold text-slate-800">Centre Hospitalier Provincial SIDI IFNI</p>
                  <p className="text-slate-600 mt-1">Service Demandeur : <strong className="text-slate-900">{selectedOrder.serviceDemandeur}</strong></p>
                  <p className="text-slate-600">Destinataire : <strong className="text-slate-900">{selectedOrder.destinataire}</strong></p>
                </div>
                <div className="sm:text-right">
                  <p className="text-slate-500">Date d'émission :</p>
                  <p className="font-bold text-slate-900">{format(parseISO(selectedOrder.dateCreation), 'dd/MM/yyyy HH:mm')}</p>
                  <div className="mt-2">
                    <span className={clsx(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
                      selectedOrder.statut === 'annulee' ? "bg-rose-100 text-rose-800" : selectedOrder.statut === 'en_cours' ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                    )}>
                      Statut : {selectedOrder.statut === 'annulee' ? 'Annulée' : selectedOrder.statut === 'en_cours' ? 'En cours' : 'Livrée'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status banner with RESUME BUTTON if cancelled */}
              {selectedOrder.statut === 'annulee' && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                      <AlertOctagon className="h-4 w-4 text-rose-600" />
                      Cette commande a été annulée
                    </h4>
                    <p className="text-xs text-rose-800 mt-0.5">
                      Motif : {selectedOrder.motifAnnulation || 'Non spécifié'}
                    </p>
                    {selectedOrder.dateAnnulation && (
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        Annulée le {format(parseISO(selectedOrder.dateAnnulation), 'dd/MM/yyyy à HH:mm')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResume(selectedOrder.id, selectedOrder.numeroCommande)}
                    className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-xs shrink-0 active:scale-95"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reprendre la commande annulée
                  </button>
                </div>
              )}

              {/* ACTION BAR: Quantity Edit Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-teal-50/70 border border-teal-200/80 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-teal-700" />
                  <span className="text-xs font-bold text-teal-950">
                    Articles & Quantités commandées ({isEditMode ? editingItems.length : selectedOrder.items.length})
                  </span>
                </div>

                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(selectedOrder)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-teal-700 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-50 shadow-2xs active:scale-95"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Modifier les quantités du bon
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white/80"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditedItems}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 shadow-2xs active:scale-95"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Enregistrer les modifications
                    </button>
                  </div>
                )}
              </div>

              {/* Search to add products while in edit mode */}
              {isEditMode && (
                <div className="relative border border-teal-200 rounded-xl p-3 bg-white space-y-2">
                  <label className="block text-xs font-bold text-teal-900">
                    Ajouter un autre médicament au bon :
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom de médicament..."
                      value={editProductSearch}
                      onChange={(e) => setEditProductSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-600"
                    />
                  </div>

                  {editProductSearch && (
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg shadow-md divide-y divide-slate-100 bg-white">
                      {products
                        .filter((p) => p.name.toLowerCase().includes(editProductSearch.toLowerCase()))
                        .slice(0, 6)
                        .map((prod) => (
                          <div
                            key={prod.id}
                            className="flex items-center justify-between p-2 text-xs hover:bg-teal-50"
                          >
                            <div>
                              <span className="font-semibold text-slate-800">{prod.name}</span>
                              <span className="text-[10px] text-slate-400 ml-2">{prod.category}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingItems.some((it) => it.productId === prod.id)) {
                                  setEditingItems([
                                    ...editingItems,
                                    {
                                      productId: prod.id,
                                      productName: prod.name,
                                      category: prod.category,
                                      quantiteDemandee: prod.quantiteMoyenneMensuelle || 10,
                                    },
                                  ]);
                                }
                                setEditProductSearch('');
                              }}
                              className="rounded bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-800"
                            >
                              + Ajouter
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Désignation du Médicament / Produit</th>
                      <th className="px-4 py-3 text-left">Catégorie</th>
                      <th className="px-4 py-3 text-right">Quantité Demandée</th>
                      <th className="px-4 py-3 text-right">Quantité Reçue</th>
                      {isEditMode && <th className="px-3 py-3 text-center w-12">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {(!isEditMode ? selectedOrder.items : editingItems).map((it, idx) => (
                      <tr key={it.productId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{it.productName}</td>
                        <td className="px-4 py-3 text-slate-500">{it.category}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {isEditMode ? (
                            <input
                              type="number"
                              min="1"
                              value={it.quantiteDemandee}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                const updated = [...editingItems];
                                updated[idx].quantiteDemandee = val;
                                setEditingItems(updated);
                              }}
                              className="w-20 rounded border border-teal-500 px-2 py-1 text-right text-xs font-bold text-slate-900 bg-teal-50/40 focus:bg-white outline-none"
                            />
                          ) : (
                            <span className="text-sm font-black text-slate-900">{it.quantiteDemandee}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-teal-700">
                          {selectedOrder.statut === 'livree' ? (it.quantiteRecue ?? it.quantiteDemandee) : '-'}
                        </td>
                        {isEditMode && (
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setEditingItems(editingItems.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Retirer ce produit"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOrder.commentaires && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-0.5">Commentaires & Remarques :</span>
                  {selectedOrder.commentaires}
                </div>
              )}

              {/* Dual signature lines for official print */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs text-slate-600">
                <div>
                  <p className="font-bold text-slate-800">L'Infirmier Chef du Bloc</p>
                  <p className="text-[11px] text-slate-400 mt-8">....................................................</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800">Le Pharmacien Chef</p>
                  <p className="text-[11px] text-slate-400 mt-8">....................................................</p>
                </div>
              </div>

              {/* Modal footer actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                {/* Delete button from modal */}
                <button
                  type="button"
                  onClick={() => setOrderToDelete(selectedOrder)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                  Supprimer ce bon
                </button>

                <div className="flex items-center gap-2">
                  {selectedOrder.statut === 'en_cours' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenReceiveModal(selectedOrder);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Check className="h-4 w-4" />
                      Réceptionner (Entrée en stock)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(null);
                      setIsEditMode(false);
                    }}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Supprimer le bon de commande
                </h3>
                <p className="text-xs font-semibold text-rose-700 mt-0.5">
                  {orderToDelete.numeroCommande}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement ce bon de commande contenant <strong>{orderToDelete.items.length} articles</strong> ?
              <br />
              <span className="text-rose-700 font-semibold block mt-1">
                Cette action est irréversible. Les fiches de stock actuelles ne seront pas altérées.
              </span>
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Annuler le bon de commande</h3>
            <p className="text-xs text-slate-600 mb-4">
              Veuillez indiquer le motif d'annulation. Vous pourrez reprendre cette commande annulée à tout moment.
            </p>
            <textarea
              rows={3}
              placeholder="Ex: Erreur de saisie, retard livraison, rupture centrale..."
              value={cancelMotif}
              onChange={(e) => setCancelMotif(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-rose-600 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalOrderId(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE MODAL */}
      {receiveModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Réception de la commande {receiveModalOrder.numeroCommande}
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Vérifiez les quantités reçues et indiquez les dates de péremption des lots pour l'entrée automatique en stock.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-5 max-h-72 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Produit</th>
                    <th className="px-3 py-2 text-center w-24">Qté Demandée</th>
                    <th className="px-3 py-2 text-center w-28">Qté Reçue</th>
                    <th className="px-3 py-2 text-center w-36">Péremption</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiveModalOrder.items.map((it) => {
                    const inp = receiptInputs[it.productId] || { qty: it.quantiteDemandee, expiry: '' };
                    return (
                      <tr key={it.productId}>
                        <td className="px-3 py-2 font-medium text-slate-800">{it.productName}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{it.quantiteDemandee}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={inp.qty}
                            onChange={(e) => {
                              setReceiptInputs({
                                ...receiptInputs,
                                [it.productId]: { ...inp, qty: parseInt(e.target.value) || 0 },
                              });
                            }}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-center font-bold text-slate-900 outline-none focus:border-teal-600"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="date"
                            value={inp.expiry}
                            onChange={(e) => {
                              setReceiptInputs({
                                ...receiptInputs,
                                [it.productId]: { ...inp, expiry: e.target.value },
                              });
                            }}
                            className="rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-teal-600"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setReceiveModalOrder(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
              >
                Valider l'entrée en stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
