-- Optional third nav level: a MainNavItem can now have child items
-- rendered in a flyout (e.g. Programs → Undergraduate → BBA).
--
-- parentId is nullable, so every existing row stays a top-level item
-- inside its group and current rendering is unaffected.
ALTER TABLE "main_nav_item" ADD COLUMN "parentId" TEXT;

ALTER TABLE "main_nav_item"
  ADD CONSTRAINT "main_nav_item_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "main_nav_item"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "main_nav_item_parentId_displayOrder_idx"
  ON "main_nav_item"("parentId", "displayOrder");
