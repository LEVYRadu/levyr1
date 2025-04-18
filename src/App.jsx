import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// 📍 Geocode with OpenCage
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

// 🧠 Zoning and Eligibility Logic
const fetchZoningData = async (lat, lon) => {
  const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Zoning_By_law_Boundary/FeatureServer/1/query?f=json&geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outSR=4326&outFields=*&returnGeometry=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.features || data.features.length === 0) return null;
    return data.features[0].attributes;
  } catch (err) {
    return null;
  }
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
  const zoneField =
    zoning.ZONING_DESC ||
    zoning.ZONE_CATEGORY ||
    zoning.Zone ||
    zoning.LABEL ||
    zoning.DESCRIPTION ||
    "Unknown";

  const allowedZones = ["R1", "R2", "R3", "D2", "C", "Mixed Use"];
  const isZoned = allowedZones.some((z) => zoneField.includes(z));
  const allUtilities = utilities.sewer && utilities.water;

  return {
    allowed: isZoned && allUtilities,
    zoningCategory: zoneField,
    requiredSetbacks: { rear: 1.5, side: 0.6 },
    maxSize: 65,
    reason: isZoned
      ? allUtilities
        ? "Eligible"
        : "Missing utility connection"
      : "Zoning restrictions",
  };
};

// 🧾 Generate Report and Push to Firebase
const generateFeasibilityReport = async (address) => {
  const { lat, lon } = await geocodeAddress(address);
  const zoning = await fetchZoningData(lat, lon);

  if (!zoning) {
    return {
      status: "unsupported",
      message:
        "Zoning data not found for this location. LEVYR currently supports properties within the City of Hamilton.",
    };
  }

  const utilities = await fetchUtilitiesData();
  const aduRules = checkADUFeasibility({ zoning, utilities });

  const report = {
    address,
    lat,
    lon,
    zoningCategory: aduRules.zoningCategory,
    aduPermitted: aduRules.allowed,
    reason: aduRules.reason,
    utilities,
    submittedAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "reports"), report);
  } catch (err) {
    console.error("Failed to save report to Firestore:", err);
  }

  return {
    ...report,
    aduRules,
    summary: `Feasibility complete for ${address}.`,
    status: "ok",
  };
};

// 📋 Report UI
const ReportPreview = ({ report }) => {
  if (!report) return null;
  if (report.status === "unsupported") {
    return (
      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#fff3f3", border: "1px solid #faa", borderRadius: "8px" }}>
        <strong>{report.message}</strong>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <h2>Feasibility Report</h2>
      <p><strong>Address:</strong> {report.address}</p>
      <p><strong>Zoning:</strong> {report.zoningCategory}</p>
      <p><strong>Utilities:</strong> Sewer - {report.utilities.sewer ? "Yes" : "No"}, Water - {report.utilities.water ? "Yes" : "No"}</p>
      <p><strong>ADU Permitted:</strong> {report.aduPermitted ? "Yes" : "No"}</p>
      <p><strong>Reason:</strong> {report.reason}</p>
      <p style={{ marginTop: "1rem" }}>{report.summary}</p>
    </div>
  );
};

// ✍️ Address Input
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

// 🚀 App Wrapper
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
