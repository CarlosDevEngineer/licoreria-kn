'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import SuccessModal from '@/app/components/SuccessModal';
import { formatPrice } from '@/lib/format';

export default function NuevaVentaPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nit_ci: '', nombre: '', telefono: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [clienteErrors, setClienteErrors] = useState<any>({});
  const [clienteBackendError, setClienteBackendError] = useState('');

  const formatStockFromUnd = (totalUnd: number, udsPorCaja: number) => {
    const uds = udsPorCaja || 1;
    const cajas = Math.floor(totalUnd / uds);
    const undSueltas = totalUnd % uds;
    if (undSueltas > 0) return `${cajas} caja${cajas !== 1 ? 's' : ''} | ${undSueltas} und suelta${undSueltas !== 1 ? 's' : ''}`;
    return `${cajas} caja${cajas !== 1 ? 's' : ''}`;
  };

  const getCajasYNovedades = (stockActual: number, udsPorCaja: number) => {
    const totalUnd = Math.round(stockActual);
    const uds = udsPorCaja || 1;
    const cajas = Math.floor(totalUnd / uds);
    const und = totalUnd % uds;
    return { cajas, und, totalUnd };
  };

  const getUndEnCarrito = (productoId: number) => {
    let total = 0;
    carrito.forEach(item => {
      if (item.producto_id === productoId) {
        const uds = item.unidades_por_caja || 1;
        total += item.tipo_venta === 'caja' ? item.cantidad * uds : item.cantidad;
      }
    });
    return total;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      const [clientesRes, productosRes] = await Promise.all([
        fetch('http://localhost:3001/api/clientes', { headers: authHeader }),
        fetch('http://localhost:3001/api/productos', { headers: authHeader }),
      ]);
      const clientesData = await clientesRes.json();
      const productosData = await productosRes.json();
      if (clientesRes.ok) setClientes(clientesData);
      if (productosRes.ok) setProductos(productosData.filter((p: any) => p.activo && Number(p.stock_actual) > 0));
    } catch (e: any) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const agregarProducto = (producto: any) => {
    const existente = carrito.find(p => p.producto_id === producto.producto_id);
    const udsPorCaja = Number(producto.unidades_por_caja) || 1;

    if (existente) {
      const stockOriginal = Number(producto.stock_actual);
      const undEnCarrito = getUndEnCarrito(producto.producto_id);
      const incUnd = existente.tipo_venta === 'caja' ? udsPorCaja : 1;
      if (undEnCarrito + incUnd <= stockOriginal) {
        const nuevaCant = existente.cantidad + 1;
        setCarrito(carrito.map(p => p.producto_id === producto.producto_id ? {
          ...p, cantidad: nuevaCant, subtotal: Number((nuevaCant * p.precio_unitario).toFixed(2))
        } : p));
      }
    } else {
      const esSnack = producto.tipo_producto === 'snack';
      const pUnitario = esSnack ? Number(producto.precio_venta) / udsPorCaja : Number(producto.precio_venta);
      setCarrito([...carrito, {
        producto_id: producto.producto_id, nombre: producto.nombre, cantidad: 1,
        precio_unitario: pUnitario, subtotal: pUnitario,
        stock_actual: Number(producto.stock_actual), tipo_producto: producto.tipo_producto,
        marca: producto.marca, presentacion_ml: producto.presentacion_ml,
        tipo_envase: producto.tipo_envase, unidades_por_caja: udsPorCaja,
        tipo_venta: esSnack ? 'unidad' : 'caja'
      }]);
    }
  };

  const toggleTipoVenta = (producto_id: number) => {
    setCarrito(carrito.map(p => {
      if (p.producto_id !== producto_id) return p;
      const nuevoTipo = p.tipo_venta === 'caja' ? 'unidad' : 'caja';
      const uds = p.unidades_por_caja || 1;
      const stockOriginal = Math.round(p.stock_actual);
      const undEnCarrito = getUndEnCarrito(producto_id);
      const undActualesItem = p.tipo_venta === 'caja' ? p.cantidad * uds : p.cantidad;
      const restante = stockOriginal - (undEnCarrito - undActualesItem);
      const precioBase = Number(productos.find(pr => pr.producto_id === producto_id)?.precio_venta) || 0;
      const nuevoPrecio = nuevoTipo === 'caja' ? precioBase : precioBase / uds;
      const maxUnd = nuevoTipo === 'caja' ? Math.floor(restante / uds) : restante;
      const nuevaCant = Math.min(p.cantidad, maxUnd || 1);
      return {
        ...p,
        tipo_venta: nuevoTipo,
        cantidad: nuevaCant,
        precio_unitario: nuevoPrecio,
        subtotal: Number((nuevaCant * nuevoPrecio).toFixed(2))
      };
    }));
  };

  const actualizarCantidad = (producto_id: any, cantidad: any) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(p => p.producto_id !== producto_id));
    } else {
      const item = carrito.find(p => p.producto_id === producto_id);
      if (!item) return;
      const uds = item.unidades_por_caja || 1;
      const stockOriginal = Math.round(item.stock_actual);
      const undEnCarrito = getUndEnCarrito(producto_id);
      const undActualesItem = item.tipo_venta === 'caja' ? item.cantidad * uds : item.cantidad;
      const restante = stockOriginal - (undEnCarrito - undActualesItem);
      const maxQty = item.tipo_venta === 'caja' ? Math.floor(restante / uds) : restante;
      if (cantidad <= maxQty) {
        setCarrito(carrito.map(p => p.producto_id === producto_id ? {
          ...p, cantidad, subtotal: Number((cantidad * p.precio_unitario).toFixed(2))
        } : p));
      }
    }
  };

  const eliminarProducto = (producto_id: any) => {
    setCarrito(carrito.filter(p => p.producto_id !== producto_id));
  };

  const total = carrito.reduce((sum, p) => sum + Number(p.subtotal), 0);

  const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;
  const SOLO_DIGITOS = /^\d*$/;

  const validarClienteCampo = (name: string, value: string) => {
    let error = '';
    if (name === 'nombre' && !SOLO_LETRAS.test(value)) {
      error = 'El nombre solo puede contener letras';
    }
    if (name === 'nit_ci') {
      if (!SOLO_DIGITOS.test(value)) {
        error = 'El NIT/CI solo puede contener números';
      } else if (value.length < 7 || value.length > 12) {
        error = 'El NIT/CI debe tener entre 7 y 12 dígitos';
      }
    }
    if (name === 'telefono' && value) {
      if (!SOLO_DIGITOS.test(value)) {
        error = 'El teléfono solo puede contener números';
      } else if (value.length > 8) {
        error = 'El teléfono debe tener máximo 8 dígitos';
      }
    }
    setClienteErrors((prev: any) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNuevoCliente((prev: any) => ({ ...prev, [name]: value }));
    setClienteBackendError('');
    if (['nombre', 'nit_ci', 'telefono'].includes(name)) {
      validarClienteCampo(name, value);
    }
  };

  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    const errNombre = validarClienteCampo('nombre', nuevoCliente.nombre);
    const errNit = validarClienteCampo('nit_ci', nuevoCliente.nit_ci);
    const errTel = validarClienteCampo('telefono', nuevoCliente.telefono);
    if (errNombre || errNit || errTel) return;

    const token = localStorage.getItem('token');
    setClienteBackendError('');
    try {
      const res = await fetch('http://localhost:3001/api/clientes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(nuevoCliente),
      });
      const data = await res.json();
      if (!res.ok) {
        setClienteBackendError(data.error || 'Error al guardar');
        return;
      }
      setClientes([...clientes, data]);
      setClienteId(data.cliente_id);
      setShowClienteModal(false);
      setNuevoCliente({ nit_ci: '', nombre: '', telefono: '' });
      setClienteErrors({ nit_ci: '', nombre: '', telefono: '' });
      setClienteBackendError('');
    } catch (e: any) {
      setClienteBackendError('Error de conexión con el servidor');
    }
  };

  const registrarVenta = async () => {
    if (!clienteId || carrito.length === 0) {
      setErrorMessage('Selecciona un cliente y agrega productos');
      setShowError(true);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/ventas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cliente_id: clienteId, descuento: 0, total, metodo_pago: metodoPago, observaciones, productos: carrito }),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || 'Error al registrar la venta');
        setShowError(true);
        return;
      }
      setSuccessMessage('¡Venta registrada exitosamente!');
      setShowSuccess(true);
      setCarrito([]);
      setClienteId('');
      setObservaciones('');
      fetchData();
    } catch (e: any) {
      console.error(e);
      setErrorMessage('Error al registrar la venta. Intenta nuevamente.');
      setShowError(true);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Nueva Venta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Seleccionar Cliente</h2>
              <button onClick={() => setShowClienteModal(true)} className="text-green-600 hover:text-green-700 text-sm font-medium">+ Nuevo Cliente</button>
            </div>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 shadow-sm">
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.cliente_id} value={c.cliente_id}>{c.nombre} ({c.nit_ci})</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos</h2>
            <div className="mb-4 flex gap-2">
              <button onClick={() => setFiltroTipo('todos')} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroTipo === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Todos</button>
              <button onClick={() => setFiltroTipo('bebida')} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroTipo === 'bebida' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Bebidas</button>
              <button onClick={() => setFiltroTipo('snack')} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroTipo === 'snack' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Snacks</button>
              <button onClick={() => setFiltroTipo('otro')} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroTipo === 'otro' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Otros</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {productos.filter(p => filtroTipo === 'todos' || p.tipo_producto === filtroTipo).map(p => {
                const stockOriginal = Math.round(Number(p.stock_actual));
                const info = getCajasYNovedades(stockOriginal, Number(p.unidades_por_caja) || 1);
                return (
                  <div key={p.producto_id} onClick={() => agregarProducto(p)} className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.tipo_producto === 'bebida' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {p.tipo_producto}
                      </span>
                    </div>
                    <p className="font-medium text-sm text-gray-800">{p.nombre}</p>
                    <p className="text-xs text-gray-500">{p.marca ? `Marca: ${p.marca}` : ''}{p.marca && p.presentacion_ml ? ' | ' : ''}{p.presentacion_ml ? `${p.presentacion_ml}${p.tipo_producto === 'bebida' ? 'ml' : 'kg'}` : ''}</p>
                    <p className="text-xs text-gray-500">{p.tipo_envase ? `Envase: ${p.tipo_envase}` : ''}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-green-600 font-bold text-sm">Bs {formatPrice(p.precio_venta)}</p>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Stock: {formatStockFromUnd(stockOriginal, Number(p.unidades_por_caja) || 1)}</p>
                        <p className="text-[10px] text-gray-400">{p.unidades_por_caja} und/caja &rarr; {info.totalUnd} und</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Carrito</h2>
            {carrito.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Sin productos</p>
            ) : (
              <div className="space-y-3">
                {carrito.map(p => {
                  const uds = p.unidades_por_caja || 1;
                  const totalUnd = Math.round(p.stock_actual);
                  const cajasStock = Math.floor(totalUnd / uds);
                  const undStock = totalUnd % uds;
                  const descontarUnd = p.tipo_venta === 'caja' ? p.cantidad * uds : p.cantidad;
                  const restante = totalUnd - descontarUnd;
                  const cajasRest = restante >= 0 ? Math.floor(restante / uds) : 0;
                  const undRest = restante >= 0 ? restante % uds : 0;
                  return (
                    <div key={p.producto_id} className="border-b border-gray-200 pb-3 mb-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-800">{p.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {p.marca ? `${p.marca} | ` : ''}
                            {p.presentacion_ml ? `${p.presentacion_ml}${p.tipo_producto === 'bebida' ? 'ml' : 'kg'} | ` : ''}
                            {p.tipo_envase ? `${p.tipo_envase} | ` : ''}
                            Bs {formatPrice(p.precio_unitario)}
                            <span className="bg-gray-200 text-gray-700 px-1 py-0.5 rounded text-[10px] font-medium ml-1">
                              /{p.tipo_venta === 'caja' ? 'caja' : 'unidad'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Stock disponible: <span className="font-medium">{cajasStock} cajas | {undStock} und</span> &rarr; quedar&aacute; <span className="font-medium">{cajasRest} cajas | {undRest} und</span></p>
                          {p.tipo_producto !== 'snack' && (
                            <button onClick={() => toggleTipoVenta(p.producto_id)} className="text-xs text-blue-600 hover:text-blue-800 mt-1">
                              {p.tipo_venta === 'caja' ? 'Vender por unidad' : 'Vender por caja'}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <button onClick={() => actualizarCantidad(p.producto_id, p.cantidad - 1)} className="w-6 h-6 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">-</button>
                          <span className="w-8 text-center text-gray-800">{p.cantidad}</span>
                          <button onClick={() => actualizarCantidad(p.producto_id, p.cantidad + 1)} className="w-6 h-6 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">+</button>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-green-600">Bs {formatPrice(p.subtotal)}</p>
                          <button onClick={() => eliminarProducto(p.producto_id)} className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200 transition-colors font-medium">Eliminar</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Total</h2>
            <p className="text-3xl font-bold text-green-600 mb-4">Bs {formatPrice(total)}</p>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 bg-white text-gray-800 shadow-sm">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="qr">QR</option>
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 bg-white text-gray-800 shadow-sm" rows={2} />

            <button onClick={registrarVenta} disabled={!clienteId || carrito.length === 0} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Registrar Venta
            </button>
          </div>
        </div>
      </div>

      {showClienteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-800 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">Nuevo Cliente</h2>
                <button onClick={() => setShowClienteModal(false)} className="ml-auto text-white/70 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={crearCliente} className="p-6 space-y-4">
              {clienteBackendError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl text-sm">{clienteBackendError}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">NIT/CI</label>
                <input type="text" name="nit_ci" placeholder="Ingrese NIT o CI (7-12 dígitos)" value={nuevoCliente.nit_ci} onChange={handleClienteChange} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${clienteErrors.nit_ci ? 'border-red-500' : 'border-gray-300'}`} required />
                {clienteErrors.nit_ci && <p className="text-red-500 text-sm mt-1">{clienteErrors.nit_ci}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                <input type="text" name="nombre" placeholder="Nombre completo" value={nuevoCliente.nombre} onChange={handleClienteChange} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${clienteErrors.nombre ? 'border-red-500' : 'border-gray-300'}`} required />
                {clienteErrors.nombre && <p className="text-red-500 text-sm mt-1">{clienteErrors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                <input type="text" name="telefono" value={nuevoCliente.telefono} onChange={handleClienteChange} maxLength={8} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${clienteErrors.telefono ? 'border-red-500' : 'border-gray-300'}`} />
                {clienteErrors.telefono && <p className="text-red-500 text-sm mt-1">{clienteErrors.telefono}</p>}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar
                </button>
                <button type="button" onClick={() => setShowClienteModal(false)} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold transition-colors flex items-center justify-center gap-2">
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

      <SuccessModal
        isOpen={showSuccess}
        title="Venta Exitosa"
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />

      {showError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="bg-gray-800 p-6">
              <div className="flex items-center gap-4 text-white">
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Error</h2>
                  <p className="text-sm opacity-90">{errorMessage}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <button
                onClick={() => setShowError(false)}
                className="w-full bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
