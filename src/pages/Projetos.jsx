import { useEffect, useState } from "react";
import { load, save } from "../services/storage";

const CLIENTES_KEY = "studio_clientes_v1";
const PROJETOS_KEY = "studio_projetos_v1";

const ESTILOS = ["Realismo", "Blackwork", "Fine line", "Old school", "Outros"];
const TAMANHOS = ["P", "M", "G"];
const STATUS_OPTIONS = ["Orçamento", "Em andamento", "Finalizado"];

export default function Projetos() {
  const [clientes] = useState(() => load(CLIENTES_KEY, []));

  const [projetos, setProjetos] = useState(() => load(PROJETOS_KEY, []));

  const [clienteId, setClienteId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [areaCorpo, setAreaCorpo] = useState("");
  const [tamanho, setTamanho] = useState("M");
  const [estilo, setEstilo] = useState("Realismo");
  const [valorFechado, setValorFechado] = useState("");
  const [sinal, setSinal] = useState("");
  const [status, setStatus] = useState("Orçamento");
  const [editingId, setEditingId] = useState(null);

  const [filterCliente, setFilterCliente] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    save(PROJETOS_KEY, projetos);
  }, [projetos]);

  const resetForm = () => {
    setClienteId("");
    setTitulo("");
    setAreaCorpo("");
    setTamanho("M");
    setEstilo("Realismo");
    setValorFechado("");
    setSinal("");
    setStatus("Orçamento");
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clienteId || !titulo.trim()) return;
    const numericValor = parseFloat(valorFechado) || 0;
    const numericSinal = parseFloat(sinal) || 0;

    if (editingId) {
      setProjetos((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? { ...p, clienteId, titulo: titulo.trim(), areaCorpo, tamanho, estilo, valorFechado: numericValor, sinal: numericSinal, status }
            : p
        )
      );
      resetForm();
    } else {
      const novo = {
        id: Date.now().toString(),
        clienteId,
        titulo: titulo.trim(),
        areaCorpo,
        tamanho,
        estilo,
        valorFechado: numericValor,
        sinal: numericSinal,
        status,
        criadoEm: new Date().toISOString(),
      };
      setProjetos((prev) => [...prev, novo]);
      resetForm();
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setClienteId(p.clienteId || "");
    setTitulo(p.titulo || "");
    setAreaCorpo(p.areaCorpo || "");
    setTamanho(p.tamanho || "M");
    setEstilo(p.estilo || "Realismo");
    setValorFechado(p.valorFechado || "");
    setSinal(p.sinal || "");
    setStatus(p.status || "Orçamento");
  };

  const handleDelete = (id) => {
    setProjetos((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = projetos
    .filter((p) => (filterCliente ? p.clienteId === filterCliente : true))
    .filter((p) => (filterStatus ? p.status === filterStatus : true))
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));

  const lookupCliente = (id) => clientes.find((c) => c.id === id)?.nome || "-";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1>Projetos</h1>

      <form onSubmit={handleSubmit} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label>
            Cliente:
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
              <option value="">-- selecione --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            Título:
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </label>

          <label>
            Área do corpo:
            <input value={areaCorpo} onChange={(e) => setAreaCorpo(e.target.value)} />
          </label>

          <label>
            Tamanho:
            <select value={tamanho} onChange={(e) => setTamanho(e.target.value)} style={{ width: "100%" }}>
              {TAMANHOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label>
            Estilo:
            <select value={estilo} onChange={(e) => setEstilo(e.target.value)} style={{ width: "100%" }}>
              {ESTILOS.map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          </label>

          <label>
            Valor fechado:
            <input type="number" value={valorFechado} onChange={(e) => setValorFechado(e.target.value)} />
          </label>

          <label>
            Sinal:
            <input type="number" value={sinal} onChange={(e) => setSinal(e.target.value)} />
          </label>

          <label>
            Status:
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }}>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="submit" style={{ marginRight: 8 }}>{editingId ? "Salvar" : "Criar projeto"}</button>
          {editingId && <button type="button" onClick={resetForm}>Cancelar</button>}
        </div>
      </form>

      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <select value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ minWidth: 150 }}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p>Nenhum projeto encontrado.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {filtered.map((p) => (
            <li key={p.id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12, borderRadius: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{p.titulo}</strong>
                  <div style={{ fontSize: 13 }}>{lookupCliente(p.clienteId)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>{p.status}</div>
                  <div>Fechado: R$ {Number(p.valorFechado || 0).toFixed(2)}</div>
                  <div>Sinal: R$ {Number(p.sinal || 0).toFixed(2)}</div>
                  <div>Faltante: R$ {Number((p.valorFechado || 0) - (p.sinal || 0)).toFixed(2)}</div>
                </div>
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(p)}>Editar</button>
                <button onClick={() => handleDelete(p.id)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
