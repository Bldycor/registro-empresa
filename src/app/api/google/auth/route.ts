import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOAuthClient } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });

  return NextResponse.redirect(url);
}
