/**
 * @file mobile-products.spec.ts
 * @description Mobile product browsing and cart tests for SauceDemo
 * @tags @mobile @smoke
 */
import { test, expect } from '../../src/fixtures/mobile.fixture';

test.describe('Mobile Products & Cart @mobile @smoke', () => {
  test.beforeEach(async ({ mobileLoginPage }) => {
    await mobileLoginPage.goto();
    await mobileLoginPage.login('standard_user', 'secret_sauce');
  });

  test('should display products list on mobile', async ({ mobileProductsPage }) => {
    const title = await mobileProductsPage.getPageTitle();
    expect(title).toBe('Products');
    const count = await mobileProductsPage.getItemCount();
    expect(count).toBe(6);
  });

  test('should add item to cart and show badge', async ({ mobileProductsPage }) => {
    await mobileProductsPage.addItemToCart(0);
    const cartCount = await mobileProductsPage.getCartCount();
    expect(cartCount).toBe('1');
  });

  test('should navigate to cart and see added item', async ({
    mobileProductsPage,
    mobileCartPage,
  }) => {
    await mobileProductsPage.addItemToCart(0);
    await mobileProductsPage.goToCart();
    const itemCount = await mobileCartPage.getItemCount();
    expect(itemCount).toBe(1);
  });

  test('should remove item from cart', async ({ mobileProductsPage, mobileCartPage }) => {
    await mobileProductsPage.addItemToCart(0);
    await mobileProductsPage.goToCart();
    await mobileCartPage.removeFirstItem();
    const itemCount = await mobileCartPage.getItemCount();
    expect(itemCount).toBe(0);
  });

  test('should continue shopping from cart', async ({
    mobileProductsPage,
    mobileCartPage,
    page,
  }) => {
    await mobileProductsPage.goToCart();
    await mobileCartPage.continueShopping();
    await expect(page).toHaveURL(/inventory/);
  });
});
