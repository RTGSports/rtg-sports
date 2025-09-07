import { supabase } from "./supabase";

export type Favorite = { id: number; league: "wnba" | "nwsl"; team_code: string };

export async function listFavorites() {
  const { data, error } = await supabase
    .from("favorites")
    .select("id, league, team_code")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Favorite[];
}

export async function addFavorite(league: "wnba" | "nwsl", team_code: string) {
  const { error } = await supabase.from("favorites").insert({ league, team_code });
  if (error) throw error;
}

export async function removeFavorite(id: number) {
  const { error } = await supabase.from("favorites").delete().eq("id", id);
  if (error) throw error;
}