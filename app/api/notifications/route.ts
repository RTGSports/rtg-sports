import { NextRequest, NextResponse } from "next/server";

interface NotificationPreferences {
  gameStart: boolean;
  finalScore: boolean;
  breakingNews: boolean;
  email?: string | null;
}

const COOKIE_NAME = "rtg-notification-preferences";
const DEFAULT_PREFERENCES: NotificationPreferences = {
  gameStart: true,
  finalScore: true,
  breakingNews: false,
  email: null,
};

function readPreferences(request: NextRequest): NotificationPreferences {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!cookie) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(cookie);

    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_PREFERENCES;
    }

    return {
      gameStart: Boolean(parsed.gameStart),
      finalScore: Boolean(parsed.finalScore),
      breakingNews: Boolean(parsed.breakingNews),
      email:
        typeof parsed.email === "string" && parsed.email.length > 0
          ? parsed.email
          : null,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(preferences: NotificationPreferences) {
  return {
    name: COOKIE_NAME,
    value: JSON.stringify(preferences),
    httpOnly: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function GET(request: NextRequest) {
  const preferences = readPreferences(request);
  return NextResponse.json({ preferences });
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as Partial<NotificationPreferences>;

    const preferences: NotificationPreferences = {
      gameStart:
        typeof payload.gameStart === "boolean"
          ? payload.gameStart
          : DEFAULT_PREFERENCES.gameStart,
      finalScore:
        typeof payload.finalScore === "boolean"
          ? payload.finalScore
          : DEFAULT_PREFERENCES.finalScore,
      breakingNews:
        typeof payload.breakingNews === "boolean"
          ? payload.breakingNews
          : DEFAULT_PREFERENCES.breakingNews,
      email:
        typeof payload.email === "string" && payload.email.length > 0
          ? payload.email
          : null,
    };

    const response = NextResponse.json({ preferences });
    response.cookies.set(writePreferences(preferences));
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update notification preferences right now.",
      },
      { status: 400 }
    );
  }
}
