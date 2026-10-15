import { useState } from "react";
import { users } from "./users";
import "./Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem("user") || "null")
  );

  function handleSubmit(e) {
    e.preventDefault();

    const found = users.find(
      (u) => u.username === username && u.password === password
    );

    if (!found) {
      setError("Invalid username or password.");
      return;
    }

    // save who logged in (never save the password)
    const loggedIn = {
      username: found.username,
      name: found.name,
      role: found.role,
    };
    sessionStorage.setItem("user", JSON.stringify(loggedIn));
    setUser(loggedIn);
    setError("");
  }

  function handleLogout() {
    sessionStorage.removeItem("user");
    setUser(null);
    setUsername("");
    setPassword("");
  }

  if (user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Welcome, {user.name}</h1>
          <p className="login-role">Logged in as: {user.role}</p>
          <button onClick={handleLogout}>Log Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Staff Login</h1>
        <p className="login-sub">Admins, hosts and security officers.</p>

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit">Log In</button>
        </form>
      </div>
    </div>
  );
}

export default Login;