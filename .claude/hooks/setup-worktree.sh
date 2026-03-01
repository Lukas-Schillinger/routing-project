#!/bin/bash
set -e

INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name')
CWD=$(echo "$INPUT" | jq -r '.cwd')

WORKTREE_DIR="$CWD/.claude/worktrees/$NAME"

# Create the git worktree
git worktree add -b "$NAME" "$WORKTREE_DIR" HEAD >&2

# Symlink node_modules
if [ -d "$CWD/node_modules" ] && [ ! -e "$WORKTREE_DIR/node_modules" ]; then
  ln -s "$CWD/node_modules" "$WORKTREE_DIR/node_modules" >&2
fi

# Symlink .env
if [ -f "$CWD/.env" ] && [ ! -e "$WORKTREE_DIR/.env" ]; then
  ln -s "$CWD/.env" "$WORKTREE_DIR/.env" >&2
fi

# Print the worktree path — this is what Claude Code reads
echo "$WORKTREE_DIR"
