import { describe, it, expect } from 'vitest';
import { evaluateEarnedBadges, BADGE_DEFINITIONS } from '../../shared/badgeDefinitions.js';

describe('Badge and Achievement System Tests', () => {
  it('defines 7 distinct badges', () => {
    expect(BADGE_DEFINITIONS.length).toBe(7);
    const ids = BADGE_DEFINITIONS.map(b => b.id);
    expect(new Set(ids).size).toBe(7);
  });

  it('awards zero_restow badge when evaluation has 0 restows and positive profit', () => {
    const evalData = { restowCount: 0, netProfit: 10000000, revenue: 10000000 };
    const session = { week: 2, totalWeeks: 11 };
    const players = [{ id: 'p1', isBot: false, cash: 160000000 }];
    
    const { allEarned, newlyEarned } = evaluateEarnedBadges(evalData, session, players, []);
    expect(allEarned).toContain('zero_restow');
    expect(newlyEarned.some(b => b.id === 'zero_restow')).toBe(true);
  });

  it('awards profit_max when cash snapshot reaches 250M', () => {
    const evalData = { cashSnapshot: 260000000, restowCount: 1 };
    const session = { week: 8, totalWeeks: 11 };
    const players = [{ id: 'p1', isBot: false, cash: 260000000 }];

    const { allEarned } = evaluateEarnedBadges(evalData, session, players, []);
    expect(allEarned).toContain('profit_max');
  });

  it('awards bot_beater when human player exceeds Bot Smart cash', () => {
    const evalData = { restowCount: 0 };
    const session = { week: 11, totalWeeks: 11, isGameOver: true };
    const players = [
      { id: 'human', isBot: false, cash: 250000000 },
      { id: 'bot1', isBot: true, personality: 'SMART', cash: 200000000 },
      { id: 'bot2', isBot: true, personality: 'GREEDY', cash: 180000000 }
    ];

    const { allEarned } = evaluateEarnedBadges(evalData, session, players, []);
    expect(allEarned).toContain('bot_beater');
  });

  it('does not re-award already earned badges in newlyEarned', () => {
    const evalData = { restowCount: 0, netProfit: 5000000 };
    const session = { week: 3 };
    const players = [{ id: 'p1', isBot: false, cash: 150000000 }];

    const { newlyEarned } = evaluateEarnedBadges(evalData, session, players, ['zero_restow']);
    expect(newlyEarned.some(b => b.id === 'zero_restow')).toBe(false);
  });
});
