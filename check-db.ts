
import { getSupabaseClient } from "./lib/supabase/client.js";

async function checkTables() {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.log("No supabase client");
        return;
    }

    // Try to query information_schema.tables to see what we have
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .limit(1);

    if (error) {
        console.log("Error querying appointments:", error.message);
    } else {
        console.log("Appointments table exists!");
    }

    const { data: data2, error: error2 } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);

    if (error2) {
        console.log("Error querying bookings:", error2.message);
    } else {
        console.log("Bookings table exists!");
    }
}

checkTables();
