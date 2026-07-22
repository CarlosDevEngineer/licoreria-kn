'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';
import CustomSelect from '@/app/components/CustomSelect';
import { formatPrice } from '@/lib/format';

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState<any>({
    nombre: '', descripcion: '', tipo_producto: 'bebida',
    stock_actual: 0,
    costo_unitario: 0, precio_venta: 0, precio_botella: 0, activo: true,
    categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: '',
    proveedor_id: ''
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  const [errores, setErrores] = useState<any>({});
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [showNuevaCategoria, setShowNuevaCategoria] = useState(false);
  const [page, setPage] = useState(1);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickProduct, setQuickProduct] = useState<any>(null);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState<{ stock_actual: number | ''; costo_unitario: number; precio_venta: number; precio_botella: number; proveedor_id: string }>({ stock_actual: 0, costo_unitario: 0, precio_venta: 0, precio_botella: 0, proveedor_id: '' });
  useEffect(() => {
    fetchProductos();
    fetchProveedores();
    fetchCategorias();
  }, []);

  const fetchProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/productos', {
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
      const res = await fetch('/api/proveedores', {
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

  const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'&.,\-()/]+$/;

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/productos/categorias', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const formatStock = (p: any) => {
    const uds = Number(p.unidades_por_caja) || 1;
    const totalUnd = Number(p.stock_actual);
    const cajas = Math.floor(totalUnd / uds);
    const undSueltas = totalUnd % uds;
    if (undSueltas > 0) return `${cajas} caja${cajas !== 1 ? 's' : ''} | ${undSueltas} und suelta${undSueltas !== 1 ? 's' : ''}`;
    return `${cajas} caja${cajas !== 1 ? 's' : ''}`;
  };
  const SOLO_NUMEROS = /^\d*$/;
  const ENTEROS = /^\d+$/;
  const DECIMALES = /^\d+(\.\d{0,2})?$/;

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
      else if (!Number.isInteger(Number(value)) || Number(value) !== Math.floor(Number(value))) error = 'El stock debe ser un número entero';
    }
    if (name === 'costo_unitario') {
      if (value === '' || value === 0) error = 'El costo es obligatorio';
      else if (value < 0) error = 'El costo no puede ser negativo';
      else if (!DECIMALES.test(String(value))) error = 'El costo debe ser un número válido';
    }
    if (name === 'precio_venta') {
      if (value === '' || value === 0) error = 'El precio es obligatorio';
      else if (value < 0) error = 'El precio no puede ser negativo';
      else if (!DECIMALES.test(String(value))) error = 'El precio debe ser un número válido';
    }
    if (name === 'precio_botella') {
      if (value && value < 0) error = 'El precio por botella no puede ser negativo';
      else if (value && !DECIMALES.test(String(value))) error = 'El precio por botella debe ser un número válido';
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
    if (form.costo_unitario === '' || form.costo_unitario === 0) errs.costo_unitario = 'El costo es obligatorio';
    else if (form.costo_unitario < 0) errs.costo_unitario = 'El costo no puede ser negativo';
    else if (!DECIMALES.test(String(form.costo_unitario))) errs.costo_unitario = 'El costo debe ser un número válido';
    if (form.precio_venta === '' || form.precio_venta === 0) errs.precio_venta = 'El precio es obligatorio';
    else if (form.precio_venta < 0) errs.precio_venta = 'El precio no puede ser negativo';
    else if (!DECIMALES.test(String(form.precio_venta))) errs.precio_venta = 'El precio debe ser un número válido';
    if (form.precio_botella && form.precio_botella < 0) errs.precio_botella = 'El precio por botella no puede ser negativo';
    else if (form.precio_botella && !DECIMALES.test(String(form.precio_botella))) errs.precio_botella = 'El precio por botella debe ser un número válido';
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
        const res = await fetch(`/api/productos/${editando}`, {
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
        const res = await fetch('/api/productos', {
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
      setForm({ nombre: '', descripcion: '', tipo_producto: 'bebida', stock_actual: 0, costo_unitario: 0, precio_venta: 0, precio_botella: 0, activo: true, categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: '', proveedor_id: '' });
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
      costo_unitario: p.costo_unitario, precio_venta: p.precio_venta, precio_botella: p.precio_botella || 0,
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

  const handleQuickUpdate = (p: any) => {
    setQuickProduct(p);
    setQuickForm({
      stock_actual: 0,
      costo_unitario: Number(p.costo_unitario),
      precio_venta: Number(p.precio_venta),
      precio_botella: Number(p.precio_botella) || 0,
      proveedor_id: p.proveedor_id ? String(p.proveedor_id) : ''
    });
    setShowQuickModal(true);
  };

  const submitQuickUpdate = async (e: any) => {
    e.preventDefault();
    if (!quickProduct) return;
    const token = localStorage.getItem('token');
    const p = quickProduct;
    if (!quickForm.proveedor_id) {
      alert('Seleccione un proveedor');
      return;
    }
    try {
      const res = await fetch(`/api/compras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          producto_id: p.producto_id,
          proveedor_id: parseInt(quickForm.proveedor_id),
          cantidad_cajas: quickForm.stock_actual === '' ? 0 : quickForm.stock_actual,
          costo_unitario: quickForm.costo_unitario,
          precio_venta: quickForm.precio_venta,
          precio_botella: quickForm.precio_botella || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Error al registrar compra'));
        return;
      }
      setShowQuickModal(false);
      setQuickProduct(null);
      fetchProductos();
    } catch (e: any) {
      console.error(e);
    }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/productos/${itemToDelete}`, {
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
    setForm({ nombre: '', descripcion: '', tipo_producto: 'bebida', stock_actual: 0, costo_unitario: 0, precio_venta: 0, precio_botella: 0, activo: true, categoria: '', marca: '', presentacion_ml: '', tipo_envase: '', unidades_por_caja: '', proveedor_id: '' });
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

  const itemsPorPagina = 10;
  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
  const dataPaginada = productosFiltrados.slice((page - 1) * itemsPorPagina, page * itemsPorPagina);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <div className="flex gap-2">

          <button onClick={resetForm} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input type="text" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1); }} placeholder="Buscar por código, nombre o categoría..." className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 shadow-sm" />
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase"></th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Código</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Categoría</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Proveedor</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Stock (Caja)</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Costo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dataPaginada.map((p, idx) => (
              <tr key={p.producto_id} className="hover:bg-gray-50">
                <td className="px-6 py-7 text-gray-800 text-base">{idx + 1}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{p.codigo || `PR-${String(p.producto_id).padStart(5, '0')}`}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{p.nombre}</td>
                <td className="px-6 py-7">
                  <span className="px-2 py-1 rounded-[5px] text-xs font-medium bg-blue-300 text-blue-900">
                    {p.tipo_producto}
                  </span>
                </td>
                <td className="px-6 py-7 text-gray-800 text-base">{p.categoria || '-'}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{p.proveedor_nombre || '-'}</td>
                <td className="px-6 py-7 text-gray-800 text-base">
                  <span className={Math.floor(Number(p.stock_actual) / (Number(p.unidades_por_caja) || 1)) <= 8 ? 'text-red-600 font-bold' : ''}>
                    {formatStock(p)}
                  </span>
                </td>
                <td className="px-6 py-7 text-gray-800 text-base">Bs {formatPrice(p.costo_unitario)}</td>
                <td className="px-6 py-7">
                  <span className={`px-2 py-1 rounded-full text-xs ${p.activo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-7">
                  <div className="flex gap-3">
                    <button onClick={() => handleQuickUpdate(p)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer" title="Actualizar stock/precio">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-800 cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(p.producto_id)} className="text-red-600 hover:text-red-800 cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-6 py-5 border-t bg-gray-50/80">
              <span className="text-sm text-gray-500">{(page - 1) * itemsPorPagina + 1}-{Math.min(page * itemsPorPagina, productosFiltrados.length)} de {productosFiltrados.length}</span>
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
          {productosFiltrados.length === 0 && (
            <p className="text-center text-gray-500 py-8">No se encontraron productos</p>
          )}
        </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4 md:my-0">
            <div className="bg-gray-800 px-4 py-4 md:px-6 md:py-5">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 md:p-3 bg-white/20 rounded-xl">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-lg md:text-2xl font-bold">{editando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Código</label>
                  <div className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-500 text-xs md:text-sm font-mono">
                    {editando ? (productos.find((p: any) => p.producto_id === editando)?.codigo || `PR-${String(editando).padStart(5, '0')}`) : 'Se genera al guardar'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Nombre</label>
                  <input type="text" value={form.nombre} onChange={e => handleFieldChange('nombre', e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.nombre ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="nombre" />
                </div>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm" rows={2} />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Tipo de Producto</label>
                <CustomSelect value={form.tipo_producto} onChange={v => setForm({...form, tipo_producto: v, marca: '', tipo_envase: '', presentacion_ml: ''})} className="w-full" options={[
                  { value: 'bebida', label: 'Bebida' },
                  { value: 'snack', label: 'Snack' },
                  { value: 'otro', label: 'Otro' },
                ]} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Marca</label>
                    <input type="text" value={form.marca} onChange={e => handleFieldChange('marca', e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.marca ? 'border-red-400' : 'border-gray-300'}`} />
                    <InputError campo="marca" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Categoría</label>
                    {showNuevaCategoria ? (
                      <div key="nueva-cat" className="animate-fadeIn flex flex-col sm:flex-row gap-2">
                        <input type="text" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} placeholder="Nueva categoría" className="flex-1 md:flex-none md:w-40 md:min-w-0 border border-gray-300 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { if (nuevaCategoria.trim()) { setCategorias([...categorias, nuevaCategoria.trim()]); setForm({...form, categoria: nuevaCategoria.trim()}); setNuevaCategoria(''); setShowNuevaCategoria(false); } }} className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl hover:bg-green-700 text-sm cursor-pointer">OK</button>
                          <button type="button" onClick={() => { setNuevaCategoria(''); setShowNuevaCategoria(false); }} className="flex-1 sm:flex-none border border-gray-300 px-3 py-2 md:px-4 md:py-2 rounded-xl hover:bg-gray-100 text-sm cursor-pointer">X</button>
                        </div>
                      </div>
                    ) : (
                      <div key="select-cat" className="animate-fadeIn flex gap-2 min-w-0">
                        <CategoriaSelect value={form.categoria} onChange={v => handleFieldChange('categoria', v)} categorias={categorias} error={errores.categoria} narrower={!!form.categoria} />
                        <button type="button" onClick={() => setShowNuevaCategoria(true)} className="px-3 py-2.5 md:px-4 md:py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 cursor-pointer shrink-0 border border-gray-300" title="Nueva categoría"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                        {form.categoria && (
                          <button type="button" onClick={() => setCategoriaAEliminar(form.categoria)} className="px-3 py-2.5 md:px-4 md:py-3 bg-red-100 hover:bg-red-200 rounded-xl text-red-600 cursor-pointer shrink-0 border border-red-300" title="Eliminar categoría"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        )}
                      </div>
                    )}
                    <InputError campo="categoria" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Categoría</label>
                  {showNuevaCategoria ? (
                    <div key="nueva-cat" className="animate-fadeIn flex flex-col sm:flex-row gap-2">
                      <input type="text" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} placeholder="Nueva categoría" className="flex-1 min-w-0 border border-gray-300 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { if (nuevaCategoria.trim()) { setCategorias([...categorias, nuevaCategoria.trim()]); setForm({...form, categoria: nuevaCategoria.trim()}); setNuevaCategoria(''); setShowNuevaCategoria(false); } }} className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl hover:bg-green-700 text-sm cursor-pointer">OK</button>
                        <button type="button" onClick={() => { setNuevaCategoria(''); setShowNuevaCategoria(false); }} className="flex-1 sm:flex-none border border-gray-300 px-3 py-2 md:px-4 md:py-2 rounded-xl hover:bg-gray-100 text-sm cursor-pointer">X</button>
                      </div>
                    </div>
                  ) : (
                    <div key="select-cat" className="animate-fadeIn flex gap-2 min-w-0">
                      <CategoriaSelect value={form.categoria} onChange={v => handleFieldChange('categoria', v)} categorias={categorias} error={errores.categoria} narrower={!!form.categoria} />
                      <button type="button" onClick={() => setShowNuevaCategoria(true)} className="px-3 py-2.5 md:px-4 md:py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 cursor-pointer shrink-0 border border-gray-300" title="Nueva categoría"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                      {form.categoria && (
                        <button type="button" onClick={() => setCategoriaAEliminar(form.categoria)} className="px-3 py-2.5 md:px-4 md:py-3 bg-red-100 hover:bg-red-200 rounded-xl text-red-600 cursor-pointer shrink-0 border border-red-300" title="Eliminar categoría"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      )}
                    </div>
                  )}
                  <InputError campo="categoria" />
                </div>
              )}
              {form.tipo_producto === 'bebida' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Presentación (ml)</label>
                    <input type="text" value={form.presentacion_ml} onChange={e => handleFieldChange('presentacion_ml', e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.presentacion_ml ? 'border-red-400' : 'border-gray-300'}`} />
                    <InputError campo="presentacion_ml" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Tipo envase</label>
                    <input type="text" value={form.tipo_envase} onChange={e => handleFieldChange('tipo_envase', e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.tipo_envase ? 'border-red-400' : 'border-gray-300'}`} />
                    <InputError campo="tipo_envase" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Presentación (kg)</label>
                  <input type="text" value={form.presentacion_ml} onChange={e => handleFieldChange('presentacion_ml', e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.presentacion_ml ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="presentacion_ml" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Costo de compra (Bs)</label>
                  <input type="text" inputMode="numeric" value={form.costo_unitario ? Number(form.costo_unitario).toLocaleString('es') : ''} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); handleFieldChange('costo_unitario', raw === '' ? '' : parseInt(raw, 10)); }} className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.costo_unitario ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="costo_unitario" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Precio caja (Bs)</label>
                  <input type="text" inputMode="numeric" value={form.precio_venta ? Number(form.precio_venta).toLocaleString('es') : ''} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); handleFieldChange('precio_venta', raw === '' ? '' : parseInt(raw, 10)); }} className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.precio_venta ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="precio_venta" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Precio botella (Bs)</label>
                  <input type="text" inputMode="numeric" value={form.precio_botella ? Number(form.precio_botella).toLocaleString('es') : ''} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); handleFieldChange('precio_botella', raw === '' ? '' : parseInt(raw, 10)); }} className={`w-full border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errores.precio_botella ? 'border-red-400' : 'border-gray-300'}`} />
                  <InputError campo="precio_botella" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor</label>
                <CustomSelect value={form.proveedor_id} onChange={v => handleFieldChange('proveedor_id', v)} className="w-full" options={[
                  { value: '', label: 'Sin proveedor' },
                  ...proveedores.map(pr => ({ value: pr.proveedor_id, label: pr.nombre })),
                ]} />
              </div>
              <label className="flex items-center gap-3 text-gray-800 bg-gray-50 p-3 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} className="w-5 h-5 text-gray-800 rounded" />
                <span className="font-semibold">Producto activo</span>
              </label>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold flex items-center justify-center gap-2 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar
                </button>
                <button type="button" onClick={closeModal} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
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

      {showQuickModal && quickProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gray-800 p-5 rounded-t-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Compra: {quickProduct.nombre}
              </h3>
            </div>
            <form onSubmit={submitQuickUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cajas a comprar</label>
                <input type="number" value={quickForm.stock_actual} onChange={e => setQuickForm({...quickForm, stock_actual: e.target.value === '' ? '' : parseInt(e.target.value)})} onFocus={e => e.target.select()} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" min="1" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Costo de compra (Bs)</label>
                <input type="text" inputMode="numeric" value={quickForm.costo_unitario ? Number(quickForm.costo_unitario).toLocaleString('es') : ''} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setQuickForm({...quickForm, costo_unitario: raw === '' ? 0 : parseInt(raw, 10)}); }} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Precio de venta caja (Bs)</label>
                <input type="text" inputMode="numeric" value={quickForm.precio_venta ? Number(quickForm.precio_venta).toLocaleString('es') : ''} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setQuickForm({...quickForm, precio_venta: raw === '' ? 0 : parseInt(raw, 10)}); }} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Precio botella (Bs)</label>
                <input type="text" inputMode="numeric" value={quickForm.precio_botella ? Number(quickForm.precio_botella).toLocaleString('es') : ''} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setQuickForm({...quickForm, precio_botella: raw === '' ? 0 : parseInt(raw, 10)}); }} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor</label>
                <CustomSelect value={quickForm.proveedor_id} onChange={v => setQuickForm({...quickForm, proveedor_id: v})} className="w-full" options={[
                  { value: '', label: 'Seleccionar proveedor' },
                  ...proveedores.map(pr => ({ value: pr.proveedor_id, label: pr.nombre })),
                ]} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold cursor-pointer">
                  Registrar Compra
                </button>
                <button type="button" onClick={() => { setShowQuickModal(false); setQuickProduct(null); }} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold transition-colors cursor-pointer">
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
      <ConfirmModal
        isOpen={!!categoriaAEliminar}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${categoriaAEliminar}"?`}
        onConfirm={() => { setCategorias(categorias.filter(c => c !== categoriaAEliminar)); if (form.categoria === categoriaAEliminar) setForm({...form, categoria: ''}); setCategoriaAEliminar(null); }}
        onCancel={() => setCategoriaAEliminar(null)}
      />
    </div>
  );
}

function CategoriaSelect({ value, onChange, categorias, error, narrower }: { value: string; onChange: (v: string) => void; categorias: string[]; error?: string; narrower?: boolean }) {
  const sorted = [...categorias].sort((a, b) => a.localeCompare(b, 'es'));
  const options = [{ value: '', label: 'Seleccionar categoría' }, ...sorted.map(c => ({ value: c, label: c }))];
  return <CustomSelect value={value} onChange={onChange} options={options} className={narrower ? 'w-40 sm:w-36 shrink-0' : 'w-60 sm:w-52 shrink-0'} error={error} />;
}


