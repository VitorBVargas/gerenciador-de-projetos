// Helper para exibir datas exatamente como salvas
export const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '-';
  // Exibir a data exatamente como está no banco
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};