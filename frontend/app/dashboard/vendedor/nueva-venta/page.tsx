'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import SuccessModal from '@/app/components/SuccessModal';
import CustomSelect from '@/app/components/CustomSelect';
import { formatPrice } from '@/lib/format';

export default function NuevaVentaPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nit_ci: '', nombre: '', telefono: '' });
  const [clienteErrors, setClienteErrors] = useState({ nit_ci: '', nombre: '', telefono: '' });
  const [clienteBackendError, setClienteBackendError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [pageProducto, setPageProducto] = useState(1);
  const itemsPorPagina = 9;
  const [seleccionandoId, setSeleccionandoId] = useState<number | null>(null);
  const [editQtyId, setEditQtyId] = useState<number | null>(null);
  const [editQtyVal, setEditQtyVal] = useState('');
  const [showRecibo, setShowRecibo] = useState(false);
  const [reciboData, setReciboData] = useState<any>(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

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
    carrito.forEach((item: any) => {
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
    try {
      const token = localStorage.getItem('token');
      const authHeaders = { 'Authorization': `Bearer ${token}` };
      const [clientesRes, productosRes] = await Promise.all([
        fetch('/api/clientes', { headers: authHeaders }),
        fetch('/api/productos', { headers: authHeaders }),
      ]);
      const clientesData = await clientesRes.json();
      const productosData = await productosRes.json();
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setProductos(Array.isArray(productosData) ? productosData.filter((p: any) => p.activo) : []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const agregarProducto = (producto: any) => {
    setSeleccionandoId(producto.producto_id);
    setTimeout(() => setSeleccionandoId(null), 300);
    const udsPorCaja = Number(producto.unidades_por_caja) || 1;
    setCarrito((prev: any[]) => {
      const existente = prev.find((p: any) => p.producto_id === producto.producto_id);
      if (existente) {
        const stockOriginal = Number(producto.stock_actual);
        const undEnCarrito = getUndEnCarrito(producto.producto_id);
        const incUnd = existente.tipo_venta === 'caja' ? udsPorCaja : 1;
        if (undEnCarrito + incUnd <= stockOriginal) {
          const nuevaCant = existente.cantidad + 1;
          return prev.map((p: any) => p.producto_id === producto.producto_id ? {
            ...p, cantidad: nuevaCant, subtotal: Number((nuevaCant * p.precio_unitario).toFixed(2))
          } : p);
        }
      } else {
        const tipoVenta = 'unidad';
        const pUnitario = Number(producto.precio_botella) || Number(producto.precio_venta) / udsPorCaja;
        return [...prev, {
          producto_id: producto.producto_id, codigo: producto.codigo, nombre: producto.nombre, cantidad: 1,
          precio_unitario: pUnitario, subtotal: pUnitario,
          stock_actual: Number(producto.stock_actual), tipo_producto: producto.tipo_producto,
          marca: producto.marca, presentacion_ml: producto.presentacion_ml,
          tipo_envase: producto.tipo_envase, unidades_por_caja: udsPorCaja,
          precio_venta: Number(producto.precio_venta),
          precio_botella: Number(producto.precio_botella) || 0,
          tipo_venta: tipoVenta
        }];
      }
      return prev;
    });
  };

  const toggleTipoVenta = (producto_id: any) => {
    setCarrito(carrito.map((p: any) => {
      if (p.producto_id !== producto_id) return p;
      const nuevoTipo = p.tipo_venta === 'caja' ? 'unidad' : 'caja';
      const uds = p.unidades_por_caja || 1;
      const stockOriginal = Math.round(p.stock_actual);
      const undEnCarrito = getUndEnCarrito(producto_id);
      const undActualesItem = p.tipo_venta === 'caja' ? p.cantidad * uds : p.cantidad;
      const restante = stockOriginal - (undEnCarrito - undActualesItem);
      const precioBase = Number(productos.find((pr: any) => pr.producto_id === producto_id)?.precio_venta) || 0;
      const precioBott = Number(productos.find((pr: any) => pr.producto_id === producto_id)?.precio_botella) || 0;
      const nuevoPrecio = nuevoTipo === 'caja' ? precioBase : (precioBott || precioBase / uds);
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
    setCarrito(prev => {
      if (cantidad <= 0) return prev.filter((p: any) => p.producto_id !== producto_id);
      const item = prev.find((p: any) => p.producto_id === producto_id);
      if (!item) return prev;
      const uds = item.unidades_por_caja || 1;
      const stockOriginal = Math.round(item.stock_actual);
      let totalUnd = 0;
      prev.forEach((it: any) => { if (it.producto_id === producto_id) { totalUnd += it.tipo_venta === 'caja' ? it.cantidad * (it.unidades_por_caja || 1) : it.cantidad; } });
      const undActualesItem = item.tipo_venta === 'caja' ? item.cantidad * uds : item.cantidad;
      const restante = stockOriginal - (totalUnd - undActualesItem);
      const maxQty = item.tipo_venta === 'caja' ? Math.floor(restante / uds) : restante;
      if (cantidad <= maxQty) {
        return prev.map((p: any) => p.producto_id === producto_id ? { ...p, cantidad, subtotal: Number((cantidad * p.precio_unitario).toFixed(2)) } : p);
      }
      return prev;
    });
  };

  const eliminarProducto = (producto_id: any) => {
    setCarrito(carrito.filter((p: any) => p.producto_id !== producto_id));
  };

  const total = carrito.reduce((sum: any, p: any) => sum + Number(p.subtotal), 0);

  const productosFiltrados = productos.filter(p => (filtroTipo === 'todos' || p.tipo_producto === filtroTipo) && (!busquedaProducto || p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())));
  const totalPaginasProd = Math.ceil(productosFiltrados.length / itemsPorPagina);
  const productosPagina = productosFiltrados.slice((pageProducto - 1) * itemsPorPagina, pageProducto * itemsPorPagina);

  const imprimirRecibo = () => {
    const w = window.open('', '_blank');
    if (!w || !reciboData) return;
    let html = '<html><head><title>Recibo</title><style>body{font-family:monospace;padding:20px;font-size:14px}table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;text-align:left}th{border-bottom:2px solid #000}td{border-bottom:1px solid #ccc}.total{font-weight:bold;font-size:16px;margin-top:10px}.text-right{text-align:center}</style></head><body>';
    html += '<h2 style="text-align:center">Licorer&iacute;a KN</h2><h3 style="text-align:center">RECIBO DE VENTA</h3>';
    html += '<p><strong>Factura:</strong> #' + (reciboData.venta?.numero_factura || reciboData.venta?.venta_id) + '</p>';
    html += '<p><strong>Fecha:</strong> ' + new Date(reciboData.venta?.fecha_venta).toLocaleDateString('es-ES') + '</p>';
    html += '<p><strong>Cliente:</strong> ' + reciboData.cliente_nombre + '</p>';
    html += '<table><thead><tr><th>Codigo</th><th>Producto</th><th class="text-right">Cant</th><th class="text-right">P.Unit</th><th class="text-right">Subtotal</th></tr></thead><tbody>';
    (reciboData.detalle || []).forEach(function(d: any) {
      const cant = Math.round(Number(d.cantidad));
      html += '<tr><td>' + (d.producto_codigo || '') + '</td><td>' + d.producto_nombre + '</td><td class="text-right">' + cant + ' ' + (d.tipo_venta === 'caja' ? 'caja' : 'und') + '</td><td class="text-right">Bs ' + formatPrice(d.precio_unitario) + '</td><td class="text-right">Bs ' + formatPrice(d.subtotal) + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div class="total"><p><strong>Total: Bs ' + formatPrice(reciboData.venta?.total || total) + '</strong></p></div>';
    html += '<p>M&eacute;todo de pago: ' + metodoPago + '</p>';
    if (reciboData.monto_recibido) {
      html += '<p>Monto recibido: Bs ' + formatPrice(reciboData.monto_recibido) + '</p>';
      html += '<p>Cambio: Bs ' + formatPrice(reciboData.cambio) + '</p>';
    }
    html += '</body></html>';
    w.document.write(html);
    w.document.close();
    w.print();
  };

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
      const res = await fetch('/api/clientes', {
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
      setClienteSearch('');
      setShowClienteModal(false);
      setNuevoCliente({ nit_ci: '', nombre: '', telefono: '' });
      setClienteErrors({ nit_ci: '', nombre: '', telefono: '' });
      setClienteBackendError('');
    } catch (e: any) {
      setClienteBackendError('Error de conexión con el servidor');
    }
  };

  const registrarVenta = async () => {
    if (guardando) return;
    if (carrito.length === 0) {
      setErrorMessage('Agrega productos al carrito');
      setShowError(true);
      return;
    }
    if (metodoPago === 'efectivo' && (!montoRecibido || Number(montoRecibido) < total)) {
      setErrorMessage('El monto recibido debe ser mayor o igual al total');
      setShowError(true);
      return;
    }
    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { cliente_id: clienteId || null, descuento: 0, total, metodo_pago: metodoPago, observaciones, productos: carrito.map((p: any) => ({ producto_id: p.producto_id, cantidad: p.cantidad, tipo_venta: p.tipo_venta || 'unidad', precio_unitario: p.precio_unitario, subtotal: p.subtotal })) };
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || 'Error al registrar la venta');
        setShowError(true);
        setGuardando(false);
        return;
      }
      const data = await res.json();
      const detalleRecibo = carrito.map((p: any) => ({
        producto_codigo: p.codigo,
        producto_nombre: p.nombre,
        cantidad: p.cantidad,
        tipo_venta: p.tipo_venta || 'unidad',
        precio_unitario: p.precio_unitario,
        subtotal: p.subtotal
      }));
      const cambioCalculado = metodoPago === 'efectivo' ? Number(montoRecibido) - total : 0;
      setReciboData({ venta: data, detalle: detalleRecibo, monto_recibido: metodoPago === 'efectivo' ? Number(montoRecibido) : null, cambio: cambioCalculado, cliente_nombre: clienteId ? (clientes.find((c: any) => c.cliente_id === Number(clienteId))?.nombre || '---') : 'N/A' });
      setCambio(cambioCalculado);
      setShowRecibo(true);
      setCarrito([]);
      setClienteId('');
      setClienteSearch('');
      setMontoRecibido('');
      setObservaciones('');
      setGuardando(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      setErrorMessage('Error al registrar la venta. Intenta nuevamente.');
      setShowError(true);
      setGuardando(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Nueva Venta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={() => { setFiltroTipo('todos'); setPageProducto(1); }} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${filtroTipo === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Todos</button>
                <button onClick={() => { setFiltroTipo('bebida'); setPageProducto(1); }} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${filtroTipo === 'bebida' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Bebidas</button>
                <button onClick={() => { setFiltroTipo('snack'); setPageProducto(1); }} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${filtroTipo === 'snack' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Snacks</button>
                <button onClick={() => { setFiltroTipo('otro'); setPageProducto(1); }} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${filtroTipo === 'otro' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Otros</button>
                <input type="text" value={busquedaProducto} onChange={e => { setBusquedaProducto(e.target.value); setPageProducto(1); }} placeholder="Buscar producto..." className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 sm:ml-auto" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productosPagina.map((p: any) => {
                  const stockOriginal = Math.round(Number(p.stock_actual));
                  const info = getCajasYNovedades(stockOriginal, Number(p.unidades_por_caja) || 1);
                  return (
                    <div key={p.producto_id} onClick={() => agregarProducto(p)} className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${seleccionandoId === p.producto_id ? 'border-green-500 bg-green-100 scale-95 shadow-lg shadow-green-200' : 'border-gray-200 hover:border-green-500 hover:bg-green-50'}`}>
                      <div className="flex items-center gap-1 mb-2">
                        <span className={`px-3 py-0.5 rounded-[5px] text-sm font-medium ${p.tipo_producto === 'bebida' ? 'bg-blue-300 text-blue-900' : 'bg-orange-300 text-orange-900'}`}>
                          {p.tipo_producto}
                        </span>
                      </div>
                      <p className="font-medium text-base text-gray-800">{p.nombre}</p>
                      <p className="text-sm text-gray-500">{p.marca ? `Marca: ${p.marca}` : ''}{p.marca && p.presentacion_ml ? ' | ' : ''}{p.presentacion_ml ? `${Math.round(Number(p.presentacion_ml))}${p.tipo_producto === 'bebida' ? 'ml' : 'kg'}` : ''}</p>
                      <p className="text-sm text-gray-500">{p.tipo_envase ? `Envase: ${p.tipo_envase}` : ''}</p>
                      <div className="flex justify-between items-center mt-3">
                        <div>
                          <p className="text-green-600 font-bold text-sm">Bs {formatPrice(p.precio_venta)} <span className="text-xs font-normal text-gray-500">/caja</span></p>
                          {p.precio_botella ? <p className="text-green-600 font-bold text-sm">Bs {formatPrice(p.precio_botella)} <span className="text-xs font-normal text-gray-500">/botella</span></p> : null}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Stock: {formatStockFromUnd(stockOriginal, Number(p.unidades_por_caja) || 1)}</p>
                          <p className="text-xs text-gray-400">{p.unidades_por_caja} und/caja &rarr; {info.totalUnd} und</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPaginasProd > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
                  <span className="text-sm text-gray-500">{(pageProducto - 1) * itemsPorPagina + 1}-{Math.min(pageProducto * itemsPorPagina, productosFiltrados.length)} de {productosFiltrados.length}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPageProducto(p => Math.max(1, p - 1))} disabled={pageProducto === 1} className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {Array.from({ length: Math.min(totalPaginasProd, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPaginasProd <= 5) { pageNum = i + 1; }
                      else if (pageProducto <= 3) { pageNum = i + 1; }
                      else if (pageProducto >= totalPaginasProd - 2) { pageNum = totalPaginasProd - 4 + i; }
                      else { pageNum = pageProducto - 2 + i; }
                      return (
                        <button key={pageNum} onClick={() => setPageProducto(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${pageProducto === pageNum ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}>
                          {pageNum}
                        </button>
                      );
                    })}
                    <button onClick={() => setPageProducto(p => Math.min(totalPaginasProd, p + 1))} disabled={pageProducto === totalPaginasProd} className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Seleccionar Cliente</h2>
                <button onClick={() => setShowClienteModal(true)} className="text-green-600 hover:text-green-700 text-sm font-medium cursor-pointer">+ Nuevo Cliente</button>
              </div>
              <div className="relative">
                <input type="text" placeholder="Buscar cliente por nombre o NIT..." value={clienteId ? (clientes.find((c: any) => c.cliente_id === Number(clienteId))?.nombre || '') : clienteSearch} onChange={e => { setClienteSearch(e.target.value); setShowClienteDropdown(true); setClienteId(''); }} onFocus={() => setShowClienteDropdown(true)} onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)} className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-800 shadow-sm" />
                {showClienteDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <div onMouseDown={() => { setClienteId(''); setClienteSearch(''); setShowClienteDropdown(false); }} className="px-4 py-3 hover:bg-gray-100 cursor-pointer text-gray-400 text-sm italic border-b border-gray-100">
                      N/A - Sin cliente
                    </div>
                    {clientes.filter((c: any) => !clienteSearch || c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || c.nit_ci.includes(clienteSearch)).map((c: any) => (
                      <div key={c.cliente_id} onMouseDown={() => { setClienteId(c.cliente_id); setClienteSearch(''); setShowClienteDropdown(false); }} className="px-4 py-3 hover:bg-gray-100 cursor-pointer text-gray-800 text-sm">{c.nombre} ({c.nit_ci})</div>
                    ))}
                    {clientes.filter((c: any) => !clienteSearch || c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || c.nit_ci.includes(clienteSearch)).length === 0 && (
                      <div className="px-4 py-2 text-gray-400 text-sm">Sin resultados</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Carrito
                <span className="ml-auto text-sm font-normal text-gray-400">{carrito.length} producto{carrito.length !== 1 ? 's' : ''}</span>
              </h2>
              {carrito.length === 0 ? (
                <div className="text-gray-400 text-center py-8 flex flex-col items-center gap-2">
                  <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  <p className="text-sm">Sin productos en el carrito</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {carrito.map((p: any) => {
                    const uds = p.unidades_por_caja || 1;
                    const totalUnd = Math.round(p.stock_actual);
                    const cajasStock = Math.floor(totalUnd / uds);
                    const undStock = totalUnd % uds;
                    const descontarUnd = p.tipo_venta === 'caja' ? p.cantidad * uds : p.cantidad;
                    const restante = totalUnd - descontarUnd;
                    const cajasRest = restante >= 0 ? Math.floor(restante / uds) : 0;
                    const undRest = restante >= 0 ? restante % uds : 0;
                    return (
                      <div key={p.producto_id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                         <div className="flex items-stretch gap-3 w-auto">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-base text-gray-800 truncate">{p.nombre}</p>
                              <span className={`px-2 py-0.5 rounded-[5px] text-xs font-medium shrink-0 ${p.tipo_producto === 'bebida' ? 'bg-blue-300 text-blue-900' : 'bg-orange-300 text-orange-900'}`}>
                                {p.tipo_producto}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {p.marca ? `${p.marca} | ` : ''}
                              {p.presentacion_ml ? `${p.presentacion_ml}${p.tipo_producto === 'bebida' ? 'ml' : 'kg'} | ` : ''}
                              {p.tipo_envase ? `${p.tipo_envase} | ` : ''}
                              <span className="font-medium text-gray-700">Bs {formatPrice(p.precio_unitario)}</span>
                              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[11px] font-medium ml-1.5">
                                /{p.tipo_venta === 'caja' ? 'caja' : 'unidad'}
                              </span>
                            </p>
                            <p className="text-sm text-gray-400 mt-1.5">
                              <span className="text-gray-500">Stock:</span> <span className="font-medium text-gray-600">{cajasStock} cajas | {undStock} und</span>
                              <span className="mx-1.5 text-gray-300">&rarr;</span>
                              <span className="text-gray-500">Queda:</span> <span className="font-medium text-gray-600">{cajasRest} cajas | {undRest} und</span>
                            </p>
                            {p.tipo_producto !== 'snack' && (
                              <button onClick={() => toggleTipoVenta(p.producto_id)} className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                <svg className={`w-3.5 h-3.5 transition-transform duration-500 ${p.tipo_venta === 'unidad' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                {p.tipo_venta === 'caja' ? 'Vender por unidad' : 'Vender por caja'}
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col items-stretch gap-2 shrink-0">
                              <div className="text-center self-center !w-auto">
                              <p className="font-bold text-green-600 text-xl w-full">Bs {formatPrice(p.subtotal)}</p>
                              <button onClick={() => eliminarProducto(p.producto_id)} className="mt-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors font-medium border border-red-200 cursor-pointer">
                                Eliminar
                              </button>
                            </div>
                            <div className="flex items-center bg-gray-100 rounded-md">
                              <button onClick={() => actualizarCantidad(p.producto_id, p.cantidad - 1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded-l-md transition-colors cursor-pointer text-sm font-bold">-</button>
                              <input type="text" inputMode="numeric" value={editQtyId === p.producto_id ? editQtyVal : String(p.cantidad)} onFocus={() => { setEditQtyId(p.producto_id); setEditQtyVal(String(p.cantidad)); }} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setEditQtyVal(v); if (v !== '') actualizarCantidad(p.producto_id, parseInt(v, 10)); }} onBlur={e => { const v = e.target.value.replace(/[^0-9]/g, ''); actualizarCantidad(p.producto_id, v === '' ? 1 : parseInt(v, 10)); setEditQtyId(null); }} className="w-9 h-7 text-center text-sm font-semibold text-gray-800 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                              <button onClick={() => actualizarCantidad(p.producto_id, p.cantidad + 1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded-r-md transition-colors cursor-pointer text-sm font-bold">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Total</h2>
              <p className="text-4xl font-bold text-green-600 mb-6">Bs {formatPrice(total)}</p>

              <label className="block text-base font-semibold text-gray-700 mb-2">Método de Pago</label>
              <CustomSelect value={metodoPago} onChange={setMetodoPago} className="w-56 md:w-full mb-5" options={[
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'tarjeta', label: 'Tarjeta' },
                { value: 'qr', label: 'QR' },
              ]} />

              {metodoPago === 'efectivo' && (
                <div className="mb-5">
                  <label className="block text-base font-semibold text-gray-700 mb-2">Monto recibido (Bs)</label>
                  <input type="number" value={montoRecibido} onChange={e => { setMontoRecibido(e.target.value); setCambio(Number(e.target.value) - total); }} className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-800 shadow-sm text-base" />
                  {Number(montoRecibido) >= total && <p className="text-sm text-green-600 mt-1 font-medium">Cambio: Bs {formatPrice(Number(montoRecibido) - total)}</p>}
                  {Number(montoRecibido) > 0 && Number(montoRecibido) < total && <p className="text-sm text-red-600 mt-1 font-medium">Faltan Bs {formatPrice(total - Number(montoRecibido))}</p>}
                </div>
              )}

              <label className="block text-base font-semibold text-gray-700 mb-2">Observaciones</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5 bg-white text-gray-800 shadow-sm text-base" rows={2} />

              <button onClick={registrarVenta} disabled={carrito.length === 0 || guardando || (metodoPago === 'efectivo' && (!montoRecibido || Number(montoRecibido) < total))} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-200 cursor-pointer">
                {guardando ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Guardando...</> : 'Registrar Venta'}
              </button>
            </div>
          </div>
        </div>

      {showClienteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-800 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">Nuevo Cliente</h2>
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
                <input type="text" name="telefono" placeholder="Número de teléfono" value={nuevoCliente.telefono} onChange={handleClienteChange} maxLength={8} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${clienteErrors.telefono ? 'border-red-500' : 'border-gray-300'}`} />
                {clienteErrors.telefono && <p className="text-red-500 text-sm mt-1">{clienteErrors.telefono}</p>}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold flex items-center justify-center gap-2 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar
                </button>
                <button type="button" onClick={() => setShowClienteModal(false)} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                className="w-full bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecibo && reciboData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-800 p-6 text-center text-white">
              <h2 className="text-2xl font-bold">RECIBO DE VENTA</h2>
              <p className="text-sm opacity-80"> Drew Grand Reserve</p>
            </div>
            <div className="p-6">
              <div className="text-sm text-gray-600 border-b pb-3 mb-4">
                <p><span className="font-semibold">Factura:</span> #{reciboData.venta?.numero_factura || reciboData.venta?.venta_id}</p>
                <p><span className="font-semibold">Fecha:</span> {new Date(reciboData.venta?.fecha_venta).toLocaleDateString('es-ES')}</p>
                <p><span className="font-semibold">Cliente:</span> {reciboData.cliente_nombre}</p>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-600 font-semibold">Codigo</th>
                      <th className="text-left py-2 text-gray-600 font-semibold">Producto</th>
                      <th className="text-center py-2 text-gray-600 font-semibold">Cant.</th>
                      <th className="text-right py-2 text-gray-600 font-semibold">P. Unit.</th>
                      <th className="text-right py-2 text-gray-600 font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reciboData.detalle || []).map((d: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-800 font-mono">{d.producto_codigo || ''}</td>
                        <td className="py-2 text-gray-800">{d.producto_nombre}</td>
                        <td className="py-2 text-center text-gray-800">{Math.round(Number(d.cantidad))} {d.tipo_venta === 'caja' ? 'caja' : 'und'}</td>
                      <td className="py-2 text-right text-gray-800">Bs {formatPrice(d.precio_unitario)}</td>
                      <td className="py-2 text-right text-gray-800 font-medium">Bs {formatPrice(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>Bs {formatPrice(reciboData.venta?.subtotal || total)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Descuento</span><span>Bs {formatPrice(reciboData.venta?.descuento || 0)}</span></div>
                <div className="flex justify-between text-lg font-bold text-gray-800"><span>Total</span><span>Bs {formatPrice(reciboData.venta?.total || total)}</span></div>
                <div className="flex justify-between text-gray-600 pt-1"><span>Método de pago</span><span className="capitalize">{metodoPago}</span></div>
                {reciboData.monto_recibido && (
                  <>
                    <div className="flex justify-between text-gray-600"><span>Monto recibido</span><span>Bs {formatPrice(reciboData.monto_recibido)}</span></div>
                    <div className="flex justify-between text-green-600 font-bold"><span>Cambio</span><span>Bs {formatPrice(reciboData.cambio)}</span></div>
                  </>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3 border-t">
              <button onClick={imprimirRecibo} className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 font-semibold cursor-pointer">
                Imprimir
              </button>
              <button onClick={() => setShowRecibo(false)} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
