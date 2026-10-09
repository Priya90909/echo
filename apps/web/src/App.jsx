import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Shell from "./components/Shell.jsx";
import Placeholder from "./pages/Placeholder.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Placeholder title="Welcome back." description="Sign-in will be available in a later update." standalone />} />
        <Route path="/register" element={<Placeholder title="Find your people." description="Registration will be available in a later update." standalone />} />
        <Route path="/*" element={<Shell />} />
      </Routes>
    </BrowserRouter>
  );
}
