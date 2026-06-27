'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;
const SOLO_DIGITOS = /^\d*$/;

export default function ClientesVendedorPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ nit_ci: '', nombre: '', telefono: '' });
  const [errors, setErrors] = useState({ nombre: '', nit_ci: '', telefono: '' });
  const [backendError, setBackendError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/clientes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const validarCampo = (name: any, value: any) => {
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
    setErrors((prev: any) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setBackendError('');
    if (['nombre', 'nit_ci', 'telefono'].includes(name)) {
      validarCampo(name, value);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const errNombre = validarCampo('nombre', form.nombre);
    const errNit = validarCampo('nit_ci', form.nit_ci);
    const errTel = validarCampo('telefono', form.telefono);
    if (errNombre || errNit || errTel) return;

    const token = localStorage.getItem('token');
    setBackendError('');
    try {
      const res = await fetch(
        editando
          ? `/api/clientes/${editando}`
          : '/api/clientes',
        {
          method: editando ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setBackendError(data.error || 'Error al guardar');
        return;
      }
      setShowModal(false);
      setEditando(null);
      setForm({ nit_ci: '', nombre: '', telefono: '' });
      setErrors({ nombre: '', nit_ci: '', telefono: '' });
      setBackendError('');
      fetchClientes();
    } catch (e: any) {
      setBackendError('Error de conexión con el servidor');
    }
  };

  const handleEdit = (c: any) => {
    setEditando(c.cliente_id);
    setForm({ nit_ci: c.nit_ci, nombre: c.nombre, telefono: c.telefono || '' });
    setErrors({ nombre: '', nit_ci: '', telefono: '' });
    setBackendError('');
    setShowModal(true);
  };

  const abrirNuevo = () => {
    setShowModal(true);
    setEditando(null);
    setForm({ nit_ci: '', nombre: '', telefono: '' });
    setErrors({ nombre: '', nit_ci: '', telefono: '' });
    setBackendError('');
  };

  const handleDelete = (id: any) => {
    setItemToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/clientes/${itemToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert('Error al eliminar: ' + (data.error || 'Error desconocido'));
        setShowConfirm(false);
        setItemToDelete(null);
        return;
      }
      fetchClientes();
    }
    setShowConfirm(false);
    setItemToDelete(null);
  };

  const clientesFiltrados = clientes.filter((c: any) => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.nit_ci.toLowerCase().includes(busqueda.toLowerCase())
  );
  const itemsPorPagina = 10;
  const totalPaginas = Math.ceil(clientesFiltrados.length / itemsPorPagina);
  const clientesPaginados = clientesFiltrados.slice((page - 1) * itemsPorPagina, page * itemsPorPagina);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button onClick={abrirNuevo} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Cliente
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Buscar por nombre o NIT/CI..." value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1); }} className="w-full md:w-1/3 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 placeholder-gray-400 shadow-sm" />
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase"></th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">NIT/CI</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Teléfono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
{clientesPaginados.map((c, idx) => (
              <tr key={c.cliente_id} className="hover:bg-gray-50">
                <td className="px-6 py-7 text-gray-800 text-base">{(page - 1) * itemsPorPagina + idx + 1}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{c.nit_ci}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{c.nombre}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{c.telefono || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {clientesFiltrados.length === 0 && (
          <p className="text-center text-gray-500 py-8">No se encontraron clientes</p>
        )}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-6 py-5 border-t bg-gray-50/80">
            <span className="text-sm text-gray-500">{(page - 1) * itemsPorPagina + 1}-{Math.min(page * itemsPorPagina, clientesFiltrados.length)} de {clientesFiltrados.length}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPaginas <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPaginas - 2) {
                    pageNum = totalPaginas - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${page === pageNum ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}
                disabled={page === totalPaginas}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-800 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {backendError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl text-sm">{backendError}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">NIT/CI</label>
                <input type="text" name="nit_ci" placeholder="Ingrese NIT o CI (7-12 dígitos)" value={form.nit_ci} onChange={handleChange} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errors.nit_ci ? 'border-red-500' : 'border-gray-300'}`} required />
                {errors.nit_ci && <p className="text-red-500 text-sm mt-1">{errors.nit_ci}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                <input type="text" name="nombre" placeholder="Nombre completo" value={form.nombre} onChange={handleChange} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errors.nombre ? 'border-red-500' : 'border-gray-300'}`} required />
                {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                <input type="text" name="telefono" value={form.telefono} onChange={handleChange} maxLength={8} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errors.telefono ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.telefono && <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors font-semibold flex items-center justify-center gap-2 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
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

      <ConfirmModal
        isOpen={showConfirm}
        title="Eliminar Cliente"
        message="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}