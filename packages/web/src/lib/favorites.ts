import { supabase } from "./supabase";

export type Favorite = {
  id: number;
  league: "wnba" | "nwsl";
  team_code: string;
  team_name?: string;
};

export async function listFavorites() {
  // read from the view which includes team_name
  const { data, error } = await supabase
    .from("user_favorites_v")
    .select("id, league, team_code, team_name")
    .order("id", { ascending: false });

  if (error) throw error;
  return (data || []) as Favorite[];
}

export async function addFavorite(league: "wnba" | "nwsl", team_code: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("Please sign in first.");
  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: u.user.id, league, team_code });
  if (error) throw error;
}

export async function removeFavorite(id: number) {
  const { error } = await supabase.from("favorites").delete().eq("id", id);
  if (error) throw error;
}