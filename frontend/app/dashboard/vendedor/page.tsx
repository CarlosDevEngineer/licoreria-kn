'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'];

export default function VendedorDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState({ productos: 0, ventas: 0 });
  const [ventasData, setVentasData] = useState([]);
  const [productosData, setProductosData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    if (!token || rol !== 'vendedor') {
      window.location.href = '/login';
      return;
    }
    setUsername(localStorage.getItem('username') || '');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productos, ventas] = await Promise.all([
        fetch('http://localhost:3001/api/productos').then(r => r.json()),
        fetch('http://localhost:3001/api/ventas', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}).then(r => r.json()),
      ]);
      
      const ventasCompletadas = Array.isArray(ventas) ? ventas.filter((v: any) => v.estado === 'completada') : [];
      const productosActivos = Array.isArray(productos) ? productos.filter((p: any) => p.activo) : [];
      
      setStats({
        productos: productosActivos.length,
        ventas: ventasCompletadas.length,
      });

      if (Array.isArray(productos) && productos.length > 0) {
        const topProductos = productos.slice(0, 6).map((p: any) => ({
          name: p.nombre?.substring(0, 12) || 'Sin nombre',
          stock: p.stock_actual || 0,
        }));
        setProductosData(topProductos);
      } else {
        setProductosData([]);
      }

      if (Array.isArray(ventas) && ventas.length > 0) {
        const misVentas = ventas.filter((v: any) => v.estado === 'completada');
        const ventasPorMes: any = {};
        misVentas.forEach((v: any) => {
          const fecha = new Date(v.fecha_venta || v.fecha);
          if (isNaN(fecha.getTime())) return;
          const mes = fecha.toLocaleString('es-ES', { month: 'short' });
          const key = mes.charAt(0).toUpperCase() + mes.slice(1);
          if (!ventasPorMes[key]) ventasPorMes[key] = { name: key, monthIdx: fecha.getMonth(), ventas: 0 };
          ventasPorMes[key].ventas += Number(v.total) || 0;
        });
        const mesesData = Object.values(ventasPorMes).sort((a: any, b: any) => a.monthIdx - b.monthIdx);
        setVentasData(mesesData.length > 0 ? mesesData : [{ name: 'Sin datos', ventas: 0 }]);
      } else {
        setVentasData([{ name: 'Sin datos', ventas: 0 }]);
      }
    } catch (e) {
      console.error(e);
      setVentasData([{ name: 'Error', ventas: 0 }]);
      setProductosData([]);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: 'Nueva Venta', description: 'Registrar una nueva venta', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z', href: '/dashboard/vendedor/nueva-venta', bg: 'bg-gray-800' },
    { title: 'Productos', value: stats.productos, description: 'Ver productos disponibles', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', href: '/dashboard/vendedor/productos', bg: 'bg-gray-600' },
    { title: 'Mis Ventas', value: stats.ventas, description: 'Ver historial de ventas', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', href: '/dashboard/vendedor/ventas', bg: 'bg-gray-500' },
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel de Vendedor</h1>
        <p className="text-gray-500">Bienvenido, {username}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => router.push(card.href)}
            className="bg-white p-6 rounded-2xl shadow hover:shadow-lg cursor-pointer transition-all"
          >
            <div className={`${card.bg} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{card.title} {card.value && `- ${card.value}`}</h3>
            <p className="text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Mis Ventas por Mes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ventasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }} />
              <Bar dataKey="ventas" fill="#6b7280" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Stock Disponible</h3>
          {productosData.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productosData.map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className={`px-3 py-2 text-right ${p.stock < 5 ? 'text-red-600 font-bold' : p.stock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No hay productos registrados
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Tendencia de Mis Ventas</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={ventasData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }} />
            <Line type="monotone" dataKey="ventas" stroke="#374151" strokeWidth={3} dot={{ fill: '#374151', strokeWidth: 2, r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
