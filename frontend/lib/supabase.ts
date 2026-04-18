import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://dekhdcvhhiafgxgnbuji.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla2hkY3ZoaGlhZmd4Z25idWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDE1MzYsImV4cCI6MjA5MTYxNzUzNn0.mEYiyDk6mLsO3yTBhBdUDepo2fOZZ8vTIAkmOiGNAxQ"
);