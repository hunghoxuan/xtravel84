import { useState } from "react";
import { api } from "../../../app/api";
import PageHeader from "../../../shared/components/PageHeader";

export default function ProfilePage({ authUser, onUserUpdate }) {
  const [profile, setProfile] = useState({ name: authUser?.name || "", email: authUser?.email || "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const out = await api.updateAuthProfile(profile.name, profile.email);
      onUserUpdate?.(out.user);
      setMessage("Profile updated.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (passwords.next !== passwords.confirm) return setMessage("New passwords do not match.");
    setBusy(true);
    try {
      await api.changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setMessage("Password updated.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="pay42-page-container stack-layout fadeIn">
      <PageHeader title="Profile" subtitle={`${authUser?.user_id || ""} · ${(authUser?.roles || []).join(", ")}`} />
      <div className="two-column-layout">
        <form className="panel stack-layout" onSubmit={saveProfile}>
          <h3>Identity</h3>
          <label><span className="minor-text">Name</span><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
          <label><span className="minor-text">Email</span><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required /></label>
          <button type="submit" disabled={busy}>Save profile</button>
        </form>
        <form className="panel stack-layout" onSubmit={changePassword}>
          <h3>Security</h3>
          <label><span className="minor-text">Current password</span><input type="password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} required /></label>
          <label><span className="minor-text">New password</span><input type="password" minLength={6} value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} required /></label>
          <label><span className="minor-text">Confirm new password</span><input type="password" minLength={6} value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} required /></label>
          <button type="submit" disabled={busy}>Change password</button>
        </form>
      </div>
      {message ? <div className="panel minor-text">{message}</div> : null}
    </section>
  );
}
