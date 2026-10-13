import { useEffect, useMemo, useState } from "react";
import { api } from "../../../app/api";
import PageHeader from "../../../shared/components/PageHeader";

const emptyForm = { user_id: "", name: "", email: "", role: "buyer", password: "123456" };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const out = await api.listUsers();
    setUsers(Array.isArray(out?.items) ? out.items : []);
  }

  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => !needle || [user.user_id, user.name, user.email, ...(user.roles || [])].join(" ").toLowerCase().includes(needle));
  }, [query, users]);

  function edit(user) {
    setSelectedId(user.user_id);
    setForm({ user_id: user.user_id, name: user.name || "", email: user.email || "", role: user.roles?.[0] || "buyer", password: "" });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const payload = { name: form.name, email: form.email, roles: [form.role], ...(form.password ? { password: form.password } : {}) };
      if (selectedId) await api.updateUser(selectedId, payload);
      else await api.createUser({ ...payload, user_id: form.user_id });
      setForm(emptyForm);
      setSelectedId("");
      await load();
      setMessage("User saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(userId) {
    await api.deactivateUser(userId);
    await load();
  }

  async function remove(userId) {
    if (!window.confirm(`Delete ${userId}?`)) return;
    await api.deleteUser(userId);
    await load();
  }

  return (
    <section className="pay42-page-container stack-layout fadeIn">
      <PageHeader title="Users" subtitle="Manage administrators, sellers, and buyers." />
      <div className="two-column-layout">
        <div className="panel">
          <div className="toolbar"><input placeholder="Search users" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{visibleUsers.map((user) => <tr key={user.user_id}>
              <td><strong>{user.name || user.user_id}</strong><div className="minor-text">{user.email}</div></td>
              <td>{(user.roles || []).join(", ")}</td><td>{user.is_active === false ? "Inactive" : "Active"}</td>
              <td className="row-actions"><button type="button" className="secondary-button" onClick={() => edit(user)}>Edit</button>{user.user_id !== "admin" ? <><button type="button" className="secondary-button" onClick={() => deactivate(user.user_id)}>Deactivate</button><button type="button" className="danger-button" onClick={() => remove(user.user_id)}>Delete</button></> : null}</td>
            </tr>)}</tbody>
          </table></div>
        </div>
        <form className="panel stack-layout" onSubmit={save}>
          <h3>{selectedId ? `Edit ${selectedId}` : "Create user"}</h3>
          <label><span className="minor-text">User ID</span><input disabled={Boolean(selectedId)} value={form.user_id} onChange={(event) => setForm({ ...form, user_id: event.target.value })} required /></label>
          <label><span className="minor-text">Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label><span className="minor-text">Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label><span className="minor-text">Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="admin">Admin</option></select></label>
          <label><span className="minor-text">Password {selectedId ? "(leave blank to keep)" : ""}</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <div className="row-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>{selectedId ? <button type="button" className="secondary-button" onClick={() => { setSelectedId(""); setForm(emptyForm); }}>Cancel</button> : null}</div>
          {message ? <div className="minor-text">{message}</div> : null}
        </form>
      </div>
    </section>
  );
}
