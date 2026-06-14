'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useMemo, useCallback } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';
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

export default function VentasPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [filtroEstado, setFiltroEstado] = useState('completada');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const today = () => new Date().toISOString().slice(0, 10);
  const [customDesde, setCustomDesde] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customHasta, setCustomHasta] = useState(today);

  useEffect(() => {
    fetchVentas();
  }, []);

  const fetchVentas = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/ventas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setVentas(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/ventas/${itemToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchVentas();
    }
    setShowConfirm(false);
    setItemToDelete(null);
  };

  const handleDelete = (id: any) => {
    setItemToDelete(id);
    setShowConfirm(true);
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
      if (filtroEstado !== 'todos' && v.estado !== filtroEstado) return false;
      const fechaVenta = new Date(v.fecha_venta);
      if (fechaVenta < desde) return false;
      const hastaEnd = new Date(hasta);
      hastaEnd.setHours(23, 59, 59, 999);
      if (fechaVenta > hastaEnd) return false;
      return true;
    });
  }, [ventas, filtroEstado, getDateRange]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['dia', 'semana', 'mes', 'personalizado'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  periodo === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p === 'dia' ? 'Hoy' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Personalizado'}
              </button>
            ))}
          </div>
          {periodo === 'personalizado' && (
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-1.5">
              <input type="date" value={customDesde} onChange={e => setCustomDesde(e.target.value)} className="text-xs text-gray-700 border-none outline-none bg-transparent w-28" />
              <span className="text-gray-400">-</span>
              <input type="date" value={customHasta} onChange={e => setCustomHasta(e.target.value)} className="text-xs text-gray-700 border-none outline-none bg-transparent w-28" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setFiltroEstado('todos')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filtroEstado === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Todas</button>
            <button onClick={() => setFiltroEstado('completada')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filtroEstado === 'completada' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Completadas</button>
            <button onClick={() => setFiltroEstado('anulada')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filtroEstado === 'anulada' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Anuladas</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Método</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ventasFiltradas.map((v, idx) => (
              <tr key={v.venta_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800">{idx + 1}</td>
                <td className="px-6 py-4 text-gray-800">{new Date(v.fecha_venta).toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-800">{v.cliente_nombre}</td>
                <td className="px-6 py-4 font-bold text-green-600">Bs {formatPrice(v.total)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${v.estado === 'completada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {v.estado === 'completada' ? 'Completada' : 'Anulada'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-800">{v.metodo_pago || '-'}</td>
                <td className="px-6 py-4 text-gray-800">{v.usuario_nombre || '-'}</td>
                <td className="px-6 py-4">
                  {v.estado === 'completada' && (
                    <button onClick={() => handleDelete(v.venta_id)} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm">
                      Anular
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ventasFiltradas.length === 0 && (
          <p className="text-center text-gray-500 py-8">No se encontraron ventas en este período</p>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="Anular Venta"
        message="¿Estás seguro de que deseas anular esta venta? El stock de productos será restaurado."
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
