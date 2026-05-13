'use client';

import { useEffect, useState } from 'react';

export default function VentasVendedorPage() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const misVentas = data.filter(v => v.usuario_nombre === username);
      setVentas(misVentas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mis Ventas</h1>

      {ventas.length === 0 ? (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ventas.map((v) => (
                <tr key={v.venta_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-800">{v.venta_id}</td>
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
