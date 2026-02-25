// Helper para exibir datas com timezone compensation
export const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '-';
  // Subtraí 1 dia para desfazer a compensação de timezone feita no save
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() - 1);
  return date.toLocaleDateString('pt-BR');
};