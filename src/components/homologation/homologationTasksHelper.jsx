// Helper para buscar tarefas de homologação
// Faz fallback entre homologationTasks e homologationTasksEducation

import { getDefaultTasksForProduct as getStandardTasks } from './homologationTasks';
import { getEducationTasksForProduct } from './homologationTasksEducation';

export const getDefaultTasksForProduct = (productName) => {
  if (!productName) return null;
  
  // Tenta primeiro em homologationTasks (padrão)
  const standardTasks = getStandardTasks(productName);
  if (standardTasks) return standardTasks;
  
  // Se não encontrou, tenta em homologationTasksEducation
  const educationTasks = getEducationTasksForProduct(productName);
  if (educationTasks) return educationTasks;
  
  return null;
};

export const productHasHomologation = (productName) => {
  return getDefaultTasksForProduct(productName) !== null;
};