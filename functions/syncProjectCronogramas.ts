import { base44 } from '@/api/base44Client';

/**
 * Sincroniza cronogramas com TimelineEvents de um projeto
 * - Cria cronogramas baseado em eventos únicos (project_id + vertical)
 * - Vincula TimelineEvents aos cronogramas
 */
export async function syncProjectCronogramas(projectId) {
  try {
    // Buscar todos os TimelineEvents do projeto
    const timelineEvents = await base44.entities.TimelineEvent.list();
    const projectEvents = timelineEvents.filter(e => e.project_id === projectId);

    if (projectEvents.length === 0) return;

    // Agrupar eventos por vertical
    const eventosPorVertical = {};
    
    projectEvents.forEach(event => {
      const vertical = event.vertical || 'sem-vertical';
      if (!eventosPorVertical[vertical]) {
        eventosPorVertical[vertical] = [];
      }
      eventosPorVertical[vertical].push(event);
    });

    // Para cada vertical, criar/atualizar cronograma e vincular eventos
    for (const [vertical, eventos] of Object.entries(eventosPorVertical)) {
      try {
        // Buscar se cronograma já existe
        const allCronogramas = await base44.entities.Cronograma.list();
        const cronogramasExistentes = allCronogramas.filter(c => 
          c.project_id === projectId && c.vertical === vertical
        );

        let cronogramaId;

        if (cronogramasExistentes.length > 0) {
          cronogramaId = cronogramasExistentes[0].id;
        } else {
          // Criar novo cronograma
          const newCronograma = await base44.entities.Cronograma.create({
            project_id: projectId,
            vertical: vertical,
            status: 'nao_iniciado'
          });
          cronogramaId = newCronograma.id;
        }

        // Vincular todos os TimelineEvents a este cronograma
        for (const evento of eventos) {
          if (!evento.cronograma_id || evento.cronograma_id !== cronogramaId) {
            await base44.entities.TimelineEvent.update(evento.id, {
              cronograma_id: cronogramaId
            });
          }
        }

        console.log(`✓ Sincronizado cronograma: ${vertical} (${eventos.length} eventos)`);
      } catch (err) {
        console.error(`Erro ao sincronizar vertical ${vertical}:`, err);
      }
    }

    console.log(`✓ Projeto ${projectId} sincronizado com sucesso`);
  } catch (err) {
    console.error('Erro ao sincronizar cronogramas:', err);
    throw err;
  }
}

/**
 * Deleta todos os cronogramas de um projeto
 */
export async function deleteProjectCronogramas(projectId) {
  try {
    const allCronogramas = await base44.entities.Cronograma.list();
    const cronogramas = allCronogramas.filter(c => c.project_id === projectId);

    for (const cron of cronogramas) {
      await base44.entities.Cronograma.delete(cron.id);
    }

    console.log(`✓ Deletados ${cronogramas.length} cronogramas do projeto ${projectId}`);
  } catch (err) {
    console.error('Erro ao deletar cronogramas:', err);
    throw err;
  }
}

/**
 * Marca todos os cronogramas de um projeto como concluídos
 */
export async function completeProjectCronogramas(projectId) {
  try {
    const cronogramas = await base44.entities.Cronograma.filter({
      project_id: projectId
    });

    for (const cron of cronogramas) {
      await base44.entities.Cronograma.update(cron.id, {
        status: 'concluido'
      });
    }

    console.log(`✓ Marcados ${cronogramas.length} cronogramas como concluídos`);
  } catch (err) {
    console.error('Erro ao concluir cronogramas:', err);
    throw err;
  }
}