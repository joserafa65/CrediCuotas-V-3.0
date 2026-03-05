import { LoanDetails, AmortizationRow, FrecuenciaAbono, CalculationResults } from '../types';

const FRECUENCIA_MAP: Record<FrecuenciaAbono, number> = {
  'Una vez': -1, // Special case
  'Mensual': 1,
  'Trimestral': 3,
  'Semestral': 6,
  'Anual': 12,
};

export const calculateLoan = (details: LoanDetails): CalculationResults | null => {
  const { montoPrestamo, plazoAnios, tasaInteresAnual, incluirSeguroDesgravamen, sumarGastosLegales, porcentajeGastosLegales, financiarGastosLegales, calcularSeguroVehicular, porcentajeSeguroVehicular, sumarSeguroACuota, valorPropiedad } = details;

  if (montoPrestamo <= 0 || plazoAnios <= 0 || tasaInteresAnual <= 0) {
    return null;
  }

  const gastosLegales = sumarGastosLegales && porcentajeGastosLegales > 0 ? montoPrestamo * (porcentajeGastosLegales / 100) : 0;
  const montoFinanciado = sumarGastosLegales && financiarGastosLegales ? montoPrestamo + gastosLegales : montoPrestamo;

  const seguroVehicular = calcularSeguroVehicular && porcentajeSeguroVehicular > 0 ? valorPropiedad * (porcentajeSeguroVehicular / 100) : 0;

  const tasaMensual = tasaInteresAnual / 100 / 12;
  const numPagos = plazoAnios * 12;

  const cuotaBase = montoFinanciado * (tasaMensual * Math.pow(1 + tasaMensual, numPagos)) / (Math.pow(1 + tasaMensual, numPagos) - 1);

  if (isNaN(cuotaBase) || !isFinite(cuotaBase)) {
    return null;
  }

  const seguroMensual = incluirSeguroDesgravamen ? montoFinanciado * 0.0004 : 0;
  const seguroVehicularMensual = calcularSeguroVehicular && sumarSeguroACuota ? seguroVehicular / 12 : 0;
  const cuotaMensual = cuotaBase + seguroMensual + seguroVehicularMensual;

  let saldo = montoFinanciado;
  const tablaAmortizacion: AmortizationRow[] = [];
  let totalInteres = 0;
  let totalPagado = 0;

  for (let i = 1; i <= numPagos; i++) {
    const interes = saldo * tasaMensual;
    let capital = cuotaBase - interes;
    let cuotaActual = cuotaMensual;

    if (saldo - capital < 0.01) {
        capital = saldo;
        cuotaActual = capital + interes + seguroMensual;
    }
    
    saldo -= capital;
    totalPagado += cuotaActual;
    totalInteres += interes;

    tablaAmortizacion.push({
      periodo: i,
      cuota: cuotaActual,
      interes,
      capital,
      abonoExtra: 0,
      saldoRestante: saldo < 0.01 ? 0 : saldo,
    });

    if (saldo < 0.01) break;
  }

  const seguroVehicularTotal = calcularSeguroVehicular && !sumarSeguroACuota ? seguroVehicular : 0;
  const terminasPagando = (details.valorPropiedad - montoPrestamo) + totalPagado + (financiarGastosLegales ? 0 : gastosLegales) + seguroVehicularTotal;

  let results: CalculationResults = {
    cuotaMensual,
    totalPagado,
    totalInteres,
    tablaAmortizacion,
    terminasPagando,
    gastosLegales: gastosLegales > 0 ? gastosLegales : undefined,
    seguroVehicular: seguroVehicular > 0 ? seguroVehicular : undefined,
  };

  if (details.hacerAbonoExtra && details.montoAbonoExtra > 0) {
    let saldoExtra = montoFinanciado;
    const nuevaTabla: AmortizationRow[] = [];
    let totalPagadoExtra = 0;
    let totalInteresExtra = 0;

    if (details.tipoAbonoExtra === 'reducir_plazo') {
        let meses = 0;
        while (saldoExtra > 0.01) {
            meses++;
            const interes = saldoExtra * tasaMensual;
            let capital = cuotaBase - interes;
            
            let abonoExtraEsteMes = 0;
            const freq = FRECUENCIA_MAP[details.frecuenciaAbonoExtra];
            if ((freq === -1 && meses === 1) || (freq > 0 && meses % freq === 0)) {
                abonoExtraEsteMes = details.montoAbonoExtra;
            }

            if (saldoExtra <= capital + abonoExtraEsteMes) {
                capital = saldoExtra;
                const pagoFinal = saldoExtra + interes + seguroMensual;
                totalPagadoExtra += pagoFinal;
                totalInteresExtra += interes;
                nuevaTabla.push({ periodo: meses, cuota: pagoFinal, interes, capital, abonoExtra: 0, saldoRestante: 0 });
                saldoExtra = 0;
                break;
            }
            
            saldoExtra -= (capital + abonoExtraEsteMes);
            totalPagadoExtra += (cuotaMensual + abonoExtraEsteMes);
            totalInteresExtra += interes;

            nuevaTabla.push({ periodo: meses, cuota: cuotaMensual, interes, capital, abonoExtra: abonoExtraEsteMes, saldoRestante: saldoExtra < 0.01 ? 0 : saldoExtra });
        }
        
        return {
            ...results,
            ahorroTotal: totalPagado - totalPagadoExtra,
            mesesAhorrados: numPagos - meses,
            nuevaTablaAmortizacion: nuevaTabla,
            totalInteres: totalInteresExtra,
            terminasPagando: (details.valorPropiedad - montoPrestamo) + totalPagadoExtra + (financiarGastosLegales ? 0 : gastosLegales) + seguroVehicularTotal,
        };

    } else { // 'reducir_cuota'
        let cuotaBaseActual = cuotaBase;
        let cuotaActual = cuotaMensual;
        let primeraNuevaCuota: number | undefined = undefined;

        for (let i = 1; i <= numPagos; i++) {
            if (saldoExtra < 0.01) break;

            const interes = saldoExtra * tasaMensual;
            let capital = cuotaBaseActual - interes;

            let abonoExtraEsteMes = 0;
            const freq = FRECUENCIA_MAP[details.frecuenciaAbonoExtra];
            if ((freq === -1 && i === 1) || (freq > 0 && i % freq === 0)) {
                abonoExtraEsteMes = details.montoAbonoExtra;
            }

            if (saldoExtra <= capital + abonoExtraEsteMes) {
                capital = saldoExtra;
                const pagoFinal = saldoExtra + interes + seguroMensual;
                totalPagadoExtra += pagoFinal;
                totalInteresExtra += interes;
                nuevaTabla.push({ periodo: i, cuota: pagoFinal, interes, capital, abonoExtra: 0, saldoRestante: 0 });
                saldoExtra = 0;
                break;
            }

            saldoExtra -= (capital + abonoExtraEsteMes);
            totalPagadoExtra += (cuotaActual + abonoExtraEsteMes);
            totalInteresExtra += interes;

            nuevaTabla.push({ periodo: i, cuota: cuotaActual, interes, capital, abonoExtra: abonoExtraEsteMes, saldoRestante: saldoExtra < 0.01 ? 0 : saldoExtra });

            if (abonoExtraEsteMes > 0) {
                const pagosRestantes = numPagos - i;
                if (pagosRestantes > 0 && saldoExtra > 0) {
                    cuotaBaseActual = saldoExtra * (tasaMensual * Math.pow(1 + tasaMensual, pagosRestantes)) / (Math.pow(1 + tasaMensual, pagosRestantes) - 1);
                    if(isNaN(cuotaBaseActual) || !isFinite(cuotaBaseActual)) {
                      cuotaBaseActual = saldoExtra;
                    }
                    cuotaActual = cuotaBaseActual + seguroMensual;
                    if (!primeraNuevaCuota) {
                        primeraNuevaCuota = cuotaActual;
                    }
                }
            }
        }
        
        return {
            ...results,
            ahorroTotal: totalPagado - totalPagadoExtra,
            mesesAhorrados: 0,
            nuevaTablaAmortizacion: nuevaTabla,
            nuevaCuotaMensual: primeraNuevaCuota,
            totalInteres: totalInteresExtra,
            terminasPagando: (details.valorPropiedad - montoPrestamo) + totalPagadoExtra + (financiarGastosLegales ? 0 : gastosLegales) + seguroVehicularTotal,
        };
    }
  }

  return results;
};