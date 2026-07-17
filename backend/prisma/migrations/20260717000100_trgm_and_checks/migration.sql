-- Enable pg_trgm so case-insensitive ILIKE '%...%' searches are index-backed
-- rather than full table scans (DB-08).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for the keyword search on invoice number / customer name.
CREATE INDEX IF NOT EXISTS "invoices_invoice_number_trgm_idx"
    ON "invoices" USING GIN ("invoice_number" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "invoices_customer_fullname_trgm_idx"
    ON "invoices" USING GIN ("customer_fullname" gin_trgm_ops);

-- CHECK constraints — defence in depth behind application-level validation (DB-09).
ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_due_date_gte_invoice_date_check"
    CHECK ("due_date" >= "invoice_date");

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_tax_percent_non_negative_check"
    CHECK ("tax_percent" >= 0);

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_total_discount_non_negative_check"
    CHECK ("total_discount" >= 0);

ALTER TABLE "invoice_items"
    ADD CONSTRAINT "invoice_items_quantity_positive_check"
    CHECK ("quantity" > 0);

ALTER TABLE "invoice_items"
    ADD CONSTRAINT "invoice_items_rate_positive_check"
    CHECK ("rate" > 0);
