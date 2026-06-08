'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const METODO_COLORS = { efectivo: '#374151', tarjeta: '#6b7280', qr: '#9ca3af' };

export default function ReportesPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ventasRes, productosRes] = await Promise.all([
        fetch('http://localhost:3001/api/ventas', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:3001/api/productos', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      setVentas(await ventasRes.json());
      setProductos(await productosRes.json());
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const ventasFiltradas = ventas.filter((v: any) => v.estado === 'completada');

  const totalVentas = ventasFiltradas.length;
  const totalIngresos = ventasFiltradas.reduce((s: any, v: any) => s + Number(v.total), 0);

  const ventasPorMetodo = Object.entries(
    ventasFiltradas.reduce((acc: any, v: any) => {
      const m = v.metodo_pago || 'otro';
      acc[m] = (acc[m] || 0) + Number(v.total);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const ventasPorDia = Object.entries(
    ventasFiltradas.reduce((acc, v) => {
      const dia = new Date(v.fecha_venta).toLocaleDateString('es-ES');
      acc[dia] = (acc[dia] || 0) + Number(v.total);
      return acc;
    }, {})
  ).map(([name, ventas]) => ({ name, ventas }));

  const productosBajoStock = productos.filter((p: any) => p.activo && Math.floor(Number(p.stock_actual) / (Number(p.unidades_por_caja) || 1)) <= 1);

  const formatStock = (p: any) => {
    const uds = Number(p.unidades_por_caja) || 1;
    const totalUnd = Number(p.stock_actual);
    const cajas = Math.floor(totalUnd / uds);
    const undSueltas = totalUnd % uds;
    if (undSueltas > 0) return `${cajas} caja${cajas !== 1 ? 's' : ''} | ${undSueltas} und suelta${undSueltas !== 1 ? 's' : ''}`;
    return `${cajas} caja${cajas !== 1 ? 's' : ''}`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-gray-800"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de ventas y stock</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Completadas</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Ventas realizadas</p>
          <p className="text-3xl font-bold text-gray-900">{totalVentas}</p>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-green-50 rounded-xl">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Ingresos</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Ingresos totales</p>
          <p className="text-3xl font-bold text-green-600">Bs {totalIngresos.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-red-50 rounded-xl">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Stock bajo</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Productos por reponer</p>
          <p className="text-3xl font-bold text-red-600">{productosBajoStock.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Ventas por día</h3>
          </div>
          {ventasPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={ventasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="ventas" fill="#374151" radius={[8, 8, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-medium">Sin datos para el período seleccionado</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Ventas por método de pago</h3>
          </div>
          {ventasPorMetodo.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={ventasPorMetodo} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: Bs ${value.toFixed(0)}`}>
                  {ventasPorMetodo.map((_, i) => (
                    <Cell key={i} fill={Object.values(METODO_COLORS)[i] || '#d1d5db'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <p className="text-sm font-medium">Sin datos para el período seleccionado</p>
            </div>
          )}
        </div>
      </div>

      {productosBajoStock.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-red-50 rounded-lg">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Productos con stock bajo</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">{productosBajoStock.length} producto(s) necesitan reposición</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock actual</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ud. / caja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productosBajoStock.map((p, idx) => (
                  <tr key={p.producto_id} className="hover:bg-red-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-800">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        {formatStock(p)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 font-medium">{p.unidades_por_caja}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
