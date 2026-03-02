import { useEffect, useState } from "react";

const PROJETOS_KEY = "tattoo_app_projetos_v1";
const SESSOES_KEY = "tattoo_app_sessoes_v1";

export default function Sessoes() {
  const [projetos] = useState(() => {
    try {
      const s = localStorage.getItem(PROJETOS_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  const [sessoes, setSessoes] = useState(() => {
    try {
      const s = localStorage.getItem(SESSOES_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  const [projetoId, setProjetoId] = useState("");
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("");
  const [duracaoHoras, setDuracaoHoras] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");

  useEffect(() => {
    localStorage.setItem(SESSOES_KEY, JSON.stringify(sessoes));
  }, [sessoes]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projetoId || !data) return;
    const novo = {
      id: Date.now().toString(),
      projetoId,
      data,
      inicio,
      duracaoHoras: parseFloat(duracaoHoras) || 0,
      observacoes,
      valorRecebido: parseFloat(valorRecebido) || 0,
      criadoEm: new Date().toISOString(),
    };
    setSessoes((prev) => [...prev, novo]);
    setProjetoId("");
    setData("");
    setInicio("");
    setDuracaoHoras("");
    setObservacoes("");
    setValorRecebido("");
  };

  const handleDelete = (id) => {
    setSessoes((prev) => prev.filter((s) => s.id !== id));
  };

  const filtered = sessoes
    .filter((s) => (projetoId ? s.projetoId === projetoId : true))
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));

  const lookupProjeto = (id) => projetos.find((p) => p.id === id)?.titulo || "-";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1>Sessões</h1>

      <form onSubmit={handleSubmit} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label>
            Projeto:
            <select value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
              <option value="">-- selecione --</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
            </select>
          </label>

          <label>
            Data:
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>

          <label>
            Início:
            <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </label>

          <label>
            Duração (h):
            <input type="number" value={duracaoHoras} onChange={(e) => setDuracaoHoras(e.target.value)} />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Observações:
            <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Valor recebido:
            <input type="number" value={valorRecebido} onChange={(e) => setValorRecebido(e.target.value)} />
          </label>
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="submit">Salvar sessão</button>
        </div>
      </form>

      <div style={{ marginBottom: 12 }}>
        <label>
          Filtrar por projeto:
          <select value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
            <option value="">Todos</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>{p.titulo}</option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p>Nenhuma sessão registrada.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {filtered.map((s) => (
            <li key={s.id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12, borderRadius: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{lookupProjeto(s.projetoId)}</strong>
                  <div style={{ fontSize: 13 }}>{s.data} • {s.inicio} • {s.duracaoHoras}h</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>Recebido: R$ {Number(s.valorRecebido || 0).toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{new Date(s.criadoEm).toLocaleString()}</div>
                </div>
              </div>
              {s.observacoes && <p style={{ marginTop: 8 }}>{s.observacoes}</p>}
              <div style={{ marginTop: 8 }}>
                <button onClick={() => handleDelete(s.id)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}