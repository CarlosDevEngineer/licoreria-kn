import { useState } from "react";
import { useRouter } from "next/router";
import styles from "./Login.module.css";

export default function Login() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

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
        setError(data.error);
        return;
      }

      // guardar token
      localStorage.setItem("token", data.token);

      // decodificar token
      const payload = JSON.parse(atob(data.token.split(".")[1]));

      // redirección por rol
      if (payload.rol === "admin") {
        router.push("/admin");
      } else {
        router.push("/vendedor");
      }

    } catch (error) {
      console.error(error);
      setError("Error en login");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Login Licorería-KN</h2>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleLogin} className={styles.form}>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Usuario</label>
            <input
              name="username"
              placeholder="Usuario"
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Contraseña</label>

            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Contraseña"
                onChange={handleChange}
                className={styles.input}
              />

              <button
                type="button"
                className={styles.showPasswordButton}
                onClick={() => setShowPassword(!showPassword)}
              >
                👁
              </button>
            </div>
          </div>

          <button type="submit" className={styles.button}>
            Ingresar
          </button>

        </form>
      </div>
    </div>
  );
}