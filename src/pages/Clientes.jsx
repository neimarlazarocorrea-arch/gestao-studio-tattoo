import { useState, useEffect, useRef } from "react";
import { load, save } from "../services/storage";

const STORAGE_KEY = "studio_clientes_v1";
const ESTILOS = ["Realismo", "Blackwork", "Fine line", "Old school", "Outros"];

export default function Clientes() {
  const [clientes, setClientes] = useState(() => load(STORAGE_KEY, []));

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [estilo_preferido, setEstilo] = useState("Realismo");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const nomeInputRef = useRef(null);

  useEffect(() => {
    save(STORAGE_KEY, clientes);
  }, [clientes]);

  useEffect(() => {
    nomeInputRef.current?.focus();
  }, [editingId]);

  const clearForm = () => {
    setNome("");
    setTelefone("");
    setInstagram("");
    setObservacoes("");
    setEstilo("Realismo");
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    if (editingId !== null) {
      setClientes((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? { ...c, nome: nome.trim(), telefone, instagram, observacoes, estilo_preferido }
            : c
        )
      );
      clearForm();
    } else {
      const novo = {
        id: Date.now(),
        nome: nome.trim(),
        telefone,
        instagram,
        observacoes,
        estilo_preferido,
        criadoEm: new Date().toISOString(),
      };
      setClientes((prev) => [...prev, novo]);
      clearForm();
    }
  };

  const startEdit = (cliente) => {
    setEditingId(cliente.id);
    setNome(cliente.nome);
    setTelefone(cliente.telefone || "");
    setInstagram(cliente.instagram || "");
    setObservacoes(cliente.observacoes || "");
    setEstilo(cliente.estilo_preferido || "Realismo");
  };

  const handleDelete = (id) => {
    setClientes((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) clearForm();
  };

  const filtered = clientes
    .filter((c) => {
      const term = search.toLowerCase();
      return (
        c.nome.toLowerCase().includes(term) ||
        (c.telefone && c.telefone.toLowerCase().includes(term)) ||
        (c.instagram && c.instagram.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));

  return (
    <div>
      <h1>Clientes</h1>
      <form onSubmit={handleSubmit} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 24, borderRadius: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <label>
            Nome*:
            <input
              ref={nomeInputRef}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              style={{ width: "100%", padding: 6 }}
            />
          </label>
          <label>
            Telefone:
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={{ width: "100%", padding: 6 }} />
          </label>
          <label>
            Instagram:
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} style={{ width: "100%", padding: 6 }} />
          </label>
          <label>
            Estilo preferido:
            <select value={estilo_preferido} onChange={(e) => setEstilo(e.target.value)} style={{ width: "100%", padding: 6 }}>
              {ESTILOS.map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ display: "block", marginBottom: 8 }}>
          Observações:
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            style={{ width: "100%", padding: 6, minHeight: 60 }}
          />
        </label>
        <div style={{ marginTop: 8 }}>
          <button type="submit" style={{ marginRight: 8 }}>
            {editingId !== null ? "Salvar alterações" : "Adicionar"}
          </button>
          {editingId !== null && (
            <button type="button" onClick={clearForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Buscar por nome, telefone ou instagram..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
        />
      </div>

      {filtered.length === 0 ? (
        <p>Nenhum cliente cadastrado.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {filtered.map((c) => (
            <li key={c.id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12, borderRadius: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{c.nome}</strong>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    Estilo: <strong>{c.estilo_preferido}</strong>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {new Date(c.criadoEm).toLocaleDateString()}
                </div>
              </div>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {c.telefone && <span>📞 {c.telefone} </span>}
                {c.instagram && <span>📷 {c.instagram} </span>}
              </div>
              {c.observacoes && <p style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>{c.observacoes}</p>}
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(c)}>Editar</button>
                <button onClick={() => handleDelete(c.id)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}