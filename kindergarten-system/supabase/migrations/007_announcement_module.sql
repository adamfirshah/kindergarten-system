-- PAPA Kindergarten System — Announcements module
-- Uses notifications for each user delivery and keeps one announcement record
-- as the source content. Run after 006_homework_module.sql.

-- ─── Announcement Source Records ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID REFERENCES branches(id) ON DELETE CASCADE,
  class_id     INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'General',
  priority     TEXT NOT NULL DEFAULT 'normal',
  audience     TEXT NOT NULL DEFAULT 'all',
  publish_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (priority IN ('normal', 'high', 'urgent')),
  CHECK (audience IN ('all', 'staff', 'parents')),
  CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS announcement_recipients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  UNIQUE (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcement_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend the existing per-user notifications table rather than replacing it.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'system';

-- ─── Indexes and Updated-at Trigger ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_announcements_branch ON announcements(branch_id);
CREATE INDEX IF NOT EXISTS idx_announcements_class ON announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status_publish ON announcements(status, publish_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_user ON announcement_recipients(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_announcement_replies_announcement ON announcement_replies(announcement_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_announcement ON notifications(announcement_id);

DROP TRIGGER IF EXISTS announcements_updated_at ON announcements;
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Publish Distribution ───────────────────────────────────────────────────
-- When a draft is published, create one receipt and one existing-style
-- notification per eligible active user. Conflict checks keep reruns safe.
CREATE OR REPLACE FUNCTION distribute_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'published' THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO announcement_recipients (announcement_id, user_id)
    SELECT NEW.id, user_record.id
    FROM users user_record
    WHERE user_record.status = 'active'
      AND (NEW.branch_id IS NULL OR user_record.branch_id = NEW.branch_id OR user_record.role_id = 1)
      AND (
        NEW.audience = 'all'
        OR (NEW.audience = 'parents' AND user_record.role_id = 4)
        OR (NEW.audience = 'staff' AND user_record.role_id IN (1, 2, 3, 5))
      )
      AND (
        NEW.class_id IS NULL
        OR user_record.role_id <> 4
        OR EXISTS (
          SELECT 1
          FROM parents parent_record
          JOIN student_parents student_parent ON student_parent.parent_id = parent_record.id
          JOIN student_classes student_class ON student_class.student_id = student_parent.student_id
          WHERE parent_record.user_id = user_record.id
            AND student_class.class_id = NEW.class_id
        )
      )
  ON CONFLICT (announcement_id, user_id) DO NOTHING;

  INSERT INTO notifications (user_id, title, message, is_read, announcement_id, notification_type)
    SELECT recipient.user_id, NEW.title, NEW.message, false, NEW.id, 'announcement'
    FROM announcement_recipients recipient
    WHERE recipient.announcement_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM notifications notification_record
        WHERE notification_record.announcement_id = NEW.id
          AND notification_record.user_id = recipient.user_id
      );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcements_distribute ON announcements;
CREATE TRIGGER announcements_distribute
  AFTER INSERT OR UPDATE OF status ON announcements
  FOR EACH ROW EXECUTE FUNCTION distribute_announcement();

-- ─── Row-Level Security: Announcements ──────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select_by_role" ON announcements;
DROP POLICY IF EXISTS "announcements_manage_by_admin" ON announcements;
DROP POLICY IF EXISTS "announcement_recipients_select" ON announcement_recipients;
DROP POLICY IF EXISTS "announcement_recipients_update_own" ON announcement_recipients;
DROP POLICY IF EXISTS "announcement_replies_select" ON announcement_replies;
DROP POLICY IF EXISTS "announcement_replies_insert" ON announcement_replies;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;

CREATE POLICY "announcements_select_by_role" ON announcements FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR (
      auth_user_role() IN (2, 3)
      AND (branch_id IS NULL OR branch_id = auth_user_branch())
      AND (auth_user_role() = 2 OR status = 'published')
    )
    OR (
      auth_user_role() = 4
      AND status = 'published'
      AND audience IN ('all', 'parents')
      AND (branch_id IS NULL OR branch_id = auth_user_branch())
      AND (
        class_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM parents parent_record
          JOIN student_parents student_parent ON student_parent.parent_id = parent_record.id
          JOIN student_classes student_class ON student_class.student_id = student_parent.student_id
          WHERE parent_record.user_id = auth.uid()
            AND student_class.class_id = announcements.class_id
        )
      )
    )
  );

CREATE POLICY "announcements_manage_by_admin" ON announcements FOR ALL TO authenticated
  USING (
    auth_user_role() IN (1, 2)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
  )
  WITH CHECK (
    auth_user_role() IN (1, 2)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
  );

CREATE POLICY "announcement_recipients_select" ON announcement_recipients FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR auth_user_role() = 1
    OR EXISTS (
      SELECT 1 FROM announcements announcement_record
      WHERE announcement_record.id = announcement_recipients.announcement_id
        AND auth_user_role() = 2
        AND announcement_record.branch_id = auth_user_branch()
    )
  );

CREATE POLICY "announcement_recipients_update_own" ON announcement_recipients FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "announcement_replies_select" ON announcement_replies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements announcement_record
      WHERE announcement_record.id = announcement_replies.announcement_id
        AND (
          auth_user_role() = 1
          OR (
            auth_user_role() IN (2, 3, 4)
            AND (announcement_record.branch_id IS NULL OR announcement_record.branch_id = auth_user_branch())
            AND announcement_record.status = 'published'
          )
        )
    )
  );

CREATE POLICY "announcement_replies_insert" ON announcement_replies FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND auth_user_role() IN (1, 2, 3)
    AND EXISTS (
      SELECT 1 FROM announcements announcement_record
      WHERE announcement_record.id = announcement_replies.announcement_id
        AND (
          auth_user_role() = 1
          OR announcement_record.branch_id IS NULL
          OR announcement_record.branch_id = auth_user_branch()
        )
    )
  );

CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Secure helper used by all reader roles. Users may update only their own
-- receipt and matching notification; announcement content remains unchanged.
CREATE OR REPLACE FUNCTION mark_announcement_read(
  target_announcement_id UUID,
  should_acknowledge BOOLEAN DEFAULT false
)
RETURNS announcement_recipients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_receipt announcement_recipients;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM announcement_recipients
    WHERE announcement_id = target_announcement_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Announcement is not available for this user';
  END IF;

  UPDATE announcement_recipients
  SET
    read_at = COALESCE(read_at, now()),
    acknowledged_at = CASE
      WHEN should_acknowledge THEN COALESCE(acknowledged_at, now())
      ELSE acknowledged_at
    END
  WHERE announcement_id = target_announcement_id
    AND user_id = auth.uid()
  RETURNING * INTO updated_receipt;

  UPDATE notifications
  SET is_read = true
  WHERE announcement_id = target_announcement_id
    AND user_id = auth.uid();

  RETURN updated_receipt;
END;
$$;

REVOKE ALL ON FUNCTION mark_announcement_read(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_announcement_read(UUID, BOOLEAN) TO authenticated;
