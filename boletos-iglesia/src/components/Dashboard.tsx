'use client';

import { useState } from 'react';
import type { Registro, Asiento, Nacion } from '@/types';

interface Props {
  registros: Registro[];
  asientos: Asiento[];
  naciones: Nacion[];
}

// Configura aquí la fecha de tu evento
const EVENT_DATE = new Date('2026-05-15T00:00:00');

export default function Dashboard({ registros, asientos, naciones }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Simple PIN protection — change this PIN to whatever you want
  const DASHBOARD_PIN = '1234';

  const handlePinSubmit = () => {
    if (pin === DASHBOARD_PIN) {
      setAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-xl p-8 border text-center w-full max-w-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ background: 'rgba(0, 188, 212, 0.1)' }}>
            🔒
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Dashboard Ejecutivo
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Ingresa el PIN para acceder
          </p>
          <div className="space-y-3">
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
              placeholder="PIN"
              maxLength={10}
              className="w-full px-4 py-3 rounded-lg text-center text-2xl tracking-[0.5em] border bg-transparent"
              style={{
                borderColor: pinError ? 'var(--color-danger)' : 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              autoFocus
            />
            {pinError && (
              <p className="text-xs text-red-400">PIN incorrecto, intenta de nuevo</p>
            )}
            <button
              onClick={handlePinSubmit}
              className="w-full py-3 rounded-lg font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), #0097a7)', fontFamily: 'var(--font-display)' }}
            >
              Acceder
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- METRICS ----
  const totalRegistrados = registros.length;
  const boletosLiquidados = registros.filter(r => r.status === 'liquidado').length;
  const boletosAbono = registros.filter(r => r.status === 'abono').length;
  const boletosPendientes = registros.filter(r => r.status === 'pendiente').length;

  const totalAsientosOcupados = asientos.filter(a => a.estado === 'ocupado').length;
  const totalAsientosDisponibles = asientos.filter(a => a.estado === 'disponible').length;
  const totalAsientos = asientos.filter(a => a.estado !== 'no_disponible').length;
  const porcentajeOcupacion = totalAsientos > 0 ? Math.round((totalAsientosOcupados / totalAsientos) * 100) : 0;

  const totalRecaudado = registros.reduce((s, r) => s + Number(r.monto_pagado), 0);
  const totalPorCobrar = registros.reduce((s, r) => s + (Number(r.monto_total) - Number(r.monto_pagado)), 0);
  const totalVenta = registros.reduce((s, r) => s + Number(r.monto_total), 0);

  // Days until event
  const now = new Date();
  const diffTime = EVENT_DATE.getTime() - now.getTime();
  const diasParaEvento = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Ranking by nación
  const nacionRanking = naciones
    .map(n => {
      const regs = registros.filter(r => r.nacion_id === n.id);
      return {
        ...n,
        count: regs.length,
        liquidados: regs.filter(r => r.status === 'liquidado').length,
        recaudado: regs.reduce((s, r) => s + Number(r.monto_pagado), 0),
      };
    })
    .filter(n => n.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxNacionCount = nacionRanking.length > 0 ? nacionRanking[0].count : 1;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Dashboard Ejecutivo
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Resumen general del evento
          </p>
        </div>
        <button
          onClick={() => setAuthenticated(false)}
          className="px-3 py-1.5 rounded-lg text-xs border transition-all hover:border-red-500 hover:text-red-400"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          🔒 Cerrar dashboard
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Días para el evento */}
        <div className="rounded-xl p-5 border relative overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'var(--color-accent)', transform: 'translate(30%, -30%)' }} />
          <div className="text-4xl font-bold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
            {diasParaEvento}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Días para el evento
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {EVENT_DATE.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Gente registrada */}
        <div className="rounded-xl p-5 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {totalRegistrados}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Personas registradas
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {totalAsientosOcupados} asientos ocupados
          </div>
        </div>

        {/* Boletos liquidados */}
        <div className="rounded-xl p-5 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-4xl font-bold text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>
            {boletosLiquidados}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Boletos liquidados
          </div>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] text-amber-400">{boletosAbono} abonos</span>
            <span className="text-[10px] text-red-400">{boletosPendientes} pendientes</span>
          </div>
        </div>

        {/* Total recaudado */}
        <div className="rounded-xl p-5 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-4xl font-bold text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>
            ${totalRecaudado.toLocaleString()}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Total recaudado
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            de ${totalVenta.toLocaleString()} en ventas
          </div>
        </div>

        {/* Saldo por cobrar */}
        <div className="rounded-xl p-5 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-4xl font-bold text-amber-400" style={{ fontFamily: 'var(--font-display)' }}>
            ${totalPorCobrar.toLocaleString()}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Saldo por cobrar
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {boletosAbono + boletosPendientes} personas con saldo
          </div>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="rounded-xl p-6 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Ocupación del Venue</h3>
          <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>{porcentajeOcupacion}%</span>
        </div>
        <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${porcentajeOcupacion}%`,
              background: porcentajeOcupacion > 80
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : porcentajeOcupacion > 50
                ? 'linear-gradient(90deg, #00bcd4, #4dd0e1)'
                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>{totalAsientosOcupados} ocupados</span>
          <span>{totalAsientosDisponibles} disponibles</span>
        </div>
      </div>

      {/* Payment progress */}
      <div className="rounded-xl p-6 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Progreso de Cobranza</h3>
          <span className="text-sm font-bold text-emerald-400">
            {totalVenta > 0 ? Math.round((totalRecaudado / totalVenta) * 100) : 0}%
          </span>
        </div>
        <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${totalVenta > 0 ? (totalRecaudado / totalVenta) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #10b981, #34d399)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>${totalRecaudado.toLocaleString()} cobrado</span>
          <span>${totalPorCobrar.toLocaleString()} pendiente</span>
        </div>
      </div>

      {/* Nación ranking */}
      <div className="rounded-xl p-6 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h3 className="font-bold mb-5" style={{ fontFamily: 'var(--font-display)' }}>
          Ranking por Nación
        </h3>

        {nacionRanking.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin registros aún</p>
        ) : (
          <div className="space-y-3">
            {nacionRanking.map((n, i) => (
              <div key={n.id} className="flex items-center gap-4">
                {/* Position */}
                <div className="w-8 text-center">
                  {i === 0 ? (
                    <span className="text-xl">🥇</span>
                  ) : i === 1 ? (
                    <span className="text-xl">🥈</span>
                  ) : i === 2 ? (
                    <span className="text-xl">🥉</span>
                  ) : (
                    <span className="text-sm font-bold" style={{ color: 'var(--color-text-muted)' }}>
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Color dot + name */}
                <div className="flex items-center gap-2 w-64 flex-shrink-0">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: n.color }} />
                  <span className="text-sm font-medium truncate">{n.nombre}</span>
                </div>

                {/* Bar */}
                <div className="flex-1 h-8 rounded-lg overflow-hidden relative" style={{ background: 'var(--color-bg)' }}>
                  <div
                    className="h-full rounded-lg transition-all duration-700 flex items-center px-3"
                    style={{
                      width: `${Math.max(10, (n.count / maxNacionCount) * 100)}%`,
                      background: `${n.color}40`,
                      borderLeft: `3px solid ${n.color}`,
                    }}
                  >
                    <span className="text-xs font-bold whitespace-nowrap">{n.count} inscritos</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 flex-shrink-0 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-emerald-400">{n.liquidados}</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>liquidados</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold" style={{ color: 'var(--color-accent)' }}>
                      ${n.recaudado.toLocaleString()}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>recaudado</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status distribution */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '3px solid rgba(239, 68, 68, 0.3)' }}>
            <span className="text-2xl font-bold text-red-400" style={{ fontFamily: 'var(--font-display)' }}>
              {boletosPendientes}
            </span>
          </div>
          <div className="text-sm font-medium">Pendientes</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin pago registrado</div>
        </div>
        <div className="rounded-xl p-5 border text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.1)', border: '3px solid rgba(245, 158, 11, 0.3)' }}>
            <span className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'var(--font-display)' }}>
              {boletosAbono}
            </span>
          </div>
          <div className="text-sm font-medium">Con abono</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pago parcial</div>
        </div>
        <div className="rounded-xl p-5 border text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '3px solid rgba(16, 185, 129, 0.3)' }}>
            <span className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>
              {boletosLiquidados}
            </span>
          </div>
          <div className="text-sm font-medium">Liquidados</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pago completo</div>
        </div>
      </div>
    </div>
  );
}
