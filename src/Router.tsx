import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { Portfolio } from "./pages/Portfolio";
import CreateToken from "./pages/CreateToken";
import Layout from "./components/Layout";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/create" element={<CreateToken />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
