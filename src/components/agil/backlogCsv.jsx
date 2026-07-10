// Exportação e importação simples de CSV para o backlog ágil
const COLS = ['tipo', 'titulo', 'descricao', 'produto', 'vertical', 'prioridade', 'story_points', 'status', 'responsavel', 'estimativa_horas', 'criterio_aceite', 'tags'];

function escape(v) {
  const s = v == null ? '' : String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function exportBacklogCsv(items) {
  const header = COLS.join(',');
  const rows = items.map(i => COLS.map(c => {
    if (c === 'tags') return escape((i.tags || []).join('; '));
    return escape(i[c]);
  }).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backlog_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export function parseBacklogCsv(text, projectId) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = parseLine(line);
    const obj = { project_id: projectId };
    header.forEach((h, idx) => {
      const val = cells[idx] ?? '';
      if (h === 'story_points' || h === 'estimativa_horas') obj[h] = Number(val) || 0;
      else if (h === 'tags') obj[h] = val ? val.split(';').map(t => t.trim()).filter(Boolean) : [];
      else if (COLS.includes(h)) obj[h] = val;
    });
    if (!obj.tipo) obj.tipo = 'story';
    if (!obj.status) obj.status = 'backlog';
    if (!obj.prioridade) obj.prioridade = 'media';
    return obj;
  }).filter(o => o.titulo);
}