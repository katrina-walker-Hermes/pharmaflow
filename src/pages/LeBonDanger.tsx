import { useState, useMemo, useRef } from 'react';
import { useStore, BonDangerEntry, BonDangerDocument } from '../store';
import { 
  ShieldAlert, 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileDown, 
  Paperclip, 
  X,
  ExternalLink,
  Edit2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

export default function LeBonDanger() {
  const bonDangerEntries = useStore((state) => state.bonDangerEntries) || [];
  const bonDangerDocuments = useStore((state) => state.bonDangerDocuments) || [];
  const addBonDangerEntry = useStore((state) => state.addBonDangerEntry);
  const updateBonDangerEntry = useStore((state) => state.updateBonDangerEntry);
  const deleteBonDangerEntry = useStore((state) => state.deleteBonDangerEntry);
  const addBonDangerDocument = useStore((state) => state.addBonDangerDocument);
  const deleteBonDangerDocument = useStore((state) => state.deleteBonDangerDocument);

  // Active view tab: 'registre' (table) or 'documents' (scanned physical orders)
  const [activeTab, setActiveTab] = useState<'registre' | 'documents'>('registre');

  // Filters for the main table
  const [productFilter, setProductFilter] = useState<'all' | 'Fentanyl 100 µg' | 'Fentanyl 500 µg'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reconciliationFilter, setReconciliationFilter] = useState<'all' | 'conforme' | 'non_conforme'>('all');

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<BonDangerDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteDocConfirmId, setDeleteDocConfirmId] = useState<string | null>(null);

  // Form State for Entry
  const [formProductName, setFormProductName] = useState<'Fentanyl 100 µg' | 'Fentanyl 500 µg'>('Fentanyl 100 µg');
  const [formLotNumber, setFormLotNumber] = useState('');
  const [formQuantite, setFormQuantite] = useState<number>(1);
  const [formQuantiteVideRecu, setFormQuantiteVideRecu] = useState<number>(0);
  const [formNomIAR, setFormNomIAR] = useState('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formHeure, setFormHeure] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formSalle, setFormSalle] = useState('Salle 1 (Chirurgie Générale)');
  const [formObservations, setFormObservations] = useState('');

  // Form State for Document Upload
  const [docReference, setDocReference] = useState('');
  const [docIarName, setDocIarName] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [docProductTarget, setDocProductTarget] = useState('Fentanyl 100 µg & 500 µg');
  const [docNotes, setDocNotes] = useState('');
  const [docFile, setDocFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed summary metrics
  const stats = useMemo(() => {
    let f100Delivered = 0;
    let f100EmptyReceived = 0;
    let f500Delivered = 0;
    let f500EmptyReceived = 0;
    let nonConformCount = 0;

    bonDangerEntries.forEach((e) => {
      const q = Number(e.quantite) || 0;
      const v = Number(e.quantiteVideRecu) || 0;

      if (e.productName.includes('100')) {
        f100Delivered += q;
        f100EmptyReceived += v;
      } else if (e.productName.includes('500')) {
        f500Delivered += q;
        f500EmptyReceived += v;
      }

      if (v < q) {
        nonConformCount += (q - v);
      }
    });

    return {
      f100Delivered,
      f100EmptyReceived,
      f100Missing: Math.max(0, f100Delivered - f100EmptyReceived),
      f500Delivered,
      f500EmptyReceived,
      f500Missing: Math.max(0, f500Delivered - f500EmptyReceived),
      totalMissingVides: nonConformCount,
      totalDocuments: bonDangerDocuments.length
    };
  }, [bonDangerEntries, bonDangerDocuments]);

  // Filtered entries for the main table
  const filteredEntries = useMemo(() => {
    return bonDangerEntries.filter((item) => {
      // Product filter
      if (productFilter !== 'all' && item.productName !== productFilter) {
        return false;
      }

      // Reconciliation filter
      const q = Number(item.quantite) || 0;
      const v = Number(item.quantiteVideRecu) || 0;
      const isConforme = v >= q;

      if (reconciliationFilter === 'conforme' && !isConforme) return false;
      if (reconciliationFilter === 'non_conforme' && isConforme) return false;

      // Search query (IAR name, lot number, notes, salle)
      if (searchQuery.trim()) {
        const qLower = searchQuery.toLowerCase().trim();
        const matchesIAR = item.nomIAR.toLowerCase().includes(qLower);
        const matchesLot = item.lotNumber.toLowerCase().includes(qLower);
        const matchesSalle = (item.salle || '').toLowerCase().includes(qLower);
        const matchesObs = (item.observations || '').toLowerCase().includes(qLower);
        return matchesIAR || matchesLot || matchesSalle || matchesObs;
      }

      return true;
    });
  }, [bonDangerEntries, productFilter, reconciliationFilter, searchQuery]);

  // Frequent IAR names for quick selection
  const frequentIars = [
    'IAR EL ALAOUI Mohamed',
    'IAR BENALI Fatima',
    'IAR TAZI Rachid',
    'IAR IDRISSI Amina',
    'IAR CHERKAOUI Youssef'
  ];

  // Open modal for new entry
  const openNewEntryModal = () => {
    setEditingEntryId(null);
    setFormProductName('Fentanyl 100 µg');
    setFormLotNumber('');
    setFormQuantite(1);
    setFormQuantiteVideRecu(0);
    setFormNomIAR('');
    setFormDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setFormHeure(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setFormSalle('Salle 1 (Chirurgie Générale)');
    setFormObservations('');
    setIsEntryModalOpen(true);
  };

  // Open modal for editing existing entry
  const openEditEntryModal = (entry: BonDangerEntry) => {
    setEditingEntryId(entry.id);
    setFormProductName(entry.productName as any);
    setFormLotNumber(entry.lotNumber);
    setFormQuantite(entry.quantite);
    setFormQuantiteVideRecu(entry.quantiteVideRecu);
    setFormNomIAR(entry.nomIAR);
    setFormDate(entry.date || new Date().toISOString().split('T')[0]);
    setFormHeure(entry.heure || '08:00');
    setFormSalle(entry.salle || 'Salle 1');
    setFormObservations(entry.observations || '');
    setIsEntryModalOpen(true);
  };

  // Quick reconcile: set empty returned = quantity
  const handleQuickReconcile = (entry: BonDangerEntry) => {
    updateBonDangerEntry(entry.id, {
      quantiteVideRecu: entry.quantite,
      observations: entry.observations 
        ? `${entry.observations} - Vides régularisés (${entry.quantite}/${entry.quantite})` 
        : `Vides régularisés et vérifiés le ${new Date().toLocaleDateString('fr-FR')}`
    });
  };

  // Submit Entry Form
  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNomIAR.trim() || !formLotNumber.trim()) {
      alert('Veuillez renseigner le nom de l\'IAR et le N° de lot.');
      return;
    }

    if (editingEntryId) {
      updateBonDangerEntry(editingEntryId, {
        productName: formProductName,
        lotNumber: formLotNumber.trim().toUpperCase(),
        quantite: Number(formQuantite),
        quantiteVideRecu: Number(formQuantiteVideRecu),
        nomIAR: formNomIAR.trim(),
        date: formDate,
        heure: formHeure,
        salle: formSalle,
        observations: formObservations.trim()
      });
    } else {
      addBonDangerEntry({
        productName: formProductName,
        lotNumber: formLotNumber.trim().toUpperCase(),
        quantite: Number(formQuantite),
        quantiteVideRecu: Number(formQuantiteVideRecu),
        nomIAR: formNomIAR.trim(),
        date: formDate,
        heure: formHeure,
        salle: formSalle,
        observations: formObservations.trim()
      });
    }

    setIsEntryModalOpen(false);
  };

  // Handle file selection for scanned document
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 12MB
    if (file.size > 12 * 1024 * 1024) {
      setUploadError('Le fichier est trop volumineux. La taille maximale autorisée est de 12 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setDocFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        base64
      });
      // Auto-suggest reference if empty
      if (!docReference) {
        const year = new Date().getFullYear();
        const rand = Math.floor(100 + Math.random() * 900);
        setDocReference(`BC-STUP-${year}-${rand}`);
      }
    };
    reader.onerror = () => {
      setUploadError('Erreur lors de la lecture du fichier scanné.');
    };
    reader.readAsDataURL(file);
  };

  // Submit Document Upload
  const handleDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      setUploadError('Veuillez sélectionner un fichier scanné (PDF ou Image).');
      return;
    }
    if (!docReference.trim() || !docIarName.trim()) {
      setUploadError('Veuillez renseigner la référence du bon et le nom de l\'IAR.');
      return;
    }

    addBonDangerDocument({
      date: docDate,
      reference: docReference.trim().toUpperCase(),
      iarName: docIarName.trim(),
      productTarget: docProductTarget,
      fileName: docFile.name,
      fileType: docFile.type,
      fileSize: docFile.size,
      fileData: docFile.base64,
      notes: docNotes.trim()
    });

    // Reset and close
    setDocFile(null);
    setDocReference('');
    setDocIarName('');
    setDocNotes('');
    setIsDocModalOpen(false);
  };

  // Trigger download of a scanned document
  const downloadDocument = (doc: BonDangerDocument) => {
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.fileName || `${doc.reference}_scanne.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6">
      {/* Top Warning Banner: Stupéfiant Tableau B */}
      <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-4 sm:p-5 text-rose-950 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <ShieldAlert className="w-48 h-48 text-rose-900" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-rose-600 p-2.5 text-white shadow-xs shrink-0 mt-0.5">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wider uppercase bg-rose-200 text-rose-800 px-2 py-0.5 rounded-md">
                  Réglementation Stupéfiants
                </span>
                <span className="text-xs font-bold text-rose-700">Substances Vénéneuses — Tableau B</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-rose-950 tracking-tight mt-1">
                Le Bon Danger — Fentanyl 100 µg & 500 µg
              </h1>
              <p className="text-xs sm:text-sm text-rose-800/90 mt-1 max-w-3xl leading-relaxed">
                Registre sécurisé et isolé du bloc opératoire (CHP SIDI IFNI). Traçabilité stricte : chaque ampoule délivrée à l'IAR impose la restitution obligatoire de son <strong>ampoule vide</strong> correspondante. Les <strong>bons de commande physiques scannés</strong> doivent être téléversés pour la protection médico-légale.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={openNewEntryModal}
              className="flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-800 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              Nouveau Mouvement
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDocModalOpen(true);
                setDocFile(null);
                setUploadError('');
              }}
              className="flex items-center gap-2 rounded-xl bg-white border border-rose-300 text-rose-800 px-3.5 py-2.5 text-xs font-bold shadow-2xs hover:bg-rose-100/60 active:scale-95 transition-all"
            >
              <Upload className="h-4 w-4 text-rose-600" />
              Téléverser Bon Scanné
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards / Reconciliation Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fentanyl 100 µg Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stupéfiant 1</span>
              <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                100 µg / 2ml
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">Fentanyl 100 µg</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="text-slate-500 block text-[10px]">Délivrées</span>
                <span className="font-extrabold text-slate-900 text-lg">{stats.f100Delivered}</span>
                <span className="text-[10px] text-slate-400"> ampoules</span>
              </div>
              <div className="bg-teal-50 p-2 rounded-xl">
                <span className="text-teal-700 block text-[10px]">Vides reçus</span>
                <span className="font-extrabold text-teal-800 text-lg">{stats.f100EmptyReceived}</span>
                <span className="text-[10px] text-teal-600"> restitués</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Vides manquants:</span>
            <span className={clsx("font-bold text-xs px-2 py-0.5 rounded-md", stats.f100Missing > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>
              {stats.f100Missing > 0 ? `${stats.f100Missing} en attente` : '0 (Conforme)'}
            </span>
          </div>
        </div>

        {/* Fentanyl 500 µg Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stupéfiant 2</span>
              <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                500 µg / 10ml
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">Fentanyl 500 µg</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="text-slate-500 block text-[10px]">Délivrées</span>
                <span className="font-extrabold text-slate-900 text-lg">{stats.f500Delivered}</span>
                <span className="text-[10px] text-slate-400"> ampoules</span>
              </div>
              <div className="bg-teal-50 p-2 rounded-xl">
                <span className="text-teal-700 block text-[10px]">Vides reçus</span>
                <span className="font-extrabold text-teal-800 text-lg">{stats.f500EmptyReceived}</span>
                <span className="text-[10px] text-teal-600"> restitués</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Vides manquants:</span>
            <span className={clsx("font-bold text-xs px-2 py-0.5 rounded-md", stats.f500Missing > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>
              {stats.f500Missing > 0 ? `${stats.f500Missing} en attente` : '0 (Conforme)'}
            </span>
          </div>
        </div>

        {/* Global Medico-Legal Empty Ampoule Status */}
        <div className={clsx(
          "rounded-2xl border p-4 shadow-2xs flex flex-col justify-between transition-colors",
          stats.totalMissingVides > 0 
            ? "bg-amber-50/80 border-amber-300 text-amber-950" 
            : "bg-emerald-50/80 border-emerald-300 text-emerald-950"
        )}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Audit Réglementaire</span>
              {stats.totalMissingVides > 0 ? (
                <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  À régulariser
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  100% Conforme
                </span>
              )}
            </div>
            <h3 className="text-base font-bold mt-1">Réconciliation des Vides</h3>
            <p className="text-xs mt-2 leading-relaxed">
              {stats.totalMissingVides > 0 ? (
                <span>
                  Attention : <strong>{stats.totalMissingVides} ampoule(s) vide(s)</strong> restent à récupérer auprès des IAR pour être enregistrées et éliminées selon le protocole.
                </span>
              ) : (
                <span>Toutes les ampoules pleines délivrées ont fait l'objet d'une restitution intégrale des vides correspondants. Registre à jour.</span>
              )}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold">
            <span>Écart total :</span>
            <span className={stats.totalMissingVides > 0 ? "text-amber-800" : "text-emerald-700"}>
              {stats.totalMissingVides > 0 ? `-${stats.totalMissingVides} vides` : 'Aucun écart'}
            </span>
          </div>
        </div>

        {/* Scanned Orders Section Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Protection Légale</span>
              <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Preuves papier
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">Bons Physiques Scannés</h3>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-blue-700">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">{stats.totalDocuments}</span>
                <span className="text-xs text-slate-500 block">bon(s) archivé(s)</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
            >
              <span>Accéder aux bons scannés</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Registre vs Documents */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('registre')}
            className={clsx(
              "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-all",
              activeTab === 'registre'
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Tableau de Traçabilité du Fentanyl</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {bonDangerEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={clsx(
              "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-all",
              activeTab === 'documents'
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Upload className="h-4 w-4" />
            <span>Bons de Commande Physiques Scannés (Médico-Légal)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold">
              {bonDangerDocuments.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: REGISTRE DES STUPÉFIANTS (TABLEAU EXACTEMENT DEMANDÉ) */}
      {activeTab === 'registre' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Product Filter */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setProductFilter('all')}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg transition-all",
                    productFilter === 'all' ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Tous les dosages
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('Fentanyl 100 µg')}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg transition-all",
                    productFilter === 'Fentanyl 100 µg' ? "bg-purple-600 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Fentanyl 100 µg
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('Fentanyl 500 µg')}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg transition-all",
                    productFilter === 'Fentanyl 500 µg' ? "bg-indigo-600 text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Fentanyl 500 µg
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={reconciliationFilter}
                onChange={(e) => setReconciliationFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-rose-500"
              >
                <option value="all">Tous les états de vide</option>
                <option value="non_conforme">⚠️ Vides en attente (manquants)</option>
                <option value="conforme">✓ Vides restitués (conforme)</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par IAR, lot, salle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-rose-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Main Table: Contains exact required columns: Nom de produit, N° de lot, Quantité, Quantité du vide reçu, Nom de IAR */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Date & Heure</th>
                    <th className="py-3.5 px-4">Nom de produit</th>
                    <th className="py-3.5 px-4">N° de lot</th>
                    <th className="py-3.5 px-4 text-center">Quantité (Plein)</th>
                    <th className="py-3.5 px-4 text-center">Quantité du vide reçu</th>
                    <th className="py-3.5 px-4">Nom de l'IAR</th>
                    <th className="py-3.5 px-4">Statut & Salle</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold">Aucun enregistrement ne correspond aux filtres.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Cliquez sur "Nouveau Mouvement" pour consigner une délivrance de Fentanyl.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => {
                      const q = Number(entry.quantite) || 0;
                      const v = Number(entry.quantiteVideRecu) || 0;
                      const isComplete = v >= q;
                      const missingCount = Math.max(0, q - v);

                      return (
                        <tr key={entry.id} className={clsx("hover:bg-slate-50/80 transition-colors", !isComplete && "bg-amber-50/30")}>
                          {/* Date & Time */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{entry.date}</div>
                            {entry.heure && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {entry.heure}
                              </div>
                            )}
                          </td>

                          {/* 1. Exact Column: Nom de produit */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={clsx(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black",
                              entry.productName.includes('100')
                                ? "bg-purple-100 text-purple-900 border border-purple-200"
                                : "bg-indigo-100 text-indigo-900 border border-indigo-200"
                            )}>
                              {entry.productName}
                            </span>
                          </td>

                          {/* 2. Exact Column: N° de lot */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                              {entry.lotNumber}
                            </span>
                          </td>

                          {/* 3. Exact Column: Quantité */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {q}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">amp. pleines</span>
                          </td>

                          {/* 4. Exact Column: Quantité du vide reçu */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={clsx(
                                "text-sm font-black px-2.5 py-1 rounded-lg",
                                isComplete 
                                  ? "bg-teal-100 text-teal-900 border border-teal-200" 
                                  : "bg-amber-100 text-amber-900 border border-amber-300"
                              )}>
                                {v}
                              </span>
                            </div>
                            <span className="text-[10px] block mt-0.5 font-medium">
                              {isComplete ? (
                                <span className="text-teal-700">✓ Vides reçus</span>
                              ) : (
                                <span className="text-amber-700 font-bold">⚠️ Manque {missingCount}</span>
                              )}
                            </span>
                          </td>

                          {/* 5. Exact Column: Nom de IAR */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-[10px]">
                                {entry.nomIAR.replace(/^IAR\s*/i, '').charAt(0) || 'I'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">{entry.nomIAR}</span>
                                <span className="block text-[10px] text-slate-400">Infirmier Anesthésiste</span>
                              </div>
                            </div>
                          </td>

                          {/* Statut & Details */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs">
                              {entry.salle && (
                                <span className="text-[11px] font-semibold text-slate-600 block">
                                  {entry.salle}
                                </span>
                              )}
                              {entry.observations ? (
                                <span className="text-[11px] text-slate-500 italic block mt-0.5 line-clamp-1" title={entry.observations}>
                                  {entry.observations}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Aucune observation</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isComplete && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickReconcile(entry)}
                                  title="Enregistrer la restitution immédiate de tous les vides"
                                  className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold shadow-2xs active:scale-95 transition-all"
                                >
                                  Restituer Vides
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditEntryModal(entry)}
                                title="Modifier la ligne"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(entry.id)}
                                title="Supprimer la ligne"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Total lignes affichées : {filteredEntries.length}</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 font-bold">
                  {filteredEntries.filter(e => Number(e.quantiteVideRecu) >= Number(e.quantite)).length} conformes
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-700 font-bold">
                  {filteredEntries.filter(e => Number(e.quantiteVideRecu) < Number(e.quantite)).length} en attente
                </span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900"
              >
                <FileDown className="h-3.5 w-3.5" />
                Imprimer le carnet de traçabilité
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BONS DE COMMANDE PHYSIQUES SCANNÉS (POUR PROTECTION MÉDICO-LÉGALE) */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Header of Section */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Upload className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-blue-950">
                  Archives des Bons de Commande Physiques Scannés
                </h2>
              </div>
              <p className="text-xs text-blue-800 mt-1 max-w-2xl leading-relaxed">
                Rubrique dédiée à l'archivage médico-légal des bons de commande stupéfiants physiques manuscrits et signés (PDF ou scans d'images). Ces documents constituent la preuve juridique obligatoire en cas de contrôle de la pharmacie hospitalière ou d'audit médico-légal.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsDocModalOpen(true);
                setDocFile(null);
                setUploadError('');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0"
            >
              <Upload className="h-4 w-4" />
              Téléverser un Document Scanné
            </button>
          </div>

          {/* Grid / List of Scanned Documents */}
          {bonDangerDocuments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <Upload className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Aucun bon de commande physique n'a encore été téléversé</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Prenez une photo de votre bon de commande physique ou numérisez-le au format PDF, puis téléversez-le ici pour votre protection juridique.
              </p>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Téléverser le premier bon scanné
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bonDangerDocuments.map((doc) => {
                const isPdf = doc.fileType.includes('pdf');
                const isImage = doc.fileType.includes('image');

                return (
                  <div 
                    key={doc.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Top bar of card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={clsx(
                            "rounded-xl p-2.5 shrink-0",
                            isPdf ? "bg-red-50 text-red-600 border border-red-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                          )}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 block leading-tight">
                              {doc.reference}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {doc.date} • {formatFileSize(doc.fileSize)}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {isPdf ? 'PDF' : isImage ? 'Image' : 'Document'}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="mt-3.5 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">IAR / Signataire:</span>
                          <span className="font-bold text-slate-900">{doc.iarName}</span>
                        </div>
                        {doc.productTarget && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px]">Produit:</span>
                            <span className="font-semibold text-rose-800">{doc.productTarget}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">Fichier d'origine:</span>
                          <span className="text-slate-700 truncate max-w-[150px]" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                        </div>
                        {doc.notes && (
                          <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-600 italic">
                            "{doc.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Download & Preview */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-800 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-600" />
                        Aperçu
                      </button>

                      {/* Download original scanned document */}
                      <button
                        type="button"
                        onClick={() => downloadDocument(doc)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
                        title="Télécharger le document d'origine sur votre appareil"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Télécharger
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteDocConfirmId(doc.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Supprimer l'archive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Saisie ou Édition d'un Mouvement Bon Danger */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 bg-rose-700 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-800 text-rose-100">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {editingEntryId ? 'Modifier la ligne de traçabilité' : 'Enregistrer une délivrance de Fentanyl'}
                  </h3>
                  <span className="text-xs text-rose-200">Registre "Le Bon Danger"</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEntryModalOpen(false)}
                className="text-rose-200 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEntrySubmit} className="p-6 space-y-4">
              {/* Product Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Nom de produit (Stupéfiant) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormProductName('Fentanyl 100 µg')}
                    className={clsx(
                      "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all",
                      formProductName === 'Fentanyl 100 µg'
                        ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Fentanyl 100 µg
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormProductName('Fentanyl 500 µg')}
                    className={clsx(
                      "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all",
                      formProductName === 'Fentanyl 500 µg'
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Fentanyl 500 µg
                  </button>
                </div>
              </div>

              {/* Lot number & Nom IAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. N° de lot <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: FTN-2025-A12"
                    value={formLotNumber}
                    onChange={(e) => setFormLotNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:border-rose-600 focus:ring-2 focus:ring-rose-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Nom de l'IAR <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="iars-list"
                    placeholder="Ex: IAR EL ALAOUI Mohamed"
                    value={formNomIAR}
                    onChange={(e) => setFormNomIAR(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-rose-600 focus:ring-2 focus:ring-rose-100 outline-none"
                  />
                  <datalist id="iars-list">
                    {frequentIars.map((iar) => (
                      <option key={iar} value={iar} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Quantité & Quantité du vide reçu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-rose-50/60 rounded-xl border border-rose-100">
                <div>
                  <label className="block text-xs font-black text-rose-950 mb-1">
                    4. Quantité (Délivrée / Pleine) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQuantite}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormQuantite(val);
                    }}
                    className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-100 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black text-rose-950">
                      5. Quantité du vide reçu <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormQuantiteVideRecu(formQuantite)}
                      className="text-[10px] font-bold text-teal-800 underline hover:text-teal-950"
                    >
                      Restitution totale ({formQuantite})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formQuantiteVideRecu}
                    onChange={(e) => setFormQuantiteVideRecu(Number(e.target.value))}
                    className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-100 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {formQuantiteVideRecu >= formQuantite ? (
                      <span className="text-teal-700 font-bold">✓ Équilibre complet des ampoules</span>
                    ) : (
                      <span className="text-amber-700 font-bold">
                        ⚠️ En attente de {Math.max(0, formQuantite - formQuantiteVideRecu)} ampoule(s) vide(s)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Date, Heure, Salle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Heure</label>
                  <input
                    type="time"
                    value={formHeure}
                    onChange={(e) => setFormHeure(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salle / Affectation</label>
                  <input
                    type="text"
                    value={formSalle}
                    onChange={(e) => setFormSalle(e.target.value)}
                    placeholder="Salle 1..."
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observations / N° Intervention (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Ampoules vides détruites devant témoin, intervention programmée..."
                  value={formObservations}
                  onChange={(e) => setFormObservations(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-rose-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  {editingEntryId ? 'Enregistrer les modifications' : 'Valider le mouvement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Téléversement du Bon de Commande Physique Scanné */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 bg-blue-700 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-800 text-blue-100">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Archivage d'un Bon de Commande Scanné</h3>
                  <span className="text-xs text-blue-200">Protection Médico-Légale Stupéfiants</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="text-blue-200 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDocumentSubmit} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* File picker / dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Fichier scanné du Bon Physique (PDF ou Image) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!docFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 p-6 rounded-2xl text-center cursor-pointer transition-colors"
                  >
                    <Upload className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-blue-900">
                      Cliquez pour choisir le document scanné ou prenez une photo
                    </p>
                    <p className="text-[11px] text-blue-700 mt-1">
                      Formats acceptés : PDF, PNG, JPG, JPEG (Max 12 Mo)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 text-white rounded-xl">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                          {docFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(docFile.size)} • {docFile.type}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDocFile(null)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 p-1"
                    >
                      Changer
                    </button>
                  </div>
                )}
              </div>

              {/* Reference & IAR Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Référence du bon physique <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BC-STUP-2026-003"
                    value={docReference}
                    onChange={(e) => setDocReference(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom de l'IAR signataire <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="iars-doc-list"
                    placeholder="Ex: IAR BENALI Fatima"
                    value={docIarName}
                    onChange={(e) => setDocIarName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  />
                  <datalist id="iars-doc-list">
                    {frequentIars.map((i) => (
                      <option key={i} value={i} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Date & Product target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date du bon physique</label>
                  <input
                    type="date"
                    required
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Produit concerné</label>
                  <select
                    value={docProductTarget}
                    onChange={(e) => setDocProductTarget(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none"
                  >
                    <option value="Fentanyl 100 µg & 500 µg">Fentanyl 100 µg & 500 µg</option>
                    <option value="Fentanyl 100 µg">Fentanyl 100 µg uniquement</option>
                    <option value="Fentanyl 500 µg">Fentanyl 500 µg uniquement</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mentions médico-légales / Remarques (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Bon signé avec tampon du médecin anesthésiste et de l'IAR de garde..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  Enregistrer et archiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Aperçu du Document Scanné */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl h-[88vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-3 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-teal-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
                    <span>{previewDoc.reference}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {previewDoc.fileName}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Signataire: {previewDoc.iarName} • Date: {previewDoc.date}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadDocument(previewDoc)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4">
              {previewDoc.fileType.includes('pdf') ? (
                <iframe
                  src={previewDoc.fileData}
                  title={previewDoc.reference}
                  className="w-full h-full rounded-xl border border-slate-300 bg-white shadow-xs"
                />
              ) : previewDoc.fileType.includes('image') ? (
                <img
                  src={previewDoc.fileData}
                  alt={previewDoc.reference}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-md border border-slate-300"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 max-w-sm">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-800 text-sm">Aperçu non disponible directement</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Ce type de fichier peut être téléchargé directement pour visualisation sur votre ordinateur.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadDocument(previewDoc)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Télécharger le fichier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Entry */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-full bg-rose-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Confirmer la suppression</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Êtes-vous sûr de vouloir supprimer cette ligne de traçabilité du registre "Le Bon Danger" ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBonDangerEntry(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Document */}
      {deleteDocConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-full bg-rose-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Supprimer le bon scanné</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Êtes-vous certain de vouloir supprimer cette archive scannée ? Assurez-vous de posséder une autre copie médico-légale si nécessaire.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDocConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBonDangerDocument(deleteDocConfirmId);
                  setDeleteDocConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Supprimer le document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
