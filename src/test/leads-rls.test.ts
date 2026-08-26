import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Integration tests against the real Lovable Cloud backend.
// Validates RLS policy "anyone can submit lead" on public.leads:
//   WITH CHECK requires non-empty nome, email (>3), whatsapp (>5), localizacao.
// Both anon and authenticated roles share the same policy, so we test via anon.

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const anon = createClient(URL, KEY);

const validLead = () => ({
  nome: "[TEST] RLS",
  email: "rls-test@example.com",
  whatsapp: "+351900000000",
  localizacao: "Lisboa",
  tem_retoma: false,
  precisa_financiamento: false,
});

describe("leads RLS — anon", () => {
  beforeAll(() => {
    expect(URL).toBeTruthy();
    expect(KEY).toBeTruthy();
  });

  it("accepts a fully valid lead", async () => {
    const { error } = await anon.from("leads").insert(validLead());
    expect(error).toBeNull();
  });

  it("rejects empty nome", async () => {
    const { error } = await anon.from("leads").insert({ ...validLead(), nome: "   " });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501"); // RLS violation
  });

  it("rejects short email", async () => {
    const { error } = await anon.from("leads").insert({ ...validLead(), email: "a@b" });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("rejects short whatsapp", async () => {
    const { error } = await anon.from("leads").insert({ ...validLead(), whatsapp: "123" });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("rejects empty localizacao", async () => {
    const { error } = await anon.from("leads").insert({ ...validLead(), localizacao: "" });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("blocks anon from reading leads (no SELECT policy for anon)", async () => {
    const { data, error } = await anon.from("leads").select("id").limit(1);
    // RLS hides rows; either error or empty array, never leaked rows
    expect(error || (data && data.length === 0)).toBeTruthy();
  });
});
