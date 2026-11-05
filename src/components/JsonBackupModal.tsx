import { useState, useRef } from 'react';
import { useStore, AppBackupData } from '../store';
import { 
  X, 
  Download, 
  Upload, 
  FileCode2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ShieldAlert, 
  ClipboardList, 
  Copy, 
  Check, 
  Database,
  ArrowRight,
  Info
} from 'lucide-react';
import { clsx } from 'clsx';
import { safeFormatDate } from '../utils/formatters';

interface JsonBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JsonBackupModal({ isOpen, onClose }: JsonBackupModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  
  // Store hooks
  const products = useStore((state) => state.products);
  const orders = useStore((state) => state.orders);
  const bonDangerEntries = useStore((state) => state.bonDangerEntries);
  const bonDangerDocuments = useStore((state) => state.bonDangerDocuments);
  const exportAllData = useStore((state) => state.exportAllData);
  const importAllData = useStore((state) => state.importAllData);

  // Export state
  const [copied, setCopied] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Compute live stats
  const totalTransactions = products.reduce((acc, p) => acc + (Array.isArray(p.transactions) ? p.transactions.length : 0), 0);
  const totalOrders = orders.length;
  const totalBonDanger = bonDangerEntries.length;
  const totalDocs = bonDangerDocuments.length;

  const handleDownloadJson = () => {
    try {
      const backup: AppBackupData = exportAllData();
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
      const fileName = `sauvegarde_pharmacie_bloc_sidi_ifni_${dateStr}_${timeStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Erreur export JSON:', err);
    }
  };

  const handleCopyJson = () => {
    try {
      const backup = exportAllData();
      navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erreur copie presse-papiers:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setParseError('Format de fichier invalide. Veuillez sélectionner un fichier au format .json.');
      setImportFile(null);
      setParsedData(null);
      return;
    }

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validation check
        let prodCount = 0;
        if (Array.isArray(parsed)) {
          prodCount = parsed.length;
        } else if (typeof parsed === 'object' && parsed !== null) {
          if (Array.isArray(parsed.products)) {
            prodCount = parsed.products.length;
          }
        }

        if (prodCount === 0 && (!parsed.orders || parsed.orders.length === 0) && (!parsed.bonDangerEntries || parsed.bonDangerEntries.length === 0)) {
          setParseError('Le fichier JSON ne contient aucune fiche de stock ou commande reconnue.');
          setParsedData(null);
          return;
        }

        setParsedData(parsed);
      } catch (err) {
        setParseError('Impossible de lire ce fichier : syntaxe JSON corrompue.');
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!parsedData) return;
    setIsProcessing(true);
    setImportResult(null);

    try {
      const res = importAllData(parsedData, importMode);
      setImportResult(res);
      if (res.success) {
        setParsedData(null);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err?.message || 'Une erreur inattendue est survenue pendant l\'importation.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Inspect preview counts in uploaded file
  const previewProductsCount = parsedData 
    ? (Array.isArray(parsedData) ? parsedData.length : Array.isArray(parsedData.products) ? parsedData.products.length : 0)
    : 0;
  const previewOrdersCount = parsedData && Array.isArray(parsedData.orders) ? parsedData.orders.length : 0;
  const previewBonDangerCount = parsedData && Array.isArray(parsedData.bonDangerEntries) ? parsedData.bonDangerEntries.length : 0;
  const previewDocsCount = parsedData && Array.isArray(parsedData.bonDangerDocuments) ? parsedData.bonDangerDocuments.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 my-8 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-teal-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-800 text-teal-200 border border-teal-700 shadow-2xs">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                Sauvegarde & Restauration des Données
              </h2>
              <p className="text-xs text-teal-200">
                Télécharger ou importer toutes les données du stock au format JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-200 hover:bg-teal-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setImportResult(null);
            }}
            className={clsx(
              "flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all",
              activeTab === 'export'
                ? "border-teal-700 bg-white text-teal-900 font-extrabold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-100/70"
            )}
          >
            <Download className="h-4 w-4" />
            <span>1. Télécharger (Exporter JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setExportSuccess(false);
            }}
            className={clsx(
              "flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all",
              activeTab === 'import'
                ? "border-teal-700 bg-white text-teal-900 font-extrabold"
                : "border-transparent hover:text-slate-900 hover:bg-slate-100/70"
            )}
          >
            <Upload className="h-4 w-4" />
            <span>2. Importer / Restaurer (JSON)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* TAB 1: EXPORT JSON */}
          {activeTab === 'export' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="rounded-xl bg-teal-50/70 border border-teal-200 p-4 text-xs text-teal-950 flex items-start gap-3">
                <Info className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Sauvegarde locale sécurisée (Format universel JSON)</p>
                  <p className="text-teal-800 leading-relaxed">
                    Le fichier généré contient l'intégralité de vos <strong>fiches de stock</strong>, les <strong>mouvements d'entrées/sorties avec numéros de lot et péremptions</strong>, l'historique complet des <strong>bons de commande</strong> ainsi que le registre <strong>Le Bon Danger</strong> (Fentanyl) et ses pièces justificatives.
                  </p>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Contenu actuel prêt à l'exportation :
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Fiches de Stock</span>
                    <span className="text-lg font-black text-slate-900 block mt-0.5">{products.length}</span>
                    <span className="text-[10px] text-slate-400">{totalTransactions} mouvements</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Bons de Commande</span>
                    <span className="text-lg font-black text-slate-900 block mt-0.5">{totalOrders}</span>
                    <span className="text-[10px] text-slate-400">Pharmacie centrale</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Le Bon Danger</span>
                    <span className="text-lg font-black text-rose-700 block mt-0.5">{totalBonDanger}</span>
                    <span className="text-[10px] text-slate-400">Lignes Fentanyl</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Bons Scannés</span>
                    <span className="text-lg font-black text-slate-900 block mt-0.5">{totalDocs}</span>
                    <span className="text-[10px] text-slate-400">Fichiers médico-légaux</span>
                  </div>
                </div>
              </div>

              {exportSuccess && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Fichier JSON téléchargé !</span>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      Votre fichier de sauvegarde est enregistré dans vos téléchargements. Conservez-le précieusement sur une clé USB ou le réseau du bloc.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                  <span>{copied ? 'JSON copié !' : 'Copier le JSON brut'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white px-5 py-2.5 text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Télécharger la Sauvegarde Complète (.json)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT JSON */}
          {activeTab === 'import' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 text-xs text-blue-950 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Restauration ou transfert de stock</p>
                  <p className="text-blue-800 leading-relaxed">
                    Importez un fichier JSON généré précédemment pour restaurer l'état de votre pharmacie sur cet appareil ou synchroniser les données d'un autre poste de travail.
                  </p>
                </div>
              </div>

              {/* File upload drop box */}
              <div className="border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-teal-50/30 transition-all cursor-pointer"
                   onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileCode2 className="mx-auto h-10 w-10 text-teal-700 mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  {importFile ? importFile.name : 'Cliquez pour sélectionner le fichier JSON'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {importFile 
                    ? `${(importFile.size / 1024).toFixed(1)} Ko - Prêt à être analysé` 
                    : 'Sélectionnez le fichier .json de sauvegarde sur votre ordinateur ou clé USB'}
                </p>
              </div>

              {/* Error Alert */}
              {parseError && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Erreur de lecture du fichier</span>
                    <p className="text-rose-800 mt-0.5">{parseError}</p>
                  </div>
                </div>
              )}

              {/* Import Result Alert */}
              {importResult && (
                <div className={clsx(
                  "rounded-xl border p-4 text-xs flex items-start gap-2.5 animate-in fade-in",
                  importResult.success ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-rose-300 bg-rose-50 text-rose-950"
                )}>
                  {importResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{importResult.success ? 'Importation réussie' : 'Échec de l\'importation'}</span>
                    <p className={clsx("mt-0.5", importResult.success ? "text-emerald-800" : "text-rose-800")}>
                      {importResult.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Validated File Preview & Import Options */}
              {parsedData && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Fichier de sauvegarde valide</span>
                    </div>
                    {parsedData.exportDate && (
                      <span className="text-[11px] text-slate-500">
                        Date d'export : {safeFormatDate(parsedData.exportDate, 'dd/MM/yyyy à HH:mm')}
                      </span>
                    )}
                  </div>

                  {/* Preview counts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Produits</span>
                      <span className="font-bold text-slate-900 text-sm">{previewProductsCount}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Commandes</span>
                      <span className="font-bold text-slate-900 text-sm">{previewOrdersCount}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Bon Danger</span>
                      <span className="font-bold text-rose-700 text-sm">{previewBonDangerCount}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Documents</span>
                      <span className="font-bold text-slate-900 text-sm">{previewDocsCount}</span>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-800">
                      Mode d'intégration des données :
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={clsx(
                        "flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                        importMode === 'replace'
                          ? "border-teal-700 bg-teal-50/50 shadow-2xs"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}>
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 text-teal-700 focus:ring-teal-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Restauration complète (Écraser)
                          </span>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Remplace les données actuelles par le contenu exact du fichier JSON. Recommandé pour restaurer une sauvegarde.
                          </span>
                        </div>
                      </label>

                      <label className={clsx(
                        "flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                        importMode === 'merge'
                          ? "border-teal-700 bg-teal-50/50 shadow-2xs"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}>
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-0.5 text-teal-700 focus:ring-teal-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Fusion intelligente (Conserver)
                          </span>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Ajoute les nouvelles références et mouvements sans effacer les produits ou commandes déjà enregistrés.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleExecuteImport}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white px-5 py-2.5 text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      <Upload className="h-4 w-4" />
                      <span>{isProcessing ? 'Importation en cours...' : 'Confirmer et appliquer l\'importation'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>Centre Hospitalier Provincial SIDI IFNI</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
