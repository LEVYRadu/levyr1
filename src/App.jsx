import React, { useState } from "react";

// Component 1: Address Input
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

// Component 2: Logic Engine (Zoning + Utilities + ADU Rules)
const fetchZoningData = async (lat, lon) => {
  const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Zoning_By_law_Boundary/FeatureServer/1/query?f=json&where=1%3D1&outFields=*&geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outSR=4326`;
  const response = await fetch(url);
  const data = await response.json();
  return data.features?.[0]?.attributes;
};

const fetchUtilitiesData = async (lat, lon) => {
  return {
    sewer: true,   // Replace with real fetch later
    water: true,
    hydro: true,
  };
};

const checkADUFeasibility = ({ zoning, utilities }) => {
  if (!zoning) return { allowed: false, reason: "Zoning data unavailable" };

  const category = zoning.ZONE_CATEGORY || zoning.Zone_Type || "Unknown";
  const allowedZones = ["R1", "R2", "R3", "C", "Mixed Use"];
  const isZoned = allowedZones.some(z => category.includes(z));
  const allUtilities = utilities?.sewer && utilities?.water;

  return {
    allowed: isZoned && allUtilities,
    zoningCategory: category,
    requiredSetbacks: {
      rear: 1.5,
      side: 0.6,
    },
    maxSize: 65, // in m² (placeholder)
    reason: isZoned
      ? (allUtilities ? "Eligible" : "Missing utility connection")
      : "Zoning restrictions",
  };
};

// Component 3: Report Generator
const generateFeasibilityReport = async (address) => {
  const geocoded = { lat: 43.2557, lon: -79.8711 }; // hardcoded for now
  const zoningInfo = await fetchZoningData(geocoded.lat, geocoded.lon);
  const utilities = await fetchUtilitiesData(geocoded.lat, geocoded.lon);
  const aduRules = checkADUFeasibility({ zoning: zoningInfo, utilities });

  return {
    address,
    zoning: zoningInfo,
    utilities,
    aduRules,
    summary: `Feasibility analysis complete for ${address}.` + (aduRules.allowed ? " ADU likely permitted." : ` Not permitted: ${aduRules.reason}`)
  };
};

// Component 4: Report Preview
const ReportPreview = ({ report }) => {
  if (!report) return null;
  return (
    <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <h2>Feasibility Report</h2>
      <p><strong>Address:</strong> {report.address}</p>
      <p><strong>Zoning:</strong> {report.zoning?.ZONE_CATEGORY || "Unknown"}</p>
      <p><strong>Utilities:</strong> Sewer - {report.utilities.sewer ? "Yes" : "No"}, Water - {report.utilities.water ? "Yes" : "No"}</p>
      <p><strong>ADU Permitted:</strong> {report.aduRules.allowed ? "Yes" : "No"}</p>
      <p><strong>Reason:</strong> {report.aduRules.reason}</p>
      {report.aduRules.allowed && (
        <>
          <p><strong>Max ADU Size:</strong> {report.aduRules.maxSize} m²</p>
          <p><strong>Required Setbacks:</strong> Rear - {report.aduRules.requiredSetbacks.rear} m, Side - {report.aduRules.requiredSetbacks.side} m</p>
        </>
      )}
      <p style={{ marginTop: "1rem" }}>{report.summary}</p>
    </div>
  );
};

// Main App Component
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
