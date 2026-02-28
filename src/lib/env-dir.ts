import { execSync } from 'node:child_process';
import path from 'node:path';

/**
 * Returns the root directory containing `.env`.
 * In a git worktree this resolves to the main repo root;
 * otherwise it returns the current working directory.
 */
export function getEnvDir(): string {
	const commonDir = execSync('git rev-parse --git-common-dir', { encoding: 'utf-8' }).trim();
	if (commonDir === '.git') return process.cwd();
	return path.resolve(commonDir, '..');
}
