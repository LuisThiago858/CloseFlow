CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(63) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organizations_name_check" CHECK (
        "name" = btrim("name")
        AND char_length("name") BETWEEN 1 AND 120
    ),
    CONSTRAINT "organizations_slug_check" CHECK (
        "slug" ~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$'
        AND "slug" NOT IN ('api', 'app', 'auth', 'login', 'register', 'admin', 'settings', 'support', 'www', 'closeflow')
    ),
    CONSTRAINT "organizations_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT "organizations_timestamps_check" CHECK ("updated_at" >= "created_at")
);

CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "memberships_role_check" CHECK ("role" IN ('OWNER', 'MEMBER')),
    CONSTRAINT "memberships_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT "memberships_timestamps_check" CHECK (
        "joined_at" >= "created_at"
        AND "updated_at" >= "created_at"
    )
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "memberships_organization_id_user_id_key"
ON "memberships"("organization_id", "user_id");
CREATE INDEX "memberships_user_status_organization_idx"
ON "memberships"("user_id", "status", "organization_id");
CREATE INDEX "memberships_organization_status_role_idx"
ON "memberships"("organization_id", "status", "role", "id");

ALTER TABLE "memberships"
ADD CONSTRAINT "memberships_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "memberships"
ADD CONSTRAINT "memberships_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION check_organization_membership_invariants(target_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    organization_status VARCHAR(32);
BEGIN
    SELECT "status"
    INTO organization_status
    FROM "organizations"
    WHERE "id" = target_organization_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF organization_status = 'ACTIVE' AND NOT EXISTS (
        SELECT 1
        FROM "memberships"
        WHERE "organization_id" = target_organization_id
          AND "status" = 'ACTIVE'
          AND "role" = 'OWNER'
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'organization membership invariant violated';
    END IF;

    IF organization_status = 'INACTIVE' AND EXISTS (
        SELECT 1
        FROM "memberships"
        WHERE "organization_id" = target_organization_id
          AND "status" = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'organization membership invariant violated';
    END IF;
END;
$$;

CREATE FUNCTION enforce_organization_membership_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_TABLE_NAME = 'organizations' THEN
        PERFORM check_organization_membership_invariants(COALESCE(NEW."id", OLD."id"));
    ELSE
        IF TG_OP <> 'INSERT' THEN
            PERFORM check_organization_membership_invariants(OLD."organization_id");
        END IF;
        IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW."organization_id" IS DISTINCT FROM OLD."organization_id") THEN
            PERFORM check_organization_membership_invariants(NEW."organization_id");
        ELSIF TG_OP = 'UPDATE' THEN
            PERFORM check_organization_membership_invariants(NEW."organization_id");
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER organizations_membership_invariant
AFTER INSERT OR UPDATE OR DELETE ON "organizations"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_organization_membership_invariants();

CREATE CONSTRAINT TRIGGER memberships_organization_invariant
AFTER INSERT OR UPDATE OR DELETE ON "memberships"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_organization_membership_invariants();
