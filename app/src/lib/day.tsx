import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { addDays, today } from '@kettle/shared';
import type { Day } from '@kettle/shared';

interface DayContextValue {
  day: Day;
  setDay: (day: Day) => void;
  step: (delta: number) => void;
  goToToday: () => void;
  isToday: boolean;
}

const DayContext = createContext<DayContextValue | null>(null);

/**
 * The selected day is shared across tabs: stepping back a day on Ventes and
 * then opening Stock should show the same day, not silently jump to today.
 */
export function DayProvider({ children }: { children: ReactNode }) {
  const [day, setDay] = useState<Day>(() => today());

  const step = useCallback((delta: number) => setDay((current) => addDays(current, delta)), []);
  const goToToday = useCallback(() => setDay(today()), []);

  const value = useMemo<DayContextValue>(
    () => ({ day, setDay, step, goToToday, isToday: day === today() }),
    [day, step, goToToday],
  );

  return <DayContext.Provider value={value}>{children}</DayContext.Provider>;
}

export function useDay(): DayContextValue {
  const value = useContext(DayContext);
  if (!value) throw new Error('useDay doit être utilisé dans un DayProvider');
  return value;
}

const longFormatter = new Intl.DateTimeFormat('fr-DZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortFormatter = new Intl.DateTimeFormat('fr-DZ', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function parse(day: Day): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export const formatDayLong = (day: Day): string => longFormatter.format(parse(day));
export const formatDayShort = (day: Day): string => shortFormatter.format(parse(day));
