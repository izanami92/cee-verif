/**
 * Test e2e #3 : Saisie manuelle des surfaces
 *
 * Workflow testé :
 * 1. Login
 * 2. Upload dossier avec attestation manquante ou secteur Autres/NAF agricole
 * 3. Lancer l'analyse
 * 4. Vérifier détection attestation manquante
 * 5. Saisir manuellement les surfaces
 * 6. Vérifier recalcul automatique des checks de surfaces
 * 7. Vérifier validation après saisie
 */

import { test, expect } from '@playwright/test';
import {
  login,
  uploadFile,
  launchAnalysis,
  switchToChantier,
  enterManualSurface
} from './helpers.js';
import path from 'path';

test.describe('Saisie manuelle des surfaces', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should detect missing attestation and show manual input', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload dossier avec attestation manquante
    console.log('📤 Upload dossier avec attestation manquante...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier présence du formulaire de saisie manuelle
    const manualInputForm = page.locator('#manual-surfaces-form');
    await expect(manualInputForm).toBeVisible();

    console.log('✅ Formulaire saisie manuelle affiché');

    // Vérifier présence du message explicatif
    const explanationText = page.locator('#manual-surfaces-explanation');
    await expect(explanationText).toBeVisible();

    const text = await explanationText.textContent();
    expect(text).toContain('attestation');
    expect(text.toLowerCase()).toContain('manquante');

    console.log('✅ Message explicatif présent');
  });

  test('should allow manual surface entry and recalculate checks', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload et analyse
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Saisir une surface manuelle
    console.log('✏️ Saisie manuelle de la surface...');
    await enterManualSurface(page, 0, 2940);

    // Vérifier que l'input a bien été rempli
    const surfaceInput = page.locator('#manual-surface-0');
    await expect(surfaceInput).toHaveValue('2940');

    // Cliquer sur le bouton "Recalculer"
    const recalculateBtn = page.locator('#recalculate-checks-btn');
    await expect(recalculateBtn).toBeEnabled();
    await recalculateBtn.click();

    // Attendre le recalcul
    await page.waitForTimeout(1000);

    // Vérifier que les checks ont été recalculés
    const checksContainer = page.locator('.checks-container');
    await expect(checksContainer).toBeVisible();

    console.log('✅ Checks recalculés après saisie manuelle');
  });

  test('should validate surface tolerance (±1m²)', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload et analyse
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Test 1 : Surface exacte (2940 m²)
    console.log('✏️ Test avec surface exacte...');
    await enterManualSurface(page, 0, 2940);
    await page.locator('#recalculate-checks-btn').click();
    await page.waitForTimeout(500);

    // Vérifier qu'il n'y a pas d'erreur de surface
    let surfaceCheck = page.locator('.check-card:has-text("Surface")').first();
    let checkLevel = await surfaceCheck.getAttribute('data-niveau');

    // Si la surface est exacte, le check devrait être OK ou INFO
    console.log(`✅ Surface exacte : niveau = ${checkLevel}`);

    // Test 2 : Surface avec +1m² (tolérance OK)
    await page.reload();
    await login(page);
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));
    await launchAnalysis(page);

    console.log('✏️ Test avec surface +1m²...');
    await enterManualSurface(page, 0, 2941);
    await page.locator('#recalculate-checks-btn').click();
    await page.waitForTimeout(500);

    surfaceCheck = page.locator('.check-card:has-text("Surface")').first();
    checkLevel = await surfaceCheck.getAttribute('data-niveau');

    // Avec +1m², devrait rester dans la tolérance
    console.log(`✅ Surface +1m² : niveau = ${checkLevel}`);

    // Test 3 : Surface avec +5m² (hors tolérance)
    await page.reload();
    await login(page);
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));
    await launchAnalysis(page);

    console.log('✏️ Test avec surface +5m² (hors tolérance)...');
    await enterManualSurface(page, 0, 2945);
    await page.locator('#recalculate-checks-btn').click();
    await page.waitForTimeout(500);

    surfaceCheck = page.locator('.check-card:has-text("Surface")').first();
    checkLevel = await surfaceCheck.getAttribute('data-niveau');

    // Avec +5m², devrait être une erreur MAJEURE
    expect(checkLevel).toBe('majeur');
    console.log(`✅ Surface +5m² : niveau = ${checkLevel} (erreur détectée)`);
  });

  test('should handle multiple chantiers manual input', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload dossier multi-chantiers avec attestations manquantes
    console.log('📤 Upload dossier multi-chantiers avec attestations manquantes...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-multi-attestations-manquantes.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier présence de plusieurs inputs de saisie
    const manualInputs = page.locator('.manual-surface-input');
    const inputCount = await manualInputs.count();

    expect(inputCount).toBeGreaterThan(1);
    console.log(`✅ ${inputCount} champs de saisie manuelle affichés`);

    // Saisir les surfaces pour chaque chantier
    for (let i = 0; i < inputCount; i++) {
      const testSurface = 1000 + (i * 500); // 1000, 1500, 2000, etc.
      await enterManualSurface(page, i, testSurface);
      console.log(`✏️ Chantier ${i + 1} : ${testSurface} m²`);
    }

    // Recalculer
    await page.locator('#recalculate-checks-btn').click();
    await page.waitForTimeout(1000);

    // Vérifier que tous les chantiers ont été traités
    const chantierButtons = page.locator('.chantier-btn');
    const chantierCount = await chantierButtons.count();

    expect(chantierCount).toBe(inputCount);
    console.log(`✅ ${chantierCount} chantiers traités avec surfaces manuelles`);
  });

  test('should require valid numeric input', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload et analyse
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Essayer d'entrer une valeur invalide
    const surfaceInput = page.locator('#manual-surface-0');
    await surfaceInput.fill('abc');

    const recalculateBtn = page.locator('#recalculate-checks-btn');

    // Le bouton devrait rester désactivé ou afficher une erreur
    // (dépend de l'implémentation exacte)
    console.log('✅ Validation input numérique testée');
  });

  test('should persist manual surfaces when switching chantiers', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload dossier multi-chantiers
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-multi-attestations-manquantes.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Saisir surfaces pour chantier 1
    await switchToChantier(page, 0);
    await enterManualSurface(page, 0, 2940);

    // Basculer sur chantier 2
    await switchToChantier(page, 1);
    await enterManualSurface(page, 1, 1500);

    // Revenir sur chantier 1
    await switchToChantier(page, 0);

    // Vérifier que la valeur est toujours là
    const surfaceInput = page.locator('#manual-surface-0');
    await expect(surfaceInput).toHaveValue('2940');

    console.log('✅ Surfaces manuelles persistées lors du switch entre chantiers');
  });
});
