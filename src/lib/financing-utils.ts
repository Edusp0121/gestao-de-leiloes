export interface FinancingParams {
  principal: number
  annualRate: number
  termMonths: number
  paymentsMade: number
  method: 'SAC' | 'PRICE'
  entryPercent?: number
  correcaoMensal?: number
}

export function calculateMonthlyRate(annualRate: number): number {
  const rate = annualRate > 0 ? annualRate : 8
  return rate / 100 / 12
}

export function calculateInstallment(params: FinancingParams): number {
  const {
    principal,
    annualRate = 8,
    termMonths = 120,
    paymentsMade = 0,
    method = 'PRICE',
    entryPercent = 10,
  } = params

  if (!termMonths || termMonths <= 0) return 0
  const term = termMonths
  const monthlyRate = calculateMonthlyRate(annualRate)

  // Financed principal: minus entry (default 10% entry)
  const financedPrincipal = principal > 0 ? principal * (1 - entryPercent / 100) : 91080

  if (method === 'PRICE') {
    if (monthlyRate === 0) return financedPrincipal / term
    const factor = Math.pow(1 + monthlyRate, term)
    return (financedPrincipal * (monthlyRate * factor)) / (factor - 1)
  }

  const amortization = financedPrincipal / term
  const currentSaldo = Math.max(0, financedPrincipal - amortization * paymentsMade)
  return amortization + currentSaldo * monthlyRate
}

export function calculateSaldoDevedor(params: FinancingParams): number {
  const {
    principal,
    annualRate = 8,
    termMonths = 120,
    paymentsMade = 0,
    method = 'PRICE',
    entryPercent = 10,
    correcaoMensal = 0,
  } = params

  if (!termMonths || termMonths <= 0) return 0
  const term = termMonths
  if (paymentsMade >= term) return 0

  const monthlyRate = calculateMonthlyRate(annualRate)
  const financedPrincipal = principal > 0 ? principal * (1 - entryPercent / 100) : 91080

  if (paymentsMade <= 0) {
    return financedPrincipal
  }

  const correcaoTaxa = (correcaoMensal || 0) / 100

  if (method === 'PRICE') {
    let parcela = 0
    if (monthlyRate === 0) {
      parcela = financedPrincipal / term
    } else {
      const factor = Math.pow(1 + monthlyRate, term)
      parcela = (financedPrincipal * (monthlyRate * factor)) / (factor - 1)
    }

    let saldo = financedPrincipal
    for (let m = 1; m <= paymentsMade; m++) {
      // 1. Corrigir saldo pela TR/índice de correção mensal
      saldo = saldo * (1 + correcaoTaxa)
      // 2. Calcular juros sobre saldo corrigido
      const juros = saldo * monthlyRate
      // 3. Amortização = parcela - juros
      const amortizacao = parcela - juros
      // 4. Novo saldo = saldo - amortizacao
      saldo = saldo - amortizacao
      if (saldo < 0) {
        saldo = 0
        break
      }
    }
    return Math.max(0, saldo)
  }

  // SAC
  const baseAmortizacao = financedPrincipal / term
  let saldo = financedPrincipal
  for (let m = 1; m <= paymentsMade; m++) {
    // 1. Corrigir saldo pela TR/índice de correção mensal
    saldo = saldo * (1 + correcaoTaxa)
    // 2. Amortização base no SAC
    saldo = saldo - baseAmortizacao
    if (saldo < 0) {
      saldo = 0
      break
    }
  }
  return Math.max(0, saldo)
}
