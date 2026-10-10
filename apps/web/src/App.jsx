import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Shell from "./components/Shell.jsx";
import Auth from "./pages/Auth.jsx";
import { SessionProvider } from "./session.jsx";

export default function App() {
  return (
    <SessionProvider><BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth key="login" />} />
        <Route path="/register" element={<Auth key="register" register />} />
        <Route path="/*" element={<Shell />} />
      </Routes>
    </BrowserRouter></SessionProvider>
  );
}
