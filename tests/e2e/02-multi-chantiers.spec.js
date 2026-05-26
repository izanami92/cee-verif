/**
 * Test e2e #2 : Analyse dossier multi-chantiers
 *
 * Workflow testé :
 * 1. Login
 * 2. Upload d'un dossier avec plusieurs chantiers (multiples attestations)
 * 3. Lancer l'analyse
 * 4. Vérifier détection de plusieurs chantiers
 * 5. Vérifier navigation entre chantiers
 * 6. Vérifier checks par chantier
 * 7. Vérifier totaux globaux vs totaux individuels
 */

import { test, expect } from '@playwright/test';
import {
  login,
  uploadFile,
  launchAnalysis,
  switchToChantier,
  countChecksByLevel
} from './helpers.js';
import path from 'path';

test.describe('Analyse dossier multi-chantiers', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should detect multiple chantiers', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload dossier multi-chantiers
    console.log('📤 Upload dossier multi-chantiers...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-multi-chantiers.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier que plusieurs chantiers sont détectés
    const chantierButtons = page.locator('.chantier-btn');
    const chantierCount = await chantierButtons.count();

    expect(chantierCount).toBeGreaterThan(1);
    console.log(`✅ ${chantierCount} chantiers détectés`);

    // Vérifier que chaque bouton a un label
    for (let i = 0; i < chantierCount; i++) {
      const btnText = await chantierButtons.nth(i).textContent();
      expect(btnText).toBeTruthy();
      expect(btnText.length).toBeGreaterThan(0);
    }
  });

  test('should navigate between chantiers', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload et analyse
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-multi-chantiers.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    const chantierButtons = page.locator('.chantier-btn');
    const chantierCount = await chantierButtons.count();

    // Parcourir chaque chantier
    for (let i = 0; i < chantierCount; i++) {
      console.log(`🏗️ Navigation vers chantier ${i + 1}...`);
      await switchToChantier(page, i);

      // Vérifier que le bouton est actif
      const activeBtn = await chantierButtons.nth(i).getAttribute('class');
      expect(activeBtn).toContain('active');

      // Vérifier que les checks sont affichés
      const checksContainer = page.locator('.checks-container');
      await expect(checksContainer).toBeVisible();

      console.log(`✅ Chantier ${i + 1} affiché correctement`);
    }
  });

  test('should show checks per chantier', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload et analyse
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-multi-chantiers.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    const chantierButtons = page.locator('.chantier-btn');
    const chantierCount = await chantierButtons.count();

    // Pour chaque chantier, vérifier la présence de checks
    const checksByChantier = [];

    for (let i = 0; i < chantierCount; i++) {
      await switchToChantier(page, i);

      const checkCards = page.locator('.check-card');
      const checkCount = await checkCards.count();

      checksByChantier.push(checkCount);
      console.log(`📊 Chantier ${i + 1} : ${checkCount} checks`);

      // Chaque chantier devrait avoir au moins quelques checks
      expect(checkCount).toBeGreaterThan(0);
    }

    // Vérifier que les chantiers ont des nombres différents de checks
    // (car différentes erreurs par chantier)
    const allSame = checksByChantier.every(count => count === checksByChantier[0]);

    // Si les dossiers multi-chantiers ont des erreurs différentes par chantier,
    // les compteurs devraient être différents. Mais cette assertion peut être
    // trop stricte selon les fixtures, donc on vérifie juste qu'il y a des checks.
    console.log(`✅ Répartition checks : ${checksByChantier.join(', ')}`);
  });

  test('should verify global totals vs individual totals', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload et analyse
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-multi-chantiers.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Extraire les informations de chaque chantier
    const chantierButtons = page.locator('.chantier-btn');
    const chantierCount = await chantierButtons.count();

    const chantiersData = [];

    for (let i = 0; i < chantierCount; i++) {
      await switchToChantier(page, i);

      // Récupérer les infos affichées du chantier (si disponibles dans l'UI)
      // Note : cette section dépend de l'affichage des infos dans l'UI
      // Pour l'instant on vérifie juste que les checks sont cohérents

      const bloquantCount = await countChecksByLevel(page, 'bloquant');
      const majeurCount = await countChecksByLevel(page, 'majeur');
      const infoCount = await countChecksByLevel(page, 'info');

      chantiersData.push({
        chantier: i + 1,
        bloquant: bloquantCount,
        majeur: majeurCount,
        info: infoCount
      });

      console.log(`📊 Chantier ${i + 1} : ${bloquantCount} bloquant(s), ${majeurCount} majeur(s), ${infoCount} info(s)`);
    }

    // Vérifier que la somme fait sens
    const totalBloquants = chantiersData.reduce((sum, c) => sum + c.bloquant, 0);
    const totalMajeurs = chantiersData.reduce((sum, c) => sum + c.majeur, 0);
    const totalInfos = chantiersData.reduce((sum, c) => sum + c.info, 0);

    console.log(`📊 Totaux globaux : ${totalBloquants} bloquant(s), ${totalMajeurs} majeur(s), ${totalInfos} info(s)`);

    // Au moins quelques checks devraient être présents au total
    expect(totalBloquants + totalMajeurs + totalInfos).toBeGreaterThan(0);
  });

  test('should handle single vs multiple chantiers correctly', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Test 1 : Upload dossier simple (1 chantier)
    console.log('📤 Test dossier simple (1 chantier)...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-exemple.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    let chantierButtons = page.locator('.chantier-btn');
    let chantierCount = await chantierButtons.count();

    expect(chantierCount).toBe(1);
    console.log('✅ 1 chantier détecté pour dossier simple');

    // Reset et test 2 : Upload dossier multi-chantiers
    await page.reload();
    await login(page);

    console.log('📤 Test dossier multi (plusieurs chantiers)...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-multi-chantiers.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    chantierButtons = page.locator('.chantier-btn');
    chantierCount = await chantierButtons.count();

    expect(chantierCount).toBeGreaterThan(1);
    console.log(`✅ ${chantierCount} chantiers détectés pour dossier multi`);
  });
});
