/**
 * @jest-environment node
 */

interface AvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

function isOpenNow(availability: AvailabilityRow[] | undefined, now: Date): boolean {
  if (!availability || availability.length === 0) return false;
  const dayOfWeek = now.getDay();
  const todaySlots = availability.filter((a) => a.day_of_week === dayOfWeek && a.is_available);
  if (todaySlots.length === 0) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return todaySlots.some((slot) => {
    const [openH, openM] = slot.start_time.split(':').map(Number);
    const [closeH, closeM] = slot.end_time.split(':').map(Number);
    const openMinutes = (openH ?? 0) * 60 + (openM ?? 0);
    const closeMinutes = (closeH ?? 0) * 60 + (closeM ?? 0);
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  });
}

const hasActiveFilters = (search?: string, cuisines?: string[], minRating?: number, sortBy?: string): boolean =>
  Boolean(search || (cuisines && cuisines.length > 0) || minRating || (sortBy && sortBy !== 'default'));

describe('Chef Search & Discovery (Task 10)', () => {
  describe('isOpenNow', () => {
    it('returns true when current time is within availability slot', () => {
      // Wednesday = day 3, at 12:00
      const now = new Date('2026-05-06T12:00:00');
      const avail: AvailabilityRow[] = [
        { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
      ];
      expect(isOpenNow(avail, now)).toBe(true);
    });

    it('returns false when current time is outside availability slot', () => {
      const now = new Date('2026-05-06T20:00:00');
      const avail: AvailabilityRow[] = [
        { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
      ];
      expect(isOpenNow(avail, now)).toBe(false);
    });

    it('returns false when no availability data', () => {
      const now = new Date('2026-05-06T12:00:00');
      expect(isOpenNow(undefined, now)).toBe(false);
      expect(isOpenNow([], now)).toBe(false);
    });

    it('returns false when day has no slots', () => {
      // Wednesday = day 3, but only Monday (1) configured
      const now = new Date('2026-05-06T12:00:00');
      const avail: AvailabilityRow[] = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
      ];
      expect(isOpenNow(avail, now)).toBe(false);
    });

    it('returns false when slot exists but is_available is false', () => {
      const now = new Date('2026-05-06T12:00:00');
      const avail: AvailabilityRow[] = [
        { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: false },
      ];
      expect(isOpenNow(avail, now)).toBe(false);
    });

    it('returns true at exact start_time', () => {
      const now = new Date('2026-05-06T09:00:00');
      const avail: AvailabilityRow[] = [
        { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
      ];
      expect(isOpenNow(avail, now)).toBe(true);
    });

    it('handles multiple slots on same day', () => {
      // Lunch break: 11-14 and 17-21
      const now = new Date('2026-05-06T18:00:00');
      const avail: AvailabilityRow[] = [
        { day_of_week: 3, start_time: '11:00', end_time: '14:00', is_available: true },
        { day_of_week: 3, start_time: '17:00', end_time: '21:00', is_available: true },
      ];
      expect(isOpenNow(avail, now)).toBe(true);
    });
  });

  describe('hasActiveFilters', () => {
    it('returns false with no filters', () => {
      expect(hasActiveFilters()).toBe(false);
      expect(hasActiveFilters(undefined, [], undefined, 'default')).toBe(false);
    });

    it('returns true with search text', () => {
      expect(hasActiveFilters('Italian')).toBe(true);
    });

    it('returns true with selected cuisines', () => {
      expect(hasActiveFilters(undefined, ['Mexican'])).toBe(true);
    });

    it('returns true with min rating', () => {
      expect(hasActiveFilters(undefined, undefined, 4.0)).toBe(true);
    });

    it('returns true with non-default sort', () => {
      expect(hasActiveFilters(undefined, undefined, undefined, 'rating')).toBe(true);
    });
  });
});
