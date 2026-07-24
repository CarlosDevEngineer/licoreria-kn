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

interface CompraReporte {
  compra_id: number;
  fecha_compra: string;
  numero_factura: string;
  subtotal: string;
  total: string;
  estado: string;
  observaciones: string | null;
  proveedor_nombre: string | null;
  detalle: CompraDetalleItem[];
}

interface CompraDetalleItem {
  producto_id: number;
  producto_nombre: string;
  producto_codigo: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
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

interface MovimientoInventario {
  movimiento_id: number;
  producto_id: number;
  tipo_movimiento: string;
  cantidad: number;
  saldo_anterior: number;
  saldo_posterior: number;
  observaciones: string | null;
  fecha_movimiento: string;
  usuario_id: number | null;
  producto_nombre: string | null;
  producto_codigo: string | null;
  costo_unitario_actual: number | null;
  unidades_por_caja: number | null;
  usuario_nombre: string | null;
}

interface StockHistorialItem {
  producto_id: number;
  producto_nombre: string;
  producto_codigo: string;
  unidades_por_caja: number;
  dias: Record<string, number>;
}

export default function ReportesPage() {
  const [tab, setTab] = useState<'ventas' | 'compras' | 'stock'>('ventas');
  const [ventas, setVentas] = useState<VentaReporte[]>([]);
  const [compras, setCompras] = useState<CompraReporte[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [stockHistorial, setStockHistorial] = useState<StockHistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('dia');
  const [customDesde, setCustomDesde] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [customHasta, setCustomHasta] = useState(new Date());
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('todos');
  const [pageVentas, setPageVentas] = useState(1);
  const [pageStock, setPageStock] = useState(1);
  const [pageCompras, setPageCompras] = useState(1);
  const [pageMovimientos, setPageMovimientos] = useState(1);
  const [pageArqueo, setPageArqueo] = useState(1);
  const [busquedaArqueo, setBusquedaArqueo] = useState('');

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
      const [reporteRes, comprasRes, prodRes, movRes, stockHistRes] = await Promise.all([
        fetch(`/api/ventas/reporte?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/compras/reporte?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/productos', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/inventario/movimientos?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/inventario/stock-historial?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (reporteRes.ok) setVentas(await reporteRes.json());
      if (comprasRes.ok) setCompras(await comprasRes.json());
      if (prodRes.ok) setProductos(await prodRes.json());
      if (movRes.ok) setMovimientos(await movRes.json());
      if (stockHistRes.ok) setStockHistorial(await stockHistRes.json());
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

  const totalCompras = compras.length;
  const totalGastos = compras.reduce((s, c) => s + Number(c.total), 0);

  const ventasPorMetodo = useMemo(() =>
    Object.entries(ventas.reduce((acc: Record<string, number>, v) => {
      const m = v.metodo_pago || 'otro';
      acc[m] = (acc[m] || 0) + Number(v.total);
      return acc;
    }, {})).map(([name, value]) => ({ name: name.toUpperCase(), value })), [ventas]);

  const ventasPorDia = useMemo(() =>
    Object.entries(ventas.reduce((acc: Record<string, number>, v) => {
      const dia = new Date(v.fecha_venta).toLocaleDateString('es-ES');
      acc[dia] = (acc[dia] || 0) + Number(v.total);
      return acc;
    }, {})).map(([name, ventas]) => ({ name, ventas })), [ventas]);

  const comprasPorDia = useMemo(() =>
    Object.entries(compras.reduce((acc: Record<string, number>, c) => {
      const dia = new Date(c.fecha_compra).toLocaleDateString('es-ES');
      acc[dia] = (acc[dia] || 0) + Number(c.total);
      return acc;
    }, {})).map(([name, gastos]) => ({ name, gastos })), [compras]);

  const productosBajoStock = useMemo(() =>
    (Array.isArray(productos) ? productos : []).filter((p: any) =>
      p.activo && Math.floor(Number(p.stock_actual) / (Number(p.unidades_por_caja) || 1)) <= 8
    ), [productos]);

  const itemsPorPagina = 10;
  const totalPaginasStock = Math.ceil(productosBajoStock.length / itemsPorPagina);
  const dataPaginadaStock = productosBajoStock.slice((pageStock - 1) * itemsPorPagina, pageStock * itemsPorPagina);

  const ventasFiltradas = useMemo(() => {
    if (filtroMetodoPago === 'todos') return ventas;
    return ventas.filter(v => v.metodo_pago === filtroMetodoPago);
  }, [ventas, filtroMetodoPago]);

  const ventasDetalleTotales = useMemo(() => {
    let totalSubtotal = 0;
    for (const v of ventasFiltradas) {
      for (const d of v.detalle) {
        totalSubtotal += Number(d.subtotal) || 0;
      }
    }
    return { totalSubtotal };
  }, [ventasFiltradas]);

  const totalPaginasVentas = Math.ceil(ventasFiltradas.length / itemsPorPagina);
  const dataPaginadaVentas = ventasFiltradas.slice((pageVentas - 1) * itemsPorPagina, pageVentas * itemsPorPagina);
  const totalPaginasCompras = Math.ceil(compras.length / itemsPorPagina);
  const dataPaginadaCompras = compras.slice((pageCompras - 1) * itemsPorPagina, pageCompras * itemsPorPagina);
  const comprasMovimientos = useMemo(() => movimientos.filter(m => m.tipo_movimiento === 'compra'), [movimientos]);
  const totalPaginasMovimientos = Math.ceil(comprasMovimientos.length / itemsPorPagina);
  const dataPaginadaMovimientos = comprasMovimientos.slice((pageMovimientos - 1) * itemsPorPagina, pageMovimientos * itemsPorPagina);

  const stockFechas = useMemo(() => {
    const fechasSet = new Set<string>();
    for (const item of stockHistorial) {
      for (const fecha of Object.keys(item.dias)) {
        fechasSet.add(fecha);
      }
    }
    return Array.from(fechasSet).sort();
  }, [stockHistorial]);

  const stockSorted = useMemo(() => {
    return [...stockHistorial].sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre));
  }, [stockHistorial]);

  const totalPaginasStockHistorial = Math.ceil(stockSorted.length / itemsPorPagina);
  const dataPaginadaStockHistorial = stockSorted.slice((pageStock - 1) * itemsPorPagina, pageStock * itemsPorPagina);

  const arqueoProductos = useMemo(() => {
    const prods = (Array.isArray(productos) ? productos : []).filter((p: any) => p.activo);
    return prods.map((p: any) => {
      const stock = Number(p.stock_actual) || 0;
      const costo = Number(p.precio_botella) || 0;
      const precio = Number(p.precio_venta) || 0;
      const uds = Number(p.unidades_por_caja) || 1;
      const cajas = Math.floor(stock / uds);
      const undSueltas = stock % uds;
      return {
        ...p,
        stockNumerico: stock,
        costoUnitario: costo,
        precioVenta: precio,
        unidadesPorCaja: uds,
        cajas,
        undSueltas,
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  const totalArqueoStock = useMemo(() => arqueoProductos.reduce((s, p) => s + p.stockNumerico, 0), [arqueoProductos]);
  const totalArqueoCajas = useMemo(() => arqueoProductos.reduce((s, p) => s + p.cajas, 0), [arqueoProductos]);

  const arqueoFiltrado = useMemo(() => {
    if (!busquedaArqueo) return arqueoProductos;
    const q = busquedaArqueo.toLowerCase();
    return arqueoProductos.filter(p =>
      p.codigo?.toLowerCase().includes(q) || p.nombre?.toLowerCase().includes(q)
    );
  }, [arqueoProductos, busquedaArqueo]);

  const totalPaginasArqueo = Math.ceil(arqueoFiltrado.length / itemsPorPagina);
  const dataPaginadaArqueo = arqueoFiltrado.slice((pageArqueo - 1) * itemsPorPagina, pageArqueo * itemsPorPagina);

  const exportExcel = async () => {
    setExporting('excel');
    try {
      if (tab === 'ventas') {
        const rows: any[] = [];
        for (const v of ventasFiltradas) {
          for (const d of v.detalle) {
            rows.push({
              Factura: v.numero_factura,
              Fecha: formatDate(new Date(v.fecha_venta)),
              Cliente: v.cliente_nombre || '---',
              Producto: d.producto_nombre,
              Cantidad: formatStockLabel(d),
              'Precio Unit.': d.precio_unitario,
              Subtotal: formatPrice(d.subtotal),
              'Método Pago': (v.metodo_pago || '').toUpperCase(),
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
              Cantidad: '', 'Precio Unit.': '', Subtotal: '',
              'Método Pago': (v.metodo_pago || '').toUpperCase(),
              Usuario: v.usuario_nombre || '---',
              Total: formatPrice(v.total),
            });
          }
        }
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
        const label = getPeriodoLabel(periodo, customDesde, customHasta).replace(/[/:]/g, '-');
        XLSX.writeFile(wb, `reporte_ventas_${label}.xlsx`);
      } else if (tab === 'compras') {
        const rows: any[] = [];
        for (const c of compras) {
          for (const d of c.detalle) {
            rows.push({
              Factura: c.numero_factura || c.compra_id,
              Fecha: formatDate(new Date(c.fecha_compra)),
              Proveedor: c.proveedor_nombre || '---',
              Producto: d.producto_nombre,
              Cantidad: d.cantidad,
              'Precio Unit.': d.precio_unitario,
              Subtotal: formatPrice(d.subtotal),
              Total: formatPrice(c.total),
            });
          }
          if (c.detalle.length === 0) {
            rows.push({
              Factura: c.numero_factura || c.compra_id,
              Fecha: formatDate(new Date(c.fecha_compra)),
              Proveedor: c.proveedor_nombre || '---',
              Producto: '(sin detalle)',
              Cantidad: '', 'Precio Unit.': '', Subtotal: '',
              Total: formatPrice(c.total),
            });
          }
        }
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Compras');
        const label = getPeriodoLabel(periodo, customDesde, customHasta).replace(/[/:]/g, '-');
        XLSX.writeFile(wb, `reporte_compras_${label}.xlsx`);
      } else {
        const header = ['#', 'Código', 'Producto', 'Categoría', 'Marca', 'Ud./Caja', 'Stock Cajas', 'Stock Unds', 'Stock Actual (Unidades)', 'Costo Unidad', 'P.Venta (Caja)'];
        const rows = arqueoProductos.map((p, idx) => [
          idx + 1, p.codigo, p.nombre, p.categoria || '', p.marca || '',
          p.unidadesPorCaja, p.cajas, p.undSueltas, p.stockNumerico,
          p.costoUnitario, p.precioVenta
        ]);
        const footer = ['', '', 'TOTALES', '', '', '', '', '', totalArqueoStock, '', ''];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([header, ...rows, footer]);
        ws['!cols'] = [{ wch: 4 }, { wch: 10 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Arqueo Inventario');
        const label = getPeriodoLabel(periodo, customDesde, customHasta).replace(/[/:]/g, '-');
        XLSX.writeFile(wb, `arqueo_inventario_${label}.xlsx`);
      }
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const label = getPeriodoLabel(periodo, customDesde, customHasta);

      if (tab === 'ventas') {
        doc.setFontSize(16);
        doc.text('Reporte de Ventas', 14, 20);
        doc.setFontSize(10);
        doc.text(`Período: ${label}`, 14, 28);
        doc.text(`Total ventas: ${totalVentas}  |  Total ingresos: Bs ${formatPrice(totalIngresos)}`, 14, 34);

        const body = ventasFiltradas.flatMap(v =>
          v.detalle.length > 0
            ? v.detalle.map(d => [
                String(v.numero_factura), formatDate(new Date(v.fecha_venta)),
                v.cliente_nombre || '---', d.producto_nombre,
                formatStockLabel(d), `Bs ${formatPrice(d.precio_unitario)}`,
                `Bs ${formatPrice(d.subtotal)}`, (v.metodo_pago || '').toUpperCase(),
              ])
            : [[String(v.numero_factura), formatDate(new Date(v.fecha_venta)),
                v.cliente_nombre || '---', '(sin detalle)',
                '', '', '', (v.metodo_pago || '').toUpperCase()]]
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
      } else if (tab === 'compras') {
        doc.setFontSize(16);
        doc.text('Reporte de Compras', 14, 20);
        doc.setFontSize(10);
        doc.text(`Período: ${label}`, 14, 28);
        doc.text(`Total compras: ${totalCompras}  |  Total gastos: Bs ${formatPrice(totalGastos)}`, 14, 34);

        const body = compras.flatMap(c =>
          c.detalle.length > 0
            ? c.detalle.map(d => [
                String(c.numero_factura || c.compra_id), formatDate(new Date(c.fecha_compra)),
                c.proveedor_nombre || '---', d.producto_nombre,
                String(d.cantidad), `Bs ${formatPrice(d.precio_unitario)}`,
                `Bs ${formatPrice(d.subtotal)}`, '',
              ])
            : [[String(c.numero_factura || c.compra_id), formatDate(new Date(c.fecha_compra)),
                c.proveedor_nombre || '---', '(sin detalle)',
                '', '', '', '']]
        );

        autoTable(doc, {
          startY: 40,
          head: [['Factura', 'Fecha', 'Proveedor', 'Producto', 'Cantidad', 'P. Unit.', 'Subtotal', '']],
          body,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });
      } else {
        doc.setFontSize(16);
        doc.text('Arqueo de Inventario', 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${formatDate(new Date())}`, 14, 28);
        doc.text(`Total productos: ${arqueoProductos.length}  |  Stock total: ${totalArqueoStock.toLocaleString('es-ES')} unidades`, 14, 34);

        const header = ['#', 'Código', 'Producto', 'Stock (Unds)', 'Costo Unidad', 'P.Venta (Caja)'];
        const body = arqueoProductos.map((p, idx) => [
          String(idx + 1), p.codigo, p.nombre,
          String(p.stockNumerico), `Bs ${formatPrice(p.costoUnitario)}`,
          `Bs ${formatPrice(p.precioVenta)}`,
        ]);

        autoTable(doc, {
          startY: 40,
          head: [header],
          body,
          theme: 'striped',
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });
      }

      const fileName = `reporte_${tab}_${label.replace(/[/:]/g, '-')}.pdf`;
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
          <p className="text-sm text-gray-500 mt-1">Resumen de ventas, compras, stock y exportación</p>
        </div>
        <div className="flex items-center gap-2">
          {exporting === 'excel' && <span className="text-sm text-gray-500 animate-pulse">Generando Excel...</span>}
          {exporting === 'pdf' && <span className="text-sm text-gray-500 animate-pulse">Generando PDF...</span>}
          <button
            onClick={exportExcel}
            disabled={!!exporting || (tab === 'ventas' ? ventas.length === 0 : tab === 'compras' ? compras.length === 0 : arqueoProductos.length === 0)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
          <button
            onClick={exportPDF}
            disabled={!!exporting || (tab === 'ventas' ? ventas.length === 0 : tab === 'compras' ? compras.length === 0 : arqueoProductos.length === 0)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      <div className={`grid gap-4 ${tab === 'stock' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {tab !== 'stock' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Período:</span>
              {(['dia', 'semana', 'mes', 'personalizado'] as Periodo[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriodo(p); setPageVentas(1); setPageStock(1); setPageCompras(1); setPageMovimientos(1); setPageArqueo(1); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    periodo === p ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  onChange={e => { setCustomDesde(new Date(e.target.value + 'T00:00:00')); setPageVentas(1); setPageStock(1); setPageCompras(1); setPageMovimientos(1); setPageArqueo(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                />
                <span className="text-gray-400">a</span>
                <input
                  type="date"
                  value={customHasta.toISOString().slice(0, 10)}
                  onChange={e => { setCustomHasta(new Date(e.target.value + 'T23:59:59')); setPageVentas(1); setPageStock(1); setPageCompras(1); setPageMovimientos(1); setPageArqueo(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {getPeriodoLabel(periodo, customDesde, customHasta)}
            {!loading && (tab === 'ventas'
              ? ` — ${totalVentas} venta${totalVentas !== 1 ? 's' : ''}`
              : ` — ${totalCompras} compra${totalCompras !== 1 ? 's' : ''} | ${movimientos.length} movimiento${movimientos.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>
        )}

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setTab('ventas')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'ventas' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Ventas
              </button>
              <button
                onClick={() => setTab('compras')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'compras' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Compras
              </button>
              <button
                onClick={() => setTab('stock')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'stock' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Stock
              </button>
            </div>
          </div>
          {tab === 'ventas' && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700 mr-1">Método de pago:</span>
              {(['todos', 'efectivo', 'tarjeta', 'qr'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setFiltroMetodoPago(m); setPageVentas(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                     filtroMetodoPago === m ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m === 'todos' ? 'Todos' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-gray-800" />
        </div>
      ) : tab === 'ventas' ? (
        ventasFiltradas.length === 0 ? (
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
                      <Tooltip formatter={(value: any) => [`Bs ${formatPrice(Number(value))}`, 'Ventas']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
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
                      <Pie data={ventasPorMetodo} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, value }) => `${(name || '').toUpperCase()}: Bs ${formatPrice(value)}`}>
                        {ventasPorMetodo.map((_, i) => (
                          <Cell key={i} fill={Object.values(METODO_COLORS)[i] || '#d1d5db'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`Bs ${formatPrice(Number(value))}`]} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
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
                <table className="w-full whitespace-nowrap">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Factura</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Fecha</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Cliente</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Usuario</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Producto</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 uppercase">Cantidad</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase">P. Unit.</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase">Subtotal</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 uppercase">Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dataPaginadaVentas.map(v =>
                      v.detalle.map((d, idx) => (
                        <tr key={`${v.venta_id}-${d.producto_id}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-6 py-6 font-medium text-gray-900 text-base">#{v.numero_factura}</td>
                          <td className="px-6 py-6 text-gray-800 text-base">{formatDate(new Date(v.fecha_venta))}</td>
                          <td className="px-6 py-6 text-gray-800 text-base">{v.cliente_nombre || '---'}</td>
                          <td className="px-6 py-6 text-gray-800 text-base">{v.usuario_nombre || '---'}</td>
                          <td className="px-6 py-6 text-gray-800 text-base">{d.producto_nombre}</td>
                          <td className="px-6 py-6 text-center text-gray-800 text-base">{formatStockLabel(d)}</td>
                          <td className="px-6 py-6 text-right text-gray-800 text-base">Bs {formatPrice(d.precio_unitario)}</td>
                          <td className="px-6 py-6 text-right font-medium text-gray-900 text-base">Bs {formatPrice(d.subtotal)}</td>
                          <td className="px-6 py-6 text-center">
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full uppercase">{v.metodo_pago}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-right text-sm font-bold text-gray-900"></td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">Bs {formatPrice(ventasDetalleTotales.totalSubtotal)}</td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                </table>
                {totalPaginasVentas > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/80">
                    <span className="text-sm text-gray-500">{(pageVentas - 1) * itemsPorPagina + 1}-{Math.min(pageVentas * itemsPorPagina, ventasFiltradas.length)} de {ventasFiltradas.length}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPageVentas(p => Math.max(1, p - 1))}
                        disabled={pageVentas === 1}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPaginasVentas, 5) }, (_, i) => {
                          let pageNum: number;
                          if (totalPaginasVentas <= 5) {
                            pageNum = i + 1;
                          } else if (pageVentas <= 3) {
                            pageNum = i + 1;
                          } else if (pageVentas >= totalPaginasVentas - 2) {
                            pageNum = totalPaginasVentas - 4 + i;
                          } else {
                            pageNum = pageVentas - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPageVentas(pageNum)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${pageVentas === pageNum ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPageVentas(p => Math.min(totalPaginasVentas, p + 1))}
                        disabled={pageVentas === totalPaginasVentas}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                )}
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
                    <table className="w-full whitespace-nowrap">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-2 md:px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase"></th>
                          <th className="px-2 md:px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Producto</th>
                          <th className="px-2 md:px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">Stock actual</th>
                          <th className="px-2 md:px-6 py-4 text-center text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">Ud./caja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dataPaginadaStock.map((p, idx) => (
                          <tr key={p.producto_id} className="hover:bg-gray-50">
                            <td className="px-2 md:px-6 py-6 text-gray-800 text-sm md:text-base">{idx + 1}</td>
                            <td className="px-2 md:px-6 py-6 font-medium text-gray-900 text-sm md:text-base">{p.nombre}</td>
                            <td className="px-2 md:px-6 py-6 text-right">
                              <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-1.5 md:px-2.5 py-1 rounded-lg text-xs md:text-sm">
                                <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                {formatStock(p)}
                              </span>
                            </td>
                            <td className="px-2 md:px-6 py-6 text-center text-gray-800 text-xs md:text-base">{p.unidades_por_caja}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-t bg-gray-50/80">
                    <span className="text-xs md:text-sm text-gray-500">{(pageStock - 1) * itemsPorPagina + 1}-{Math.min(pageStock * itemsPorPagina, productosBajoStock.length)} de {productosBajoStock.length}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPageStock(p => Math.max(1, p - 1))}
                        disabled={pageStock === 1}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPaginasStock, 5) }, (_, i) => {
                          let pageNum: number;
                          if (totalPaginasStock <= 5) {
                            pageNum = i + 1;
                          } else if (pageStock <= 3) {
                            pageNum = i + 1;
                          } else if (pageStock >= totalPaginasStock - 2) {
                            pageNum = totalPaginasStock - 4 + i;
                          } else {
                            pageNum = pageStock - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPageStock(pageNum)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${pageStock === pageNum ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPageStock(p => Math.min(totalPaginasStock, p + 1))}
                        disabled={pageStock === totalPaginasStock}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      ) : tab === 'compras' ? (
        compras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-lg font-medium">No hay compras en este período</p>
            <p className="text-sm mt-1">Prueba seleccionando otro rango de fechas</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Compras</span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Compras realizadas</p>
                <p className="text-3xl font-bold text-gray-900">{totalCompras}</p>
              </div>
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-red-50 rounded-xl">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Gastos</span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Total gastado</p>
                <p className="text-3xl font-bold text-red-600">Bs {formatPrice(totalGastos)}</p>
              </div>
            </div>


            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 pb-3">
                <h3 className="text-lg font-semibold text-gray-900">Detalle de compras</h3>
                <p className="text-sm text-gray-500">{totalCompras} compra(s) en el período</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Factura</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Fecha</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Proveedor</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Producto</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 uppercase">Cantidad (Cajas)</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase">P. Unit.</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dataPaginadaCompras.map(c =>
                      c.detalle.map((d, idx) => (
                        <tr key={`${c.compra_id}-${d.producto_id}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-6 py-6 font-medium text-gray-900 text-base">#{c.numero_factura || c.compra_id}</td>
                          <td className="px-6 py-6 text-gray-800 text-base">{formatDate(new Date(c.fecha_compra))}</td>
                          <td className="px-6 py-6 text-gray-800 text-base">{c.proveedor_nombre || '---'}</td>
                          <td className="px-6 py-6 text-gray-800 text-base">{d.producto_nombre}</td>
                          <td className="px-6 py-6 text-center text-gray-800 text-base">{d.cantidad}</td>
                          <td className="px-6 py-6 text-right text-gray-800 text-base">Bs {formatPrice(d.precio_unitario)}</td>
                          <td className="px-6 py-6 text-right font-medium text-gray-900 text-base">Bs {formatPrice(d.subtotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {totalPaginasCompras > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/80">
                    <span className="text-sm text-gray-500">{(pageCompras - 1) * itemsPorPagina + 1}-{Math.min(pageCompras * itemsPorPagina, compras.length)} de {compras.length}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPageCompras(p => Math.max(1, p - 1))}
                        disabled={pageCompras === 1}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPaginasCompras, 5) }, (_, i) => {
                          let pageNum: number;
                          if (totalPaginasCompras <= 5) {
                            pageNum = i + 1;
                          } else if (pageCompras <= 3) {
                            pageNum = i + 1;
                          } else if (pageCompras >= totalPaginasCompras - 2) {
                            pageNum = totalPaginasCompras - 4 + i;
                          } else {
                            pageNum = pageCompras - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPageCompras(pageNum)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${pageCompras === pageNum ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPageCompras(p => Math.min(totalPaginasCompras, p + 1))}
                        disabled={pageCompras === totalPaginasCompras}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {comprasMovimientos.length > 0 ? (
              <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 pb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Movimientos de Compra</h3>
                  <p className="text-sm text-gray-500">{comprasMovimientos.length} compra(s) en el período</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Fecha</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Producto</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 uppercase">Tipo</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase">Cantidad</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase">Stock Ant.</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase">Stock Post.</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 uppercase">Costo Unit.</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Usuario</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dataPaginadaMovimientos.map(m => (
                        <tr key={m.movimiento_id} className="hover:bg-gray-50">
                          <td className="px-6 py-6 text-gray-800 text-base whitespace-nowrap">{new Date(m.fecha_movimiento).toLocaleString('es-ES')}</td>
                          <td className="px-6 py-6 font-medium text-gray-900 text-base">{m.producto_nombre || `ID ${m.producto_id}`}</td>
                          <td className="px-6 py-6 text-center">
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              {m.tipo_movimiento}
                            </span>
                          </td>
                          <td className={`px-6 py-6 text-right font-medium text-base ${Number(m.cantidad) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(() => {
                              const uds = Number(m.unidades_por_caja) || 1;
                              const cajas = Math.abs(Number(m.cantidad)) / uds;
                              const sign = Number(m.cantidad) >= 0 ? '+' : '-';
                              const rounded = Math.round(cajas);
                              const display = cajas % 1 === 0 ? rounded : cajas.toFixed(1);
                              return `${sign}${display} cajas`;
                            })()}
                          </td>
                          <td className="px-6 py-6 text-right text-gray-800 text-base">
                            {(() => {
                              const uds = Number(m.unidades_por_caja) || 1;
                              const val = Number(m.saldo_anterior);
                              const cajas = Math.floor(val / uds);
                              const unds = val % uds;
                              return cajas > 0 ? `${cajas} cajas ${unds} und` : `${unds} und`;
                            })()}
                          </td>
                          <td className="px-6 py-6 text-right text-gray-800 text-base">
                            {(() => {
                              const uds = Number(m.unidades_por_caja) || 1;
                              const val = Number(m.saldo_posterior);
                              const cajas = Math.floor(val / uds);
                              const unds = val % uds;
                              return cajas > 0 ? `${cajas} cajas ${unds} und` : `${unds} und`;
                            })()}
                          </td>
                          <td className="px-6 py-6 text-right text-gray-800 text-base">Bs {formatPrice(m.costo_unitario_actual || 0)}</td>
                          <td className="px-6 py-6 text-gray-800 text-base">{m.usuario_nombre || '---'}</td>
                          <td className="px-6 py-6 text-gray-800 text-base max-w-[200px] truncate" title={m.observaciones || ''}>{m.observaciones || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalPaginasMovimientos > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/80">
                      <span className="text-sm text-gray-500">{(pageMovimientos - 1) * itemsPorPagina + 1}-{Math.min(pageMovimientos * itemsPorPagina, comprasMovimientos.length)} de {comprasMovimientos.length}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPageMovimientos(p => Math.max(1, p - 1))} disabled={pageMovimientos === 1} className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(totalPaginasMovimientos, 5) }, (_, i) => {
                            let pageNum: number;
                            if (totalPaginasMovimientos <= 5) pageNum = i + 1;
                            else if (pageMovimientos <= 3) pageNum = i + 1;
                            else if (pageMovimientos >= totalPaginasMovimientos - 2) pageNum = totalPaginasMovimientos - 4 + i;
                            else pageNum = pageMovimientos - 2 + i;
                            return (
                              <button key={pageNum} onClick={() => setPageMovimientos(pageNum)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${pageMovimientos === pageNum ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}>
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={() => setPageMovimientos(p => Math.min(totalPaginasMovimientos, p + 1))} disabled={pageMovimientos === totalPaginasMovimientos} className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center py-12 text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-lg font-medium">No hay compras registradas en este período</p>
                <p className="text-sm mt-1">Las compras se registran al crear una nueva compra</p>
              </div>
            )}
          </>
        )
      ) : (
        arqueoProductos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-lg font-medium">No hay productos registrados</p>
            <p className="text-sm mt-1">Registra productos para ver el arqueo de inventario</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-purple-50 rounded-xl">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">Inventario</span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Total productos</p>
                <p className="text-3xl font-bold text-gray-900">{arqueoProductos.length}</p>
              </div>
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Unidades</span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Stock total (unidades)</p>
                <p className="text-3xl font-bold text-gray-900">{totalArqueoStock.toLocaleString('es-ES')}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Arqueo de Inventario</h3>
                    <p className="text-sm text-gray-500">Todos los productos activos con su stock actual, costos</p>
                  </div>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Buscar por código o producto..."
                      value={busquedaArqueo}
                      onChange={e => { setBusquedaArqueo(e.target.value); setPageArqueo(1); }}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 w-full sm:w-72"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">Código</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Producto</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">Ud./Caja</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">Stock (cajas)</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">Stock (uds)</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">Stock Actual (Unidades)</th>
                      <th className="px-4 py-4 text-right text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">Costo Unidad</th>
                      <th className="px-4 py-4 text-right text-sm font-semibold text-gray-600 uppercase whitespace-nowrap">P.Venta (Caja)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dataPaginadaArqueo.map((p, idx) => (
                      <tr key={p.producto_id} className="hover:bg-gray-50">
                        <td className="px-4 py-5 text-gray-800 text-sm">{(pageArqueo - 1) * itemsPorPagina + idx + 1}</td>
                        <td className="px-4 py-5 text-gray-800 text-sm font-mono whitespace-nowrap">{p.codigo}</td>
                        <td className="px-4 py-5">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                            {p.categoria && <p className="text-xs text-gray-500">{p.categoria}{p.marca ? ` · ${p.marca}` : ''}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center text-gray-800 text-sm">{p.unidadesPorCaja}</td>
                        <td className="px-4 py-5 text-center text-gray-800 text-sm font-medium">{p.cajas}</td>
                        <td className="px-4 py-5 text-center text-gray-800 text-sm">{p.undSueltas}</td>
                        <td className="px-4 py-5 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-lg ${p.stockNumerico === 0 ? 'bg-red-50 text-red-600' : p.stockNumerico <= p.unidadesPorCaja ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                            {p.stockNumerico}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-right text-gray-800 text-sm">Bs {formatPrice(p.costoUnitario)}</td>
                        <td className="px-4 py-5 text-right text-gray-800 text-sm">Bs {formatPrice(p.precioVenta)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-right text-sm font-bold text-gray-900">TOTALES</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-gray-900">{totalArqueoCajas.toLocaleString('es-ES')}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-gray-900">—</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-gray-900">{totalArqueoStock.toLocaleString('es-ES')}</td>
                      <td colSpan={2} className="px-4 py-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
                {totalPaginasArqueo > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/80">
                    <span className="text-sm text-gray-500">{(pageArqueo - 1) * itemsPorPagina + 1}-{Math.min(pageArqueo * itemsPorPagina, arqueoFiltrado.length)} de {arqueoFiltrado.length}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPageArqueo(p => Math.max(1, p - 1))}
                        disabled={pageArqueo === 1}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPaginasArqueo, 5) }, (_, i) => {
                          let pageNum: number;
                          if (totalPaginasArqueo <= 5) pageNum = i + 1;
                          else if (pageArqueo <= 3) pageNum = i + 1;
                          else if (pageArqueo >= totalPaginasArqueo - 2) pageNum = totalPaginasArqueo - 4 + i;
                          else pageNum = pageArqueo - 2 + i;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPageArqueo(pageNum)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${pageArqueo === pageNum ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPageArqueo(p => Math.min(totalPaginasArqueo, p + 1))}
                        disabled={pageArqueo === totalPaginasArqueo}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </>
        )
      )}
    </div>
  );
}
