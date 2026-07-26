import { expect, test } from '@playwright/test';

const password = 'uma senha longa e segura';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}@example.com`;
}

test('cadastro cria organizações, troca tenant e logout encerra a sessão', async ({
  page,
}) => {
  const email = uniqueEmail('e2e-register');
  const firstOrganization = `Organização A ${crypto.randomUUID().slice(0, 6)}`;
  const secondOrganization = `Organização B ${crypto.randomUUID().slice(0, 6)}`;
  await page.goto('/register');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByLabel('Confirmar senha').fill(password);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/app\/onboarding$/u);
  await expect(
    page.getByRole('heading', { name: 'Crie sua primeira organização' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Criar organização' }).click();
  await page.getByLabel('Nome').fill(firstOrganization);
  await page
    .getByLabel('Identificador')
    .fill(`org-a-${crypto.randomUUID().slice(0, 8)}`);
  await page.getByRole('button', { name: 'Criar organização' }).click();
  await expect(page).toHaveURL(/\/app$/u);
  await expect(
    page.getByRole('heading', { name: firstOrganization }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Nova organização' }).click();
  await page.getByLabel('Nome').fill(secondOrganization);
  await page
    .getByLabel('Identificador')
    .fill(`org-b-${crypto.randomUUID().slice(0, 8)}`);
  await page.getByRole('button', { name: 'Criar organização' }).click();
  await expect(
    page.getByRole('heading', { name: secondOrganization }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel('Organização ativa').locator('option:checked'),
  ).toHaveText(secondOrganization);
  await page
    .getByLabel('Organização ativa')
    .selectOption({ label: firstOrganization });
  await expect(
    page.getByRole('heading', { name: firstOrganization }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login$/u);
});

test('login usa mensagem genérica e permite acesso com credenciais válidas', async ({
  page,
  request,
}) => {
  const email = uniqueEmail('e2e-login');
  const registration = await request.post(
    'http://127.0.0.1:3100/api/v1/auth/register',
    {
      headers: { Origin: 'http://127.0.0.1:4173' },
      data: { email, password, passwordConfirmation: password },
    },
  );
  expect(registration.status()).toBe(201);

  await page.goto('/login');
  await page.getByLabel('E-mail').fill('missing@example.com');
  await page.getByLabel('Senha').fill('outra senha longa');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'E-mail ou senha inválidos.',
  );

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding$/u);
  await expect(
    page.getByRole('heading', { name: 'Crie sua primeira organização' }),
  ).toBeVisible();
});

test('formulário de login mantém ordem básica de teclado', async ({ page }) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('E-mail')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Senha')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeFocused();
});
