'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'];

export default function AdminDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState({ usuarios: 0, clientes: 0, productos: 0, ventas: 0 });
  const [ventasData, setVentasData] = useState([]);
  const [productosData, setProductosData] = useState([]);
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
      const [usuarios, clientes, productos, ventas] = await Promise.all([
        fetch('http://localhost:3001/api/auth/users', { headers: authHeader }).then(r => r.json()),
        fetch('http://localhost:3001/api/clientes', { headers: authHeader }).then(r => r.json()),
        fetch('http://localhost:3001/api/productos', { headers: authHeader }).then(r => r.json()),
        fetch('http://localhost:3001/api/ventas', { headers: authHeader }).then(r => r.json()),
      ]);
      
      const ventasCompletadas = Array.isArray(ventas) ? ventas.filter((v: any) => v.estado === 'completada') : [];
      const productosActivos = Array.isArray(productos) ? productos.filter((p: any) => p.activo) : [];
      
      setStats({
        usuarios: Array.isArray(usuarios) ? usuarios.length : 0,
        clientes: Array.isArray(clientes) ? clientes.length : 0,
        productos: Array.isArray(productos) ? productos.length : 0,
        ventas: ventasCompletadas.length,
      });

      if (Array.isArray(productos) && productos.length > 0) {
        const topProductos = productos.slice(0, 6).map((p: any) => ({
          name: p.nombre?.substring(0, 12) || 'Sin nombre',
          stock: p.stock_actual || 0,
          precio: p.precio_venta || 0,
        }));
        setProductosData(topProductos);
      } else {
        setProductosData([]);
      }

      if (Array.isArray(ventas) && ventas.length > 0) {
        const ventasAgrupadas = ventas.filter((v: any) => v.estado === 'completada').reduce((acc: any, v: any) => {
          const fecha = new Date(v.fecha_venta || v.fecha);
          if (isNaN(fecha.getTime())) return acc;
          const mes = fecha.toLocaleDateString('es-ES', { month: 'long' });
          const key = mes.charAt(0).toUpperCase() + mes.slice(1);
          if (!acc[key]) acc[key] = { name: key, monthIdx: fecha.getMonth(), ventas: 0 };
          acc[key].ventas += Number(v.total) || 0;
          return acc;
        }, {});
        const mesesOrdenados = Object.values(ventasAgrupadas).sort((a: any, b: any) => a.monthIdx - b.monthIdx);
        setVentasData(mesesOrdenados.length > 0 ? mesesOrdenados : [{ name: 'Sin datos', ventas: 0 }]);
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => router.push(card.href)}
            className="bg-white p-6 rounded-2xl shadow hover:shadow-lg cursor-pointer transition-all"
          >
            <div className={`${card.bg} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
              <span className="text-white text-2xl font-bold">{card.value}</span>
            </div>
            <h3 className="text-gray-800 font-semibold">{card.title}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Ventas por Mes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ventasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }} />
              <Bar dataKey="ventas" fill="#374151" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Stock de Productos</h3>
          {productosData.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productosData.map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className={`px-3 py-2 text-right ${p.stock < 5 ? 'text-red-600 font-bold' : p.stock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>{p.stock}</td>
                    <td className="px-3 py-2 text-right">Bs {p.precio}</td>
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
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Tendencia de Ventas</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={ventasData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }} />
            <Legend />
            <Line type="monotone" dataKey="ventas" stroke="#374151" strokeWidth={3} dot={{ fill: '#374151', strokeWidth: 2, r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
