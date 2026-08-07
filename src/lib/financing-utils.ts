export interface FinancingParams {
  principal: number
  annualRate: number
  termMonths: number
  paymentsMade: number
  method: 'SAC' | 'PRICE'
  entryPercent?: number
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

  const term = termMonths && termMonths > 0 ? termMonths : 120
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
  } = params

  const term = termMonths && termMonths > 0 ? termMonths : 120
  if (paymentsMade >= term) return 0

  const monthlyRate = calculateMonthlyRate(annualRate)
  const financedPrincipal = principal > 0 ? principal * (1 - entryPercent / 100) : 91080

  if (method === 'PRICE') {
    if (monthlyRate === 0) {
      return Math.max(0, financedPrincipal * (1 - paymentsMade / term))
    }
    const factor = Math.pow(1 + monthlyRate, term)
    const paidFactor = Math.pow(1 + monthlyRate, paymentsMade)
    return Math.max(0, (financedPrincipal * (factor - paidFactor)) / (factor - 1))
  }

  const amortization = financedPrincipal / term
  return Math.max(0, financedPrincipal - amortization * paymentsMade)
}
