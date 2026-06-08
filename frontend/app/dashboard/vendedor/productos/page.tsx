'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';

export default function ProductosVendedorPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState<any>({
    nombre: '', descripcion: '', tipo_producto: 'bebida',
    stock_actual: 0,
    costo_unitario: 0, precio_venta: 0, activo: true,
    categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: '',
    proveedor_id: ''
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  const [errores, setErrores] = useState<any>({});
  const [proveedores, setProveedores] = useState<any[]>([]);

  useEffect(() => {
    fetchProductos();
    fetchProveedores();
  }, []);

  const fetchProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/productos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { setProductos([]); return; }
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProveedores = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/proveedores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { setProveedores([]); return; }
      const data = await res.json();
      setProveedores(Array.isArray(data) ? data.filter((p: any) => p.activo !== false) : []);
    } catch (e: any) {
      console.error(e);
      setProveedores([]);
    }
  };

  const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;

  const formatStock = (p: any) => {
    const uds = Number(p.unidades_por_caja) || 1;
    const totalUnd = Number(p.stock_actual);
    const cajas = Math.floor(totalUnd / uds);
    const undSueltas = totalUnd % uds;
    if (undSueltas > 0) return `${cajas} caja${cajas !== 1 ? 's' : ''} | ${undSueltas} und suelta${undSueltas !== 1 ? 's' : ''}`;
    return `${cajas} caja${cajas !== 1 ? 's' : ''}`;
  };
  const SOLO_NUMEROS = /^\d*$/;
  const DECIMALES = /^\d+(\.\d{1,2})?$/;

  const validarCampo = (name: any, value: any, currentForm: any) => {
    const data = currentForm || form;
    let error = '';
    if (name === 'nombre') {
      if (!value.trim()) error = 'El nombre es obligatorio';
      else if (!SOLO_LETRAS.test(value)) error = 'El nombre solo puede contener letras';
    }
    if (name === 'stock_actual') {
      if (value === '' || value === 0) error = 'El stock es obligatorio';
      else if (value < 0) error = 'El stock no puede ser negativo';
      else if (!Number.isInteger(Number(value))) error = 'El stock debe ser un número entero';
    }
    if (name === 'costo_unitario') {
      if (value === '' || value === 0) error = 'El costo es obligatorio';
      else if (value < 0) error = 'El costo no puede ser negativo';
      else if (!DECIMALES.test(String(value))) error = 'El costo debe ser un número decimal válido';
    }
    if (name === 'precio_venta') {
      if (value === '' || value === 0) error = 'El precio es obligatorio';
      else if (value < 0) error = 'El precio no puede ser negativo';
      else if (!DECIMALES.test(String(value))) error = 'El precio debe ser un número decimal válido';
    }
    if (name === 'marca' && data.tipo_producto === 'bebida' && value && !SOLO_LETRAS.test(value)) {
      error = 'La marca solo puede contener letras';
    }
    if (name === 'categoria' && value && !SOLO_LETRAS.test(value)) {
      error = 'La categoría solo puede contener letras';
    }
    if (name === 'presentacion_ml' && value && !SOLO_NUMEROS.test(String(value))) {
      error = 'La presentación solo puede contener números';
    }
    if (name === 'tipo_envase' && data.tipo_producto === 'bebida' && value && !SOLO_LETRAS.test(value)) {
      error = 'El tipo de envase solo puede contener letras';
    }
    setErrores((prev: any) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleFieldChange = (name: any, value: any) => {
    const updatedForm = { ...form, [name]: value };
    setForm(updatedForm);
    validarCampo(name, value, updatedForm);
  };

  const validateForm = () => {
    const errs: any = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    else if (!SOLO_LETRAS.test(form.nombre)) errs.nombre = 'El nombre solo puede contener letras';
    if (!form.tipo_producto) errs.tipo_producto = 'Seleccione un tipo';
    if (form.stock_actual === '' || form.stock_actual === 0) errs.stock_actual = 'El stock es obligatorio';
    else if (form.stock_actual < 0) errs.stock_actual = 'El stock no puede ser negativo';
    else if (!Number.isInteger(Number(form.stock_actual)) || Number(form.stock_actual) !== Math.floor(Number(form.stock_actual))) errs.stock_actual = 'El stock debe ser un número entero';

    if (form.costo_unitario === '' || form.costo_unitario === 0) errs.costo_unitario = 'El costo es obligatorio';
    else if (form.costo_unitario < 0) errs.costo_unitario = 'El costo no puede ser negativo';
    else if (!DECIMALES.test(String(form.costo_unitario))) errs.costo_unitario = 'El costo debe ser un número decimal válido';
    if (form.precio_venta === '' || form.precio_venta === 0) errs.precio_venta = 'El precio es obligatorio';
    else if (form.precio_venta < 0) errs.precio_venta = 'El precio no puede ser negativo';
    else if (!DECIMALES.test(String(form.precio_venta))) errs.precio_venta = 'El precio debe ser un número decimal válido';
    if (form.marca && form.tipo_producto === 'bebida' && !SOLO_LETRAS.test(form.marca)) errs.marca = 'La marca solo puede contener letras';
    if (form.categoria && !SOLO_LETRAS.test(form.categoria)) errs.categoria = 'La categoría solo puede contener letras';
    if (form.presentacion_ml && !SOLO_NUMEROS.test(String(form.presentacion_ml))) errs.presentacion_ml = 'La presentación solo puede contener números';
    if (form.tipo_envase && form.tipo_producto === 'bebida' && !SOLO_LETRAS.test(form.tipo_envase)) errs.tipo_envase = 'El tipo de envase solo puede contener letras';
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validateForm()) return;

    const token = localStorage.getItem('token');
    const udsParaStock = Number(form.unidades_por_caja) || 1;
    const formData = {
      ...form,
      stock_actual: Math.round(form.stock_actual * udsParaStock),
      presentacion_ml: form.presentacion_ml === '' ? null : form.presentacion_ml,
      unidades_por_caja: form.unidades_por_caja === '' ? null : form.unidades_por_caja,
      proveedor_id: form.proveedor_id === '' ? null : parseInt(form.proveedor_id),
    };
    try {
      if (editando) {
        const res = await fetch(`http://localhost:3001/api/productos/${editando}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Error al guardar'));
          return;
        }
      } else {
        const res = await fetch('http://localhost:3001/api/productos', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Error al guardar'));
          return;
        }
      }
      setShowModal(false);
      setEditando(null);
      setForm({ nombre: '', descripcion: '', tipo_producto: 'bebida', stock_actual: 0, costo_unitario: 0, precio_venta: 0, activo: true, categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: '', proveedor_id: '' });
      setErrores({});
      fetchProductos();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleEdit = (p: any) => {
    setEditando(p.producto_id);
    const udsEdit = Number(p.unidades_por_caja) || 1;
    setForm({
      nombre: p.nombre, descripcion: p.descripcion || '', tipo_producto: p.tipo_producto,
      stock_actual: Math.floor(Number(p.stock_actual) / udsEdit),
      costo_unitario: p.costo_unitario, precio_venta: p.precio_venta,
      activo: p.activo, categoria: p.categoria || '', marca: p.marca || '',
      presentacion_ml: p.presentacion_ml ? String(Math.round(Number(p.presentacion_ml))) : '', tipo_envase: p.tipo_envase || '', unidades_por_caja: p.unidades_por_caja ? String(Math.round(Number(p.unidades_por_caja))) : '',
      proveedor_id: p.proveedor_id ? String(p.proveedor_id) : ''
    });
    setErrores({});
    setShowModal(true);
  };

  const handleDelete = (id: any) => {
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

  const resetForm = () => {
    setForm({ nombre: '', descripcion: '', tipo_producto: 'bebida', stock_actual: 0, costo_unitario: 0, precio_venta: 0, activo: true, categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: '', proveedor_id: '' });
    setErrores({});
    setShowModal(true);
    setEditando(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditando(null);
    setErrores({});
  };

  const InputError = ({ campo }: { campo: any }) => errores[campo] ? <p className="text-red-500 text-xs mt-1">{errores[campo]}</p> : null;

  const productosFiltrados = productos.filter((p: any) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return p.nombre?.toLowerCase().includes(q) || 
           p.codigo?.toLowerCase().includes(q) ||
           p.categoria?.toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <button onClick={resetForm} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Producto
        </button>
      </div>

      <div className="mb-4">
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por código, nombre o categoría..." className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 shadow-sm" />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock (Caja)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productosFiltrados.map((p, idx) => (
              <tr key={p.producto_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800">{idx + 1}</td>
                <td className="px-6 py-4 text-gray-800">PR-{p.producto_id}</td>
                <td className="px-6 py-4 text-gray-800">{p.nombre}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {p.tipo_producto}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-800">{p.categoria || '-'}</td>
                <td className="px-6 py-4 text-gray-800">{p.proveedor_nombre || '-'}</td>
                <td className="px-6 py-4 text-gray-800">
                  <span className={Math.floor(Number(p.stock_actual) / (Number(p.unidades_por_caja) || 1)) <= 1 ? 'text-red-600 font-bold' : ''}>
                    {formatStock(p)}
                  </span>
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
                  <div className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-gray-500 text-sm">
                    {editando ? `PR-${editando}` : `PR-${productos.reduce((max, p) => Math.max(max, p.producto_id || 0), 0) + 1}`}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                  <input type="text" value={form.nombre} onChange={e => handleFieldChange('nombre', e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.nombre ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="nombre" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
                <select value={form.tipo_producto} onChange={e => handleFieldChange('tipo_producto', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white">
                  <option value="bebida">Bebida</option>
                  <option value="snack">Snack</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock (Cajas)</label>
                  <input type="number" value={form.stock_actual} onChange={e => handleFieldChange('stock_actual', e.target.value === '' ? '' : parseFloat(e.target.value))} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.stock_actual ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="stock_actual" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unidades por caja</label>
                  <input type="number" value={form.unidades_por_caja} onChange={e => setForm({...form, unidades_por_caja: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                </div>
              </div>
              {form.tipo_producto === 'bebida' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Marca</label>
                    <input type="text" value={form.marca} onChange={e => handleFieldChange('marca', e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.marca ? 'border-red-400' : 'border-gray-300'}`} />
                    <InputError campo="marca" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                    <input type="text" value={form.categoria} onChange={e => handleFieldChange('categoria', e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.categoria ? 'border-red-400' : 'border-gray-300'}`} />
                    <InputError campo="categoria" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                  <input type="text" value={form.categoria} onChange={e => handleFieldChange('categoria', e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.categoria ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="categoria" />
                </div>
              )}
              {form.tipo_producto === 'bebida' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Presentación (ml)</label>
                    <input type="text" value={form.presentacion_ml} onChange={e => handleFieldChange('presentacion_ml', e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.presentacion_ml ? 'border-red-400' : 'border-gray-300'}`} />
                    <InputError campo="presentacion_ml" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo envase</label>
                    <input type="text" value={form.tipo_envase} onChange={e => handleFieldChange('tipo_envase', e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.tipo_envase ? 'border-red-400' : 'border-gray-300'}`} />
                    <InputError campo="tipo_envase" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Presentación (kg)</label>
                  <input type="text" value={form.presentacion_ml} onChange={e => handleFieldChange('presentacion_ml', e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.presentacion_ml ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="presentacion_ml" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Costo de compra (Bs)</label>
                  <input type="number" step="0.01" value={form.costo_unitario} onChange={e => handleFieldChange('costo_unitario', e.target.value === '' ? '' : parseFloat(e.target.value))} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.costo_unitario ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="costo_unitario" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio de venta (Bs)</label>
                  <input type="number" step="0.01" value={form.precio_venta} onChange={e => handleFieldChange('precio_venta', e.target.value === '' ? '' : parseFloat(e.target.value))} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.precio_venta ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="precio_venta" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor</label>
                <select value={form.proveedor_id} onChange={e => handleFieldChange('proveedor_id', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white">
                  <option value="">Sin proveedor</option>
                  {proveedores.map(pr => (
                    <option key={pr.proveedor_id} value={pr.proveedor_id}>{pr.nombre}</option>
                  ))}
                </select>
              </div>

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
                <button type="button" onClick={closeModal} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold transition-colors flex items-center justify-center gap-2">
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
