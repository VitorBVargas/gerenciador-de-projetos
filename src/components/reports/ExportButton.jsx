import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ExportButton({ 
  projectName, 
  reportData, 
  type = "progress" // progress, vertical, product, kpi
}) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('Relatório de Progresso', 14, 20);
      doc.setFontSize(10);
      doc.text(projectName || 'Projeto', 14, 30);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth - 14, 30, { align: 'right' });

      let yPosition = 50;

      // KPIs Summary
      if (reportData.kpis) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text('Principais Indicadores', 14, yPosition);
        yPosition += 10;

        const kpiData = [
          ['Indicador', 'Valor', 'Tendência'],
          ...reportData.kpis.map(kpi => [
            kpi.title,
            kpi.value,
            kpi.trend ? `${kpi.trend > 0 ? '+' : ''}${kpi.trend}%` : '-'
          ])
        ];

        doc.autoTable({
          startY: yPosition,
          head: [kpiData[0]],
          body: kpiData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
        });

        yPosition = doc.lastAutoTable.finalY + 15;
      }

      // Progress by Vertical
      if (reportData.verticals && reportData.verticals.length > 0) {
        doc.setFontSize(14);
        doc.text('Progresso por Vertical', 14, yPosition);
        yPosition += 10;

        const verticalData = [
          ['Vertical', 'Tarefas Concluídas', 'Tarefas Totais', 'Progresso'],
          ...reportData.verticals.map(v => [
            v.name,
            v.completed.toString(),
            v.total.toString(),
            `${v.percentage}%`
          ])
        ];

        doc.autoTable({
          startY: yPosition,
          head: [verticalData[0]],
          body: verticalData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
        });

        yPosition = doc.lastAutoTable.finalY + 15;
      }

      // Progress by Product
      if (reportData.products && reportData.products.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text('Progresso por Produto', 14, yPosition);
        yPosition += 10;

        const productData = [
          ['Produto', 'Vertical', 'Status', 'Progresso'],
          ...reportData.products.map(p => [
            p.name,
            p.vertical,
            p.status,
            `${p.progress}%`
          ])
        ];

        doc.autoTable({
          startY: yPosition,
          head: [productData[0]],
          body: productData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
        });
      }

      // Bottlenecks
      if (reportData.bottlenecks && reportData.bottlenecks.length > 0) {
        if (doc.lastAutoTable.finalY > 250) {
          doc.addPage();
          yPosition = 20;
        } else {
          yPosition = doc.lastAutoTable.finalY + 15;
        }

        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text('Gargalos Identificados', 14, yPosition);
        yPosition += 10;

        const bottleneckData = [
          ['Área', 'Descrição', 'Impacto'],
          ...reportData.bottlenecks.map(b => [
            b.area,
            b.description,
            b.impact
          ])
        ];

        doc.autoTable({
          startY: yPosition,
          head: [bottleneckData[0]],
          body: bottleneckData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] }
        });
      }

      doc.save(`relatorio-${projectName?.toLowerCase().replace(/\s/g, '-') || 'projeto'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      let csvContent = `Relatório de Progresso - ${projectName}\n`;
      csvContent += `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n\n`;

      // KPIs
      if (reportData.kpis) {
        csvContent += 'Principais Indicadores\n';
        csvContent += 'Indicador,Valor,Tendência\n';
        reportData.kpis.forEach(kpi => {
          csvContent += `${kpi.title},${kpi.value},${kpi.trend ? `${kpi.trend}%` : '-'}\n`;
        });
        csvContent += '\n';
      }

      // Verticals
      if (reportData.verticals) {
        csvContent += 'Progresso por Vertical\n';
        csvContent += 'Vertical,Tarefas Concluídas,Tarefas Totais,Progresso\n';
        reportData.verticals.forEach(v => {
          csvContent += `${v.name},${v.completed},${v.total},${v.percentage}%\n`;
        });
        csvContent += '\n';
      }

      // Products
      if (reportData.products) {
        csvContent += 'Progresso por Produto\n';
        csvContent += 'Produto,Vertical,Status,Progresso\n';
        reportData.products.forEach(p => {
          csvContent += `${p.name},${p.vertical},${p.status},${p.progress}%\n`;
        });
        csvContent += '\n';
      }

      // Bottlenecks
      if (reportData.bottlenecks) {
        csvContent += 'Gargalos Identificados\n';
        csvContent += 'Área,Descrição,Impacto\n';
        reportData.bottlenecks.forEach(b => {
          csvContent += `${b.area},"${b.description}",${b.impact}\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-${projectName?.toLowerCase().replace(/\s/g, '-') || 'projeto'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700" disabled={exporting}>
          <Download className="w-4 h-4 mr-2" />
          {exporting ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-slate-800 border-slate-700">
        <DropdownMenuItem 
          onClick={exportToPDF}
          className="text-slate-300 hover:bg-slate-700 cursor-pointer"
        >
          <FileText className="w-4 h-4 mr-2" />
          Exportar como PDF
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={exportToCSV}
          className="text-slate-300 hover:bg-slate-700 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar como CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}