import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  console.log("Repos Route - Session:", session); // DEBUG

  if (!session || !session.accessToken) {
    console.log("Repos Route - No token!"); // DEBUG
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Repos Route - Token found:", session.accessToken); // DEBUG

  try {
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      console.log("GitHub API Error:", response.status);
      throw new Error("GitHub API error");
    }

    const repos = await response.json();
    console.log("Repos fetched:", repos.length);
    
    return NextResponse.json(repos);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}