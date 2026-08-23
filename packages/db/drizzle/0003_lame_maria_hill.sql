CREATE TABLE "library_tags" (
	"library_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "library_tags_library_id_tag_id_pk" PRIMARY KEY("library_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "project_libraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_libraries_project_id_library_id_unique" UNIQUE("project_id","library_id")
);
--> statement-breakpoint
ALTER TABLE "library_tags" ADD CONSTRAINT "library_tags_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_tags" ADD CONSTRAINT "library_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_libraries" ADD CONSTRAINT "project_libraries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_libraries" ADD CONSTRAINT "project_libraries_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;