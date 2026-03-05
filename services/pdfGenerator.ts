import { LoanDetails, CalculationResults, AmortizationRow } from '../types';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const formatCurrency = (value: number) => {
  if (typeof value !== "number" || isNaN(value)) return "N/A";
  return new Intl.NumberFormat("es-ES", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Convierte ArrayBuffer → Base64 (compatible con iOS)
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }

  return btoa(binary);
}

export const generatePdf = async (
  results: CalculationResults,
  details: LoanDetails,
  title: string
) => {
  try {
    const doc = new jsPDF();

    // --- TÍTULO ---
    doc.setFontSize(18);
    doc.text(`Resumen de Simulación de ${title}`, 14, 22);
    // Link a tu página web
doc.setFontSize(10);
doc.setTextColor(0, 102, 204); // color azul típico de enlaces
doc.textWithLink('www.labappstudio.com', 14, 28, {
  url: 'https://www.labappstudio.com'
});

// Restaurar color gris normal
doc.setTextColor(100);


    // --- TABLA DE RESUMEN ---
    const summaryBody = [
      ["Valor del Bien:", `$ ${formatCurrency(details.valorPropiedad)}`],
      ["Entrada:", `$ ${formatCurrency(details.valorPropiedad - details.montoPrestamo)}`],
      ["Monto del Préstamo:", `$ ${formatCurrency(details.montoPrestamo)}`],
      ["Plazo:", `${details.plazoAnios} años`],
      ["Tasa:", `${details.tasaInteresAnual}%`],
      ["Cuota Mensual:", `$ ${formatCurrency(results.cuotaMensual)}`],
    ];

    autoTable(doc, {
      startY: 30,
      head: [["Descripción", "Valor"]],
      body: summaryBody,
      theme: "striped",
      headStyles: { fillColor: [0, 185, 174] }
    });

    // --- TABLA DE AMORTIZACIÓN ---
    doc.addPage();
    doc.setFontSize(18);
    doc.text("Tabla de Amortización", 14, 22);

    const tableSource = results.nuevaTablaAmortizacion || results.tablaAmortizacion;

    const tableHead = [["Período", "Cuota", "Interés", "Capital", "Saldo Restante"]];
    const tableBody = tableSource.map((r: AmortizationRow) => [
      r.periodo,
      `$ ${formatCurrency(r.cuota)}`,
      `$ ${formatCurrency(r.interes)}`,
      `$ ${formatCurrency(r.capital)}`,
      `$ ${formatCurrency(r.saldoRestante)}`
    ]);

    autoTable(doc, {
      startY: 30,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [0, 185, 174] },
      styles: { fontSize: 8 },
      pageBreak: "auto" // 👈 ESTA LÍNEA ES LA CLAVE
    });

    // --- GENERAR ARCHIVO ---
    const fileName = `CrediCuotas_${Date.now()}.pdf`;
    // Agregar footer con tu web
doc.setFontSize(10);
doc.setTextColor(80);
doc.text("www.labappstudio.com", 14, doc.internal.pageSize.getHeight() - 10);
    const pdfBytes = doc.output("arraybuffer");
    const base64Data = arrayBufferToBase64(pdfBytes);

    // Guardar archivo
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    // Compartir archivo
    await Share.share({
      title: "Tu PDF",
      url: saved.uri,
      dialogTitle: "Compartir archivo",
    });

  } catch (error) {
    console.error("Error PDF:", error);
    alert("Ocurrió un error generando el PDF");
  }
};