import { supabase } from "./supabase";

export type Team = {
  id: number;
  league: "wnba" | "nwsl";
  code: string;
  name: string;
  city: string;
  display_name: string;
  active: boolean;
};

export async function listTeams(league: "wnba" | "nwsl") {
  const { data, error } = await supabase
    .from("teams")
    .select("id, league, code, name, city, display_name, active")
    .eq("league", league)
    .eq("active", true)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return (data || []) as Team[];
}