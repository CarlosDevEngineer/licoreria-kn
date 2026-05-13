'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';

export default function ProductosVendedorPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    codigo: '', nombre: '', descripcion: '', tipo_producto: 'bebida',
    stock_actual: 0, stock_minimo: 0, unidad_medida: 'unidad',
    costo_unitario: 0, precio_venta: 0, activo: true,
    categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: ''
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/productos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProductos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const formData = {
      ...form,
      stock_minimo: form.stock_minimo === '' ? 0 : form.stock_minimo,
      presentacion_ml: form.presentacion_ml === '' ? null : form.presentacion_ml,
      unidades_por_caja: form.unidades_por_caja === '' ? null : form.unidades_por_caja,
    };
    try {
      if (editando) {
        await fetch(`http://localhost:3001/api/productos/${editando}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('http://localhost:3001/api/productos', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditando(null);
      setForm({ codigo: '', nombre: '', descripcion: '', tipo_producto: 'bebida', stock_actual: 0, stock_minimo: 0, unidad_medida: 'unidad', costo_unitario: 0, precio_venta: 0, activo: true, categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: '' });
      fetchProductos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (p) => {
    setEditando(p.producto_id);
    setForm({
      codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion || '', tipo_producto: p.tipo_producto,
      stock_actual: p.stock_actual, stock_minimo: p.stock_minimo,
      unidad_medida: p.unidad_medida, costo_unitario: p.costo_unitario, precio_venta: p.precio_venta,
      activo: p.activo, categoria: p.categoria || '', marca: p.marca || '',
      presentacion_ml: p.presentacion_ml || '', tipo_envase: p.tipo_envase || '', unidades_por_caja: p.unidades_por_caja || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/productos/${itemToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert('Error al eliminar: ' + (data.error || 'Error desconocido'));
        setShowConfirm(false);
        setItemToDelete(null);
        return;
      }
      fetchProductos();
    }
    setShowConfirm(false);
    setItemToDelete(null);
  };

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <button onClick={() => { setShowModal(true); setEditando(null); setForm({ codigo: '', nombre: '', descripcion: '', tipo_producto: 'bebida', stock_actual: 0, stock_minimo: 0, unidad_medida: 'unidad', costo_unitario: 0, precio_venta: 0, activo: true, categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: '' }); }} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Producto
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Buscar por nombre o código..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full md:w-1/3 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 placeholder-gray-400 shadow-sm" />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Presentación</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Envase</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ud.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productosFiltrados.map((p) => (
              <tr key={p.producto_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800">{p.codigo}</td>
                <td className="px-6 py-4 text-gray-800">{p.nombre}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {p.tipo_producto}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-800">{p.marca || '-'}</td>
                <td className="px-6 py-4 text-gray-800">{p.categoria || '-'}</td>
                <td className="px-6 py-4 text-gray-800">{p.presentacion_ml ? Math.round(p.presentacion_ml) : '-'}</td>
                <td className="px-6 py-4 text-gray-800">{p.tipo_envase || '-'}</td>
                <td className="px-6 py-4 text-gray-800">
                  <span className={p.stock_actual <= p.stock_minimo ? 'text-red-600 font-bold' : ''}>
                    {Math.round(p.stock_actual)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">{p.unidad_medida}</span>
                </td>
                <td className="px-6 py-4 text-gray-800">Bs {p.precio_venta}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${p.activo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productosFiltrados.length === 0 && (
          <p className="text-center text-gray-500 py-8">No se encontraron productos</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-800 p-6 sticky top-0">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">{editando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código</label>
                  <input type="text" placeholder="Código" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                  <input type="text" placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                <textarea placeholder="Descripción del producto" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
                  <select value={form.tipo_producto} onChange={e => setForm({...form, tipo_producto: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white">
                    <option value="bebida">Bebida</option>
                    <option value="snack">Snack</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unidad</label>
                  <select value={form.unidad_medida} onChange={e => setForm({...form, unidad_medida: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white">
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock</label>
                  <input type="number" placeholder="Stock" value={form.stock_actual} onChange={e => setForm({...form, stock_actual: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock mínimo</label>
                  <input type="number" placeholder="Stock mínimo" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                </div>
              </div>
              {form.tipo_producto === 'bebida' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Marca</label>
                    <input type="text" placeholder="" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                    <input type="text" placeholder="" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                  <input type="text" placeholder="" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                </div>
              )}
              {form.tipo_producto === 'bebida' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Presentación (ml)</label>
                    <input type="text" placeholder="" value={form.presentacion_ml} onChange={e => setForm({...form, presentacion_ml: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo envase</label>
                    <input type="text" placeholder="" value={form.tipo_envase} onChange={e => setForm({...form, tipo_envase: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Presentación (kg)</label>
                  <input type="text" placeholder="" value={form.presentacion_ml} onChange={e => setForm({...form, presentacion_ml: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Costo (Bs)</label>
                  <input type="number" step="0.01" placeholder="" value={form.costo_unitario} onChange={e => setForm({...form, costo_unitario: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio (Bs)</label>
                  <input type="number" step="0.01" placeholder="" value={form.precio_venta} onChange={e => setForm({...form, precio_venta: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" required />
                </div>
              </div>
              {form.unidad_medida === 'caja' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unidades por caja</label>
                  <input type="number" placeholder="" value={form.unidades_por_caja} onChange={e => setForm({...form, unidades_por_caja: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                </div>
              )}
              <label className="flex items-center gap-3 text-gray-800 bg-gray-50 p-3 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} className="w-5 h-5 text-gray-800 rounded" />
                <span className="font-semibold">Producto activo</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        title="Eliminar Producto"
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
