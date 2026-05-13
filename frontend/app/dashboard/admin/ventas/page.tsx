'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';

export default function VentasPage() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');

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
      setVentas(data);
    } catch (e) {
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

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirm(true);
  };

  const ventasFiltradas = ventas.filter(v => filtroEstado === 'todos' || v.estado === filtroEstado);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
        <div className="flex gap-2">
          <button onClick={() => setFiltroEstado('todos')} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroEstado === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Todas</button>
          <button onClick={() => setFiltroEstado('completada')} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroEstado === 'completada' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Completadas</button>
          <button onClick={() => setFiltroEstado('anulada')} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroEstado === 'anulada' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Anuladas</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">ID</th>
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
            {ventasFiltradas.map((v) => (
              <tr key={v.venta_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800">{v.venta_id}</td>
                <td className="px-6 py-4 text-gray-800">{new Date(v.fecha_venta).toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-800">{v.cliente_nombre}</td>
                <td className="px-6 py-4 font-bold text-green-600">Bs {v.total}</td>
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
            <p className="text-center text-gray-500 py-8">No se encontraron ventas</p>
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
