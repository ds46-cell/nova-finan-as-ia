-- Create financial_accounts table
CREATE TABLE public.financial_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_transactions table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(15,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create kpi_cache table for performance
CREATE TABLE public.kpi_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  kpi_name TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, kpi_name)
);

-- Enable RLS on all tables
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_cache ENABLE ROW LEVEL SECURITY;

-- RLS for financial_accounts
CREATE POLICY "Users can view accounts of their tenant"
ON public.financial_accounts FOR SELECT
USING (tenant_id = auth.uid());

CREATE POLICY "Admins can insert accounts"
ON public.financial_accounts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update accounts"
ON public.financial_accounts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete accounts"
ON public.financial_accounts FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for financial_transactions
CREATE POLICY "Users can view transactions of their tenant"
ON public.financial_transactions FOR SELECT
USING (tenant_id = auth.uid());

CREATE POLICY "Authenticated users can insert transactions"
ON public.financial_transactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND tenant_id = auth.uid());

CREATE POLICY "Admins can update transactions"
ON public.financial_transactions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete transactions"
ON public.financial_transactions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for kpi_cache
CREATE POLICY "Users can view their KPI cache"
ON public.kpi_cache FOR SELECT
USING (tenant_id = auth.uid());

CREATE POLICY "System can manage KPI cache"
ON public.kpi_cache FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_financial_transactions_tenant ON public.financial_transactions(tenant_id);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_financial_accounts_tenant ON public.financial_accounts(tenant_id);

-- Trigger for updated_at on financial_accounts
CREATE TRIGGER update_financial_accounts_updated_at
BEFORE UPDATE ON public.financial_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();