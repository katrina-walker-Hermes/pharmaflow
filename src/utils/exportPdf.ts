import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, getCurrentStock } from '../store';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface PdfExportOptions {
  monthName: string;
  year: number;
  nurseName?: string;
  categoryFilter?: string; // 'all' or specific category
  onlyAlerts?: boolean; // only low stock or ruptures
}

export function generateInventoryPdf(products: Product[], options: PdfExportOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Filter products based on options
  let filtered = [...products];

  if (options.categoryFilter && options.categoryFilter !== 'all') {
    filtered = filtered.filter((p) => p.category === options.categoryFilter);
  }

  if (options.onlyAlerts) {
    filtered = filtered.filter((p) => {
      const stock = getCurrentStock(p);
      return stock <= p.stockSecurite || p.enRuptureHopital;
    });
  }

  // Sort by Category, then product name
  filtered.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  // Compute key statistics
  const totalRefs = products.length;
  const filteredRefs = filtered.length;
  const inStockCount = filtered.filter((p) => getCurrentStock(p) > 0).length;
  const lowStockCount = filtered.filter((p) => {
    const s = getCurrentStock(p);
    return s <= p.stockSecurite && s > 0;
  }).length;
  const zeroStockCount = filtered.filter((p) => getCurrentStock(p) === 0).length;
  const hospitalRupturesCount = filtered.filter((p) => p.enRuptureHopital).length;

  const nowFormatted = format(new Date(), 'dd/MM/yyyy à HH:mm');

  // --- HEADER SECTION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('ROYAUME DU MAROC — MINISTÈRE DE LA SANTÉ', 14, 12);
  doc.text('CENTRE HOSPITALIER PROVINCIAL SIDI IFNI', 14, 16);
  doc.text('SERVICE DU BLOC OPÉRATOIRE', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.text(`Édité le : ${nowFormatted}`, 196, 12, { align: 'right' });
  doc.text(`Rapporteur : ${options.nurseName || 'Major du Bloc'}`, 196, 16, { align: 'right' });

  // Divider
  doc.setDrawColor(13, 148, 136); // Teal color
  doc.setLineWidth(0.8);
  doc.line(14, 23, 196, 23);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 76, 73); // Dark teal
  doc.text("RAPPORT MENSUEL D'INVENTAIRE DE LA PHARMACIE", 105, 31, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Période de reporting : ${options.monthName} ${options.year}`, 105, 36, { align: 'center' });

  // --- STATS SUMMARY BOX ---
  doc.setFillColor(240, 253, 250); // Light teal bg
  doc.setDrawColor(204, 251, 241);
  doc.roundedRect(14, 40, 182, 17, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 76, 73);

  const colWidth = 182 / 5;
  const yStat = 47;

  // Stat 1
  doc.text('RÉFÉRENCES', 14 + colWidth * 0.5, yStat, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${filteredRefs}`, 14 + colWidth * 0.5, yStat + 6, { align: 'center' });

  // Stat 2
  doc.setFontSize(8);
  doc.text('EN STOCK (>0)', 14 + colWidth * 1.5, yStat, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`${inStockCount}`, 14 + colWidth * 1.5, yStat + 6, { align: 'center' });

  // Stat 3
  doc.setFontSize(8);
  doc.setTextColor(217, 119, 6);
  doc.text('SOUS SÉCURITÉ', 14 + colWidth * 2.5, yStat, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${lowStockCount}`, 14 + colWidth * 2.5, yStat + 6, { align: 'center' });

  // Stat 4
  doc.setFontSize(8);
  doc.setTextColor(225, 29, 72);
  doc.text('STOCK ÉPUISÉ (0)', 14 + colWidth * 3.5, yStat, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${zeroStockCount}`, 14 + colWidth * 3.5, yStat + 6, { align: 'center' });

  // Stat 5
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28);
  doc.text('RUPTURE HÔPITAL', 14 + colWidth * 4.5, yStat, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${hospitalRupturesCount}`, 14 + colWidth * 4.5, yStat + 6, { align: 'center' });

  // --- TABLE DATA PREPARATION ---
  const tableRows = filtered.map((p) => {
    const stock = getCurrentStock(p);
    const expiringEntry = p.transactions
      .filter((t) => t.type === 'entree' && t.datePeremption)
      .sort((a, b) => new Date(a.datePeremption!).getTime() - new Date(b.datePeremption!).getTime())[0];

    let statut = 'Normal';
    if (p.enRuptureHopital) {
      statut = 'Rupture Hôpital';
    } else if (stock === 0) {
      statut = 'Stock 0';
    } else if (stock <= p.stockSecurite) {
      statut = 'Stock Bas';
    }

    const expiryStr = expiringEntry?.datePeremption
      ? format(parseISO(expiringEntry.datePeremption), 'MM/yyyy')
      : '-';

    return [
      p.category,
      p.name + (p.isImportant ? ' *' : ''),
      String(stock),
      String(p.stockSecurite),
      String(p.quantiteMoyenneMensuelle),
      expiryStr,
      statut,
    ];
  });

  autoTable(doc, {
    startY: 61,
    head: [['Catégorie', 'Désignation du Produit (* Important)', 'Stock', 'Sécurité', 'QMC', 'Péremption', 'Statut']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Teal header
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [40, 40, 40],
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 16, halign: 'right' },
      4: { cellWidth: 14, halign: 'right' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 23, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Highlight important products in red text
      if (data.column.index === 1 && data.cell.raw && String(data.cell.raw).includes('*')) {
        data.cell.styles.textColor = [220, 38, 38];
      }

      // Highlight status column
      if (data.column.index === 6) {
        const val = String(data.cell.raw || '');
        if (val.includes('Rupture Hôpital')) {
          data.cell.styles.textColor = [190, 24, 93];
          data.cell.styles.fillColor = [255, 241, 242];
        } else if (val.includes('Stock 0')) {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fillColor = [255, 241, 242];
        } else if (val.includes('Stock Bas')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 243, 199];
        } else {
          data.cell.styles.textColor = [4, 120, 87];
        }
      }
    },
    foot: [
      [
        {
          content: '* Produits surlignés identifiés comme prioritaires / vitaux pour le bloc opératoire.',
          colSpan: 7,
          styles: { fontStyle: 'italic', textColor: [100, 100, 100], fontSize: 6.5 },
        },
      ],
    ],
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = doc.getNumberOfPages();
      const currentPage = data.pageNumber;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Centre Hospitalier Provincial SIDI IFNI — Pharmacie du Bloc Opératoire | Page ${currentPage} sur ${totalPages}`,
        105,
        292,
        { align: 'center' }
      );
    },
    margin: { left: 14, right: 14, top: 20, bottom: 25 },
  });

  // Signatures on the final page
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();

  let signY = finalY;
  // If not enough room for signatures, add new page
  if (signY > pageHeight - 35) {
    doc.addPage();
    signY = 25;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);

  // Signature boxes
  doc.text("Visa & Signature de l'Infirmier Major du Bloc", 45, signY, { align: 'center' });
  doc.text('Visa & Signature du Pharmacien Responsable', 150, signY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Date : ..................................', 45, signY + 6, { align: 'center' });
  doc.text('Date : ..................................', 150, signY + 6, { align: 'center' });

  // Signature line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, signY + 18, 70, signY + 18);
  doc.line(125, signY + 18, 175, signY + 18);

  // Save the document with clean filename
  const sanitizedMonth = options.monthName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `Rapport_Inventaire_Pharmacie_Bloc_${sanitizedMonth}_${options.year}.pdf`;
  doc.save(filename);
}
