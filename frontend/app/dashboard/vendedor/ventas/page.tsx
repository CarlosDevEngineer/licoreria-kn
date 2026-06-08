'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';

export default function VentasVendedorPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

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
      const username = localStorage.getItem('username');
      const misVentas = data.filter((v: any) => v.usuario_nombre === username);
      setVentas(misVentas);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const ventasFiltradas = ventas.filter((v: any) => {
    if (!fechaDesde && !fechaHasta) return true;
    const fechaVenta = new Date(v.fecha_venta);
    fechaVenta.setHours(0, 0, 0, 0);
    if (fechaDesde && fechaVenta < new Date(fechaDesde)) return false;
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      if (fechaVenta > hasta) return false;
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mis Ventas</h1>
        <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="text-xs text-gray-700 border-none outline-none bg-transparent w-28" />
          <span className="text-gray-400">-</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="text-xs text-gray-700 border-none outline-none bg-transparent w-28" />
          {(fechaDesde || fechaHasta) && (
            <button onClick={() => { setFechaDesde(''); setFechaHasta(''); }} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {ventasFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">No tienes ventas registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ventasFiltradas.map((v, idx) => (
                <tr key={v.venta_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-800">{idx + 1}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(v.fecha_venta).toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-800">{v.cliente_nombre}</td>
                  <td className="px-6 py-4 font-bold text-green-600">Bs {v.total}</td>
                  <td className="px-6 py-4 text-gray-600">{v.metodo_pago || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
