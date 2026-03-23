import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FinderPage } from "./pages/FinderPage";
import { HistoryPage } from "./pages/HistoryPage";
import { NavigationPage } from "./pages/NavigationPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ShopPage } from "./pages/ShopPage";
import { Header } from "./components/Header";
import { PageTransition } from "./components/PageTransition";

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />
        <PageTransition>
          <Routes>
            <Route path="/" element={<FinderPage />} />
            <Route path="/shop/:ssuId" element={<ShopPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/navigation" element={<NavigationPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </PageTransition>
      </div>
    </BrowserRouter>
  );
}
