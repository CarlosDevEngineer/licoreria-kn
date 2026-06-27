'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';
import CustomSelect from '@/app/components/CustomSelect';

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;
const SIN_ESPECIALES = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9._-]*$/;

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', username: '', password: '', rol: 'vendedor' });
  const [errors, setErrors] = useState({ nombre: '', username: '' });
  const [backendError, setBackendError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
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
    if (name === 'username' && !SIN_ESPECIALES.test(value)) {
      error = 'El usuario no puede contener caracteres especiales';
    }
    setErrors((prev: any) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setBackendError('');
    if (name === 'nombre' || name === 'username') {
      validarCampo(name, value);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const errNombre = validarCampo('nombre', form.nombre);
    const errUsername = validarCampo('username', form.username);
    if (errNombre || errUsername) return;

    const token = localStorage.getItem('token');
    setBackendError('');
    try {
      let res;
      if (editando) {
        const bodyData: any = { nombre: form.nombre, username: form.username, rol: form.rol };
        if (form.password) bodyData.password = form.password;
        res = await fetch(`/api/auth/users/${editando}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bodyData),
        });
      } else {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(form),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setBackendError(data.error || 'Error al guardar');
        return;
      }
      setShowModal(false);
      setEditando(null);
      setForm({ nombre: '', username: '', password: '', rol: 'vendedor' });
      setErrors({ nombre: '', username: '' });
      setBackendError('');
      fetchUsuarios();
    } catch (e: any) {
      setBackendError('Error de conexión con el servidor');
    }
  };

  const handleEdit = (u: any) => {
    setEditando(u.usuario_id);
    setForm({ nombre: u.nombre, username: u.username, password: '', rol: u.rol });
    setErrors({ nombre: '', username: '' });
    setBackendError('');
    setShowModal(true);
  };

  const abrirNuevo = () => {
    setShowModal(true);
    setEditando(null);
    setForm({ nombre: '', username: '', password: '', rol: 'vendedor' });
    setErrors({ nombre: '', username: '' });
    setBackendError('');
  };

  const handleDelete = (id: any) => {
    setItemToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/auth/users/${itemToDelete}`, {
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
      fetchUsuarios();
    }
    setShowConfirm(false);
    setItemToDelete(null);
  };

  const itemsPorPagina = 10;
  const totalPaginas = Math.ceil(usuarios.length / itemsPorPagina);
  const dataPaginada = usuarios.slice((page - 1) * itemsPorPagina, page * itemsPorPagina);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
        <button onClick={abrirNuevo} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase"></th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Usuario</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Rol</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dataPaginada.map((u, idx) => (
              <tr key={u.usuario_id} className="hover:bg-gray-50">
                <td className="px-6 py-7 text-gray-800 text-base">{idx + 1}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{u.nombre}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{u.username}</td>
                <td className="px-6 py-7">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.rol === 'admin' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    {u.rol === 'admin' ? 'Admin' : 'Vendedor'}
                  </span>
                </td>
                <td className="px-6 py-7">
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-800 cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(u.usuario_id)} className="text-red-600 hover:text-red-800 cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-6 py-5 border-t bg-gray-50/80">
            <span className="text-sm text-gray-500">{(page - 1) * itemsPorPagina + 1}-{Math.min(page * itemsPorPagina, usuarios.length)} de {usuarios.length}</span>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {backendError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl text-sm">{backendError}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                <input type="text" name="nombre" placeholder="Nombre completo" value={form.nombre} onChange={handleChange} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errors.nombre ? 'border-red-500' : 'border-gray-300'}`} required />
                {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario</label>
                <input type="text" name="username" placeholder="Nombre de usuario" value={form.username} onChange={handleChange} className={`w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 ${errors.username ? 'border-red-500' : 'border-gray-300'}`} required />
                {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {editando ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                </label>
                <input type="password" name="password" placeholder={editando ? 'Nueva contraseña' : 'Contraseña'} value={form.password} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800" required={!editando} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rol</label>
                <CustomSelect value={form.rol} onChange={v => handleChange({ target: { name: 'rol', value: v } } as any)} className="w-full" options={[
                  { value: 'vendedor', label: 'Vendedor' },
                  { value: 'admin', label: 'Admin' },
                ]} />
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
        title="Eliminar Usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}