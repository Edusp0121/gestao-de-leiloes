export interface ChecklistEmailData {
  oportunidadeNome: string
  oportunidadeEndereco?: string
  destinatarioNome: string
  destinatarioEmail: string
  concluidoEm?: string
}

export const SMTP_DEFAULT_SENDER = {
  name: 'Dou-lhe Tres Assessoria',
  email: 'atendimento@doulhetres.com.br',
}

export function generateChecklistCompletionEmailHtml(data: ChecklistEmailData): string {
  const { oportunidadeNome, destinatarioNome, oportunidadeEndereco } = data

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ede4d8; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #5c3a21; color: #ffffff; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px;">${SMTP_DEFAULT_SENDER.name}</h1>
        <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Gestão de Leilões Imobiliários</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        <h2 style="color: #5c3a21; font-size: 18px; margin-top: 0;">Parabéns, ${destinatarioNome}!</h2>
        <p>Informamos que todas as <strong>23 etapas</strong> do Checklist Pós-Arrematação da oportunidade <strong>${oportunidadeNome}</strong> foram concluídas com sucesso!</p>
        ${oportunidadeEndereco ? `<p style="font-size: 13px; color: #7a6a5a; margin-top: -8px;">📍 ${oportunidadeEndereco}</p>` : ''}
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #166534; font-weight: bold;">✔ 100% dos marcos pós-arrematação registrados e finalizados.</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #166534;">O ciclo completo desde a arrematação, regularização documental, reforma até a venda e recebimento do saldo foi concluído.</p>
        </div>
        <p style="font-size: 14px; color: #666;">Você pode consultar o histórico detalhado, relatórios e exportar o PDF do checklist diretamente na plataforma Gestão de Leilões.</p>
      </div>
      <div style="background-color: #faf6f0; padding: 14px; text-align: center; font-size: 12px; color: #7a6a5a; border-top: 1px solid #ede4d8;">
        ${SMTP_DEFAULT_SENDER.name} • ${SMTP_DEFAULT_SENDER.email}
      </div>
    </div>
  `.trim()
}

export function getChecklistCompletionSubject(oportunidadeNome: string): string {
  return `Checklist Pós-Arrematação Concluído: ${oportunidadeNome}`
}
