// services/excelGenerator.ts
import { LoanDetails, CalculationResults, AmortizationRow } from '../types';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Convierte ArrayBuffer a Base64 compatible con iOS/Android
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }

  return btoa(binary);
}

// Excel usa XLSX global cargado en index.html
declare const XLSX: any;

export const generateExcel = async (
  results: CalculationResults,
  details: LoanDetails,
  title: string
) => {
  try {
    const wb = XLSX.utils.book_new();

    // Nombre dinámico del archivo
    const creditType = title.replace('Crédito ', '').replace(' ', '_');
    const amount = Math.round(details.montoPrestamo);
    const term = `${details.plazoAnios}años`;
    const fileName = `CredicuotasApp_${creditType}_${amount}_${term}.xlsx`;

    // --- Sheet Resumen ---
    const summaryData: (string | number)[][] = [
      [`Resumen de ${title}`],
      [],
      ['Descripción', 'Valor'],
      ['Valor del Bien', details.valorPropiedad],
      ['Entrada', details.valorPropiedad - details.montoPrestamo],
      ['Préstamo', details.montoPrestamo],
      ['Plazo (años)', details.plazoAnios],
      ['Tasa (%)', details.tasaInteresAnual],
      ['Cuota Mensual', results.cuotaMensual],
      ['Total Intereses', results.totalInteres],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // --- Sheet Amortización ---
    const table = results.nuevaTablaAmortizacion || results.tablaAmortizacion;

    const tableHead = ['Período', 'Cuota', 'Interés', 'Capital', 'Saldo Restante'];

    const tableBody = table.map((r: AmortizationRow) => [
      r.periodo,
      r.cuota,
      r.interes,
      r.capital,
      r.saldoRestante,
    ]);

    const wsTable = XLSX.utils.aoa_to_sheet([tableHead, ...tableBody]);
    XLSX.utils.book_append_sheet(wb, wsTable, 'Amortización');

    // --- Generar como ArrayBuffer ---
    const excelArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Convertir a base64
    const base64Data = arrayBufferToBase64(excelArrayBuffer);

    // Guardar en Documentos
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    // Compartir con hoja nativa
    await Share.share({
      title: 'Tu Excel',
      url: saved.uri,
      dialogTitle: 'Compartir archivo',
    });

  } catch (error) {
    console.error('Error Excel:', error);
    alert('Ocurrió un error generando el Excel.');
  }
};