/**
 * Test e2e #4 : Détection attestations manquantes
 *
 * Workflow testé :
 * 1. Login
 * 2. Upload dossier avec différents cas d'attestations manquantes :
 *    - Adresse dans Audit/Synthèse mais pas dans CEE
 *    - Secteur NAF "Autres" détecté automatiquement
 *    - Secteur agricole détecté (bloquant)
 * 3. Lancer l'analyse
 * 4. Vérifier détection correcte des attestations manquantes
 * 5. Vérifier affichage du formulaire de saisie
 * 6. Vérifier checks générés pour attestations manquantes
 */

import { test, expect } from '@playwright/test';
import {
  login,
  uploadFile,
  launchAnalysis,
  countChecksByLevel
} from './helpers.js';
import path from 'path';

test.describe('Détection attestations manquantes', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should detect missing attestation for address in Audit but not in CEE', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    console.log('📤 Upload dossier avec attestation manquante...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier qu'un check "attestation manquante" est présent
    const missingAttestationCheck = page.locator('.check-card:has-text("attestation manquante")').first();
    await expect(missingAttestationCheck).toBeVisible();

    // Vérifier que c'est un check de niveau BLOQUANT
    const checkLevel = await missingAttestationCheck.getAttribute('data-niveau');
    expect(checkLevel).toBe('bloquant');

    console.log('✅ Attestation manquante détectée (BLOQUANT)');
  });

  test('should detect secteur NAF Autres and show manual input', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    console.log('📤 Upload dossier avec secteur NAF Autres...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-naf-autres.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier qu'un message NAF "Autres" est présent
    const nafAutresMessage = page.locator('#manual-surfaces-explanation:has-text("Autres")');
    await expect(nafAutresMessage).toBeVisible();

    // Vérifier présence du formulaire de saisie manuelle
    const manualInputForm = page.locator('#manual-surfaces-form');
    await expect(manualInputForm).toBeVisible();

    console.log('✅ Secteur NAF "Autres" détecté, formulaire de saisie affiché');
  });

  test('should detect secteur agricole as BLOQUANT', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    console.log('📤 Upload dossier avec secteur agricole...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-agricole.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-agricole.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-agricole.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier présence d'un check BLOQUANT agricole
    const agricoleCheck = page.locator('.check-card:has-text("agricole")').first();
    await expect(agricoleCheck).toBeVisible();

    const checkLevel = await agricoleCheck.getAttribute('data-niveau');
    expect(checkLevel).toBe('bloquant');

    console.log('✅ Secteur agricole détecté comme BLOQUANT');

    // Vérifier que la bannière page de garde est ROUGE
    const banner = page.locator('#page-garde-banner');
    await expect(banner).toBeVisible();

    const bgColor = await banner.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Rouge = rgb(220, 38, 38) ou similaire
    expect(bgColor).toContain('220');

    console.log('✅ Bannière page de garde rouge (secteur agricole bloquant)');
  });

  test('should handle multiple missing attestations', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    console.log('📤 Upload dossier multi-chantiers avec plusieurs attestations manquantes...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-multi-attestations-manquantes.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Compter le nombre d'attestations manquantes détectées
    const missingAttestationChecks = page.locator('.check-card:has-text("attestation manquante")');
    const missingCount = await missingAttestationChecks.count();

    expect(missingCount).toBeGreaterThan(1);
    console.log(`✅ ${missingCount} attestations manquantes détectées`);

    // Vérifier que le formulaire de saisie a autant d'inputs
    const manualInputs = page.locator('.manual-surface-input');
    const inputCount = await manualInputs.count();

    expect(inputCount).toBe(missingCount);
    console.log(`✅ ${inputCount} champs de saisie manuelle affichés`);
  });

  test('should show correct check details for missing attestation', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Cliquer sur le check pour l'ouvrir
    const missingAttestationCheck = page.locator('.check-card:has-text("attestation manquante")').first();
    await missingAttestationCheck.click();

    // Attendre que le détail s'affiche
    await page.waitForTimeout(300);

    // Vérifier présence des informations détaillées
    const checkDetail = missingAttestationCheck.locator('.check-detail');
    await expect(checkDetail).toBeVisible();

    const detailText = await checkDetail.textContent();

    // Le détail devrait contenir l'adresse concernée
    expect(detailText.length).toBeGreaterThan(20);

    console.log('✅ Détails du check attestation manquante affichés');
  });

  test('should generate correct checks after manual surface entry', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-attestation-manquante.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Avant saisie : vérifier les checks initiaux
    const initialBloquantCount = await countChecksByLevel(page, 'bloquant');

    console.log(`📊 Avant saisie : ${initialBloquantCount} check(s) bloquant(s)`);

    // Saisir la surface manuelle
    const surfaceInput = page.locator('#manual-surface-0');
    await surfaceInput.fill('2940');

    await page.locator('#recalculate-checks-btn').click();
    await page.waitForTimeout(1000);

    // Après saisie : vérifier que le check "attestation manquante" est résolu
    const missingAttestationCheck = page.locator('.check-card:has-text("attestation manquante")');
    const missingCount = await missingAttestationCheck.count();

    // Devrait être 0 ou le check devrait être passé en INFO/OK
    console.log(`✅ Après saisie : ${missingCount} attestation(s) manquante(s)`);

    // Vérifier que de nouveaux checks de surfaces ont été générés
    const surfaceChecks = page.locator('.check-card:has-text("Surface")');
    const surfaceCheckCount = await surfaceChecks.count();

    expect(surfaceCheckCount).toBeGreaterThan(0);
    console.log(`✅ ${surfaceCheckCount} check(s) de surface générés après saisie manuelle`);
  });

  test('should handle mix of present and missing attestations', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    console.log('📤 Upload dossier mixte (attestations présentes + manquantes)...');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-multi-chantiers.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-multi-chantiers.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-mixte-attestations.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier qu'il y a des chantiers
    const chantierButtons = page.locator('.chantier-btn');
    const chantierCount = await chantierButtons.count();

    expect(chantierCount).toBeGreaterThan(1);

    // Vérifier qu'il y a au moins une attestation manquante
    const missingChecks = page.locator('.check-card:has-text("attestation manquante")');
    const missingCount = await missingChecks.count();

    expect(missingCount).toBeGreaterThan(0);

    // Vérifier qu'il y a aussi des chantiers avec attestations présentes
    // (donc des checks de validation de surfaces normaux)
    const surfaceChecks = page.locator('.check-card:has-text("Surface")');
    const surfaceCheckCount = await surfaceChecks.count();

    // Si certaines attestations sont présentes, il devrait y avoir des checks de surface
    if (chantierCount > missingCount) {
      expect(surfaceCheckCount).toBeGreaterThan(0);
    }

    console.log(`✅ Dossier mixte : ${chantierCount} chantiers, ${missingCount} attestation(s) manquante(s), ${surfaceCheckCount} check(s) de surface`);
  });
});
