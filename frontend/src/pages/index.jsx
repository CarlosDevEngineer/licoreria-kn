import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      // guardar token
      localStorage.setItem("token", data.token);

      // decodificar token (rápido)
      const payload = JSON.parse(atob(data.token.split(".")[1]));

      // redireccion por rol
      if (payload.rol === "admin") {
        router.push("/admin");
      } else {
        router.push("/vendedor");
      }

    } catch (error) {
      console.error(error);
      alert("Error en login");
    }
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2>Login Licorería-KN</h2>

      <form onSubmit={handleLogin}>
        <input
          name="username"
          placeholder="Usuario"
          onChange={handleChange}
        />
        <br /><br />

        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          onChange={handleChange}
        />
        <br /><br />

        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
}