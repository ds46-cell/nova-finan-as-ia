-- Part 5-9: Complete Enterprise Tables

-- Financial Categories table
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view categories"
ON public.financial_categories FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories"
ON public.financial_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default categories
INSERT INTO public.financial_categories (name, type) VALUES
  ('Salário', 'income'),
  ('Freelance', 'income'),
  ('Investimentos', 'income'),
  ('Vendas', 'income'),
  ('Outros Receitas', 'income'),
  ('Alimentação', 'expense'),
  ('Transporte', 'expense'),
  ('Moradia', 'expense'),
  ('Saúde', 'expense'),
  ('Educação', 'expense'),
  ('Lazer', 'expense'),
  ('Tecnologia', 'expense'),
  ('Impostos', 'expense'),
  ('Outros Despesas', 'expense');

-- Integrations table
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('csv_import', 'api', 'webhook', 'manual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  config jsonb DEFAULT '{}',
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
ON public.integrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
ON public.integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
ON public.integrations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all integrations"
ON public.integrations FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Integration logs table
CREATE TABLE public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'pending', 'processing')),
  message text,
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integration logs"
ON public.integration_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integration logs"
ON public.integration_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all integration logs"
ON public.integration_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_role text CHECK (target_role IN ('admin', 'analyst', 'viewer', 'all')),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications for their role or direct"
ON public.notifications FOR SELECT
USING (
  target_user_id = auth.uid() 
  OR target_role = 'all'
  OR (target_role IS NOT NULL AND target_role::text = (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Users can update own notification read status"
ON public.notifications FOR UPDATE
USING (target_user_id = auth.uid() OR target_role IS NOT NULL);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- AI insights table
CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_type text NOT NULL CHECK (insight_type IN ('analysis', 'recommendation', 'alert', 'summary')),
  question text,
  content text NOT NULL,
  data_context jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI insights"
ON public.ai_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI insights"
ON public.ai_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI insights"
ON public.ai_insights FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- LGPD consents table
CREATE TABLE public.lgpd_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('terms_of_service', 'privacy_policy', 'data_processing', 'marketing', 'cookies')),
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

ALTER TABLE public.lgpd_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
ON public.lgpd_consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own consents"
ON public.lgpd_consents FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all consents"
ON public.lgpd_consents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for lgpd_consents
CREATE TRIGGER update_lgpd_consents_updated_at
BEFORE UPDATE ON public.lgpd_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX idx_integration_logs_integration_id ON public.integration_logs(integration_id);
CREATE INDEX idx_integration_logs_user_id ON public.integration_logs(user_id);
CREATE INDEX idx_notifications_target_user ON public.notifications(target_user_id);
CREATE INDEX idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_lgpd_consents_user_id ON public.lgpd_consents(user_id);