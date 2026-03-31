// Helper para buscar tarefas de homologação
// Faz fallback entre homologationTasks e homologationTasksEducation

import { getDefaultTasksForProduct as getStandardTasks } from './homologationTasks';
import { getEducationTasksForProduct } from './homologationTasksEducation';
import { getArrecadacaoTasksForProduct } from './homologationTasksArrecadacao';

export const getDefaultTasksForProduct = (productName) => {
  if (!productName) return null;
  
  // Tenta primeiro em homologationTasks (padrão)
  const standardTasks = getStandardTasks(productName);
  if (standardTasks) return standardTasks;
  
  // Tenta em homologationTasksArrecadacao
  const arrecadacaoTasks = getArrecadacaoTasksForProduct(productName);
  if (arrecadacaoTasks) return arrecadacaoTasks;
  
  // Se não encontrou, tenta em homologationTasksEducation
  const educationTasks = getEducationTasksForProduct(productName);
  if (educationTasks) return educationTasks;
  
  return null;
};

export const productHasHomologation = (productName) => {
  return getDefaultTasksForProduct(productName) !== null;
};