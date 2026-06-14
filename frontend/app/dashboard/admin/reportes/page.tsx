'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatPrice } from '@/lib/format';

const METODO_COLORS: Record<string, string> = { efectivo: '#374151', tarjeta: '#6b7280', qr: '#9ca3af' };

type Periodo = 'dia' | 'semana' | 'mes' | 'personalizado';

interface VentaReporte {
  venta_id: number;
  fecha_venta: string;
  subtotal: string;
  descuento: string;
  total: string;
  estado: string;
  metodo_pago: string;
  observaciones: string | null;
  numero_factura: number;
  cliente_nombre: string | null;
  usuario_nombre: string | null;
  detalle: DetalleItem[];
}

interface DetalleItem {
  producto_id: number;
  producto_codigo: string;
  producto_nombre: string;
  cantidad: number;
  tipo_venta: string;
  precio_unitario: number;
  subtotal: number;
  unidades_por_caja: number;
}

function getWeekRange(d: Date) {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { desde: start, hasta: end };
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getPeriodoLabel(periodo: Periodo, customDesde: Date, customHasta: Date) {
  if (periodo === 'dia') return `Hoy (${formatDate(new Date())})`;
  if (periodo === 'semana') {
    const r = getWeekRange(new Date());
    return `Semana del ${formatDate(r.desde)} al ${formatDate(r.hasta)}`;
  }
  if (periodo === 'mes') {
    const now = new Date();
    return `${now.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`;
  }
  return `${formatDate(customDesde)} - ${formatDate(customHasta)}`;
}

function formatStock(p: any) {
  const uds = Number(p.unidades_por_caja) || 1;
  const totalUnd = Number(p.stock_actual);
  const cajas = Math.floor(totalUnd / uds);
  const undSueltas = totalUnd % uds;
  if (undSueltas > 0) return `${cajas} caja${cajas !== 1 ? 's' : ''} | ${undSueltas} und suelta${undSueltas !== 1 ? 's' : ''}`;
  return `${cajas} caja${cajas !== 1 ? 's' : ''}`;
}

function formatStockLabel(item: DetalleItem) {
  const uds = Number(item.unidades_por_caja) || 1;
  if (item.tipo_venta === 'caja') {
    return `${item.cantidad} caja${item.cantidad !== 1 ? 's' : ''} (${item.cantidad * uds} und)`;
  }
  return `${item.cantidad} und`;
}

export default function ReportesPage() {
  const [ventas, setVentas] = useState<VentaReporte[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('dia');
  const [customDesde, setCustomDesde] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [customHasta, setCustomHasta] = useState(new Date());
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (periodo) {
      case 'dia': {
        const d = new Date(now); d.setHours(0, 0, 0, 0);
        return { desde: d, hasta: now };
      }
      case 'semana': return getWeekRange(now);
      case 'mes': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        return { desde: d, hasta: now };
      }
      case 'personalizado': return { desde: customDesde, hasta: customHasta };
    }
  }, [periodo, customDesde, customHasta]);

  const fetchReporte = useCallback(async () => {
    const { desde, hasta } = getDateRange();
    setLoading(true);
    try {
      const q = `desde=${desde.toISOString().slice(0, 10)}&hasta=${hasta.toISOString().slice(0, 10)}`;
      const [reporteRes, prodRes] = await Promise.all([
        fetch(`http://localhost:3001/api/ventas/reporte?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/productos', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (reporteRes.ok) setVentas(await reporteRes.json());
      if (prodRes.ok) setProductos(await prodRes.json());
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, token]);

  useEffect(() => {
    fetchReporte();
  }, [fetchReporte]);

  const totalVentas = ventas.length;
  const totalIngresos = ventas.reduce((s, v) => s + Number(v.total), 0);

  const ventasPorMetodo = useMemo(() =>
    Object.entries(ventas.reduce((acc: Record<string, number>, v) => {
      const m = v.metodo_pago || 'otro';
      acc[m] = (acc[m] || 0) + Number(v.total);
      return acc;
    }, {})).map(([name, value]) => ({ name, value })), [ventas]);

  const ventasPorDia = useMemo(() =>
    Object.entries(ventas.reduce((acc: Record<string, number>, v) => {
      const dia = new Date(v.fecha_venta).toLocaleDateString('es-ES');
      acc[dia] = (acc[dia] || 0) + Number(v.total);
      return acc;
    }, {})).map(([name, ventas]) => ({ name, ventas })), [ventas]);

  const productosBajoStock = useMemo(() =>
    (Array.isArray(productos) ? productos : []).filter((p: any) =>
      p.activo && Math.floor(Number(p.stock_actual) / (Number(p.unidades_por_caja) || 1)) <= 1
    ), [productos]);

  const exportExcel = async () => {
    setExporting('excel');
    try {
      const rows: any[] = [];
      for (const v of ventas) {
        for (const d of v.detalle) {
          rows.push({
            Factura: v.numero_factura,
            Fecha: formatDate(new Date(v.fecha_venta)),
            Cliente: v.cliente_nombre || '---',
            Producto: d.producto_nombre,
            Cantidad: formatStockLabel(d),
            'Precio Unit.': d.precio_unitario,
            Subtotal: formatPrice(d.subtotal),
            'Método Pago': v.metodo_pago,
            Usuario: v.usuario_nombre || '---',
            Total: formatPrice(v.total),
          });
        }
        if (v.detalle.length === 0) {
          rows.push({
            Factura: v.numero_factura,
            Fecha: formatDate(new Date(v.fecha_venta)),
            Cliente: v.cliente_nombre || '---',
            Producto: '(sin detalle)',
            Cantidad: '',
            'Precio Unit.': '',
            Subtotal: '',
            'Método Pago': v.metodo_pago,
            Usuario: v.usuario_nombre || '---',
            Total: formatPrice(v.total),
          });
        }
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
        { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      const label = getPeriodoLabel(periodo, customDesde, customHasta).replace(/[/:]/g, '-');
      XLSX.writeFile(wb, `reporte_ventas_${label}.xlsx`);
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const label = getPeriodoLabel(periodo, customDesde, customHasta);

      doc.setFontSize(16);
      doc.text('Reporte de Ventas', 14, 20);
      doc.setFontSize(10);
      doc.text(`Período: ${label}`, 14, 28);
      doc.text(`Total ventas: ${totalVentas}  |  Total ingresos: Bs ${formatPrice(totalIngresos)}`, 14, 34);

      const body = ventas.flatMap(v =>
        v.detalle.length > 0
          ? v.detalle.map(d => [
              String(v.numero_factura),
              formatDate(new Date(v.fecha_venta)),
              v.cliente_nombre || '---',
              d.producto_nombre,
              formatStockLabel(d),
              `Bs ${formatPrice(d.precio_unitario)}`,
              `Bs ${formatPrice(d.subtotal)}`,
              v.metodo_pago,
            ])
          : [[
              String(v.numero_factura),
              formatDate(new Date(v.fecha_venta)),
              v.cliente_nombre || '---',
              '(sin detalle)',
              '',
              '',
              '',
              v.metodo_pago,
            ]]
      );

      autoTable(doc, {
        startY: 40,
        head: [['Factura', 'Fecha', 'Cliente', 'Producto', 'Cantidad', 'P. Unit.', 'Subtotal', 'Pago']],
        body,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      const fileName = `reporte_ventas_${label.replace(/[/:]/g, '-')}.pdf`;
      doc.save(fileName);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de ventas y exportación</p>
        </div>
        <div className="flex items-center gap-2">
          {exporting === 'excel' && (
            <span className="text-sm text-gray-500 animate-pulse">Generando Excel...</span>
          )}
          {exporting === 'pdf' && (
            <span className="text-sm text-gray-500 animate-pulse">Generando PDF...</span>
          )}
          <button
            onClick={exportExcel}
            disabled={!!exporting || ventas.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
          <button
            onClick={exportPDF}
            disabled={!!exporting || ventas.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Período:</span>
          {(['dia', 'semana', 'mes', 'personalizado'] as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodo === p
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === 'dia' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Personalizado'}
            </button>
          ))}
          {periodo === 'personalizado' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customDesde.toISOString().slice(0, 10)}
                onChange={e => setCustomDesde(new Date(e.target.value + 'T00:00:00'))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              />
              <span className="text-gray-400">a</span>
              <input
                type="date"
                value={customHasta.toISOString().slice(0, 10)}
                onChange={e => setCustomHasta(new Date(e.target.value + 'T23:59:59'))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {getPeriodoLabel(periodo, customDesde, customHasta)}
          {!loading && ` — ${totalVentas} venta${totalVentas !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-gray-800" />
        </div>
      ) : ventas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg font-medium">No hay ventas en este período</p>
          <p className="text-sm mt-1">Prueba seleccionando otro rango de fechas</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Completadas</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">Ventas realizadas</p>
              <p className="text-3xl font-bold text-gray-900">{totalVentas}</p>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-green-50 rounded-xl">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Ingresos</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">Ingresos totales</p>
              <p className="text-3xl font-bold text-green-600">Bs {formatPrice(totalIngresos)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Ventas por día</h3>
              </div>
              {ventasPorDia.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={ventasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="ventas" fill="#374151" radius={[8, 8, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm font-medium">Sin datos para el período seleccionado</p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Ventas por método de pago</h3>
              </div>
              {ventasPorMetodo.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={ventasPorMetodo} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: Bs ${formatPrice(value)}`}>
                      {ventasPorMetodo.map((_, i) => (
                        <Cell key={i} fill={Object.values(METODO_COLORS)[i] || '#d1d5db'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <p className="text-sm font-medium">Sin datos para el período seleccionado</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 pb-3">
              <h3 className="text-lg font-semibold text-gray-900">Detalle de ventas</h3>
              <p className="text-sm text-gray-500">{totalVentas} venta(s) en el período</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">P. Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ventas.map(v =>
                    v.detalle.map((d, idx) => (
                      <tr key={`${v.venta_id}-${d.producto_id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">#{v.numero_factura}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(new Date(v.fecha_venta))}</td>
                        <td className="px-4 py-3 text-gray-700">{v.cliente_nombre || '---'}</td>
                        <td className="px-4 py-3 text-gray-800">{d.producto_nombre}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{formatStockLabel(d)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">Bs {formatPrice(d.precio_unitario)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">Bs {formatPrice(d.subtotal)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                            {v.metodo_pago}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {productosBajoStock.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-6 pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-red-50 rounded-lg">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Productos con stock bajo</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">{productosBajoStock.length} producto(s) necesitan reposición</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock actual</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ud. / caja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productosBajoStock.map((p, idx) => (
                      <tr key={p.producto_id} className="hover:bg-red-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-800">{idx + 1}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{p.nombre}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            {formatStock(p)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500 font-medium">{p.unidades_por_caja}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
