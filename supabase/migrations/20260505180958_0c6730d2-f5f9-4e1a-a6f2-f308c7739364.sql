CREATE POLICY "admin reads all leads" ON public.leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates leads" ON public.leads FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes leads" ON public.leads FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads all propostas" ON public.propostas FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));