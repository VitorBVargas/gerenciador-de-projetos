export function getAvailableEntities(savedEntities = [], products = []) {
  const orderedSaved = [...savedEntities].sort((a, b) => {
    const orderDiff = (a.ordem ?? 999) - (b.ordem ?? 999);
    if (orderDiff !== 0) return orderDiff;
    return (a.nome || '').localeCompare(b.nome || '');
  });

  if (orderedSaved.length > 0) return orderedSaved;

  const seen = new Map();
  products
    .filter(product => product.prestacao_contas)
    .forEach((product, index) => {
      const nome = product.entity || product.entity_full_name || product.name;
      if (!nome) return;
      const nomeCompleto = product.entity_full_name || product.entity || product.name;
      const key = `${nome}-${nomeCompleto}`;
      if (!seen.has(key)) {
        seen.set(key, {
          id: `fallback-${index}`,
          nome,
          nome_completo: nomeCompleto,
          ordem: index,
          is_fallback: true,
        });
      }
    });

  return Array.from(seen.values());
}

export function entityMatchesObligation(obrigacao, entity, allEntities = []) {
  if (!entity) return true;
  if (obrigacao.entity_id) return obrigacao.entity_id === entity.id;
  if (obrigacao.entity_name) {
    return obrigacao.entity_name === entity.nome || obrigacao.entity_name === entity.nome_completo;
  }
  const firstEntity = allEntities[0];
  return !obrigacao.entity_id && !obrigacao.entity_name && firstEntity?.id === entity.id;
}