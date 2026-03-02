import React from "react";

const SESSOES_KEY = "tattoo_app_sessoes_v1";
const PROJETOS_KEY = "tattoo_app_projetos_v1";
const CLIENTES_KEY = "tattoo_app_clientes_v1";

export default function Financeiro() {
  let sessoes = [];
  let projetos = [];
  let clientes = [];
  try {
    const s = localStorage.getItem(SESSOES_KEY);
    sessoes = s ? JSON.parse(s) : [];
  } catch (e) {
    console.error(e);
  }
  try {
    const p = localStorage.getItem(PROJETOS_KEY);
    projetos = p ? JSON.parse(p) : [];
  } catch (e) {
    console.error(e);
  }
  try {
    const c = localStorage.getItem(CLIENTES_KEY);
    clientes = c ? JSON.parse(c) : [];
  } catch (e) {
    console.error(e);
  }

  const lookupProjeto = (id) => projetos.find((p) => p.id === id);
  const lookupCliente = (id) => clientes.find((c) => c.id === id);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // calcular estatísticas sem dependências adicionais
  const entries = sessoes
    .filter((s) => s.valorRecebido && Number(s.valorRecebido) > 0)
    .map((s) => ({ ...s, valorRecebido: Number(s.valorRecebido) || 0 }))
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));

  const totalAll = entries.reduce((sum, e) => sum + e.valorRecebido, 0);

  const totalMonth = entries.reduce((sum, e) => {
    const d = e.data ? new Date(e.data) : new Date(e.criadoEm);
    return d.getMonth() === month && d.getFullYear() === year ? sum + e.valorRecebido : sum;
  }, 0);

  const latest = entries.slice(0, 20).map((e) => {
    const projeto = lookupProjeto(e.projetoId);
    const cliente = projeto ? lookupCliente(projeto.clienteId) : null;
    return {
      id: e.id,
      data: e.data || (e.criadoEm ? new Date(e.criadoEm).toISOString().slice(0, 10) : "-"),
      cliente: cliente ? cliente.nome : "-",
      projeto: projeto ? projeto.titulo : "-",
      valor: e.valorRecebido,
    };
  });

  const stats = { totalAll, totalMonth, latest };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>Financeiro</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <div>Total recebido (mês atual)</div>
          <div style={{ fontSize: 20, fontWeight: "bold" }}>R$ {stats.totalMonth.toFixed(2)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <div>Total recebido (geral)</div>
          <div style={{ fontSize: 20, fontWeight: "bold" }}>R$ {stats.totalAll.toFixed(2)}</div>
        </div>
      </div>

      <h2>Últimas entradas</h2>
      {stats.latest.length === 0 ? (
        <p>Nenhuma entrada registrada.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Data</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Cliente</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Projeto</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {stats.latest.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: 8 }}>{row.data}</td>
                <td style={{ padding: 8 }}>{row.cliente}</td>
                <td style={{ padding: 8 }}>{row.projeto}</td>
                <td style={{ padding: 8, textAlign: "right" }}>R$ {Number(row.valor).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}