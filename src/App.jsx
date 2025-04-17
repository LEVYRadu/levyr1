import React, { useState } from "react";

// 🔍 1. Geocode using OpenCage
const geocodeAddress = async (address) => {
  const apiKey = "352a0e8f66fd420eb176702efb619b5f";
  const encoded = encodeURIComponent(address);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encoded}&key=${apiKey}&countrycode=ca&limit=1`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.results.length === 0) throw new Error("Address not found");
  const { lat, lng } = data.results[0].geometry;
  return { lat, lon: lng };
};

// 🏡 Address Input Component
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

// 🌐 Zoning & Utility Data
const fetchZoningData = async (lat, lon) => {
  const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Zoning_By_law_Boundary/FeatureServer/1/query?f=json&where=1%3D1&outFields=*&geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outSR=4326`;
  const res = await fetch(url);
  const data = await res.json();
  return data.features?.[0]?.attributes;
};

const fetchUtilitiesData = async () => {
  return {
    sewer: true,
    water: true,
    hydro: true,
  };
};

const checkADUFeasibility = ({ zoning, utilities }) => {
  if (!zoning) return { allowed: false, reason: "No zoning data found" };
  const category = zoning.ZONE_CATEGORY || zoning.Zone_Type || "Unknown";
  const allowedZones = ["R1", "R2", "R3", "C", "Mixed Use"];
  const isZoned = allowedZones.some(z => category.includes(z));
  const allUtilities = utilities.sewer && utilities.water;

  return {
    allowed: isZoned && allUtilities,
    zoningCategory: category,
    requiredSetbacks: { rear: 1.5, side: 0.6 },
    maxSize: 65,
    reason: isZoned
      ? allUtilities ? "Eligible" : "Missing utility connection"
      : "Zoning restrictions",
  };
};

// 🧠 Constraints + Grant Logic
const fetchHeritageStatus = async () => true; // Simulated
const fetchSoilType = async () => "Loam";
const fetchSlopeRisk = async () => false;
const fetchGreenbeltStatus = async () => false;
const fetchIncentiveEligibility = (heritageFlag) => !heritageFlag;

// 📊 Main Logic Engine
const generateFeasibilityReport = async (address) => {
  const { lat, lon } = await geocodeAddress(address);
  const zoning = await fetchZoningData(lat, lon);
  const utilities = await fetchUtilitiesData();
  const aduRules = checkADUFeasibility({ zoning, utilities });

  const heritageFlag = await fetchHeritageStatus();
  const soilType = await fetchSoilType();
  const slopeWarning = await fetchSlopeRisk();
  const greenbeltFlag = await fetchGreenbeltStatus();
  const incentiveEligible = fetchIncentiveEligibility(heritageFlag);

  return {
    address,
    zoning,
    utilities,
    aduRules,
    heritageFlag,
    soilType,
    slopeWarning,
    greenbeltFlag,
    incentiveEligible,
    summary: `Feasibility complete for ${address}.`,
  };
};

// 📋 Report Preview
const ReportPreview = ({ report }) => {
  if (!report) return null;
  return (
    <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <h2>Feasibility Report</h2>
      <p><strong>Address:</strong> {report.address}</p>
      <p><strong>Zoning:</strong> {
  report.zoning?.ZONE_CATEGORY ||
  report.zoning?.ZONE_TYPE ||
  report.zoning?.Zone ||
  report.zoning?.LABEL ||
  "Unknown"
}</p>

      <p><strong>Utilities:</strong> Sewer - {report.utilities.sewer ? "Yes" : "No"}, Water - {report.utilities.water ? "Yes" : "No"}</p>
      <p><strong>ADU Permitted:</strong> {report.aduRules.allowed ? "Yes" : "No"}</p>
      <p><strong>Reason:</strong> {report.aduRules.reason}</p>
      <p><strong>Soil Type:</strong> {report.soilType}</p>
      <p><strong>Slope Risk:</strong> {report.slopeWarning ? "High" : "Low"}</p>
      <p><strong>Greenbelt:</strong> {report.greenbeltFlag ? "Yes" : "No"}</p>
      <p><strong>Heritage Status:</strong> {report.heritageFlag ? "Yes" : "No"}</p>
      {report.incentiveEligible && (
        <div style={{ marginTop: "1rem", background: "#e0ffe0", padding: "1rem", borderRadius: "8px" }}>
          <strong>💸 ADU Incentive:</strong><br />
          Eligible for Hamilton’s $25K forgivable loan + rebates.
        </div>
      )}
      <p style={{ marginTop: "1rem" }}>{report.summary}</p>
    </div>
  );
};

// 🚀 App Shell
const App = () => {
  const [inputAddress, setInputAddress] = useState("");
  const [report, setReport] = useState(null);

  const handleRun = async () => {
    try {
      const result = await generateFeasibilityReport(inputAddress || "123 Main St, Hamilton");
      setReport(result);
    } catch (err) {
      alert("Could not locate that address. Try another.");
    }
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
