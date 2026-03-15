import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-session-token, x-session-user-id",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, ...params } = await req.json();

    // ── SIGNUP ──────────────────────────────────────────
    if (action === "signup") {
      const { username, password, display_name } = params;
      if (!username || !password) {
        return json({ error: "Username and password required" }, 400);
      }
      if (password.length < 4) {
        return json({ error: "Password must be at least 4 characters" }, 400);
      }
      if (username.trim().length < 3) {
        return json({ error: "Username must be at least 3 characters" }, 400);
      }

      // Hash password
      const { data: hash } = await supabase.rpc("hash_app_password", {
        _password: password,
      });

      const { data, error } = await supabase.from("app_users").insert({
        username: username.toLowerCase().trim(),
        password_hash: hash,
        display_name: display_name?.trim() || username.trim(),
        is_admin: false,
      }).select("id, username, display_name, is_admin, is_active").single();

      if (error) {
        if (error.code === "23505") return json({ error: "Username already taken" }, 409);
        return json({ error: error.message }, 500);
      }

      return json({ user: data, message: "Account created successfully" });
    }

    // ── LOGIN ───────────────────────────────────────────
    if (action === "login") {
      const { username, password } = params;
      if (!username || !password) {
        return json({ error: "Username and password required" }, 400);
      }

      const { data: user, error } = await supabase
        .from("app_users")
        .select("id, username, display_name, is_admin, is_active")
        .eq("username", username.toLowerCase().trim())
        .single();

      if (error || !user) {
        return json({ error: "Invalid username or password" }, 401);
      }

      if (!user.is_active) {
        return json({ error: "Account is disabled" }, 403);
      }

      const { data: pwCheck } = await supabase.rpc("verify_app_password", {
        _username: username.toLowerCase().trim(),
        _password: password,
      });

      if (!pwCheck) {
        return json({ error: "Invalid username or password" }, 401);
      }

      await supabase
        .from("app_users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", user.id);

      const token = crypto.randomUUID() + "-" + crypto.randomUUID();

      return json({
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          is_admin: user.is_admin,
        },
        token,
      });
    }

    // ── PROVIDER: List ──────────────────────────────────
    if (action === "list_providers") {
      const userId = await verifyUser(req, supabase);
      if (typeof userId !== "string") return userId;

      const { data, error } = await supabase
        .from("user_providers")
        .select("*")
        .eq("user_id", userId)
        .order("last_used_at", { ascending: false });

      if (error) return json({ error: error.message }, 500);
      return json({ providers: data });
    }

    // ── PROVIDER: Add ───────────────────────────────────
    if (action === "add_provider") {
      const userId = await verifyUser(req, supabase);
      if (typeof userId !== "string") return userId;

      const { name, provider_type, config, account_info, provider_name, provider_logo, settings } = params;
      if (!provider_type || !config) {
        return json({ error: "provider_type and config required" }, 400);
      }

      const { data, error } = await supabase.from("user_providers").insert({
        user_id: userId,
        name: name || "My Provider",
        provider_type,
        config,
        account_info: account_info || null,
        provider_name: provider_name || null,
        provider_logo: provider_logo || null,
        settings: settings || null,
      }).select().single();

      if (error) return json({ error: error.message }, 500);
      return json({ provider: data });
    }

    // ── PROVIDER: Update ────────────────────────────────
    if (action === "update_provider") {
      const userId = await verifyUser(req, supabase);
      if (typeof userId !== "string") return userId;

      const { provider_id, ...updates } = params;
      if (!provider_id) return json({ error: "provider_id required" }, 400);

      // Remove fields that shouldn't be updated directly
      delete updates.user_id;
      delete updates.id;

      const { error } = await supabase
        .from("user_providers")
        .update({ ...updates, last_used_at: new Date().toISOString() })
        .eq("id", provider_id)
        .eq("user_id", userId);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── PROVIDER: Delete ────────────────────────────────
    if (action === "delete_provider") {
      const userId = await verifyUser(req, supabase);
      if (typeof userId !== "string") return userId;

      const { provider_id } = params;
      if (!provider_id) return json({ error: "provider_id required" }, 400);

      const { error } = await supabase
        .from("user_providers")
        .delete()
        .eq("id", provider_id)
        .eq("user_id", userId);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── PROVIDER: Touch (update last_used_at) ───────────
    if (action === "touch_provider") {
      const userId = await verifyUser(req, supabase);
      if (typeof userId !== "string") return userId;

      const { provider_id } = params;
      if (!provider_id) return json({ error: "provider_id required" }, 400);

      await supabase
        .from("user_providers")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", provider_id)
        .eq("user_id", userId);

      return json({ success: true });
    }

    // ── ADMIN: List users ───────────────────────────────
    if (action === "list_users") {
      const adminCheck = await verifyAdmin(req, supabase);
      if (adminCheck) return adminCheck;

      const { data, error } = await supabase
        .from("app_users")
        .select("id, username, display_name, is_admin, is_active, created_at, last_login")
        .order("created_at", { ascending: true });

      if (error) return json({ error: error.message }, 500);
      return json({ users: data });
    }

    // ── ADMIN: Create user ──────────────────────────────
    if (action === "create_user") {
      const adminCheck = await verifyAdmin(req, supabase);
      if (adminCheck) return adminCheck;

      const { username, password, display_name, is_admin } = params;
      if (!username || !password) {
        return json({ error: "Username and password required" }, 400);
      }
      if (password.length < 4) {
        return json({ error: "Password must be at least 4 characters" }, 400);
      }

      const { data: hash } = await supabase.rpc("hash_app_password", {
        _password: password,
      });

      const { data, error } = await supabase.from("app_users").insert({
        username: username.toLowerCase().trim(),
        password_hash: hash,
        display_name: display_name || username,
        is_admin: is_admin || false,
      }).select("id, username, display_name, is_admin, is_active, created_at").single();

      if (error) {
        if (error.code === "23505") return json({ error: "Username already exists" }, 409);
        return json({ error: error.message }, 500);
      }

      return json({ user: data });
    }

    // ── ADMIN: Update user ──────────────────────────────
    if (action === "update_user") {
      const adminCheck = await verifyAdmin(req, supabase);
      if (adminCheck) return adminCheck;

      const { user_id, display_name, is_admin, is_active, new_password } = params;
      if (!user_id) return json({ error: "user_id required" }, 400);

      const updates: Record<string, unknown> = {};
      if (display_name !== undefined) updates.display_name = display_name;
      if (is_admin !== undefined) updates.is_admin = is_admin;
      if (is_active !== undefined) updates.is_active = is_active;

      if (new_password) {
        if (new_password.length < 4) return json({ error: "Password must be at least 4 characters" }, 400);
        const { data: hash } = await supabase.rpc("hash_app_password", { _password: new_password });
        updates.password_hash = hash;
      }

      if (Object.keys(updates).length === 0) return json({ error: "No fields to update" }, 400);

      const { error } = await supabase.from("app_users").update(updates).eq("id", user_id);
      if (error) return json({ error: error.message }, 500);

      return json({ success: true });
    }

    // ── ADMIN: Delete user ──────────────────────────────
    if (action === "delete_user") {
      const adminCheck = await verifyAdmin(req, supabase);
      if (adminCheck) return adminCheck;

      const { user_id } = params;
      if (!user_id) return json({ error: "user_id required" }, 400);

      const { error } = await supabase.from("app_users").delete().eq("id", user_id);
      if (error) return json({ error: error.message }, 500);

      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("app-auth error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/** Verify the user is authenticated and return their user ID, or a Response on failure */
async function verifyUser(req: Request, supabase: any): Promise<string | Response> {
  const sessionToken = req.headers.get("x-session-token");
  const sessionUserId = req.headers.get("x-session-user-id");

  if (!sessionToken || !sessionUserId) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Verify user exists and is active
  const { data: user } = await supabase
    .from("app_users")
    .select("id, is_active")
    .eq("id", sessionUserId)
    .single();

  if (!user || !user.is_active) {
    return json({ error: "Unauthorized" }, 401);
  }

  return user.id as string;
}

async function verifyAdmin(req: Request, supabase: any) {
  const sessionToken = req.headers.get("x-session-token");
  const sessionUserId = req.headers.get("x-session-user-id");

  if (!sessionToken || !sessionUserId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: user } = await supabase
    .from("app_users")
    .select("is_admin")
    .eq("id", sessionUserId)
    .single();

  if (!user?.is_admin) {
    return json({ error: "Admin access required" }, 403);
  }

  return null;
}
