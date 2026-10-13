import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../../app/api";

const demoUsers = ["user", "seller", "admin"];

export default function LoginPage({ onLogin }) {
  const [login, setLogin] = useState("user");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const out = await api.login(login, password);
      onLogin?.(out.user);
      const returnUrl = searchParams.get("return_url");
      navigate(returnUrl ? decodeURIComponent(returnUrl) : "/admin/42pay/dashboard", { replace: true });
    } catch (nextError) {
      setError(nextError?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel login-page fadeIn">
      <div className="login-brand">
        <img src="/logo/payhub-p-final.png" alt="PayHub" />
        <div><h1>xtravel84</h1><p>Pays and user management</p></div>
      </div>
      <form onSubmit={submit} className="stack-layout">
        <label><span className="minor-text">Demo account</span>
          <select value={login} onChange={(event) => { setLogin(event.target.value); setPassword("123456"); }}>
            {demoUsers.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label><span className="minor-text">Username or email</span>
          <input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" />
        </label>
        <label><span className="minor-text">Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
    </section>
  );
}
