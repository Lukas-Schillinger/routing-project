CREATE INDEX "invitations_token_hash_idx" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "login_tokens_token_hash_idx" ON "login_tokens" USING btree ("token_hash");