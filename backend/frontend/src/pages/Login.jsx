import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { extractApiError } from "../lib/api";
import { isAuthenticated, setToken } from "../lib/auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from || "/dashboard";

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const continueDemoMode = () => {
    setToken("demo-local-token");
    localStorage.setItem("demo_mode", "true");
    navigate("/dashboard", { replace: true });
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const res = await api.post("/login", {
        email,
        password,
      });

      setToken(res.data.token);
      localStorage.removeItem("demo_mode");
      navigate(redirectPath, { replace: true });
    } catch (apiError) {
      if (!apiError?.response) {
        // Fast fallback: if backend is offline, let user continue in demo mode.
        setToken("demo-local-token");
        localStorage.setItem("demo_mode", "true");
        navigate("/dashboard", { replace: true });
        return;
      }

      setError(extractApiError(apiError, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl"
        onSubmit={handleLogin}
      >
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">InnoVest</h1>
        <h2 className="mb-6 text-center text-lg text-slate-600">Sign in to continue</h2>

        <input
          className="mb-3 w-full rounded border border-slate-300 p-2 outline-none focus:border-indigo-500"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mb-3 w-full rounded border border-slate-300 p-2 outline-none focus:border-indigo-500"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded bg-indigo-600 p-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <button
          className="mt-2 w-full rounded border border-indigo-300 bg-indigo-50 p-2 font-semibold text-indigo-700 transition hover:bg-indigo-100"
          type="button"
          onClick={continueDemoMode}
        >
          Continue in Demo Mode
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          New user?{" "}
          <Link className="font-semibold text-indigo-700 hover:underline" to="/signup">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
