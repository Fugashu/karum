import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FinderPage } from "./pages/FinderPage";
import { HistoryPage } from "./pages/HistoryPage";
import { NavigationPage } from "./pages/NavigationPage";
import { RegisterPage } from "./pages/RegisterPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FinderPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/navigation" element={<NavigationPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
