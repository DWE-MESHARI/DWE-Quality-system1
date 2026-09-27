// طبقة الربط مع Supabase — بديل js/firebase.js، بنفس الواجهة تمامًا (DB, onAuth, login, logout, getRole)
// حتى لا يحتاج app.js أي تعديل عدا سطر الاستيراد أعلاه.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { supabaseConfig } from "./supabase-config.js";

const sb = createClient(supabaseConfig.url, supabaseConfig.key);

// ===== تحويل بين أسماء حقول الواجهة (كما يستخدمها app.js) وأسماء أعمدة الجداول =====
// emp:  الواجهة تستخدم e.on (نشطة/موقوفة) ↔ العمود الفعلي active
// ev:   الواجهة تستخدم r.emp (معرّف الموظفة) ↔ العمود الفعلي emp_id، ومعرّف الصف مركّب "emp_date"
// log:  الواجهة تستخدم t/u/un/a/d ↔ الأعمدة t/user_id/user_name/action/details
// rep:  مطابق تمامًا (s, i, a) والمفتاح هو emp_id نفسه
// cfg:  مطابق تمامًا، وصفّه الوحيد id=1

function fromRow(table, row) {
  if (table === "emp") return { id: String(row.id), name: row.name, role: row.role || "", on: row.active !== false };
  if (table === "ev") return { id: row.emp_id + "_" + row.date, emp: String(row.emp_id), date: row.date, calls: row.calls || 0, q: row.q || 0, fcr: row.fcr || 0, com: row.com || 0, cs: row.cs || 0, comp: row.comp || 0, note: row.note || "" };
  if (table === "rep") return { id: String(row.emp_id), s: row.s || "", i: row.i || "", a: row.a || "" };
  if (table === "log") return { id: String(row.id), t: row.t, u: row.user_id, un: row.user_name, a: row.action, d: row.details };
  if (table === "cfg") return { ...row };
  return row;
}

function splitEvKey(key) {
  const m = String(key).match(/^(\d+)_(.+)$/);
  if (!m) throw new Error("مفتاح تقييم غير صالح: " + key);
  return { emp_id: Number(m[1]), date: m[2] };
}

async function loadAll(table) {
  const { data, error } = await sb.from(table).select("*");
  if (error) throw error;
  return (data || []).map((r) => fromRow(table, r));
}

// ===== DB: تقلّد شكل Firestore الذي يعتمد عليه app.js =====
export const DB = {
  collection(table) {
    return {
      onSnapshot(next, err) {
        const push = () => loadAll(table).then((rows) => next({ docs: rows.map((r) => ({ id: r.id, data: () => r })) })).catch((e) => err && err(e));
        push();
        sb.channel(table + "-changes")
          .on("postgres_changes", { event: "*", schema: "public", table }, push)
          .subscribe();
        return () => {};
      },
      async add(data) {
        if (table === "emp") {
          const { data: row, error } = await sb.from("emp").insert({ name: data.name, role: data.role || null, active: data.on !== undefined ? data.on : true }).select().single();
          if (error) throw error;
          return { id: String(row.id) };
        }
        if (table === "log") {
          const { error } = await sb.from("log").insert({ t: data.t, user_id: data.u || null, user_name: data.un || null, action: data.a, details: data.d });
          if (error) throw error;
          return {};
        }
        if (table === "ev") {
          const { emp_id, date } = { emp_id: Number(data.emp), date: data.date };
          const { data: row, error } = await sb.from("ev").insert({ emp_id, date, calls: data.calls || 0, q: data.q || 0, fcr: data.fcr || 0, com: data.com || 0, cs: data.cs || 0, comp: data.comp || 0, note: data.note || "" }).select().single();
          if (error) throw error;
          return { id: row.emp_id + "_" + row.date };
        }
        const { data: row, error } = await sb.from(table).insert(data).select().single();
        if (error) throw error;
        return { id: String(row.id) };
      },
    };
  },
  doc(path) {
    const i = path.indexOf("/");
    const table = path.slice(0, i);
    const key = path.slice(i + 1);
    return {
      async set(data) {
        if (table === "ev") {
          const { emp_id, date } = splitEvKey(key);
          const { error } = await sb.from("ev").upsert({ emp_id, date, calls: data.calls || 0, q: data.q || 0, fcr: data.fcr || 0, com: data.com || 0, cs: data.cs || 0, comp: data.comp || 0, note: data.note || "" }, { onConflict: "emp_id,date" });
          if (error) throw error;
          return;
        }
        if (table === "rep") {
          const { error } = await sb.from("rep").upsert({ emp_id: Number(key), s: data.s || "", i: data.i || "", a: data.a || "" }, { onConflict: "emp_id" });
          if (error) throw error;
          return;
        }
        if (table === "cfg") {
          const { error } = await sb.from("cfg").update(data).eq("id", 1);
          if (error) throw error;
          return;
        }
        const { error } = await sb.from(table).upsert({ id: key, ...data });
        if (error) throw error;
      },
      async update(data) {
        if (table === "emp") {
          const patch = { ...data };
          if ("on" in patch) { patch.active = patch.on; delete patch.on; }
          const { error } = await sb.from("emp").update(patch).eq("id", Number(key));
          if (error) throw error;
          return;
        }
        const { error } = await sb.from(table).update(data).eq("id", key);
        if (error) throw error;
      },
      async delete() {
        if (table === "emp") {
          const { error } = await sb.from("emp").delete().eq("id", Number(key));
          if (error) throw error;
          return;
        }
        if (table === "ev") {
          const { emp_id, date } = splitEvKey(key);
          const { error } = await sb.from("ev").delete().eq("emp_id", emp_id).eq("date", date);
          if (error) throw error;
          return;
        }
        if (table === "rep") {
          const { error } = await sb.from("rep").delete().eq("emp_id", Number(key));
          if (error) throw error;
          return;
        }
        const { error } = await sb.from(table).delete().eq("id", key);
        if (error) throw error;
      },
      onSnapshot(next, err) {
        const push = async () => {
          try {
            if (table === "cfg") {
              const { data, error } = await sb.from("cfg").select("*").eq("id", 1).maybeSingle();
              if (error) throw error;
              next({ exists: !!data, data: () => (data ? fromRow("cfg", data) : {}) });
              return;
            }
            const { data, error } = await sb.from(table).select("*").eq(table === "rep" ? "emp_id" : "id", table === "rep" ? Number(key) : key).maybeSingle();
            if (error) throw error;
            next({ exists: !!data, data: () => (data ? fromRow(table, data) : {}) });
          } catch (e) { err && err(e); }
        };
        push();
        sb.channel(table + "-doc-" + key).on("postgres_changes", { event: "*", schema: "public", table }, push).subscribe();
        return () => {};
      },
    };
  },
};

// ===== المصادقة: نفس أسماء الدوال التي يستخدمها app.js، بشكل موحّد المخرجات =====
function normalizeUser(u) {
  if (!u) return null;
  return { uid: u.id, email: u.email, displayName: (u.user_metadata && u.user_metadata.full_name) || null };
}

export function onAuth(cb) {
  sb.auth.getSession().then(({ data }) => cb(normalizeUser(data.session && data.session.user)));
  sb.auth.onAuthStateChange((_event, session) => cb(normalizeUser(session && session.user)));
}

export async function login(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  await sb.auth.signOut();
}

export async function getRole(uid) {
  const { data, error } = await sb.from("roles").select("role").eq("user_id", uid).maybeSingle();
  if (error || !data) return null;
  return data.role;
}
