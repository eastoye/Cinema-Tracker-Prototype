import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { code, redirect_uri, clientId } = await req.json();

    if (!code || !redirect_uri) {
      return json({ error: "Missing code or redirect_uri" }, 400);
    }

    const traktClientId = Deno.env.get("TRAKT_CLIENT_ID");
    const traktClientSecret = Deno.env.get("TRAKT_CLIENT_SECRET");

    if (!traktClientId || !traktClientSecret) {
      return json({ error: "Trakt credentials not configured" }, 500);
    }

    // Diagnostic only — compares the client_id the frontend used to start the
    // OAuth flow with the one stored in this function's secrets.
    // Returns only a boolean; neither value is included in the response.
    const clientIdMatches = typeof clientId === "string" && clientId === traktClientId;

    const response = await fetch("https://api.trakt.tv/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: traktClientId,
        client_secret: traktClientSecret,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const rawBody = await response.text();

    if (!response.ok) {
      let detail: unknown;
      try { detail = JSON.parse(rawBody); } catch { detail = rawBody; }
      return json({ error: "Trakt token exchange failed", detail, clientIdMatches }, response.status);
    }

    const data = JSON.parse(rawBody);
    return json({ ...data, clientIdMatches });
  } catch (e) {
    return json({ error: "Internal error", detail: String(e) }, 500);
  }
});
