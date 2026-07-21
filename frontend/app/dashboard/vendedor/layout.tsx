'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    if (!token || rol !== 'vendedor') {
      window.location.href = '/login';
      return;
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const menuItems = [
    { href: '/dashboard/vendedor', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Dashboard' },
    { href: '/dashboard/vendedor/nueva-venta', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z', label: 'Nueva Venta' },
    { href: '/dashboard/vendedor/clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Clientes' },
    { href: '/dashboard/vendedor/productos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', label: 'Productos' },
    { href: '/dashboard/vendedor/ventas', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'Mis Ventas' },
  ];

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 md:hidden cursor-pointer"
      >
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar: desktop (static) / mobile (overlay) */}
      <aside
        className={`
          bg-white text-gray-800 flex flex-col
          border-r border-gray-200 shadow-lg
          overflow-hidden
          ${sidebarOpen ? 'w-72' : 'w-20'}
          transition-all duration-300 ease-in-out
          hidden md:flex
        `}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className={`flex items-center gap-3 transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
                <img src="/Logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-800 truncate">Drew Grand Reserve</h1>
                <p className="text-xs text-gray-500">Panel Vendedor</p>
              </div>
            </div>

            {!sidebarOpen && (
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shadow-md mx-auto">
                <img src="/Logo.jpeg" alt="Logo" className="w-full h-full object-cover rounded-xl" />
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                ${pathname === item.href
                  ? 'bg-gray-800 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:bg-gray-200 hover:scale-105'}
                ${!sidebarOpen ? 'justify-center' : ''}
              `}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className={`transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'} whitespace-nowrap`}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-200 mt-auto">
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200
              ${!sidebarOpen ? 'justify-center' : ''}
            `}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'} whitespace-nowrap`}>
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          bg-white text-gray-800 flex flex-col
          border-r border-gray-200 shadow-2xl
          overflow-hidden transition-all duration-300 ease-in-out
          md:hidden
          ${mobileSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
                <img src="/Logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-800 truncate">Drew Grand Reserve</h1>
                <p className="text-xs text-gray-500">Panel Vendedor</p>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                ${pathname === item.href
                  ? 'bg-gray-800 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:bg-gray-200 hover:scale-105'}
              `}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-200 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 w-full"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="whitespace-nowrap">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-100 pt-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}
