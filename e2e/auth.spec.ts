import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/auth/login');
	});

	test.describe('Login Page UI', () => {
		test('should display magic login by default', async ({ page }) => {
			// Check page heading
			await expect(page.locator('h1')).toContainText('Welcome back');

			// Default view is magic login — email field and send magic link button
			await expect(
				page.locator('label:has-text("Email address")')
			).toBeVisible();
			await expect(
				page.locator('button:has-text("Send magic link")')
			).toBeVisible();

			// Password fields should not be visible in default view
			await expect(page.locator('input[name="password"]')).not.toBeVisible();
		});

		test('should switch to password login', async ({ page }) => {
			// Click to switch to password login
			await page.click('button:has-text("Log in with password")');

			// Password form should now be visible
			await expect(page.locator('label:has-text("Email")')).toBeVisible();
			await expect(page.locator('label:has-text("Password")')).toBeVisible();
			await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
		});

		test('should have proper form attributes for magic login', async ({
			page
		}) => {
			const form = page.locator('form');

			await expect(form).toHaveAttribute('method', 'post');
			await expect(form).toHaveAttribute('action', '?/requestOTP');
		});

		test('should have proper form attributes for password login', async ({
			page
		}) => {
			await page.click('button:has-text("Log in with password")');
			const form = page.locator('form').first();

			await expect(form).toHaveAttribute('method', 'post');
			await expect(form).toHaveAttribute('action', '?/login');
		});
	});

	test.describe('Password Login Validation', () => {
		test.beforeEach(async ({ page }) => {
			// Switch to password login for validation tests
			await page.click('button:has-text("Log in with password")');
		});

		test('should show error for invalid email format', async ({ page }) => {
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');

			await page.click('button:has-text("Sign in")');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Please enter a valid email address'
			);
		});

		test('should show error for short password', async ({ page }) => {
			await page.fill('input[name="email"]', 'test@example.com');
			await page.fill('input[name="password"]', '123');

			await page.click('button:has-text("Sign in")');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Password must be at least 6 characters'
			);
		});

		test('should show error for empty fields', async ({ page }) => {
			await page.click('button:has-text("Sign in")');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Email must be at least 3 characters'
			);
		});
	});

	test.describe('Password Login Flow', () => {
		test.beforeEach(async ({ page }) => {
			await page.click('button:has-text("Log in with password")');
		});

		test('should show error for non-existent user', async ({ page }) => {
			await page.fill('input[name="email"]', 'nonexistent@example.com');
			await page.fill('input[name="password"]', 'password123');

			await page.click('button:has-text("Sign in")');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Incorrect email or password'
			);
		});

		test('should handle form submission with Enter key', async ({ page }) => {
			await page.fill('input[name="email"]', 'nonexistent@example.com');
			await page.fill('input[name="password"]', 'password123');

			await page.press('input[name="password"]', 'Enter');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Incorrect email or password'
			);
		});

		test('should clear validation error on resubmit', async ({ page }) => {
			// Trigger a validation error
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');
			await page.click('button:has-text("Sign in")');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Please enter a valid email address'
			);

			// Fix the email and resubmit
			await page.fill('input[name="email"]', 'valid@example.com');
			await page.click('button:has-text("Sign in")');

			// Should show a different error now
			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Incorrect email or password'
			);
		});
	});

	test.describe('Form Interaction', () => {
		test('should allow typing in magic login email field', async ({ page }) => {
			const emailInput = page.locator('input[name="email"]');

			await emailInput.fill('test@example.com');
			await expect(emailInput).toHaveValue('test@example.com');
		});

		test('should allow typing in password login fields', async ({ page }) => {
			await page.click('button:has-text("Log in with password")');

			const emailInput = page.locator('input[name="email"]');
			const passwordInput = page.locator('input[name="password"]');

			await emailInput.fill('test@example.com');
			await expect(emailInput).toHaveValue('test@example.com');

			await passwordInput.fill('secretpassword');
			await expect(passwordInput).toHaveValue('secretpassword');
		});

		test('should toggle between magic and password login', async ({ page }) => {
			// Default is magic login
			await expect(
				page.locator('button:has-text("Send magic link")')
			).toBeVisible();

			// Switch to password
			await page.click('button:has-text("Log in with password")');
			await expect(page.locator('button:has-text("Sign in")')).toBeVisible();

			// Switch back to magic
			await page.click('button:has-text("Back to email")');
			await expect(
				page.locator('button:has-text("Send magic link")')
			).toBeVisible();
		});
	});

	test.describe('Accessibility', () => {
		test('should have proper labels for magic login', async ({ page }) => {
			const emailLabel = page.locator('label:has-text("Email address")');
			await expect(emailLabel).toBeVisible();
		});

		test('should have proper labels for password login', async ({ page }) => {
			await page.click('button:has-text("Log in with password")');

			const emailLabel = page.locator('label:has-text("Email")');
			const passwordLabel = page.locator('label:has-text("Password")');

			await expect(emailLabel).toBeVisible();
			await expect(passwordLabel).toBeVisible();
		});

		test('should have link to registration page', async ({ page }) => {
			const registerLink = page.locator('a:has-text("Create one")');
			await expect(registerLink).toBeVisible();
		});
	});
});

test.describe('Registration Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/auth/register');
	});

	test.describe('Registration Page UI', () => {
		test('should display registration form with correct elements', async ({
			page
		}) => {
			// Check page heading
			await expect(page.locator('h1')).toContainText('Create your account');

			// Check form fields exist
			await expect(page.locator('label:has-text("Email")')).toBeVisible();
			await expect(page.locator('label:has-text("Password")')).toBeVisible();

			// Check input types
			await expect(page.locator('input[name="email"]')).toHaveAttribute(
				'type',
				'email'
			);
			await expect(page.locator('input[name="password"]')).toHaveAttribute(
				'type',
				'password'
			);

			// Check submit button exists
			await expect(
				page.locator('button:has-text("Create account")')
			).toBeVisible();
		});

		test('should have proper form attributes', async ({ page }) => {
			const form = page.locator('form');

			await expect(form).toHaveAttribute('method', 'post');
			await expect(form).toHaveAttribute('action', '?/register');
		});
	});

	test.describe('Form Validation', () => {
		test('should show error for invalid email format', async ({ page }) => {
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');

			await page.click('button:has-text("Create account")');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Please enter a valid email address'
			);
		});

		test('should show error for short password', async ({ page }) => {
			await page.fill('input[name="email"]', 'test@example.com');
			await page.fill('input[name="password"]', '123');

			await page.click('button:has-text("Create account")');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Password must be at least 6 characters'
			);
		});

		test('should show error for empty fields', async ({ page }) => {
			await page.click('button:has-text("Create account")');

			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Email must be at least 3 characters'
			);
		});
	});

	test.describe('Successful Registration', () => {
		test('should register new user and redirect to login with confirmation', async ({
			page
		}) => {
			const uniqueEmail = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

			await page.fill('input[name="email"]', uniqueEmail);
			await page.fill('input[name="password"]', 'password123');

			await page.click('button:has-text("Create account")');

			// Should redirect to login page with confirm param
			await expect(page).toHaveURL(/\/auth\/login\?email=.*&confirm=true/);
		});

		// Flaky: first registration blocks on mailService.sendLoginEmail which
		// depends on external mail delivery. When mail is slow or the webhook
		// targets a different server, the redirect never completes.
		test.fixme(
			'should show error when registering with existing email',
			async ({ page }) => {
				const duplicateEmail = `dup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

				// Register first user
				await page.fill('input[name="email"]', duplicateEmail);
				await page.fill('input[name="password"]', 'password123');
				await page.click('button:has-text("Create account")');

				// Should redirect on success
				await expect(page).toHaveURL(/\/auth\/login\?email=.*&confirm=true/);

				// Go back to register and try the same email
				await page.goto('/auth/register');
				await page.fill('input[name="email"]', duplicateEmail);
				await page.fill('input[name="password"]', 'password456');
				await page.click('button:has-text("Create account")');

				// Should stay on register page and show an error
				await expect(page).toHaveURL(/\/auth\/register/);
				await expect(page.locator('[role="alert"]')).toBeVisible();
			}
		);
	});

	test.describe('Form Interaction', () => {
		test('should allow typing in email field', async ({ page }) => {
			const emailInput = page.locator('input[name="email"]');

			await emailInput.fill('test@example.com');
			await expect(emailInput).toHaveValue('test@example.com');
		});

		test('should allow typing in password field', async ({ page }) => {
			const passwordInput = page.locator('input[name="password"]');

			await passwordInput.fill('secretpassword');
			await expect(passwordInput).toHaveValue('secretpassword');
		});

		test('should handle form submission with Enter key', async ({ page }) => {
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');

			await page.press('input[name="password"]', 'Enter');

			// Should attempt to submit and show validation error
			await expect(page.locator('[data-fs-field-error]').first()).toContainText(
				'Please enter a valid email address'
			);
		});
	});

	test.describe('Accessibility', () => {
		test('should have proper labels and form structure', async ({ page }) => {
			const emailLabel = page.locator('label:has-text("Email")');
			const passwordLabel = page.locator('label:has-text("Password")');

			await expect(emailLabel).toBeVisible();
			await expect(passwordLabel).toBeVisible();
		});

		test('should be keyboard navigable', async ({ page }) => {
			// Focus the email input first
			await page.locator('input[name="email"]').focus();
			await expect(page.locator('input[name="email"]')).toBeFocused();

			await page.keyboard.press('Tab'); // Should focus password input
			await expect(page.locator('input[name="password"]')).toBeFocused();

			await page.keyboard.press('Tab'); // Should focus submit button
			await expect(
				page.locator('button:has-text("Create account")')
			).toBeFocused();
		});

		test('should have link to sign in page', async ({ page }) => {
			const signInLink = page.locator('a:has-text("Sign in")');
			await expect(signInLink).toBeVisible();
		});
	});
});
