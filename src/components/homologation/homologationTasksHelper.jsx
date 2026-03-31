// Helper para buscar tarefas de homologação
// Faz fallback entre homologationTasks e homologationTasksEducation

import { getDefaultTasksForProduct as getStandardTasks } from './homologationTasks';
import { getEducationTasksForProduct } from './homologationTasksEducation';
import { getArrecadacaoTasksForProduct } from './homologationTasksArrecadacao';

const homologationAliases = {
  'Minha Folha': 'Folha (Cloud)',
  'Monitor DF': 'Compras (Cloud)',
  'Obras': 'Contratos (Cloud)',
  'Patrimônio (Cloud)': 'Almoxarifado (Cloud)',
  'Pontual (Cloud)': 'Ponto (Cloud)'
};

export const getDefaultTasksForProduct = (productName) => {
  if (!productName) return null;

  const namesToTry = [productName, homologationAliases[productName]].filter(Boolean);

  for (const name of namesToTry) {
    const standardTasks = getStandardTasks(name);
    if (standardTasks) return standardTasks;

    const arrecadacaoTasks = getArrecadacaoTasksForProduct(name);
    if (arrecadacaoTasks) return arrecadacaoTasks;

    const educationTasks = getEducationTasksForProduct(name);
    if (educationTasks) return educationTasks;
  }

  return null;
};

export const productHasHomologation = (productName) => {
  return getDefaultTasksForProduct(productName) !== null;
};