'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { formatPrice } from '@/lib/format';

type Periodo = 'dia' | 'semana' | 'mes' | 'personalizado';

function getWeekRange(d: Date) {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { desde: start, hasta: end };
}

function formatDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getPeriodoLabel(periodo: Periodo, desde: string, hasta: string) {
  if (periodo === 'dia') {
    const now = new Date();
    return `Hoy (${now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })})`;
  }
  if (periodo === 'semana') {
    const r = getWeekRange(new Date());
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `Semana del ${fmt(r.desde)} al ${fmt(r.hasta)}`;
  }
  if (periodo === 'mes') {
    const now = new Date();
    return now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }
  return `${formatDateStr(desde)} - ${formatDateStr(hasta)}`;
}

export default function VentasVendedorPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const today = () => new Date().toISOString().slice(0, 10);
  const [customDesde, setCustomDesde] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customHasta, setCustomHasta] = useState(today);
  const [page, setPage] = useState(1);
  const [showRecibo, setShowRecibo] = useState(false);
  const [reciboData, setReciboData] = useState<any>(null);
  const [loadingRecibo, setLoadingRecibo] = useState(false);

  useEffect(() => {
    fetchVentas();
  }, []);

  const fetchVentas = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ventas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const username = localStorage.getItem('username');
      const misVentas = Array.isArray(data) ? data.filter((v: any) => v.usuario_username === username) : [];
      setVentas(misVentas);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerRecibo = async (ventaId: any) => {
    setLoadingRecibo(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/ventas/${ventaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReciboData(data);
        setShowRecibo(true);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingRecibo(false);
    }
  };

  const imprimirRecibo = () => {
    if (!reciboData) return;
    const v = reciboData.venta;
    const detalles = reciboData.detalle || [];
    const subtotal = detalles.reduce((sum: number, d: any) => sum + Number(d.subtotal), 0);
    const descuento = Number(v.descuento) || 0;
    const total = Number(v.total);
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Recibo</title><style>
      body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; color: #000; }
      h2 { text-align: center; margin-bottom: 5px; }
      hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; border-bottom: 1px solid #000; padding: 4px 0; }
      td { padding: 4px 0; }
      .right { text-align: right; }
      .total-row { font-weight: bold; font-size: 14px; }
      .center { text-align: center; }
    </style></head><body>
      <h2> Drew Grand Reserve</h2>
      <p class="center">${new Date(v.fecha_venta).toLocaleString('es-ES')}</p>
      <p class="center">Factura #${v.numero_factura || v.venta_id}</p>
      <p>Cliente: ${v.cliente_nombre || 'N/A'}</p>
      <hr>
      <table><thead><tr><th>Producto</th><th class="right">Cant.</th><th class="right">Precio</th><th class="right">Subtotal</th></tr></thead><tbody>
        ${detalles.map((d: any) => `
          <tr>
            <td>${d.producto_nombre || `Prod #${d.producto_id}`}</td>
            <td class="right">${d.cantidad} ${d.tipo_venta === 'caja' ? 'caja(s)' : 'und'}</td>
            <td class="right">Bs ${formatPrice(d.precio_unitario)}</td>
            <td class="right">Bs ${formatPrice(d.subtotal)}</td>
          </tr>
        `).join('')}
      </tbody></table>
      <hr>
      <p><strong>Subtotal:</strong> <span class="right">Bs ${formatPrice(subtotal)}</span></p>
      ${descuento > 0 ? `<p><strong>Descuento:</strong> <span class="right">-Bs ${formatPrice(descuento)}</span></p>` : ''}
      <p class="total-row">Total: <span class="right">Bs ${formatPrice(total)}</span></p>
      <hr>
      <p>Método de pago: ${v.metodo_pago || '-'}</p>
      <p class="center">¡Gracias por su compra!</p>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

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
      case 'personalizado': return { desde: new Date(customDesde + 'T00:00:00'), hasta: new Date(customHasta + 'T23:59:59') };
    }
  }, [periodo, customDesde, customHasta]);

  const ventasFiltradas = useMemo(() => {
    const { desde, hasta } = getDateRange();
    return ventas.filter((v: any) => {
      const fechaVenta = new Date(v.fecha_venta);
      if (fechaVenta < desde) return false;
      const hastaEnd = new Date(hasta);
      hastaEnd.setHours(23, 59, 59, 999);
      if (fechaVenta > hastaEnd) return false;
      return true;
    });
  }, [ventas, getDateRange]);
  const itemsPorPagina = 10;
  const totalPaginas = Math.ceil(ventasFiltradas.length / itemsPorPagina);
  const ventasPaginadas = ventasFiltradas.slice((page - 1) * itemsPorPagina, page * itemsPorPagina);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mis Ventas</h1>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Período:</span>
          {(['dia', 'semana', 'mes', 'personalizado'] as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => { setPeriodo(p); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                periodo === p ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === 'dia' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Personalizado'}
            </button>
          ))}
          {periodo === 'personalizado' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customDesde} onChange={e => { setCustomDesde(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              <span className="text-gray-400">a</span>
              <input type="date" value={customHasta} onChange={e => { setCustomHasta(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {getPeriodoLabel(periodo, customDesde, customHasta)}
          {!loading && ` — ${ventasFiltradas.length} venta${ventasFiltradas.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {ventasFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">No tienes ventas en este período</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow">
          <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase"></th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Fecha</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Cliente</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Total</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Método</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ventasPaginadas.map((v, idx) => (
                    <tr key={v.venta_id} className="hover:bg-gray-50">
                      <td className="px-6 py-6 text-gray-800 text-base">{(page - 1) * itemsPorPagina + idx + 1}</td>
                      <td className="px-6 py-6 text-gray-800 text-base">{new Date(v.fecha_venta).toLocaleString()}</td>
                      <td className="px-6 py-6 text-gray-800 text-base">{v.cliente_nombre}</td>
                      <td className="px-6 py-6 font-bold text-green-600 text-base">Bs {formatPrice(v.total)}</td>
                      <td className="px-6 py-6">
                        <span className={`px-2 py-1 rounded-full text-xs ${v.estado === 'completada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {v.estado === 'completada' ? 'Completada' : 'Anulada'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-gray-800 text-base uppercase">{v.metodo_pago || '-'}</td>
                      <td className="px-6 py-6">
                        <button onClick={() => handleVerRecibo(v.venta_id)} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm cursor-pointer">
                          Ver Recibo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-6 py-5 border-t bg-gray-50/80">
              <span className="text-sm text-gray-500">{(page - 1) * itemsPorPagina + 1}-{Math.min(page * itemsPorPagina, ventasFiltradas.length)} de {ventasFiltradas.length}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPaginas <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPaginas - 2) {
                      pageNum = totalPaginas - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${page === pageNum ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}
                  disabled={page === totalPaginas}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showRecibo && reciboData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-800 p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Recibo de Venta
              </h3>
              {loadingRecibo && <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />}
            </div>
            <div className="p-6">
              {(() => {
                const v = reciboData.venta;
                const detalles = reciboData.detalle || [];
                const subtotal = detalles.reduce((sum: number, d: any) => sum + Number(d.subtotal), 0);
                const descuento = Number(v.descuento) || 0;
                const total = Number(v.total);
                return (
                  <div className="space-y-3 text-sm">
                    <div className="text-center border-b pb-3">
                      <h2 className="text-lg font-bold"> Drew Grand Reserve</h2>
                      <p className="text-gray-500">{new Date(v.fecha_venta).toLocaleString('es-ES')}</p>
                      <p className="text-gray-500">Factura #{v.numero_factura || v.venta_id}</p>
                    </div>
                    <p><strong>Cliente:</strong> {v.cliente_nombre || <span className="italic text-gray-400">N/A</span>}</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1">Producto</th>
                          <th className="text-right py-1">Cant.</th>
                          <th className="text-right py-1">Precio</th>
                          <th className="text-right py-1">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalles.map((d: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-1">{d.producto_nombre || `Prod #${d.producto_id}`}</td>
                            <td className="text-right py-1">{d.cantidad} {d.tipo_venta === 'caja' ? 'caja(s)' : 'und'}</td>
                            <td className="text-right py-1">Bs {formatPrice(d.precio_unitario)}</td>
                            <td className="text-right py-1">Bs {formatPrice(d.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between"><span>Subtotal</span><span>Bs {formatPrice(subtotal)}</span></div>
                      {descuento > 0 && <div className="flex justify-between text-red-600"><span>Descuento</span><span>-Bs {formatPrice(descuento)}</span></div>}
                      <div className="flex justify-between font-bold text-base"><span>Total</span><span>Bs {formatPrice(total)}</span></div>
                    </div>
                    <p className="text-gray-500">Método de pago: {v.metodo_pago || '-'}</p>
                    <div className="flex gap-3 pt-3">
                      <button onClick={imprimirRecibo} className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold cursor-pointer">
                        Imprimir
                      </button>
                      <button onClick={() => { setShowRecibo(false); setReciboData(null); }} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold transition-colors cursor-pointer">
                        Cerrar
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
