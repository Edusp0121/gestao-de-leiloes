export interface FinancingParams {
  principal: number
  annualRate: number
  termMonths: number
  paymentsMade: number
  method: 'SAC' | 'PRICE'
}

export function calculateMonthlyRate(annualRate: number): number {
  return annualRate / 100 / 12
}

export function calculateInstallment(params: FinancingParams): number {
  const { principal, annualRate, termMonths, paymentsMade, method } = params
  if (termMonths <= 0) return 0
  const monthlyRate = calculateMonthlyRate(annualRate)

  if (method === 'PRICE') {
    if (monthlyRate === 0) return principal / termMonths
    const factor = Math.pow(1 + monthlyRate, termMonths)
    return (principal * (monthlyRate * factor)) / (factor - 1)
  }

  const amortization = principal / termMonths
  const currentSaldo = Math.max(0, principal - amortization * paymentsMade)
  return amortization + currentSaldo * monthlyRate
}

export function calculateSaldoDevedor(params: FinancingParams): number {
  const { principal, annualRate, termMonths, paymentsMade, method } = params
  if (termMonths <= 0) return 0
  const monthlyRate = calculateMonthlyRate(annualRate)

  if (method === 'PRICE') {
    if (monthlyRate === 0) {
      return Math.max(0, principal * (1 - paymentsMade / termMonths))
    }
    const factor = Math.pow(1 + monthlyRate, termMonths)
    const paidFactor = Math.pow(1 + monthlyRate, paymentsMade)
    return Math.max(0, (principal * (factor - paidFactor)) / (factor - 1))
  }

  const amortization = principal / termMonths
  return Math.max(0, principal - amortization * paymentsMade)
}
