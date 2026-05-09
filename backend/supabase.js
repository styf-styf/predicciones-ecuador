const { createClient } = require("@supabase/supabase-js");

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no está definido en .env");

const supabase = createClient(
  "https://dekhdcvhhiafgxgnbuji.supabase.co",
  key
);

module.exports = supabase;