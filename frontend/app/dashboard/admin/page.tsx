'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const fmt = (n: number) => Math.round(n).toLocaleString('es');

export default function AdminDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState({ usuarios: 0, clientes: 0, productos: 0, ventas: 0 });
  const [ventasData, setVentasData] = useState<any[]>([]);
  const [topProductos, setTopProductos] = useState<any[]>([]);
  const [bajoStock, setBajoStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    if (!token || rol !== 'admin') {
      window.location.href = '/login';
      return;
    }
    setUsername(localStorage.getItem('username') || '');
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    const authHeader = { 'Authorization': `Bearer ${token}` };
    try {
      const [usuarios, clientes, productos, ventas, topRes] = await Promise.all([
        fetch('/api/auth/users', { headers: authHeader }).then(r => r.json()),
        fetch('/api/clientes', { headers: authHeader }).then(r => r.json()),
        fetch('/api/productos', { headers: authHeader }).then(r => r.json()),
        fetch('/api/ventas', { headers: authHeader }).then(r => r.json()),
        fetch('/api/ventas/productos-mas-vendidos', { headers: authHeader }).then(r => r.json()),
      ]);

      const ventasCompletadas = Array.isArray(ventas) ? ventas.filter((v: any) => v.estado === 'completada') : [];
      const productosActivos = Array.isArray(productos) ? productos.filter((p: any) => p.activo) : [];

      setBajoStock(
        productosActivos
          .filter((p: any) => Math.floor(Number(p.stock_actual) / (Number(p.unidades_por_caja) || 1)) <= 8)
          .sort((a: any, b: any) => Math.floor(Number(a.stock_actual) / (Number(a.unidades_por_caja) || 1)) - Math.floor(Number(b.stock_actual) / (Number(b.unidades_por_caja) || 1)))
          .slice(0, 8)
      );

      setStats({
        usuarios: Array.isArray(usuarios) ? usuarios.length : 0,
        clientes: Array.isArray(clientes) ? clientes.length : 0,
        productos: Array.isArray(productos) ? productos.length : 0,
        ventas: ventasCompletadas.length,
      });

      if (Array.isArray(topRes) && topRes.length > 0) {
        setTopProductos(topRes.slice(0, 8).map((p: any) => {
          const uds = Number(p.total_unidades_vendidas) || 0;
          const upc = Number(p.unidades_por_caja) || 1;
          const cajas = Math.floor(uds / upc);
          const rawName = p.nombre || 'Sin nombre';
          const displayName = `${rawName} (${upc} und/caja)`;
          return {
            name: displayName.length > 24 ? displayName.substring(0, 24) + '...' : displayName,
            vendido: cajas,
            unidades: upc,
            totalUds: uds,
            veces: Number(p.veces_vendido) || 0,
            fullName: displayName,
          };
        }));
      } else {
        setTopProductos([]);
      }

      if (Array.isArray(ventas) && ventas.length > 0) {
        const ventasAgrupadas = ventas.filter((v: any) => v.estado === 'completada').reduce((acc: any, v: any) => {
          const fecha = new Date(v.fecha_venta || v.fecha);
          if (isNaN(fecha.getTime())) return acc;
          const key = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          const timestamp = fecha.setHours(0, 0, 0, 0);
          if (!acc[key]) acc[key] = { name: key, dayTs: timestamp, ventas: 0 };
          acc[key].ventas += Number(v.total) || 0;
          return acc;
        }, {});
        const diasOrdenados = Object.values(ventasAgrupadas).sort((a: any, b: any) => a.dayTs - b.dayTs);
        setVentasData(diasOrdenados.length > 0 ? diasOrdenados : [{ name: 'Sin datos', ventas: 0 }]);
      } else {
        setVentasData([{ name: 'Sin datos', ventas: 0 }]);
      }
    } catch (e: any) {
      console.error(e);
      setVentasData([{ name: 'Error', ventas: 0 }]);
      setTopProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: 'Usuarios', value: stats.usuarios, bg: 'bg-gray-800', href: '/dashboard/admin/usuarios' },
    { title: 'Clientes', value: stats.clientes, bg: 'bg-gray-600', href: '/dashboard/admin/clientes' },
    { title: 'Productos', value: stats.productos, bg: 'bg-gray-500', href: '/dashboard/admin/productos' },
    { title: 'Ventas', value: stats.ventas, bg: 'bg-gray-900', href: '/dashboard/admin/ventas' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel de Administrador</h1>
        <p className="text-gray-500">Bienvenido, {username}</p>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => router.push(card.href)}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-2xl shadow hover:shadow-lg cursor-pointer transition-all"
          >
            <div className={`${card.bg} w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-2 md:mb-4`}>
              <span className="text-white text-sm sm:text-lg md:text-2xl font-bold">{card.value}</span>
            </div>
            <h3 className="text-gray-800 font-semibold text-xs sm:text-sm md:text-base leading-tight">{card.title}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Ventas por Día</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ventasData.slice(-5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(v: any) => `Bs ${fmt(Number(v))}`} />
              <Tooltip
                formatter={(value: any) => [`Bs ${fmt(Number(value))}`, 'Ventas']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }}
              />
              <Bar dataKey="ventas" fill="#374151" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Productos más vendidos</h3>
          {topProductos.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProductos} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis type="category" dataKey="name" stroke="#6b7280" width={180} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any, name: any, props: any) => {
                    const cajas = Number(value) || 0;
                    const upc = props?.payload?.unidades || 1;
                    return [`${cajas} caja${cajas !== 1 ? 's' : ''} (${cajas * upc} und)`, 'Vendido'];
                  }}
                  labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }}
                />
                <Bar dataKey="vendido" fill="#374151" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No hay ventas registradas
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Tendencia de Ventas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ventasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(v: any) => `Bs ${fmt(Number(v))}`} />
              <Tooltip
                formatter={(value: any) => [`Bs ${fmt(Number(value))}`, 'Ventas']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }}
              />
              <Legend />
              <Line type="monotone" dataKey="ventas" stroke="#374151" strokeWidth={3} dot={{ fill: '#374151', strokeWidth: 2, r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Productos en bajo stock</h3>
          {bajoStock.length > 0 ? (
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {bajoStock.map((p: any) => {
                const uds = Number(p.unidades_por_caja) || 1;
                const totalUnd = Number(p.stock_actual) || 0;
                const cajas = Math.floor(totalUnd / uds);
                const undSueltas = totalUnd % uds;
                const stockLabel = undSueltas > 0 ? `${cajas} caja${cajas !== 1 ? 's' : ''} | ${undSueltas} und` : `${cajas} caja${cajas !== 1 ? 's' : ''}`;
                return (
                  <div key={p.producto_id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                      <p className="text-xs text-gray-500">{p.categoria || 'Sin categoría'}{p.marca ? ` · ${p.marca}` : ''}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg ${cajas === 0 ? 'bg-red-200 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {stockLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Todos los productos tienen stock suficiente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
