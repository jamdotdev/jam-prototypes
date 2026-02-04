import { NextRequest, NextResponse } from "next/server";

const PYLON_API_URL = "https://api.usepylon.com";

export async function POST(request: NextRequest) {
  try {
    const { endpoint, body } = await request.json();
    const apiToken = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiToken) {
      return NextResponse.json({ error: "Missing API token" }, { status: 401 });
    }

    const response = await fetch(`${PYLON_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || `API error: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const endpoint = request.nextUrl.searchParams.get("endpoint");
    const apiToken = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiToken) {
      return NextResponse.json({ error: "Missing API token" }, { status: 401 });
    }

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const response = await fetch(`${PYLON_API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || `API error: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 }
    );
  }
}
