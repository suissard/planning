/**
 * Utilitaires temporels & d'intervalles pour l'Espace Animatrice.
 * Toutes les dates sont manipulées en heure locale du navigateur (Europe/Paris en production).
 */

export const pad = (n) => String(n).padStart(2, '0');

export const idOf = (x) => (x && typeof x === 'object' ? (x.documentId || x.id) : x);

export const fullName = (p) => `${p?.firstName || ''} ${p?.lastName || ''}`.trim();

export const initials = (p) => `${(p?.firstName || '?')[0] || ''}${(p?.lastName || '')[0] || ''}`.toUpperCase();

/** Date -> 'YYYY-MM-DD' (local) */
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' -> Date (minuit local) */
export const parseKey = (k) => {
  const [y, m, d] = String(k).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** 'YYYY-MM-DD' + 'HH:MM[:SS.mmm]' -> Date local */
export const atTime = (k, time) => {
  const d = parseKey(k);
  const [h, mi] = String(time || '00:00').slice(0, 5).split(':').map(Number);
  d.setHours(h || 0, mi || 0, 0, 0);
  return d;
};

/** Date -> 'HH:MM' */
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const addMinutes = (d, n) => new Date(d.getTime() + n * 60000);

/** Lundi 00:00 de la semaine contenant d */
export const mondayOf = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
};

export const diffMinutes = (a, b) => Math.round((b - a) / 60000);

export const fmtDuration = (min) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtDayLong = (k) =>
  capitalize(parseKey(k).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

export const fmtDayShort = (k) =>
  capitalize(parseKey(k).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));

export const fmtDateFull = (d) =>
  capitalize(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

/** Intervalles {s, e} en millisecondes */
export function mergeIntervals(list) {
  const sorted = [...list].filter(i => i.e > i.s).sort((a, b) => a.s - b.s);
  const out = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.s <= last.e) last.e = Math.max(last.e, i.e);
    else out.push({ s: i.s, e: i.e });
  }
  return out;
}

/** base - cuts */
export function subtractIntervals(base, cuts) {
  let result = base.map(b => ({ ...b }));
  for (const c of mergeIntervals(cuts)) {
    const next = [];
    for (const r of result) {
      if (c.e <= r.s || c.s >= r.e) {
        next.push(r);
        continue;
      }
      if (c.s > r.s) next.push({ ...r, e: c.s });
      if (c.e < r.e) next.push({ ...r, s: c.e });
    }
    result = next;
  }
  return result.filter(r => r.e > r.s);
}

/** Répartit des éléments {_start, _end} sur des lignes sans chevauchement */
export function assignLanes(items) {
  const lanesEnd = [];
  const placed = [...items].sort((a, b) => a._start - b._start).map(item => {
    let lane = lanesEnd.findIndex(end => end <= item._start.getTime());
    if (lane === -1) {
      lane = lanesEnd.length;
      lanesEnd.push(0);
    }
    lanesEnd[lane] = item._end.getTime();
    return { item, lane };
  });
  return { placed, laneCount: Math.max(1, lanesEnd.length) };
}

/**
 * Intervalles d'indisponibilité d'un animateur dans une fenêtre [ws, we] d'une journée.
 * - hors des plages hebdomadaires (si configurées)
 * - absences ponctuelles (specificUnavailabilities)
 */
export function unavailableIntervals(fac, dayKey, ws, we) {
  if (!fac) return [];
  const out = [];
  const wsMs = ws.getTime();
  const weMs = we.getTime();
  const wa = fac.weeklyAvailabilities;
  if (wa && typeof wa === 'object' && Object.keys(wa).length > 0) {
    const day = String(parseKey(dayKey).getDay());
    const windows = wa[day] || (day === '0' ? wa['7'] : null) || [];
    const avail = windows
      .filter(w => w && w.start && w.end)
      .map(w => ({ s: atTime(dayKey, w.start).getTime(), e: atTime(dayKey, w.end).getTime() }));
    subtractIntervals([{ s: wsMs, e: weMs }], avail).forEach(i =>
      out.push({ ...i, reason: 'Hors de vos horaires habituels', specific: false })
    );
  }
  (Array.isArray(fac.specificUnavailabilities) ? fac.specificUnavailabilities : []).forEach(u => {
    const s = new Date(u.startDate).getTime();
    const e = new Date(u.endDate).getTime();
    if (!isNaN(s) && !isNaN(e) && s < weMs && e > wsMs) {
      out.push({ s: Math.max(s, wsMs), e: Math.min(e, weMs), reason: u.reason || 'Absence', specific: true });
    }
  });
  return out;
}
