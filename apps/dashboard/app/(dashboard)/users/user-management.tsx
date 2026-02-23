"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SafeUser {
  email: string;
  role: "admin" | "viewer";
  createdAt: string;
  updatedAt: string;
}

interface Props {
  currentEmail: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserManagement({ currentEmail }: Props) {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", confirm: "", role: "viewer" as "admin" | "viewer" });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: "viewer" as "admin" | "viewer", password: "", confirm: "" });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch users
  // -----------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: SafeUser[] = await res.json();
      setUsers(data.sort((a, b) => a.email.localeCompare(b.email)));
      setError("");
    } catch {
      setError("Could not load users. Make sure Upstash Redis is configured or AUTH_USERS is set.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // -----------------------------------------------------------------------
  // Add user
  // -----------------------------------------------------------------------

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");

    if (addForm.password !== addForm.confirm) {
      setAddError("Passwords do not match.");
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addForm.email, password: addForm.password, role: addForm.role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create user");
      }
      setShowAdd(false);
      setAddForm({ email: "", password: "", confirm: "", role: "viewer" });
      await fetchUsers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAddLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Edit user
  // -----------------------------------------------------------------------

  function startEdit(user: SafeUser) {
    setEditingEmail(user.email);
    setEditForm({ role: user.role, password: "", confirm: "" });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEmail) return;
    setEditError("");

    if (editForm.password && editForm.password !== editForm.confirm) {
      setEditError("Passwords do not match.");
      return;
    }

    setEditLoading(true);
    try {
      const body: Record<string, string> = { role: editForm.role };
      if (editForm.password) body.password = editForm.password;

      const res = await fetch(`/api/users/${encodeURIComponent(editingEmail)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update user");
      }
      setEditingEmail(null);
      await fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Delete user
  // -----------------------------------------------------------------------

  async function handleDelete(email: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(email)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete user");
      }
      setDeletingEmail(null);
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
      setDeletingEmail(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-brand-pewter/20 bg-white/90 p-8 shadow-card">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-brand-pewter">
            Users
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-brand-charcoal">
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </h2>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(""); }}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-teal-deep"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-6 rounded-2xl border border-brand-pewter/20 bg-brand-mist/30 p-6"
        >
          <h3 className="text-sm font-semibold text-brand-charcoal">New User</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter">
                Email
              </label>
              <input
                type="email"
                required
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter">
                Role
              </label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as "admin" | "viewer" }))}
                className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={addForm.confirm}
                onChange={(e) => setAddForm((f) => ({ ...f, confirm: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                placeholder="Repeat password"
              />
            </div>
          </div>

          {addError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {addError}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={addLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-teal-deep disabled:opacity-60"
            >
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create User
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-pewter/30 px-4 py-2 text-sm font-medium text-brand-pewter transition hover:text-brand-charcoal"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-brand-pewter/20">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brand-pewter/20 bg-brand-mist/40">
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-brand-pewter text-xs">
                Email
              </th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-brand-pewter text-xs">
                Role
              </th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-brand-pewter text-xs">
                Created
              </th>
              <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-brand-pewter text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.email.toLowerCase() === currentEmail.toLowerCase();
              const isEditing = editingEmail === user.email;

              if (isEditing) {
                return (
                  <tr key={user.email} className="border-b border-brand-pewter/10 bg-brand-mist/20">
                    <td colSpan={4} className="px-5 py-4">
                      <form onSubmit={handleEdit}>
                        <h4 className="text-sm font-semibold text-brand-charcoal">
                          Editing {user.email}
                        </h4>
                        <div className="mt-3 grid gap-4 sm:grid-cols-3">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter">
                              Role
                            </label>
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as "admin" | "viewer" }))}
                              disabled={isSelf}
                              className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 disabled:opacity-50"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter">
                              New Password <span className="normal-case tracking-normal">(optional)</span>
                            </label>
                            <input
                              type="password"
                              minLength={8}
                              value={editForm.password}
                              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                              placeholder="Leave blank to keep"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter">
                              Confirm Password
                            </label>
                            <input
                              type="password"
                              minLength={8}
                              value={editForm.confirm}
                              onChange={(e) => setEditForm((f) => ({ ...f, confirm: e.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                              placeholder="Repeat new password"
                            />
                          </div>
                        </div>

                        {editError && (
                          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                            {editError}
                          </p>
                        )}

                        <div className="mt-4 flex gap-3">
                          <button
                            type="submit"
                            disabled={editLoading}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-teal-deep disabled:opacity-60"
                          >
                            {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEmail(null)}
                            className="inline-flex items-center gap-2 rounded-xl border border-brand-pewter/30 px-4 py-2 text-sm font-medium text-brand-pewter transition hover:text-brand-charcoal"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={user.email} className="border-b border-brand-pewter/10 last:border-b-0">
                  <td className="px-5 py-3 font-medium text-brand-charcoal">
                    {user.email}
                    {isSelf && (
                      <span className="ml-2 text-xs text-brand-pewter">(you)</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        user.role === "admin"
                          ? "bg-brand-teal/10 text-brand-teal"
                          : "bg-brand-pewter/10 text-brand-pewter"
                      }`}
                    >
                      {user.role === "admin" ? "Admin" : "Viewer"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-brand-pewter">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(user)}
                        className="rounded-lg border border-brand-pewter/30 p-1.5 text-brand-pewter transition hover:border-brand-teal hover:text-brand-teal"
                        aria-label={`Edit ${user.email}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {deletingEmail === user.email ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600">Delete?</span>
                          <button
                            onClick={() => handleDelete(user.email)}
                            disabled={deleteLoading}
                            className="rounded-lg border border-red-300 p-1.5 text-red-600 transition hover:bg-red-50"
                            aria-label="Confirm delete"
                          >
                            {deleteLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setDeletingEmail(null)}
                            className="rounded-lg border border-brand-pewter/30 p-1.5 text-brand-pewter transition hover:text-brand-charcoal"
                            aria-label="Cancel delete"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingEmail(user.email)}
                          disabled={isSelf}
                          className="rounded-lg border border-brand-pewter/30 p-1.5 text-brand-pewter transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Delete ${user.email}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-brand-pewter">
                  No users found. Click &ldquo;Add User&rdquo; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
