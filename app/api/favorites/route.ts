import { NextRequest, NextResponse } from "next/server";

interface FavoriteItem {
  id: string;
  label: string;
  category: "team" | "league";
}

const COOKIE_NAME = "rtg-favorites";

function readFavorites(request: NextRequest): FavoriteItem[] {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!cookie) {
    return [];
  }

  try {
    const parsed = JSON.parse(cookie);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is FavoriteItem =>
        typeof item?.id === "string" &&
        typeof item?.label === "string" &&
        (item?.category === "team" || item?.category === "league")
    );
  } catch {
    return [];
  }
}

function writeFavorites(favorites: FavoriteItem[]) {
  return {
    name: COOKIE_NAME,
    value: JSON.stringify(favorites),
    httpOnly: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function GET(request: NextRequest) {
  const favorites = readFavorites(request);

  return NextResponse.json({ favorites });
}

export async function POST(request: NextRequest) {
  const favorites = readFavorites(request);

  try {
    const payload = (await request.json()) as Partial<FavoriteItem>;
    const { id, label, category } = payload;

    if (!id || !label || (category !== "team" && category !== "league")) {
      return NextResponse.json(
        { error: "Favorites must include an id, label, and category." },
        { status: 400 }
      );
    }

    const exists = favorites.some((item) => item.id === id);

    if (exists) {
      const response = NextResponse.json({ favorites });
      response.cookies.set(writeFavorites(favorites));
      return response;
    }

    const updated = [...favorites, { id, label, category }];
    const response = NextResponse.json({ favorites: updated });
    response.cookies.set(writeFavorites(updated));
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save favorite right now.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const favorites = readFavorites(request);

  try {
    const payload = (await request.json()) as Partial<FavoriteItem>;
    const { id } = payload;

    if (!id) {
      return NextResponse.json(
        { error: "Favorite id is required for deletion." },
        { status: 400 }
      );
    }

    const updated = favorites.filter((item) => item.id !== id);
    const response = NextResponse.json({ favorites: updated });
    response.cookies.set(writeFavorites(updated));
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove favorite right now.",
      },
      { status: 400 }
    );
  }
}
