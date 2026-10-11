import { useState } from 'react';
import { useStore, getCurrentStock } from '../store';
import { FileDown, X, Check, Filter, Calendar, User, Printer, AlertTriangle } from 'lucide-react';
import { generateInventoryPdf } from '../utils/exportPdf';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function ExportPdfModal({ isOpen, onClose, defaultCategory }: ExportPdfModalProps) {
  const products = useStore((state) => state.products);
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIdx]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [categoryFilter, setCategoryFilter] = useState(defaultCategory || 'all');
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [nurseName, setNurseName] = useState('Major du Bloc Opératoire');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  // Compute live preview stats for the selection
  let selectedProducts = [...products];
  if (categoryFilter !== 'all') {
    selectedProducts = selectedProducts.filter((p) => p.category === categoryFilter);
  }
  if (onlyAlerts) {
    selectedProducts = selectedProducts.filter((p) => {
      const s = getCurrentStock(p);
      return s <= p.stockSecurite || p.enRuptureHopital;
    });
  }

  const countTotal = selectedProducts.length;
  const countInStock = selectedProducts.filter((p) => getCurrentStock(p) > 0).length;
  const countZero = selectedProducts.filter((p) => getCurrentStock(p) === 0).length;
  const countAlerts = selectedProducts.filter((p) => {
    const s = getCurrentStock(p);
    return (s <= p.stockSecurite && s > 0) || p.enRuptureHopital;
  }).length;

  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      generateInventoryPdf(products, {
        monthName: selectedMonth,
        year: selectedYear,
        nurseName: nurseName.trim() || undefined,
        categoryFilter,
        onlyAlerts,
      });
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Une erreur est survenue lors de la création du document PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-teal-700 bg-teal-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-teal-200">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Export Rapport Inventaire (PDF)</h2>
              <p className="text-xs text-teal-200">Reporting mensuel pour l'équipe infirmière & pharmacie</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-teal-200 hover:bg-teal-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {downloadSuccess ? (
            <div className="py-8 text-center space-y-3 animate-in fade-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Rapport PDF téléchargé avec succès !</h3>
              <p className="text-xs text-slate-500">
                Le fichier a été enregistré sur votre poste de travail.
              </p>
            </div>
          ) : (
            <>
              {/* Month & Year Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-teal-700" />
                    Mois du reporting
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Année</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentYear)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Nurse Name / Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-teal-700" />
                  Signataire (Infirmier / Major)
                </label>
                <input
                  type="text"
                  value={nurseName}
                  onChange={(e) => setNurseName(e.target.value)}
                  placeholder="Ex: Major du Bloc, Infirmier Chef..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600"
                />
              </div>

              {/* Scope & Category Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-teal-700" />
                  Périmètre de l'inventaire
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600"
                >
                  <option value="all">Toutes les catégories ({categories.length} catégories)</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      Catégorie : {c}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={onlyAlerts}
                    onChange={(e) => setOnlyAlerts(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Exporter uniquement les alertes (Stocks bas et Ruptures hôpital)</span>
                </label>
              </div>

              {/* Live Preview Summary Box */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 space-y-2 text-xs">
                <p className="font-bold text-teal-950 flex items-center justify-between">
                  <span>Aperçu du contenu à exporter :</span>
                  <span className="text-teal-700 font-extrabold">{countTotal} références</span>
                </p>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-teal-200/60">
                  <div className="bg-white p-1.5 rounded-lg border border-teal-100">
                    <span className="block text-[10px] text-slate-500">En stock</span>
                    <span className="font-bold text-emerald-600">{countInStock}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-teal-100">
                    <span className="block text-[10px] text-slate-500">Stock zéro</span>
                    <span className="font-bold text-rose-600">{countZero}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-teal-100">
                    <span className="block text-[10px] text-slate-500">Alertes / Ruptures</span>
                    <span className="font-bold text-amber-600">{countAlerts}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-all active:scale-95 disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  {isExporting ? 'Génération du PDF...' : 'Télécharger le Rapport PDF'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
