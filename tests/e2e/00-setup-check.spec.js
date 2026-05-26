/**
 * Test de vérification de l'infrastructure e2e
 * Ce test vérifie que Playwright et le serveur Vercel fonctionnent correctement
 */

import { test, expect } from '@playwright/test';

test.describe('Setup e2e', () => {
  test('should load the application', async ({ page }) => {
    // Aller sur la page d'accueil
    await page.goto('/');

    // Vérifier que la page de login est affichée
    await expect(page.locator('#loginScreen')).toBeVisible();

    // Vérifier présence du titre
    await expect(page).toHaveTitle(/CEE Vérif/);

    console.log('✅ Infrastructure e2e fonctionnelle');
  });

  test('should have required elements', async ({ page }) => {
    await page.goto('/');

    // Vérifier éléments de login
    await expect(page.locator('#password-input')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();

    console.log('✅ Éléments de login présents');
  });
});
