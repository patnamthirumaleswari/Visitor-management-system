import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const hosts = ["Priya Sharma", "Rahul Verma", "Anita Rao", "Kiran Kumar"];

function PreRegistration() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    visitDate: "",
    host: "",
  });
  const [code, setCode] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();

    // 1. make a unique code for this visit
    const newCode = crypto.randomUUID();

    // 2. save in the browser (temporary, no backend yet)
    const saved = JSON.parse(localStorage.getItem("preRegistrations") || "[]");
    saved.push({ ...form, code: newCode });
    localStorage.setItem("preRegistrations", JSON.stringify(saved));

    // 3. show the QR
    setCode(newCode);
  }

  if (code) {
    return (
      <div className="page">
        <div className="card success">
          <h1>Pre-registration done!</h1>
          <p>
            {form.fullName}, show this QR at the reception on {form.visitDate}.
          </p>
          <div style={{ margin: "20px 0" }}>
            <QRCodeSVG value={code} size={200} />
          </div>
          <button onClick={() => setCode("")}>Register Another Visitor</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Pre-Register a Visitor</h1>
        <p className="subtitle">Invite a visitor and get their QR code.</p>

        <form onSubmit={handleSubmit}>
          <label>Visitor Name</label>
          <input
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
          />

          <label>Visitor Phone</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
          />

          <label>Visit Date</label>
          <input
            type="date"
            name="visitDate"
            value={form.visitDate}
            onChange={handleChange}
            required
          />

          <label>Host</label>
          <select
            name="host"
            value={form.host}
            onChange={handleChange}
            required
          >
            <option value="">-- Select host --</option>
            {hosts.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>

          <button type="submit">Generate QR</button>
        </form>
      </div>
    </div>
  );
}

export default PreRegistration;