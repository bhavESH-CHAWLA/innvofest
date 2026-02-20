import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { extractApiError } from "../lib/api";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Fill in name, email, and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await api.post("/signup", {
        name,
        email,
        password,
      });
      navigate("/", { replace: true });
    } catch (apiError) {
      setError(extractApiError(apiError, "Signup failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl"
        onSubmit={handleSignup}
      >
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">Create Account</h1>
        <p className="mb-6 text-center text-slate-600">Start using the risk dashboard</p>

        <input
          className="mb-3 w-full rounded border border-slate-300 p-2 outline-none focus:border-indigo-500"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="mb-3 w-full rounded border border-slate-300 p-2 outline-none focus:border-indigo-500"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mb-3 w-full rounded border border-slate-300 p-2 outline-none focus:border-indigo-500"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded bg-indigo-600 p-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating..." : "Signup"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-indigo-700 hover:underline" to="/">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;
