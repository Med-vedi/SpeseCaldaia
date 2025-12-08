CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
  default_org_id TEXT := 'default-org';
  default_role TEXT := 'basic';
BEGIN
  default_username := COALESCE(
    SPLIT_PART(NEW.email, '@', 1),
    'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)
  );

  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = default_username) LOOP
    default_username := default_username || '_' || SUBSTRING(NEW.id::TEXT, 9, 4);
  END LOOP;

  INSERT INTO public.users (id, username, organization_id, role, email, user_key, type)
  VALUES (NEW.id, default_username, default_org_id, default_role, NEW.email, gen_random_uuid(), 'user')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.backfill_user_profiles()
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  created BOOLEAN
) AS $$
DECLARE
  auth_user RECORD;
  default_username TEXT;
  default_org_id TEXT := 'default-org';
  default_role TEXT := 'basic';
BEGIN
  FOR auth_user IN
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    default_username := COALESCE(
      SPLIT_PART(auth_user.email, '@', 1),
      'user_' || SUBSTRING(auth_user.id::TEXT, 1, 8)
    );

    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = default_username) LOOP
      default_username := default_username || '_' || SUBSTRING(auth_user.id::TEXT, 9, 4);
    END LOOP;

    BEGIN
      INSERT INTO public.users (id, username, organization_id, role, email, user_key, type)
      VALUES (auth_user.id, default_username, default_org_id, default_role, auth_user.email, gen_random_uuid(), 'user');

      user_id := auth_user.id;
      username := default_username;
      created := TRUE;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      user_id := auth_user.id;
      username := default_username;
      created := FALSE;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

