DROP INDEX "credit_tx_payment_intent_uidx";--> statement-breakpoint
DROP INDEX "credit_tx_optimization_job_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "credit_tx_payment_intent_uidx" ON "credit_transactions" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_tx_optimization_job_uidx" ON "credit_transactions" USING btree ("optimization_job_id");