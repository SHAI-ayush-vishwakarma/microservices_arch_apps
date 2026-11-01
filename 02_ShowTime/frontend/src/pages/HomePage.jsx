import { useAuth } from "../context/AuthContext.jsx";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="card">
      <h1>Welcome to ShowTime 🎟️</h1>
      {user ? (
        <p>You're logged in as <b>{user.email}</b> ({user.role}). Events are coming in Phase 3!</p>
      ) : (
        <p>Log in or sign up to book tickets.</p>
      )}
    </div>
  );
}
