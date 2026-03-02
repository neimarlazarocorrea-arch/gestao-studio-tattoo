import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Topo fixo */}
      <header style={{ backgroundColor: "#1a1a1a", color: "#fff", padding: "12px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: 20 }}>🎨 Gestão Studio Tattoo</h1>
      </header>

      {/* Menu */}
      <nav style={{ backgroundColor: "#f0f0f0", padding: "8px 16px", borderBottom: "1px solid #ddd", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#333", fontWeight: "500" }}>Dashboard</Link>
        <Link to="/clientes" style={{ textDecoration: "none", color: "#333", fontWeight: "500" }}>Clientes</Link>
        <Link to="/projetos" style={{ textDecoration: "none", color: "#333", fontWeight: "500" }}>Projetos</Link>
        <Link to="/sessoes" style={{ textDecoration: "none", color: "#333", fontWeight: "500" }}>Sessões</Link>
        <Link to="/estoque" style={{ textDecoration: "none", color: "#333", fontWeight: "500" }}>Estoque</Link>
        <Link to="/financeiro" style={{ textDecoration: "none", color: "#333", fontWeight: "500" }}>Financeiro</Link>
      </nav>

      {/* Conteúdo central */}
      <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "16px", width: "100%" }}>
        {children}
      </main>

      {/* Rodapé simples */}
      <footer style={{ backgroundColor: "#f0f0f0", padding: "12px 16px", textAlign: "center", fontSize: 12, color: "#666", borderTop: "1px solid #ddd" }}>
        © 2026 Gestão Studio Tattoo
      </footer>
    </div>
  );
}
