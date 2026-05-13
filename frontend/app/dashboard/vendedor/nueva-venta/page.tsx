'use client';

import { useEffect, useState } from 'react';
import SuccessModal from '@/app/components/SuccessModal';

export default function NuevaVentaPage() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState([]);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientesRes, productosRes] = await Promise.all([
        fetch('http://localhost:3001/api/clientes'),
        fetch('http://localhost:3001/api/productos'),
      ]);
      const clientesData = await clientesRes.json();
      const productosData = await productosRes.json();
      setClientes(clientesData);
      setProductos(productosData.filter(p => p.activo && p.stock_actual > 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const agregarProducto = (producto) => {
    const existente = carrito.find(p => p.producto_id === producto.producto_id);
    if (existente) {
      if (existente.cantidad < producto.stock_actual) {
        setCarrito(carrito.map(p => p.producto_id === producto.producto_id ? { ...p, cantidad: p.cantidad + 1, subtotal: (p.cantidad + 1) * p.precio_unitario } : p));
      }
    } else {
      setCarrito([...carrito, { producto_id: producto.producto_id, nombre: producto.nombre, cantidad: 1, precio_unitario: producto.precio_venta, subtotal: producto.precio_venta, stock_actual: producto.stock_actual, tipo_producto: producto.tipo_producto, marca: producto.marca, presentacion_ml: producto.presentacion_ml, tipo_envase: producto.tipo_envase, unidad_medida: producto.unidad_medida }]);
    }
  };

  const actualizarCantidad = (producto_id, cantidad) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(p => p.producto_id !== producto_id));
    } else {
      const producto = carrito.find(p => p.producto_id === producto_id);
      if (cantidad <= producto.stock_actual) {
        setCarrito(carrito.map(p => p.producto_id === producto_id ? { ...p, cantidad, subtotal: cantidad * p.precio_unitario } : p));
      }
    }
  };

  const eliminarProducto = (producto_id) => {
    setCarrito(carrito.filter(p => p.producto_id !== producto_id));
  };

  const total = carrito.reduce((sum, p) => sum + p.subtotal, 0);

  const crearCliente = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
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
      setClientes([...clientes, data]);
      setClienteId(data.cliente_id);
      setShowClienteModal(false);
      setNuevoCliente({ nit_ci: '', nombre: '', telefono: '' });
    } catch (e) {
      console.error(e);
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
      await fetch('http://localhost:3001/api/ventas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cliente_id: clienteId, descuento: 0, total, metodo_pago: metodoPago, observaciones, productos: carrito }),
      });
      setSuccessMessage('¡Venta registrada exitosamente!');
      setShowSuccess(true);
      setCarrito([]);
      setClienteId('');
      setObservaciones('');
      fetchData();
    } catch (e) {
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
              {productos.filter(p => filtroTipo === 'todos' || p.tipo_producto === filtroTipo).map(p => (
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
                    <p className="text-green-600 font-bold text-sm">Bs {p.precio_venta}</p>
                    <p className="text-xs text-gray-500">Stock: {Math.round(p.stock_actual)} <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{p.unidad_medida}</span></p>
                  </div>
                </div>
              ))}
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
                {carrito.map(p => (
                  <div key={p.producto_id} className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">{p.nombre}</p>
                      <p className="text-xs text-gray-500">{p.marca ? `${p.marca} | ` : ''}{p.presentacion_ml ? `${p.presentacion_ml}${p.tipo_producto === 'bebida' ? 'ml' : 'kg'} | ` : ''}{p.tipo_envase ? `${p.tipo_envase} | ` : ''}Bs {p.precio_unitario} <span className="bg-gray-200 text-gray-700 px-1 py-0.5 rounded text-[10px] font-medium">/{p.unidad_medida}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => actualizarCantidad(p.producto_id, p.cantidad - 1)} className="w-6 h-6 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">-</button>
                      <span className="w-8 text-center text-gray-800">{p.cantidad}</span>
                      <button onClick={() => actualizarCantidad(p.producto_id, p.cantidad + 1)} className="w-6 h-6 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">+</button>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-bold text-green-600">Bs {p.subtotal}</p>
                      <button onClick={() => eliminarProducto(p.producto_id)} className="text-red-500 text-xs hover:text-red-700">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Total</h2>
            <p className="text-3xl font-bold text-green-600 mb-4">Bs {total}</p>
            
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
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gray-800 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Nuevo Cliente</h2>
                <p className="text-xs text-gray-300">Ingresa los datos del cliente</p>
              </div>
              <button onClick={() => setShowClienteModal(false)} className="ml-auto text-white/70 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={crearCliente} className="p-6 space-y-4">
              <input type="text" placeholder="NIT/CI" value={nuevoCliente.nit_ci} onChange={e => setNuevoCliente({...nuevoCliente, nit_ci: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 shadow-sm" required />
              <input type="text" placeholder="Nombre" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 shadow-sm" required />
              <input type="text" placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 shadow-sm" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">Guardar</button>
                <button type="button" onClick={() => setShowClienteModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-100 text-gray-800 transition-colors">Cancelar</button>
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
