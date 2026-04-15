import { useState, useRef, useEffect } from "react"
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
  const [needs2FA, setNeeds2FA] = useState(false)
  const [totpCode, setTotpCode] = useState("")
  const totpRef = useRef(null)

  useEffect(() => { if (needs2FA && totpRef.current) totpRef.current.focus() }, [needs2FA])

  const doLogin = async (code) => {
    setLoading(true); setError("")
    try {
      const body = { username, password }
      if (code) body.totp_code = code
      const resp = await fetch(RAILWAY + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await resp.json()
      if (data.requires_2fa) {
        setNeeds2FA(true)
        setLoading(false)
        return
      }
      if (!resp.ok || !data.token) { setError(data.error || "Error de acceso"); setLoading(false); return }
      localStorage.setItem("khn_token", data.token)
      localStorage.setItem("khn_user", JSON.stringify({ nombre: data.nombre, rol: data.rol, cuentas: data.cuentas }))
      onLogin?.()
    } catch(err) { setError("Error de conexion") } finally { setLoading(false) }
  }

  const submit = e => { e.preventDefault(); doLogin() }
  const submit2FA = e => {
    e.preventDefault()
    if (totpCode.length !== 6) { setError("Ingresa el codigo de 6 digitos"); return }
    doLogin(totpCode)
  }

  if (needs2FA) {
    return (
      <div style={s.wrap}><div style={s.card}>
        <div style={s.logo}>KHN<span style={s.logoSpan}>_botics</span></div>
        <p style={s.sub}>Verificacion en dos pasos</p>
        <form onSubmit={submit2FA}>
          <label style={s.label}>Codigo de autenticacion</label>
          <input ref={totpRef} style={{...s.input, fontSize:24, textAlign:'center', letterSpacing:8}}
            value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
            maxLength={6} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" />
          {error && <div style={s.err}>{error}</div>}
          <button type="submit" style={{...s.btn, opacity:loading?0.7:1}} disabled={loading}>
            {loading ? "Verificando..." : "Verificar"}
          </button>
          <button type="button" onClick={() => { setNeeds2FA(false); setTotpCode(''); setError('') }}
            style={{ width:'100%', marginTop:8, padding:8, background:'none', border:'none',
              color:'var(--text3)', fontSize:12, cursor:'pointer' }}>
            Volver
          </button>
        </form>
      </div></div>
    )
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
