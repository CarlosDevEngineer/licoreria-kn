'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;
const SOLO_DIGITOS = /^\d*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', nit: '', direccion: '', celular: '', contacto: '', activo: true });
  const [errors, setErrors] = useState({ nombre: '', nit: '', celular: '', contacto: '' });
  const [backendError, setBackendError] = useState('');
  const [duplicados, setDuplicados] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/proveedores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProveedores(Array.isArray(data) ? data : []);
    } catch (e: any) {
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
    if (name === 'nit') {
      if (!SOLO_DIGITOS.test(value)) {
        error = 'El NIT solo puede contener números';
      } else if (value.length < 7 || value.length > 12) {
        error = 'El NIT debe tener entre 7 y 12 dígitos';
      }
    }
    if (name === 'celular' && value) {
      if (!SOLO_DIGITOS.test(value)) {
        error = 'El celular solo puede contener números';
      } else if (value.length !== 8) {
        error = 'El celular debe tener 8 dígitos';
      }
    }
    if (name === 'contacto' && value && !EMAIL_REGEX.test(value)) {
      error = 'Ingrese un correo electrónico válido';
    }
    setErrors((prev: any) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm({ ...form, [name]: val });
    setBackendError('');
    setDuplicados(prev => prev.filter(c => c !== name));
    if (['nombre', 'nit', 'celular', 'contacto'].includes(name)) {
      validarCampo(name, value);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const errNombre = validarCampo('nombre', form.nombre);
    const errNit = validarCampo('nit', form.nit);
    const errTel = validarCampo('celular', form.celular);
    const errEmail = validarCampo('contacto', form.contacto);
    if (errNombre || errNit || errTel || errEmail) return;

    const token = localStorage.getItem('token');
    setBackendError('');
    try {
      const res = await fetch(
        editando
          ? `/api/proveedores/${editando}`
          : '/api/proveedores',
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
        if (data.campos) {
          setDuplicados(data.campos);
        }
        return;
      }
      setShowModal(false);
      setEditando(null);
      setForm({ nombre: '', nit: '', direccion: '', celular: '', contacto: '', activo: true });
      setErrors({ nombre: '', nit: '', celular: '', contacto: '' });
      setDuplicados([]);
      setBackendError('');
      fetchProveedores();
    } catch (e: any) {
      setBackendError('Error de conexión con el servidor');
    }
  };

  const handleEdit = (p: any) => {
    setEditando(p.proveedor_id);
    setForm({ nombre: p.nombre, nit: p.nit, direccion: p.direccion || '', celular: p.celular || '', contacto: p.contacto || '', activo: p.activo });
    setErrors({ nombre: '', nit: '', celular: '', contacto: '' });
    setDuplicados([]);
    setBackendError('');
    setShowModal(true);
  };

  const abrirNuevo = () => {
    setShowModal(true);
    setEditando(null);
    setForm({ nombre: '', nit: '', direccion: '', celular: '', contacto: '', activo: true });
    setErrors({ nombre: '', nit: '', celular: '', contacto: '' });
    setDuplicados([]);
    setBackendError('');
  };

  const handleDelete = (id: any) => {
    setItemToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/proveedores/${itemToDelete}`, {
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
      fetchProveedores();
    }
    setShowConfirm(false);
    setItemToDelete(null);
  };

  const itemsPorPagina = 10;
  const filtrados = busqueda ? proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nit.includes(busqueda)
  ) : proveedores;
  const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
  const dataPaginada = filtrados.slice((page - 1) * itemsPorPagina, page * itemsPorPagina);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
        <button onClick={abrirNuevo} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      <div className="mb-4">
        <input type="text" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1); }} placeholder="Buscar proveedor por nombre o NIT..." className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 shadow-sm" />
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase"></th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">NIT</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Celular</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dataPaginada.map((p, idx) => (
              <tr key={p.proveedor_id} className="hover:bg-gray-50">
                <td className="px-6 py-7 text-gray-800 text-base">{idx + 1}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{p.nombre}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{p.nit}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{p.celular || '-'}</td>
                <td className="px-6 py-7 text-gray-800 text-base">{p.contacto || '-'}</td>
                <td className="px-6 py-7">
                  <span className={`px-2 py-1 rounded-full text-xs ${p.activo ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-7">
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-800 cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(p.proveedor_id)} className="text-red-600 hover:text-red-800 cursor-pointer">
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
            <span className="text-sm text-gray-500">{(page - 1) * itemsPorPagina + 1}-{Math.min(page * itemsPorPagina, filtrados.length)} de {filtrados.length}</span>
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
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gray-800 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                <p className="text-xs text-gray-300">{editando ? 'Modifica los datos del proveedor' : 'Ingresa los datos del nuevo proveedor'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="ml-auto text-white/70 hover:text-white cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {backendError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">{backendError}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 text-gray-800 ${duplicados.includes('nombre') ? 'border-red-700' : errors.nombre ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">NIT</label>
                <input type="text" name="nit" value={form.nit} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 text-gray-800 ${duplicados.includes('nit') ? 'border-red-700' : errors.nit ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.nit && <p className="text-red-500 text-sm mt-1">{errors.nit}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                <input type="text" name="direccion" value={form.direccion} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Celular</label>
                <input type="text" name="celular" value={form.celular} onChange={handleChange} maxLength={8} className={`w-full border rounded-lg px-4 py-2 text-gray-800 ${duplicados.includes('celular') ? 'border-red-700' : errors.celular ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.celular && <p className="text-red-500 text-sm mt-1">{errors.celular}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                <input type="email" name="contacto" value={form.contacto} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 text-gray-800 ${duplicados.includes('contacto') ? 'border-red-700' : errors.contacto ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.contacto && <p className="text-red-500 text-sm mt-1">{errors.contacto}</p>}
              </div>
              <label className="flex items-center gap-2 text-gray-800">
                <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
                <span>Activo</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition-colors cursor-pointer">Guardar</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-100 text-gray-800 transition-colors cursor-pointer">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        title="Eliminar Proveedor"
        message="¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}