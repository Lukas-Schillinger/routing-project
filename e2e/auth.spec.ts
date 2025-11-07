import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the login page before each test
		await page.goto('/auth/login');
	});

	test.describe('Login Page UI', () => {
		test('should display login form with correct elements', async ({ page }) => {
			// Check page title/heading
			await expect(page.locator('h1')).toContainText('Login/Register');

			// Check form fields exist
			await expect(page.locator('label:has-text("Email")')).toBeVisible();
			await expect(page.locator('label:has-text("Password")')).toBeVisible();

			// Check input types
			await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
			await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');

			// Check buttons exist
			await expect(page.locator('button:has-text("Login")')).toBeVisible();
		});

		test('should have proper form attributes', async ({ page }) => {
			const form = page.locator('form');

			await expect(form).toHaveAttribute('method', 'post');
			await expect(form).toHaveAttribute('action', '?/login');
		});
	});

	test.describe('Form Validation', () => {
		test('should show error for invalid email format', async ({ page }) => {
			// Fill form with invalid email
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');

			// Submit login form
			await page.click('button:has-text("Login")');

			// Should show validation error
			await expect(page.locator('p')).toContainText('Please enter a valid email address');
		});

		test('should show error for short password', async ({ page }) => {
			// Fill form with short password
			await page.fill('input[name="email"]', 'test@example.com');
			await page.fill('input[name="password"]', '123');

			// Submit login form
			await page.click('button:has-text("Login")');

			// Should show validation error
			await expect(page.locator('p')).toContainText('Password must be at least 6 characters');
		});

		test('should show error for empty fields', async ({ page }) => {
			// Submit form without filling fields
			await page.click('button:has-text("Login")');

			// Should show validation error (email will be caught first)
			await expect(page.locator('p')).toContainText('Email must be at least 3 characters');
		});
	});

	test.describe('Login Flow', () => {
		test('should show error for non-existent user', async ({ page }) => {
			// Fill form with valid format but non-existent user
			await page.fill('input[name="email"]', 'nonexistent@example.com');
			await page.fill('input[name="password"]', 'password123');

			// Submit login form
			await page.click('button:has-text("Login")');

			// Should show login error
			await expect(page.locator('p')).toContainText('Incorrect email or password');
		});

		test('should redirect on successful login', async ({ page }) => {
			// Generate unique email for this test run
			const uniqueEmail = `testuser${Date.now()}@example.com`;

			// First register a user
			await page.fill('input[name="email"]', uniqueEmail);
			await page.fill('input[name="password"]', 'password123');
			await page.click('button:has-text("Register")');

			// Wait a moment for the registration to process
			await page.waitForTimeout(1000);

			// Check if there's an error message
			const errorMessage = await page.locator('p').textContent();
			if (errorMessage && errorMessage.trim()) {
				console.log('Registration error:', errorMessage);
			}

			// Should redirect to the protected page
			await expect(page).toHaveURL('/auth/account');

			// Logout before testing login
			await page.click('button:has-text("Sign out")');
			await expect(page).toHaveURL('/auth/login');

			// Now test login with the same credentials
			await page.fill('input[name="email"]', uniqueEmail);
			await page.fill('input[name="password"]', 'password123');
			await page.click('button:has-text("Login")');

			// Wait a moment for the login to process
			await page.waitForTimeout(1000);

			// Check if there's an error message
			const loginErrorMessage = await page.locator('p').textContent();
			if (loginErrorMessage && loginErrorMessage.trim()) {
				console.log('Login error:', loginErrorMessage);
			}

			// Should redirect to the protected page
			await expect(page).toHaveURL('/auth/account');
		});
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
			// Fill form
			await page.fill('input[name="email"]', 'test@example.com');
			await page.fill('input[name="password"]', 'password123');

			// Press Enter in password field to submit
			await page.press('input[name="password"]', 'Enter');

			// Should attempt to submit (will show error for non-existent user)
			await expect(page.locator('p')).toContainText('Incorrect email or password');
		});
	});

	test.describe('Accessibility', () => {
		test('should have proper labels and form structure', async ({ page }) => {
			// Check that inputs have proper labels
			const emailLabel = page.locator('label:has-text("Email")');
			const passwordLabel = page.locator('label:has-text("Password")');

			await expect(emailLabel).toBeVisible();
			await expect(passwordLabel).toBeVisible();

			// Check that labels are associated with inputs
			const emailInput = emailLabel.locator('input');
			const passwordInput = passwordLabel.locator('input');

			await expect(emailInput).toHaveAttribute('name', 'email');
			await expect(passwordInput).toHaveAttribute('name', 'password');
		});

		test('should be keyboard navigable', async ({ page }) => {
			// Tab through form elements
			await page.keyboard.press('Tab'); // Should focus email input
			await expect(page.locator('input[name="email"]')).toBeFocused();

			await page.keyboard.press('Tab'); // Should focus password input
			await expect(page.locator('input[name="password"]')).toBeFocused();

			await page.keyboard.press('Tab'); // Should focus login button
			await expect(page.locator('button:has-text("Login")')).toBeFocused();
		});
	});

	test.describe('Error Message Display', () => {
		test('should clear error message on new form submission', async ({ page }) => {
			// First, create an error
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');
			await page.click('button:has-text("Login")');

			// Verify error is shown
			await expect(page.locator('p')).toContainText('Please enter a valid email address');

			// Fix the email and submit again
			await page.fill('input[name="email"]', 'valid@example.com');
			await page.click('button:has-text("Login")');

			// Should show different error (user not found) instead of email validation error
			await expect(page.locator('p')).toContainText('Incorrect email or password');
			await expect(page.locator('p')).not.toContainText('Please enter a valid email address');
		});
	});
});

test.describe('REgistration Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the login page before each test
		await page.goto('/auth/registration');
	});

	test.describe('Registration Page UI', () => {
		test('should display registration form with correct elements', async ({ page }) => {
			// Check page title/heading
			await expect(page.locator('h1')).toContainText('Register');

			// Check form fields exist
			await expect(page.locator('label:has-text("Email")')).toBeVisible();
			await expect(page.locator('label:has-text("Password")')).toBeVisible();
			await expect(page.locator('label:has-text("Confirm Password")')).toBeVisible();

			// Check input types
			await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
			await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
			await expect(page.locator('input[name="confrim-password"]')).toHaveAttribute(
				'type',
				'password'
			);

			// Check buttons exist
			await expect(page.locator('button:has-text("Register")')).toBeVisible();
		});

		test('should have proper form attributes', async ({ page }) => {
			const form = page.locator('form');

			await expect(form).toHaveAttribute('method', 'post');

			// Register button should have formaction
			await expect(page.locator('button:has-text("Register")')).toHaveAttribute(
				'formaction',
				'?/register'
			);
		});
	});

	test.describe('Form Validation', () => {
		test('should show error for invalid email format', async ({ page }) => {
			// Fill form with invalid email
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');
			await page.fill('input[name="confirm-password"]', 'password123');

			// Submit login form
			await page.click('button:has-text("Login")');

			// Should show validation error
			await expect(page.locator('p')).toContainText('Please enter a valid email address');
		});

		test('should show error for short password', async ({ page }) => {
			// Fill form with short password
			await page.fill('input[name="email"]', 'test@example.com');
			await page.fill('input[name="password"]', '123');
			await page.fill('input[name="confirm-password"]', '123');

			// Submit login form
			await page.click('button:has-text("Register")');

			// Should show validation error
			await expect(page.locator('p')).toContainText('Password must be at least 6 characters');
		});

		test('should show error for empty fields', async ({ page }) => {
			// Submit form without filling fields
			await page.click('button:has-text("Register")');

			// Should show validation error (email will be caught first)
			await expect(page.locator('p')).toContainText('Email must be at least 3 characters');
		});
	});

	test.describe('Registration Flow', () => {
		test('should show error for invalid email during registration', async ({ page }) => {
			// Fill form with invalid email
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');
			await page.fill('input[name="confirm-password"]', 'password123');

			// Submit register form
			await page.click('button:has-text("Register")');

			// Should show validation error
			await expect(page.locator('p')).toContainText('Please enter a valid email address');
		});

		test('should show error for weak password during registration', async ({ page }) => {
			// Fill form with weak password
			await page.fill('input[name="email"]', 'newuser@example.com');
			await page.fill('input[name="password"]', '123');
			await page.fill('input[name="confirm-password"]', '123');

			// Submit register form
			await page.click('button:has-text("Register")');

			// Should show validation error
			await expect(page.locator('p')).toContainText('Password must be at least 6 characters');
		});

		test('should successfully register new user and redirect', async ({ page }) => {
			// Generate unique email for this test
			const uniqueEmail = `testuser${Date.now()}@example.com`;

			// Fill registration form
			await page.fill('input[name="email"]', uniqueEmail);
			await page.fill('input[name="password"]', 'password123');
			await page.fill('input[name="confirm-password"]', 'password123');

			// Submit register form
			await page.click('button:has-text("Register")');

			// Should redirect to the protected page
			await expect(page).toHaveURL('/auth/account');
		});

		test('should show error when registering with existing email', async ({ page }) => {
			const duplicateEmail = 'duplicate@example.com';

			// Register first user
			await page.fill('input[name="email"]', duplicateEmail);
			await page.fill('input[name="password"]', 'password123');
			await page.fill('input[name="confirm-password"]', 'password123');
			await page.click('button:has-text("Register")');

			// Should redirect on success
			await expect(page).toHaveURL('/auth/account');

			// Logout before trying to register again
			await page.click('button:has-text("Sign out")');
			await expect(page).toHaveURL('/auth/login');

			// Try to register with same email
			await page.fill('input[name="email"]', duplicateEmail);
			await page.fill('input[name="password"]', 'password456');
			await page.fill('input[name="confirm-password"]', 'password456');
			await page.click('button:has-text("Register")');

			// Should show error
			await expect(page.locator('p')).toContainText('Email already exists');
		});
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

		test('should allow typing in password confirm field', async ({ page }) => {
			const passwordConfirmInput = page.locator('input[name="confirm-password"]');

			await passwordConfirmInput.fill('secretpassword');
			await expect(passwordConfirmInput).toHaveValue('secretpassword');
		});

		test('should handle form submission with Enter key', async ({ page }) => {
			// Fill form
			await page.fill('input[name="email"]', 'test@example.com');
			await page.fill('input[name="password"]', 'password123');
			await page.fill('input[name="confirm-password"]', 'password123');

			// Press Enter in password field to submit
			await page.press('input[name="password"]', 'Enter');

			// Should attempt to submit (will show error for non-existent user)
			await expect(page.locator('p')).toContainText('Incorrect email or password');
		});
	});

	test.describe('Accessibility', () => {
		test('should have proper labels and form structure', async ({ page }) => {
			// Check that inputs have proper labels
			const emailLabel = page.locator('label:has-text("Email")');
			const passwordLabel = page.locator('label:has-text("Password")');
			const passwordConfirmLabel = page.locator('label:has-text("Password")');

			await expect(emailLabel).toBeVisible();
			await expect(passwordLabel).toBeVisible();
			await expect(passwordConfirmLabel).toBeVisible();

			// Check that labels are associated with inputs
			const emailInput = emailLabel.locator('input');
			const passwordInput = passwordLabel.locator('input');
			const passwordConfirmInput = passwordConfirmLabel.locator('input');

			await expect(emailInput).toHaveAttribute('name', 'email');
			await expect(passwordInput).toHaveAttribute('name', 'password');
			await expect(passwordConfirmInput).toHaveAttribute('name', 'confirm-password');
		});

		test('should be keyboard navigable', async ({ page }) => {
			// Tab through form elements
			await page.keyboard.press('Tab'); // Should focus email input
			await expect(page.locator('input[name="email"]')).toBeFocused();

			await page.keyboard.press('Tab'); // Should focus password input
			await expect(page.locator('input[name="password"]')).toBeFocused();

			await page.keyboard.press('Tab'); // Should focus password input
			await expect(page.locator('input[name="confirm-password"]')).toBeFocused();

			await page.keyboard.press('Tab'); // Should focus register button
			await expect(page.locator('button:has-text("Register")')).toBeFocused();
		});
	});

	test.describe('Error Message Display', () => {
		test('should clear error message on new form submission', async ({ page }) => {
			// First, create an error
			await page.fill('input[name="email"]', 'notanemail');
			await page.fill('input[name="password"]', 'password123');
			await page.fill('input[name="confirm-password"]', 'password123');
			await page.click('button:has-text("Register")');

			// Verify error is shown
			await expect(page.locator('p')).toContainText('Please enter a valid email address');

			// Fix the email and submit again
			await page.fill('input[name="email"]', 'valid@example.com');
			await page.click('button:has-text("Login")');

			// Should show different error (user not found) instead of email validation error
			await expect(page.locator('p')).toContainText('Incorrect email or password');
			await expect(page.locator('p')).not.toContainText('Please enter a valid email address');
		});
	});
});
