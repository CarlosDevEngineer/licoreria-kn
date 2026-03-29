'use client';

import { useEffect } from 'react';

export default function Dashboard() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');

    if (!token) {
      window.location.href = '/login';
    } else {
      window.location.href = rol === 'admin' ? '/dashboard/admin' : '/dashboard/vendedor';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
    </div>
  );
}
