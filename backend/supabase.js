const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://dekhdcvhhiafgxgnbuji.supabase.co",
  "sb_publishable_U8ImTQgCIG7SOyJra4hRxA_OHXGNq11"
);

module.exports = supabase;