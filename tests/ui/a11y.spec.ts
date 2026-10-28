import { test, expect } from '../fixtures';
import { A11Y_PAGES, COLOR_SCHEMES } from '../data/a11y';

test.describe('Accessibility (axe, WCAG 2.1 AA)', () => {
  for (const { name, path, known = [] } of A11Y_PAGES) {
    for (const scheme of COLOR_SCHEMES) {
      const tag = name === 'home' && scheme === 'dark' ? '@smoke' : '@regression';
      test(`${tag} ${name} (${scheme}) has no accessibility violations beyond the known baseline`, async ({ page, axe }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await expect(page.locator('main, [role=main], body').first()).toBeVisible();
        const { violations } = await axe().analyze();

        const unexpected = violations
          .filter((v) => {
            const k = known.find((x) => x.rule === v.id);
            return !k || v.nodes.length > k.maxNodes;
          })
          .map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nodes): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);

        const fixed = known.filter((k) => !violations.some((v) => v.id === k.rule)).map((k) => k.rule);
        if (fixed.length) test.info().annotations.push({ type: 'a11y-baseline', description: `fixed, remove from tests/data/a11y.ts: ${fixed.join(', ')}` });

        expect(unexpected, 'new accessibility violations').toEqual([]);
      });
    }
  }
});
