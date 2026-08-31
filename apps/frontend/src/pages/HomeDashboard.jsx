import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryItemsModal } from '../components/CategoryItemsModal';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Custom Chart.js Plugin to draw value labels above each bar with dark mode detection
const valueLabelsPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta.hidden) {
        meta.data.forEach((element, index) => {
          const val = dataset.data[index];
          if (val === undefined || val === null) return;

          ctx.save();
          ctx.font = 'bold 12px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.fillStyle = isDark ? '#f8fafc' : '#334155';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          const x = element.x;
          let y = element.y - 4;

          // Safeguard: if bar is near the top edge, render text inside bar or at top boundary
          if (y < 16) {
            y = element.y + 16;
            ctx.fillStyle = '#ffffff';
          }

          ctx.fillText(Number(val).toLocaleString(), x, y);
          ctx.restore();
        });
      }
    });
  }
};

export const HomeDashboard = () => {
  const { kpis, records, isRecordCompleted, theme, refreshDashboard, loadingDashboard } = useApp();
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(null);

  // Guarantee a fresh fetch every time this page is mounted/navigated to,
  // rather than relying solely on the one-time fetch tied to login.
  useEffect(() => {
    refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const kpiObj = kpis.kpis || kpis;
  const total = kpis.totalUnfilled ?? kpiObj.totalUnfilled ?? kpis.total ?? kpiObj.total_monitored ?? (records ? records.length : 0);
  const audited = kpis.auditedItems ?? kpiObj.auditedItems ?? kpis.audited ?? (records ? records.filter(isRecordCompleted).length : 0);
  const remaining = kpis.remainingItems ?? kpiObj.remainingItems ?? Math.max(0, total - audited);
  const percent = kpis.completionPercentage ?? kpiObj.completionPercentage ?? (total > 0 ? parseFloat(((audited / total) * 100).toFixed(1)) : 0);

  // Vacancy Aging distribution chart data
  const agingData = kpis.vacancyAgingDistribution || kpiObj.vacancyAgingDistribution || [];
  const agingLabels = agingData.length > 0 ? agingData.map(d => d.status || d.vacancy_aging_status || 'Unspecified') : ['No Data'];
  const agingCounts = agingData.length > 0 ? agingData.map(d => parseInt(d.count || 0, 10)) : [0];

  const getAgingColor = (label) => {
    const s = (label || '').toString().toLowerCase();
    if (s.includes('newly created')) return { bg: 'rgba(59, 130, 246, 0.85)', border: '#2563eb' };
    if (s.includes('long-term') || s.includes('unfilled')) return { bg: 'rgba(239, 68, 68, 0.85)', border: '#dc2626' };
    if (s.includes('extended')) return { bg: 'rgba(249, 115, 22, 0.85)', border: '#ea580c' };
    if (s.includes('new')) return { bg: 'rgba(16, 185, 129, 0.85)', border: '#059669' };
    if (s.includes('aging')) return { bg: 'rgba(139, 92, 246, 0.85)', border: '#7c3aed' };
    return { bg: 'rgba(100, 116, 139, 0.85)', border: '#475569' };
  };

  const agingBarColors = agingLabels.map(label => getAgingColor(label));

  const barChartData = {
    labels: agingLabels,
    datasets: [
      {
        label: 'Unfilled Items',
        data: agingCounts,
        backgroundColor: agingBarColors.map(c => c.bg),
        borderColor: agingBarColors.map(c => c.border),
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  const textColor = isDark ? '#cbd5e1' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.5)';
  const legendTextColor = isDark ? '#e2e8f0' : '#334155';

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 24
      }
    },
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
          font: { size: 11, family: '"Plus Jakarta Sans", system-ui, sans-serif' }
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grace: '20%',
        ticks: {
          precision: 0,
          color: textColor,
          font: { size: 11, family: '"Plus Jakarta Sans", system-ui, sans-serif' }
        },
        grid: {
          color: gridColor
        }
      }
    },
    onClick: (event, activeElements) => {
      if (!activeElements || activeElements.length === 0) return;
      const clickedIndex = activeElements[0].index;
      const labelName = agingLabels[clickedIndex];
      if (!labelName || labelName === 'No Data') return;
      setSelectedCategoryModal(labelName);
    }
  };

  // Reasons for vacancy chart data
  const reasonsData = kpis.reasonsUnfilled || kpiObj.reasonsUnfilled || [];
  const reasonsLabels = reasonsData.length > 0 ? reasonsData.map(d => d.reason || d.reason_for_vacancy || 'Unspecified') : ['No Data'];
  const reasonsCounts = reasonsData.length > 0 ? reasonsData.map(d => parseInt(d.count || 0, 10)) : [0];

  const doughnutData = {
    labels: reasonsLabels,
    datasets: [
      {
        data: reasonsCounts,
        backgroundColor: [
          '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
        ]
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          color: legendTextColor,
          font: { size: 11, family: '"Plus Jakarta Sans", system-ui, sans-serif', weight: '600' }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => refreshDashboard()}
          disabled={loadingDashboard}
          className="text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          {loadingDashboard ? 'Refreshing…' : '⟳ Refresh Data'}
        </button>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-glass p-5">
          <div className="specular-sheen"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block relative z-10">Total Unfilled Items</span>
          <strong className="text-3xl font-bold text-slate-800 dark:text-white block mt-1 relative z-10">{Number(total).toLocaleString()}</strong>
        </div>
        <div className="card-glass p-5">
          <div className="specular-sheen"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block relative z-10">Audited Items</span>
          <strong className="text-3xl font-bold text-slate-800 dark:text-white block mt-1 relative z-10">{Number(audited).toLocaleString()}</strong>
        </div>
        <div className="card-glass p-5">
          <div className="specular-sheen"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block relative z-10">Remaining Items</span>
          <strong className="text-3xl font-bold text-slate-800 dark:text-white block mt-1 relative z-10">{Number(remaining).toLocaleString()}</strong>
        </div>
        <div className="card-glass p-5">
          <div className="specular-sheen"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block relative z-10">Completion Progress</span>
          <div className="flex items-center gap-2 mt-2 relative z-10">
            <strong className="text-3xl font-bold text-slate-800 dark:text-white">{percent}%</strong>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-glass p-5">
          <div className="specular-sheen"></div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wider relative z-10">
            Vacancy Aging Distribution (Click bar to view items)
          </h3>
          <div style={{ position: 'relative', height: '260px', width: '100%' }} className="z-10">
            <Bar data={barChartData} options={barChartOptions} plugins={[valueLabelsPlugin]} />
          </div>
        </div>

        <div className="card-glass p-5">
          <div className="specular-sheen"></div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wider relative z-10">
            Reasons for Vacancy Breakdown
          </h3>
          <div style={{ position: 'relative', height: '260px', width: '100%' }} className="z-10">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Category Items Modal Drill-Down */}
      <CategoryItemsModal
        isOpen={!!selectedCategoryModal}
        onClose={() => setSelectedCategoryModal(null)}
        categoryName={selectedCategoryModal}
        records={records}
      />
    </div>
  );
};
