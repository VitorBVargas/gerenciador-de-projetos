import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Timer, Play, Pause, Square, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function GlobalTracker({ projectId, onSaved }) {
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [acoes, setAcoes] = useState('');
  const [colaborador, setColaborador] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const intervalRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem(`tracker_${projectId}`);
    if (saved) {
      const { startTime: savedStart, elapsed: savedElapsed } = JSON.parse(saved);
      setStartTime(savedStart ? new Date(savedStart) : null);
      setElapsedTime(savedElapsed || 0);
      if (savedStart) setIsActive(true);
    }
  }, [projectId]);

  useEffect(() => {
    if (startTime || elapsedTime > 0) {
      localStorage.setItem(`tracker_${projectId}`, JSON.stringify({
        startTime: startTime?.toISOString(),
        elapsed: elapsedTime
      }));
    }
  }, [startTime, elapsedTime, projectId]);

  useEffect(() => {
    if (isActive && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, startTime]);

  const handleStart = () => {
    const now = new Date();
    setStartTime(now);
    setIsActive(true);
    toast({ title: 'Cronômetro iniciado', description: 'O tempo está sendo rastreado.', duration: 5000 });
  };

  const handlePause = () => {
    setIsActive(false);
    clearInterval(intervalRef.current);
    toast({ title: 'Cronômetro pausado', description: 'O tempo foi salvo.', duration: 2000 });
  };

  const handleStop = async () => {
    setIsActive(false);
    clearInterval(intervalRef.current);
    setDescricao('');
    setAcoes('');
    // pré-preenche o colaborador com o nome do usuário logado
    try {
      const user = await base44.auth.me();
      setColaborador(user.full_name || '');
    } catch { setColaborador(''); }
    setShowSaveModal(true);
    setIsOpen(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = await base44.auth.me();
      const totalHoras = elapsedTime / 3600;
      await base44.entities.HorasLancamento.create({
        project_id: projectId,
        colaborador: colaborador || user.full_name || 'Usuário',
        user_id: user.id,
        data: new Date().toISOString().split('T')[0],
        hora_inicio: startTime?.toTimeString().slice(0, 5),
        hora_fim: new Date().toTimeString().slice(0, 5),
        total_horas: parseFloat(totalHoras.toFixed(2)),
        tipo: 'sustentacao',
        origem: 'tracker',
        descricao: descricao || 'Tempo rastreado via cronômetro global',
        observacoes: acoes,
        reference_month: new Date().toISOString().slice(0, 7)
      });
      toast({ title: 'Tempo registrado', description: `${totalHoras.toFixed(2)}h salvas com sucesso.`, duration: 5000 });
      onSaved?.();
    } catch {
      toast({ title: 'Erro ao salvar', description: 'Não foi possível registrar o tempo.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
      setShowSaveModal(false);
      setElapsedTime(0);
      setStartTime(null);
      localStorage.removeItem(`tracker_${projectId}`);
    }
  };

  const handleDiscard = () => {
    setShowSaveModal(false);
    setElapsedTime(0);
    setStartTime(null);
    localStorage.removeItem(`tracker_${projectId}`);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          size="icon"
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
          title="Cronômetro"
        >
          <Timer className="w-4 h-4 text-white" />
          {isActive && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-slate-900" />
          )}
        </Button>
      </div>

      {/* Modal do cronômetro */}
      {isOpen && (
        <Card className="fixed top-14 right-4 z-50 w-72 bg-slate-800 border-slate-700 shadow-2xl">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-white">Cronômetro</span>
              </div>
              <Button variant="ghost" size="icon" className="w-5 h-5 text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>

            <div className="text-center mb-3">
              <div className="text-2xl font-mono font-bold text-white">{formatTime(elapsedTime)}</div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isActive ? 'Em andamento...' : startTime ? 'Pausado' : 'Pronto para iniciar'}
              </p>
            </div>

            <div className="flex gap-1.5">
              {!isActive ? (
                <Button className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleStart} disabled={!projectId}>
                  <Play className="w-3 h-3 mr-1" /> Iniciar
                </Button>
              ) : (
                <Button className="flex-1 h-8 text-xs bg-yellow-600 hover:bg-yellow-700" onClick={handlePause}>
                  <Pause className="w-3 h-3 mr-1" /> Pausar
                </Button>
              )}
              <Button variant="destructive" className="flex-1 h-8 text-xs" onClick={handleStop} disabled={elapsedTime === 0}>
                <Square className="w-3 h-3 mr-1" /> Encerrar
              </Button>
            </div>

            {!projectId && (
              <p className="text-[10px] text-red-400 mt-1.5 text-center">Selecione um projeto</p>
            )}
          </div>
        </Card>
      )}

      {/* Modal de encerramento */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold text-base">Registrar Horas</h3>
            </div>
            <p className="text-slate-400 text-xs mb-4">Tempo total: <span className="text-white font-mono font-bold">{formatTime(elapsedTime)}</span></p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Colaborador <span className="text-red-400">*</span></label>
                <input
                  value={colaborador}
                  onChange={e => setColaborador(e.target.value)}
                  placeholder="Nome do colaborador..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">O que foi feito? <span className="text-red-400">*</span></label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva a atividade realizada..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Ações / Próximos passos</label>
                <textarea
                  value={acoes}
                  onChange={e => setAcoes(e.target.value)}
                  placeholder="Ações tomadas ou próximos passos (opcional)..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1 text-slate-400 hover:text-white border border-slate-700" onClick={handleDiscard}>
                Descartar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSave}
                disabled={!descricao.trim() || !colaborador.trim() || isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar Registro'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}