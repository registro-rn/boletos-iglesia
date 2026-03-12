'use client';

import { useState } from 'react';
import type { Registro, Nacion } from '@/types';

interface Props {
  registros: Registro[];
  naciones: Nacion[];
  onSelect: (r: Registro) => void;
  onRefresh: () => void;
}

export default function RegistrosList({ registros, naciones, onSelect, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterNacion, setFilterNacion] = useState<string>('todos');

  const filtered = registros.filter(r => {
    const matchSearch = !search || r.nombre.toLowerCase().includes(search.toLowerCase()) ||
      r.telefono?.includes(search) || r.correo?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || r.status === filterStatus;
    const matchNacion = filterNacion === 'todos' || r.nacion_id === filterNacion;
    return matchSearch && matchStatus && matchNacion;
  });

  const statusColors: Record<string, string> = {
    pendiente: 'bg-red-500/20 text-red-400 border-red-500/30',
    abono: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    liquidado: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  const statusLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    abono: 'Abono',
    liquidado: 'Liquidado',
  };

  const totalRecaudado = filtered.reduce((s, r) => s + Number(r.monto_pagado), 0);
  const totalPorCobrar = filtered.reduce((s, r) => s + (Number(r.monto_total) - Number(r.monto_pagado)), 0);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o correo..."
          className="flex-1 min-w-[250px] px-4 py-2.5 rounded-lg text-sm border bg-transparent"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="abono">Abono</option>
          <option value="liquidado">Liquidado</option>
        </select>
        <select
          value={filterNacion}
          onChange={e => setFilterNacion(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <option value="todos">Todas las naciones</option>
          {naciones.map(n => (
            <option key={n.id} value={n.id}>{n.nombre}</option>
          ))}
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{filtered.length}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Registros</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-2xl font-bold text-emerald-400">{filtered.filter(r => r.status === 'liquidado').length}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Liquidados</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-2xl font-bold text-emerald-400">${totalRecaudado.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Recaudado</div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-2xl font-bold text-amber-400">${totalPorCobrar.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Por cobrar</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-bg)' }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Nombre</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Nación</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Asientos</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Status</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Pagado</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Total</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const saldo = Number(r.monto_total) - Number(r.monto_pagado);
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="cursor-pointer transition-colors hover:bg-white/5 border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <td className="px-4 py-3 font-medium">{r.nombre}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: (r as any).nacion?.color || '#666' }}
                      />
                      <span className="text-xs truncate max-w-[140px]" style={{ color: 'var(--color-text-muted)' }}>
                        {(r as any).nacion?.nombre || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(r.asientos || []).map((a: any) => (
                        <span key={a.id} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                          {a.id}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${statusColors[r.status]}`}>
                      {statusLabels[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">${Number(r.monto_pagado).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text-muted)' }}>${Number(r.monto_total).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {saldo > 0 ? (
                      <span className="text-amber-400 font-medium">${saldo.toLocaleString()}</span>
                    ) : (
                      <span className="text-emerald-400">$0</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  No se encontraron registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
