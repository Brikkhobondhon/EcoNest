-- Department Email System Migration
-- This migration implements a complete department-based email system

-- 1. Create employee_types table
CREATE TABLE IF NOT EXISTS public.employee_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type_name character varying NOT NULL UNIQUE,
  display_name character varying NOT NULL,
  description text,
  can_send_department_mails boolean DEFAULT false,
  can_view_mail_analytics boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id)
);

-- 2. Create department_heads table
CREATE TABLE IF NOT EXISTS public.department_heads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  assigned_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  CONSTRAINT department_heads_department_id_key UNIQUE (department_id),
  CONSTRAINT department_heads_user_id_key UNIQUE (user_id)
);

-- 3. Create department_mails table
CREATE TABLE IF NOT EXISTS public.department_mails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject character varying NOT NULL,
  body text NOT NULL,
  sender_department_id uuid NOT NULL,
  sender_user_id uuid NOT NULL,
  recipient_department_id uuid NOT NULL,
  is_urgent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id)
);

-- 4. Create mail_read_status table
CREATE TABLE IF NOT EXISTS public.mail_read_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mail_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  CONSTRAINT mail_read_status_unique_user_mail UNIQUE (mail_id, user_id)
);

-- 5. Add foreign key constraints
ALTER TABLE public.department_heads 
  ADD CONSTRAINT IF NOT EXISTS department_heads_department_id_fkey 
  FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;

ALTER TABLE public.department_heads 
  ADD CONSTRAINT IF NOT EXISTS department_heads_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.department_heads 
  ADD CONSTRAINT IF NOT EXISTS department_heads_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.department_mails 
  ADD CONSTRAINT IF NOT EXISTS department_mails_sender_department_id_fkey 
  FOREIGN KEY (sender_department_id) REFERENCES public.departments(id) ON DELETE CASCADE;

ALTER TABLE public.department_mails 
  ADD CONSTRAINT IF NOT EXISTS department_mails_sender_user_id_fkey 
  FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.department_mails 
  ADD CONSTRAINT IF NOT EXISTS department_mails_recipient_department_id_fkey 
  FOREIGN KEY (recipient_department_id) REFERENCES public.departments(id) ON DELETE CASCADE;

ALTER TABLE public.mail_read_status 
  ADD CONSTRAINT IF NOT EXISTS mail_read_status_mail_id_fkey 
  FOREIGN KEY (mail_id) REFERENCES public.department_mails(id) ON DELETE CASCADE;

ALTER TABLE public.mail_read_status 
  ADD CONSTRAINT IF NOT EXISTS mail_read_status_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 6. Add employee_type_id to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS employee_type_id uuid REFERENCES public.employee_types(id);

-- 7. Insert default employee types
INSERT INTO public.employee_types (type_name, display_name, description, can_send_department_mails, can_view_mail_analytics) VALUES
('department_head', 'Department Head', 'Head of a department with mail management capabilities', true, true),
('staff', 'Staff Member', 'Regular staff member of a department', false, false)
ON CONFLICT (type_name) DO NOTHING;

-- 8. Create functions for email system

-- Function to send department mail
CREATE OR REPLACE FUNCTION send_department_mail(
  p_subject text,
  p_body text,
  p_sender_user_id uuid,
  p_recipient_department_id uuid,
  p_is_urgent boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mail_id uuid;
  v_sender_department_id uuid;
  v_sender_employee_type text;
BEGIN
  -- Check if sender is a department head
  SELECT u.department_id, et.type_name 
  INTO v_sender_department_id, v_sender_employee_type
  FROM public.users u
  JOIN public.employee_types et ON u.employee_type_id = et.id
  WHERE u.id = p_sender_user_id;
  
  IF v_sender_employee_type != 'department_head' THEN
    RAISE EXCEPTION 'Only department heads can send department mails';
  END IF;
  
  -- Create the mail
  INSERT INTO public.department_mails (subject, body, sender_department_id, sender_user_id, recipient_department_id, is_urgent)
  VALUES (p_subject, p_body, v_sender_department_id, p_sender_user_id, p_recipient_department_id, p_is_urgent)
  RETURNING id INTO v_mail_id;
  
  -- Create read status for all users in recipient department
  INSERT INTO public.mail_read_status (mail_id, user_id)
  SELECT v_mail_id, u.id
  FROM public.users u
  WHERE u.department_id = p_recipient_department_id
    AND u.is_active = true;
  
  RETURN v_mail_id;
END;
$$;

-- Function to mark mail as read
CREATE OR REPLACE FUNCTION mark_mail_as_read(
  p_mail_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.mail_read_status 
  SET is_read = true, read_at = now()
  WHERE mail_id = p_mail_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mail or user not found';
  END IF;
END;
$$;

-- Function to get department mail analytics
CREATE OR REPLACE FUNCTION get_department_mail_analytics(
  p_department_id uuid,
  p_mail_id uuid
)
RETURNS TABLE (
  user_name text,
  user_email text,
  is_read boolean,
  read_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.name, u.email, mrs.is_read, mrs.read_at
  FROM public.mail_read_status mrs
  JOIN public.users u ON mrs.user_id = u.id
  WHERE u.department_id = p_department_id 
    AND mrs.mail_id = p_mail_id
  ORDER BY u.name;
END;
$$;

-- Function to get user's inbox
CREATE OR REPLACE FUNCTION get_user_inbox(p_user_id uuid)
RETURNS TABLE (
  mail_id uuid,
  subject text,
  body text,
  sender_department_name text,
  sender_user_name text,
  is_urgent boolean,
  is_read boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.id,
    dm.subject,
    dm.body,
    sd.name as sender_department_name,
    su.name as sender_user_name,
    dm.is_urgent,
    mrs.is_read,
    dm.created_at
  FROM public.department_mails dm
  JOIN public.mail_read_status mrs ON dm.id = mrs.mail_id
  JOIN public.departments sd ON dm.sender_department_id = sd.id
  JOIN public.users su ON dm.sender_user_id = su.id
  WHERE mrs.user_id = p_user_id
  ORDER BY dm.created_at DESC;
END;
$$;

-- 9. Enable Row Level Security
ALTER TABLE public.department_mails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_heads ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies

-- Policy for department_mails: Users can only see mails sent to their department
CREATE POLICY "Users can view mails sent to their department" ON public.department_mails
  FOR SELECT USING (
    recipient_department_id = (
      SELECT department_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy for mail_read_status: Users can only see their own read status
CREATE POLICY "Users can view their own mail read status" ON public.mail_read_status
  FOR SELECT USING (user_id = auth.uid());

-- Policy for department_heads: Only admins and the department head themselves can view
CREATE POLICY "Department heads can view their own assignment" ON public.department_heads
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role_id = (SELECT id FROM public.user_roles WHERE role_name = 'admin')
    )
  );

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_department_mails_recipient_department ON public.department_mails(recipient_department_id);
CREATE INDEX IF NOT EXISTS idx_mail_read_status_user_mail ON public.mail_read_status(user_id, mail_id);
CREATE INDEX IF NOT EXISTS idx_mail_read_status_mail ON public.mail_read_status(mail_id);
CREATE INDEX IF NOT EXISTS idx_department_heads_department ON public.department_heads(department_id);

-- 12. Grant necessary permissions
GRANT SELECT, INSERT ON public.department_mails TO authenticated;
GRANT SELECT, UPDATE ON public.mail_read_status TO authenticated;
GRANT SELECT ON public.department_heads TO authenticated;
GRANT SELECT ON public.employee_types TO authenticated;
GRANT EXECUTE ON FUNCTION send_department_mail TO authenticated;
GRANT EXECUTE ON FUNCTION mark_mail_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_mail_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_inbox TO authenticated;
