import {
  CONTROL_CENTER_AREAS,
  getControlCenterSummary,
} from '../control-center-model';

describe('control center model', () => {
  it('covers every core ops-admin domain with a dashboard link', () => {
    const keys = CONTROL_CENTER_AREAS.map((area) => area.key);

    expect(keys).toEqual([
      'live-ops',
      'engine-health',
      'exceptions',
      'dispatch',
      'orders',
      'chefs',
      'drivers',
      'compliance',
      'customers',
      'finance',
      'promos',
      'support',
      'team',
      'settings',
    ]);

    for (const area of CONTROL_CENTER_AREAS) {
      expect(area.href).toMatch(/^\/dashboard/);
      expect(area.signals.length).toBeGreaterThan(0);
      expect(area.actions.length).toBeGreaterThan(0);
    }
  });

  it('summarizes wired areas and action coverage', () => {
    const summary = getControlCenterSummary(CONTROL_CENTER_AREAS);

    expect(summary.totalAreas).toBe(14);
    expect(summary.wiredAreas).toBe(14);
    expect(summary.totalActions).toBeGreaterThanOrEqual(30);
    expect(summary.destructiveDeleteAreas).toEqual([]);
  });
});
