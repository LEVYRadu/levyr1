import React, { useState } from "react";

const AddressInput = ({ value, onChange }) => (
  <div>
    <label htmlFor="address">Enter Property Address</label>
    <input
      id="address"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="123 Main St, Hamilton, ON"
      style={{ width: "100%", padding: "8px", marginTop: "4px" }}
    />
  </div>
);

const generateFeasibilityReport = async (address) => {
  return {
    address,
    zoning: "R1",
    heritageFlag: false,
    greenbeltFlag: false,
    soilType: "Loam",
    aduIncentiveMHI: true,
    incentiveConfidence: "High",
    summary: "Feasibility logic fallback report ready."
  };
};

const ReportPreview = ({ report }) => {
  if (!report) return null;
  return (
    <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <h2>Feasibility Report</h2>
      <p><strong>Address:</strong> {report.address}</p>
      <p><strong>Zoning:</strong> {report.zoning}</p>
      <p><strong>Heritage Status:</strong> {report.heritageFlag ? "Yes" : "No"}</p>
      <p><strong>Greenbelt Area:</strong> {report.greenbeltFlag ? "Yes" : "No"}</p>
      <p><strong>Soil Type:</strong> {report.soilType}</p>
      <p><strong>Grant Confidence:</strong> {report.incentiveConfidence}</p>
      <p>{report.summary}</p>
    </div>
  );
};

const App = () => {
  const [inputAddress, setInputAddress] = useState("");
  const [report, setReport] = useState(null);

  const handleRun = async () => {
    const result = await generateFeasibilityReport(inputAddress || "123 Main St, Hamilton");
    setReport(result);
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif", maxWidth: "600px", margin: "auto" }}>
      <h1>LEVYR ADU Feasibility Test</h1>
      <AddressInput value={inputAddress} onChange={setInputAddress} />
      <button onClick={handleRun} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
        Run Feasibility Test
      </button>
      <ReportPreview report={report} />
    </div>
  );
};

export default App;
