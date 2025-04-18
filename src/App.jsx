import React, { useState } from "react";

// 🔁 Unit converters
const ftToM = (feet) => feet * 0.3048;
const ft2ToM2 = (ft2) => ft2 * 0.092903;
const mToFt = (m) => m / 0.3048;
const m2ToFt2 = (m2) => m2 / 0.092903;

// 🧠 ADU Feasibility Engine (Metric logic)
const checkADUFeasibility = ({
  lotWidthFt,
  lotDepthFt,
  houseWidthFt,
  houseDepthFt,
}) => {
  const lotWidthM = ftToM(lotWidthFt);
  const lotDepthM = ftToM(lotDepthFt);
  const houseWidthM = ftToM(houseWidthFt);
  const houseDepthM = ftToM(houseDepthFt);

  const lotAreaM2 = lotWidthM * lotDepthM;
  const houseAreaM2 = houseWidthM * houseDepthM;

  const rearYardDepthM = lotDepthM - houseDepthM;
  const sideClearanceM = (lotWidthM - houseWidthM) / 2;

  const rearSetbackRequiredM = 1.5;
  const sideSetbackRequiredM = 0.6;

  const hasRearYard = rearYardDepthM >= rearSetbackRequiredM;
  const hasSideClearance = sideClearanceM >= sideSetbackRequiredM;

  const buildableAreaM2 = Math.max(lotAreaM2 - houseAreaM2, 0);
  const maxADUM2 = Math.min(buildableAreaM2 * 0.15, 60); // Max 60m²
  const maxADUFt2 = Math.round(m2ToFt2(maxADUM2));

  return {
    allowed: hasRearYard && hasSideClearance,
    reason: hasRearYard && hasSideClearance
      ? "Eligible"
      : !hasRearYard
      ? "Insufficient rear yard depth"
      : "Insufficient side clearance",
    maxADUFt2,
    rearYardDepthFt: Math.round(mToFt(rearYardDepthM)),
    sideClearanceFt: Math.round(mToFt(sideClearanceM)),
    lotAreaFt2: Math.round(m2ToFt2(lotAreaM2)),
    houseAreaFt2: Math.round(m2ToFt2(houseAreaM2)),
  };
};

// 📋 Report
const ReportPreview = ({ report }) => {
  if (!report) return null;
  return (
    <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <h2>Feasibility Report</h2>
      <p><strong>Address:</strong> {report.address}</p>
      <p><strong>Zoning:</strong> R2 (Assumed)</p>
      <p><strong>Lot Area:</strong> {report.lotAreaFt2.toLocaleString()} ft²</p>
      <p><strong>House Area:</strong> {report.houseAreaFt2.toLocaleString()} ft²</p>
      <p><strong>Rear Yard Depth:</strong> {report.rearYardDepthFt} ft</p>
      <p><strong>Side Clearance:</strong> {report.sideClearanceFt} ft</p>
      <p><strong>ADU Permitted:</strong> {report.allowed ? "Yes" : "No"}</p>
      <p><strong>Reason:</strong> {report.reason}</p>
      <p><strong>Max ADU Size:</strong> {report.maxADUFt2.toLocaleString()} ft²</p>
      <p style={{ marginTop: "1rem" }}>{report.summary}</p>
    </div>
  );
};

// 🧾 Input Form
const AddressInput = ({
  address, setAddress,
  lotWidthFt, setLotWidthFt,
  lotDepthFt, setLotDepthFt,
  houseWidthFt, setHouseWidthFt,
  houseDepthFt, setHouseDepthFt
}) => (
  <div>
    <label>Property Address</label>
    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Hamilton" style={{ width: "100%", marginBottom: "10px" }} />
    <label>Lot Width (ft)</label>
    <input type="number" value={lotWidthFt} onChange={(e) => setLotWidthFt(Number(e.target.value))} placeholder="e.g. 30" style={{ width: "100%", marginBottom: "10px" }} />
    <label>Lot Depth (ft)</label>
    <input type="number" value={lotDepthFt} onChange={(e) => setLotDepthFt(Number(e.target.value))} placeholder="e.g. 100" style={{ width: "100%", marginBottom: "10px" }} />
    <label>House Width (ft)</label>
    <input type="number" value={houseWidthFt} onChange={(e) => setHouseWidthFt(Number(e.target.value))} placeholder="e.g. 25" style={{ width: "100%", marginBottom: "10px" }} />
    <label>House Depth (ft)</label>
    <input type="number" value={houseDepthFt} onChange={(e) => setHouseDepthFt(Number(e.target.value))} placeholder="e.g. 40" style={{ width: "100%", marginBottom: "10px" }} />
  </div>
);

// 🚀 Main App
const App = () => {
  const [address, setAddress] = useState("");
  const [lotWidthFt, setLotWidthFt] = useState("");
  const [lotDepthFt, setLotDepthFt] = useState("");
  const [houseWidthFt, setHouseWidthFt] = useState("");
  const [houseDepthFt, setHouseDepthFt] = useState("");
  const [report, setReport] = useState(null);

  const handleRun = () => {
    if (!lotWidthFt || !lotDepthFt || !houseWidthFt || !houseDepthFt) {
      alert("Please enter all dimensions.");
      return;
    }

    const result = checkADUFeasibility({
      lotWidthFt: Number(lotWidthFt),
      lotDepthFt: Number(lotDepthFt),
      houseWidthFt: Number(houseWidthFt),
      houseDepthFt: Number(houseDepthFt),
    });

    setReport({
      address: address || "N/A",
      ...result,
      summary: `Feasibility analysis complete for ${address || "this property"}.`,
    });
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "auto", fontFamily: "sans-serif" }}>
      <h1>LEVYR ADU Feasibility (Imperial In / Metric Logic)</h1>
      <AddressInput
        address={address} setAddress={setAddress}
        lotWidthFt={lotWidthFt} setLotWidthFt={setLotWidthFt}
        lotDepthFt={lotDepthFt} setLotDepthFt={setLotDepthFt}
        houseWidthFt={houseWidthFt} setHouseWidthFt={setHouseWidthFt}
        houseDepthFt={houseDepthFt} setHouseDepthFt={setHouseDepthFt}
      />
      <button onClick={handleRun} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
        Run Feasibility Test
      </button>
      <ReportPreview report={report} />
    </div>
  );
};

export default App;
