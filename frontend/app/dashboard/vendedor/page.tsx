'use client';

import { useEffect, useState } from 'react';

export default function VendedorDashboard() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');

    if (!token || rol !== 'vendedor') {
      window.location.href = '/login';
      return;
    }

    setUsername(localStorage.getItem('username') || '');
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-700 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Licorería KN - Vendedor</h1>
          <div className="flex items-center gap-4">
            <span>Bienvenido, {username}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 px-4 py-1 rounded hover:bg-red-600"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-8">
        <h2 className="text-2xl font-bold mb-6">Panel de Vendedor</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer">
            <h3 className="text-lg font-semibold text-green-700">Nueva Venta</h3>
            <p className="text-gray-600">Registrar una nueva venta</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer">
            <h3 className="text-lg font-semibold text-green-700">Consultar Stock</h3>
            <p className="text-gray-600">Verificar disponibilidad de productos</p>
          </div>
        </div>
      </main>
    </div>
  );
}
