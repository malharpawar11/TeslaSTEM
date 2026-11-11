-- School-published names, independent of authenticated memberships and access.
CREATE TABLE public.club_officer_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  role text NOT NULL CHECK (length(trim(role)) > 0),
  sort_order integer NOT NULL DEFAULT 0,
  source text NOT NULL,
  source_row integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, name, role)
);
ALTER TABLE public.club_officer_directory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_officer_directory FROM anon, authenticated;
GRANT SELECT ON public.club_officer_directory TO anon, authenticated;
CREATE POLICY officer_directory_read ON public.club_officer_directory
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_id AND c.status = 'approved' AND c.is_active
  ));
COMMENT ON TABLE public.club_officer_directory IS
  'School-published club leadership; these records grant no account permissions. Only project admins import roster data.';
