// Deriva a lista de verticais de Prestação de Contas a partir dos produtos.
// Cada produto com prestacao_contas=true representa uma vertical (ex.: pessoal, contábil).
export function getPrestacaoVerticals(produtos = []) {
  const seen = new Map();
  produtos
    .filter(p => p.prestacao_contas)
    .forEach(p => {
      const key = (p.vertical || p.name || 'Geral').trim();
      if (key && !seen.has(key)) {
        seen.set(key, { key, label: key, productId: p.id, productName: p.name });
      }
    });
  return Array.from(seen.values());
}