import { Routes, Route } from "react-router";
import Home from "./routes/home";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
