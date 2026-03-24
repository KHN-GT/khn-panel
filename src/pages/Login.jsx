import { useState } from "react"
const RAILWAY = "https://worker-production-d575.up.railway.app"
const s = {
  wrap:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"},
  card:{background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:16,padding:"2.5rem 2rem",width:340,boxShadow:"var(--shadow-md)"},
  logo:{fontSize:22,fontWeight:700,marginBottom:4,color:"var(--text)"},
  logoSpan:{color:"var(--purple)"},
  sub:{fontSize:13,color:"var(--text3)",marginBottom:32},
  label:{fontSize:12,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:6},
  input:{width:"100%",padding:"10px 12px",border:"1.5px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:14,color:"var(--text)",background:"var(--surface)",outline:"none",marginBottom:14,boxSizing:"border-box"},
  err:{fontSize:12,color:"var(--red)",background:"var(--red-light)",border:"1px solid var(--red-border)",borderRadius:6,padding:"8px 10px",marginBottom:14},
  btn:{width:"100%",padding:"11px",background:"var(--purple)",color:"#fff",border:"none",borderRadius:"var(--radius-sm)",fontSize:14,fontWeight:700,cursor:"pointer"},
}
export default function Login({ onLogin }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const submit = async e => {
    e.preventDefault()
    if (!username || !password) { setError("Ingresa usuario y contrasena"); return }
    setLoading(true); setError("")
    try {
      const resp = await fetch(RAILWAY + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })
      const data = await resp.json()
      if (!resp.ok || !data.token) { setError(data.error || "Error de acceso"); return }
      localStorage.setItem("khn_token", data.token)
      localStorage.setItem("khn_user", JSON.stringify({ nombre: data.nombre, rol: data.rol, cuentas: data.cuentas }))
      onLogin?.()
    } catch(err) { setError("Error de conexion") } finally { setLoading(false) }
  }
  return (
    <div style={s.wrap}><div style={s.card}>
      <div style={s.logo}>KHN<span style={s.logoSpan}>_botics</span></div>
      <p style={s.sub}>Panel de operaciones</p>
      <form onSubmit={submit}>
        <label style={s.label}>Usuario</label>
        <input style={s.input} value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin" autoFocus />
        <label style={s.label}>Contrasena</label>
        <input style={s.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="..." />
        {error && <div style={s.err}>{error}</div>}
        <button type="submit" style={{...s.btn, opacity:loading?0.7:1}} disabled={loading}>
          {loading ? "Entrando..." : "Entrar al panel"}
        </button>
      </form>
    </div></div>
  )
}
