import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Projetos from "./pages/Projetos";
import Sessoes from "./pages/Sessoes";
import Estoque from "./pages/Estoque";
import Financeiro from "./pages/Financeiro";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/sessoes" element={<Sessoes />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/financeiro" element={<Financeiro />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}