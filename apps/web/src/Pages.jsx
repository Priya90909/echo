import { lazy, Suspense } from "react";
import { Link, Routes, Route } from "react-router-dom";
const Home = lazy(() => import("./pages/Home.jsx"));
const Offline = lazy(() => import("./pages/Offline.jsx"));
const Search = lazy(() => import("./pages/Search.jsx"));
const Library = lazy(() => import("./pages/Library.jsx"));
const Detail = lazy(() => import("./pages/Detail.jsx"));
const Collection = lazy(() => import("./pages/Collection.jsx"));
const MoodFlow = lazy(() => import("./pages/MoodFlow.jsx"));
const Studio = lazy(() => import("./pages/Studio.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Rooms = lazy(() => import("./pages/Rooms.jsx"));
function Protected({ user, children }) {
  return user ? (
    <>{children}</>
  ) : (
    <main className="page">
      <h1>Your world starts here.</h1>
      <p>Sign in to save music, listen, and connect with friends.</p>
      <Link className="primary" to="/login">
        Sign in
      </Link>
    </main>
  );
}
export default function Pages({ user }) {
  const protect = (children) => <Protected user={user}>{children}</Protected>;
  return (
    <Suspense fallback={<div className="skeleton" />}>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route
          path="/offline"
          element={<Offline key={user?._id || "signed-out"} user={user} />}
        />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={protect(<Library />)} />
        <Route path="/likes" element={protect(<Collection />)} />
        <Route path="/history" element={protect(<Collection history />)} />
        <Route path="/moodflow" element={protect(<MoodFlow />)} />
        <Route path="/rooms" element={protect(<Rooms user={user} />)} />
        <Route path="/studio" element={protect(<Studio />)} />
        <Route path="/studio/upload" element={protect(<Studio uploadOnly />)} />
        <Route
          path="/studio/analytics"
          element={protect(<Studio analytics />)}
        />
        <Route path="/settings" element={protect(<Settings user={user} />)} />
        <Route
          path="/admin"
          element={protect(
            user?.role === "admin" ? (
              <Admin />
            ) : (
              <main className="page">
                <h1>Administrator access required.</h1>
              </main>
            ),
          )}
        />
        {["artists", "albums", "playlists"].map((kind) => (
          <Route
            key={kind}
            path={`/${kind}/:id`}
            element={<Detail kind={kind} user={user} />}
          />
        ))}
        <Route
          path="*"
          element={
            <main className="page">
              <h1>This frequency is out of range.</h1>
              <Link to="/home">Back to discovery</Link>
            </main>
          }
        />
      </Routes>
    </Suspense>
  );
}
