import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PharmacyOrder } from '../store';
import { format, parseISO } from 'date-fns';
import { sortProductsByCategoryAndName } from './categoryOrder';

/**
 * Downloads the Purchase Order PDF using the official Centre Hospitalier Provincial
 * Sidi Ifni template (/public/assets/aistudio/bon_de_commande_vierge_4b346f13.pdf).
 * Falls back to jsPDF synthesis if template fetch fails.
 */
export async function downloadOrderPdf(order: PharmacyOrder): Promise<void> {
  const formattedDate = (() => {
    try {
      return format(parseISO(order.dateCreation), 'dd/MM/yyyy');
    } catch {
      return format(new Date(), 'dd/MM/yyyy');
    }
  })();

  try {
    // Attempt to load the official canvas PDF from public assets
    const templateUrl = '/assets/aistudio/bon_de_commande_vierge_4b346f13.pdf';
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to load PDF canvas: ${response.statusText}`);
    }

    const templateArrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateArrayBuffer);
    
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const ROWS_PER_PAGE = 27;
    // Sort items by custom clinical category sequence, then alphabetically by product name
    const sortedRawItems = sortProductsByCategoryAndName(
      (order.items || []).map((it) => ({
        ...it,
        name: it.productName,
      }))
    );
    const items = sortedRawItems.map((it) => ({
      ...it,
      productName: it.name,
    }));
    const totalPagesNeeded = Math.max(1, Math.ceil(items.length / ROWS_PER_PAGE));

    // If more than 1 page is needed, copy template pages
    for (let p = 1; p < totalPagesNeeded; p++) {
      const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [0]);
      pdfDoc.addPage(copiedPage);
    }

    const pages = pdfDoc.getPages();

    for (let pageIdx = 0; pageIdx < totalPagesNeeded; pageIdx++) {
      const page = pages[pageIdx];
      const { height } = page.getSize(); // 792 pt

      // Date coordinate on canvas: y = 197.8 from top => in pdf-lib (bottom-up): 792 - 197.8 = 594.2
      page.drawText(formattedDate, {
        x: 122,
        y: height - 198,
        size: 9.5,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Optional Order Reference tag near top right
      page.drawText(`N° ${order.numeroCommande}`, {
        x: 420,
        y: height - 198,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      // Page numbering indicator if multiple pages
      if (totalPagesNeeded > 1) {
        page.drawText(`Page ${pageIdx + 1} / ${totalPagesNeeded}`, {
          x: 440,
          y: height - 213,
          size: 8,
          font: fontRegular,
          color: rgb(0.35, 0.35, 0.35),
        });
      }

      // Slice items for current page
      const pageItems = items.slice(pageIdx * ROWS_PER_PAGE, (pageIdx + 1) * ROWS_PER_PAGE);

      pageItems.forEach((item, rowIdx) => {
        // Table geometry derived from template:
        // Header bottom is at y=253.54 from top. Each row is 13.4 pt tall.
        // Baseline y in pdf-lib coordinate system:
        const rowTopFromPageTop = 253.54 + (rowIdx * 13.4);
        const baselineY = height - (rowTopFromPageTop + 9.5);

        // Column 1: Catégorie (x: 84.6 to 228.6)
        const categoryText = (item.category || 'Général').trim();
        const catFontSize = categoryText.length > 22 ? 6.5 : 7.5;
        page.drawText(categoryText.length > 28 ? categoryText.substring(0, 26) + '...' : categoryText, {
          x: 88,
          y: baselineY,
          size: catFontSize,
          font: fontRegular,
          color: rgb(0.25, 0.25, 0.25),
        });

        // Column 2: Désignation du Produit (x: 228.6 to 372.6)
        const prodName = (item.productName || 'Article').trim();
        const prodFontSize = prodName.length > 26 ? 6.8 : 7.5;
        page.drawText(prodName.length > 32 ? prodName.substring(0, 30) + '...' : prodName, {
          x: 232,
          y: baselineY,
          size: prodFontSize,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });

        // Column 3: Quantité Commandée (x: 372.6 to 516.6, center at 444.6)
        const qtyText = String(item.quantiteDemandee ?? 0);
        const qtyWidth = fontBold.widthOfTextAtSize(qtyText, 8.5);
        page.drawText(qtyText, {
          x: 444.6 - qtyWidth / 2,
          y: baselineY,
          size: 8.5,
          font: fontBold,
          color: rgb(0.05, 0.05, 0.05),
        });
      });
    }

    const pdfBytes = await pdfDoc.save();
    
    // Trigger download in browser
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Bon_de_Commande_${order.numeroCommande}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('Canvas PDF fetch/load fallback to jsPDF:', err);
    fallbackGenerateOrderPdf(order, formattedDate);
  }
}

/**
 * Fallback generator using jsPDF in case the static canvas file is unavailable.
 * Reproduces the exact visual layout of Centre Hospitalier Provincial de Sidi Ifni.
 */
function fallbackGenerateOrderPdf(order: PharmacyOrder, formattedDate: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter', // 612 x 792 pt
  });

  // Header Title & Hospital Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('ROYAUME DU MAROC — MINISTÈRE DE LA SANTÉ', 306, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.text('CENTRE HOSPITALIER PROVINCIAL DE SIDI IFNI', 306, 60, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text('BON DE COMMANDE MENSUELLE', 306, 95, { align: 'center' });
  doc.text('PRODUITS PHARMACEUTIQUES', 306, 112, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Date : ${formattedDate}`, 85, 145);
  doc.text(`Service : ${order.serviceDemandeur || 'Bloc Opératoire'}`, 85, 160);
  doc.text(`Réf : ${order.numeroCommande}`, 516, 145, { align: 'right' });

  const sortedItems = sortProductsByCategoryAndName(
    (order.items || []).map((it) => ({
      ...it,
      name: it.productName,
    }))
  );

  const tableData = sortedItems.map((it) => [
    it.category || 'Général',
    it.name,
    String(it.quantiteDemandee),
  ]);

  autoTable(doc, {
    startY: 175,
    margin: { left: 85, right: 95 },
    head: [['Catégorie', 'DÉSIGNATION DU PRODUIT', 'QUANTITÉ COMMANDÉE']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      lineColor: [40, 40, 40],
      lineWidth: 0.8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30],
      cellPadding: 4,
      lineColor: [70, 70, 70],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 144 },
      1: { cellWidth: 144, fontStyle: 'bold' },
      2: { cellWidth: 144, halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Dual signatures at footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text("L'Infirmier Chef du Bloc", 150, pageHeight - 65, { align: 'center' });
      doc.text('Le Pharmacien Chef', 440, pageHeight - 65, { align: 'center' });
    },
  });

  doc.save(`Bon_de_Commande_${order.numeroCommande}.pdf`);
}
