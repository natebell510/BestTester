import { test as base } from '@playwright/test';
import { MobileLoginPage } from '../mobile/pages/mobile-login.page';
import { MobileProductsPage } from '../mobile/pages/mobile-products.page';
import { MobileCartPage } from '../mobile/pages/mobile-cart.page';

export type MobileFixtures = {
  mobileLoginPage: MobileLoginPage;
  mobileProductsPage: MobileProductsPage;
  mobileCartPage: MobileCartPage;
};

export const test = base.extend<MobileFixtures>({
  mobileLoginPage: async ({ page }, use) => use(new MobileLoginPage(page)),
  mobileProductsPage: async ({ page }, use) => use(new MobileProductsPage(page)),
  mobileCartPage: async ({ page }, use) => use(new MobileCartPage(page)),
});

export { expect } from '@playwright/test';
