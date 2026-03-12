'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { METODOS_PAGO, PRECIO_BOLETO_DEFAULT } from '@/lib/constants';
import type { Nacion, Registro, Asiento, Pago, MetodoPago } from '@/types';
import SeatMap from '@/components/SeatMap';
import RegistrosList from '@/components/RegistrosList';
import RegistroDetail from '@/components/RegistroDetail';
import Toast from '@/components/Toast';

type Tab = 'nuevo' | 'registros';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('nuevo');
  const [naciones, setNaciones] = useState<Nacion[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [selectedRegistro, setSelectedRegistro] = useState<Registro | null>(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Form state
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [nacionId, setNacionId] = useState('');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [precioBoleto, setPrecioBoleto] = useState(PRECIO_BOLETO_DEFAULT);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    const [nacionesRes, asientosRes, registrosRes] = await Promise.all([
      supabase.from('naciones').select('*').order('nombre'),
      supabase.from('asientos').select('*'),
      supabase.from('registros').select(`
        *,
        nacion:naciones(*),
        asientos(*),
        pagos(*)
      `).order('created_at', { ascending: false }),
    ]);

    if (nacionesRes.data) setNaciones(nacionesRes.data);
    if (asientosRes.data) setAsientos(asientosRes.data);
    if (registrosRes.data) setRegistros(registrosRes.data);
  }, []);

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asientos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const resetForm = () => {
    setNombre('');
    setTelefono('');
    setCorreo('');
    setNacionId('');
    setSelectedSeats([]);
    setMontoPago('');
    setMetodoPago('efectivo');
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) { addToast('error', 'El nombre es requerido'); return; }
    if (!nacionId) { addToast('error', 'Selecciona una nación'); return; }
    if (selectedSeats.length === 0) { addToast('error', 'Selecciona al menos un asiento'); return; }

    const montoTotal = selectedSeats.length * precioBoleto;
    const montoAbono = parseFloat(montoPago) || 0;

    if (montoAbono > montoTotal) {
      addToast('error', 'El abono no puede ser mayor al total');
      return;
    }

    setLoading(true);
    try {
      // 1. Create registro
      const status = montoAbono >= montoTotal ? 'liquidado' : montoAbono > 0 ? 'abono' : 'pendiente';

      const { data: registro, error: regError } = await supabase
        .from('registros')
        .insert({
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          correo: correo.trim() || null,
          nacion_id: nacionId,
          status,
          monto_total: montoTotal,
          monto_pagado: montoAbono,
          precio_boleto: precioBoleto,
        })
        .select()
        .single();

      if (regError) throw regError;

      // 2. Assign seats
      const { error: seatError } = await supabase
        .from('asientos')
        .update({ estado: 'ocupado', registro_id: registro.id })
        .in('id', selectedSeats);

      if (seatError) throw seatError;

      // 3. Record payment if any
      if (montoAbono > 0) {
        const { error: payError } = await supabase
          .from('pagos')
          .insert({
            registro_id: registro.id,
            monto: montoAbono,
            metodo_pago: metodoPago,
          });

        if (payError) throw payError;
      }

      // 4. Send confirmation email if correo exists
      if (correo.trim()) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registroId: registro.id }),
          });
        } catch {
          // Email is non-blocking
          console.log('Email send attempted');
        }
      }

      addToast('success', `Registro creado para ${nombre}. ${status === 'liquidado' ? '¡Boleto liquidado!' : status === 'abono' ? 'Abono registrado.' : 'Pendiente de pago.'}`);
      resetForm();
      fetchData();
    } catch (error: any) {
      addToast('error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seatId: string) => {
    setSelectedSeats(prev =>
      prev.includes(seatId)
        ? prev.filter(s => s !== seatId)
        : [...prev, seatId]
    );
  };

  const montoTotal = selectedSeats.length * precioBoleto;
  const montoAbono = parseFloat(montoPago) || 0;
  const saldoRestante = Math.max(0, montoTotal - montoAbono);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), #0097a7)' }}>
              ✦
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Sistema de Boletos
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Punto de venta — Evento Iglesia 2026
              </p>
            </div>
          </div>

          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg)' }}>
            <button
              onClick={() => { setTab('nuevo'); setSelectedRegistro(null); }}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'nuevo'
                  ? 'text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={tab === 'nuevo' ? { background: 'var(--color-accent)' } : {}}
            >
              + Nuevo Registro
            </button>
            <button
              onClick={() => { setTab('registros'); setSelectedRegistro(null); }}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'registros'
                  ? 'text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={tab === 'registros' ? { background: 'var(--color-accent)' } : {}}
            >
              Registros ({registros.length})
            </button>
          </div>

          {/* Quick stats */}
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg" style={{ color: 'var(--color-accent)' }}>
                {asientos.filter(a => a.estado === 'ocupado').length}
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>Vendidos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-emerald-400">
                {asientos.filter(a => a.estado === 'disponible').length}
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>Disponibles</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-amber-400">
                ${registros.reduce((sum, r) => sum + Number(r.monto_pagado), 0).toLocaleString()}
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>Recaudado</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        {tab === 'nuevo' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
            {/* Seat Map */}
            <div className="rounded-xl p-6 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  Mapa de Asientos
                </h2>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-600/40 border border-emerald-700/50"></span>
                    Disponible
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-cyan-500" style={{ background: 'var(--color-accent)' }}></span>
                    Seleccionado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-cyan-600/30 border border-cyan-600/50"></span>
                    Ocupado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-900/30 border border-red-900/30 opacity-50"></span>
                    No disponible
                  </span>
                </div>
              </div>
              <SeatMap
                asientos={asientos}
                selectedSeats={selectedSeats}
                onSeatClick={handleSeatClick}
              />
            </div>

            {/* Registration Form */}
            <div className="space-y-4">
              <div className="rounded-xl p-6 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                  Datos del Registro
                </h2>

                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Nombre de la persona"
                      className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>

                  {/* Nación */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Nación *
                    </label>
                    <select
                      value={nacionId}
                      onChange={e => setNacionId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm border"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                    >
                      <option value="">Seleccionar nación...</option>
                      {naciones.map(n => (
                        <option key={n.id} value={n.id}>{n.nombre}</option>
                      ))}
                    </select>
                    {nacionId && (
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20"
                          style={{ background: naciones.find(n => n.id === nacionId)?.color }}
                        />
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {naciones.find(n => n.id === nacionId)?.nombre}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      placeholder="10 dígitos"
                      className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>

                  {/* Correo */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={correo}
                      onChange={e => setCorreo(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>

                  {/* Asientos seleccionados */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Asientos seleccionados
                    </label>
                    <div className="min-h-[40px] px-3 py-2 rounded-lg border flex flex-wrap gap-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                      {selectedSeats.length === 0 ? (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          Selecciona asientos del mapa ←
                        </span>
                      ) : (
                        selectedSeats.sort().map(s => (
                          <span key={s} className="px-2 py-0.5 rounded text-xs font-bold text-white"
                            style={{ background: 'var(--color-accent)' }}>
                            {s}
                            <button onClick={() => handleSeatClick(s)} className="ml-1 opacity-60 hover:opacity-100">×</button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment section */}
              <div className="rounded-xl p-6 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                  Pago
                </h2>

                <div className="space-y-4">
                  {/* Precio por boleto */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Precio por boleto
                    </label>
                    <input
                      type="number"
                      value={precioBoleto}
                      onChange={e => setPrecioBoleto(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm border bg-transparent"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Total ({selectedSeats.length} boleto{selectedSeats.length !== 1 ? 's' : ''})
                    </span>
                    <span className="text-xl font-bold">${montoTotal.toLocaleString()}</span>
                  </div>

                  {/* Método de pago */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Método de pago
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {METODOS_PAGO.map(m => (
                        <button
                          key={m.value}
                          onClick={() => setMetodoPago(m.value as MetodoPago)}
                          className={`px-3 py-2 rounded-lg text-sm border transition-all flex items-center gap-2 ${
                            metodoPago === m.value ? 'border-cyan-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                          style={metodoPago === m.value ? { background: 'rgba(0, 188, 212, 0.15)' } : {}}
                        >
                          <span>{m.icon}</span>
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monto de abono */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Monto a pagar (abono o total)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-text-muted)' }}>$</span>
                      <input
                        type="number"
                        value={montoPago}
                        onChange={e => setMontoPago(e.target.value)}
                        placeholder={montoTotal.toString()}
                        className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm border bg-transparent"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <button
                        onClick={() => setMontoPago(montoTotal.toString())}
                        className="text-xs underline"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        Pagar total
                      </button>
                      {saldoRestante > 0 && montoAbono > 0 && (
                        <span className="text-xs text-amber-400">
                          Saldo restante: ${saldoRestante.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !nombre.trim() || !nacionId || selectedSeats.length === 0}
                    className="w-full py-3 rounded-lg font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed glow-pulse"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-accent), #0097a7)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {loading ? 'Procesando...' : 'Registrar Boleto'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'registros' && !selectedRegistro && (
          <RegistrosList
            registros={registros}
            naciones={naciones}
            onSelect={(r) => setSelectedRegistro(r)}
            onRefresh={fetchData}
          />
        )}

        {tab === 'registros' && selectedRegistro && (
          <RegistroDetail
            registro={selectedRegistro}
            naciones={naciones}
            onBack={() => { setSelectedRegistro(null); fetchData(); }}
            onRefresh={fetchData}
            addToast={addToast}
          />
        )}
      </main>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <Toast key={t.id} type={t.type} message={t.message} />
        ))}
      </div>
    </div>
  );
}
