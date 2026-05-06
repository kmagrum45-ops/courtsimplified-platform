import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("ENV URL:", supabaseUrl ? "Loaded" : "Missing");
console.log("ENV KEY:", supabaseKey ? "Loaded" : "Missing");

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase env values in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scanFolder(folder) {
  const { data, error } = await supabase.storage
    .from("court-forms")
    .list(folder, { limit: 1000 });

  if (error) {
    console.log("ERROR:", folder, error.message);
    return;
  }

  for (const item of data || []) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;

    if (item.metadata === null) {
      await scanFolder(fullPath);
    } else {
      console.log(fullPath);
    }
  }
}

console.log("\nSUPABASE FORM FILES:\n");

await scanFolder("family");
await scanFolder("ontario/small-claims");
await scanFolder("ontario/civil/rules-of-civil-procedure");

console.log("\nAUDIT COMPLETE");