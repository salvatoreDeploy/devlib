ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_global_name_unique" ON "categories" USING btree ("name") WHERE "categories"."project_id" IS NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_project_id_name_unique" UNIQUE("project_id","name");