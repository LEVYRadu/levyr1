import React, { useState } from "react";

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

// 🗺️ Fetch zoning data from Hamilton ArcGIS
const fetchZoningData = async (lat, lon) => {
  const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Zoning_By_law_Boundary/FeatureServer/1/query?f=json&geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outSR=4326&outFields=*&returnGeometry=false`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      console.warn("No zoning data returned for that location.");
      return null;
    }

    const attributes = data.features[0].attributes;
    console.log("Zoning attributes:", JSON.stringify(attributes, null, 2));
    return attributes;
  } catch (error) {
    console.error("Zoning fetch failed:", error);
    return null;
  }
};

// 🔌 Real utilities logic
const fetchUtilitiesData = async (lat, lon) => {
  const sewerURL = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Sanitation_Sewer_Wastewater_Catchment_Areas/FeatureServer/15/query?f=geojson&geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outSR=4326`;

  try {
    const response = await fetch(sewerURL);
    const data = await response.json();
    const intersects = data.features.length > 0;

    return {
      sewer: intersects,
      water: intersects, // Assuming same catchment covers both for now
      hydro: false,      // Placeholder until hydro data is added
    };
  } catch (error) {
    console.error("Utility fetch failed:", error);
    return {
      sewer: false,
      water: false,
      hydro: false,
    };
  }
};

const checkADUFeasibility = ({ zoning, utilities }) => {
  if (!zoning) return { allowed: false, reason: "No zoning data found" };
  const zoneField = (zoning.ZONING_CODE && zoning.ZONING_DESC)
    ? `${zoning.ZONING_CODE} — ${zoning.ZONING_DESC}`
    : "Unknown";

  const allowedZones = ["R1", "R2", "R3", "C", "Mixed Use", "D"];
  const isZoned = allowedZones.some(z => zoneField.includes(z));
  const allUtilities = utilities.sewer && utilities.water;

  return {
    allowed: isZoned && allUtilities,
    zoningCategory: zoneField,
    requiredSetbacks: { rear: 1.5, side: 0.6 },
    maxSize: 65,
    reason: isZoned
      ? allUtilities ? "Eligible" : "Missing utility connection"
      : "Zoning restrictions",
  };
};

// 🧠 Simulated extra logic
const fetchHeritageStatus = async () => true;
const fetchSoilType = async () => "Loam";
const fetchSlopeRisk = async () => false;
const fetchGreenbeltStatus = async () => false;

// 📊 Report Generator
const generateFeasibilityReport = async (address) => {
  const { lat, lon } = await geocodeAddress(address);
  const zoning = await fetchZoningData(lat, lon);
  const utilities = await fetchUtilitiesData(lat, lon);
  const aduRules = checkADUFeasibility({ zoning, utilities });

  const heritageFlag = await fetchHeritageStatus();
  const soilType = await fetchSoilType();
  const slopeWarning = await fetchSlopeRisk();
  const greenbeltFlag = await fetchGreenbeltStatus();

  return {
    address,
    zoning,
    utilities,
    aduRules,
    heritageFlag,
    soilType,
    slopeWarning,
    greenbeltFlag,
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
      <p><strong>Zoning:</strong> {report.aduRules.zoningCategory}</p>
      <p><strong>Utilities:</strong> Sewer - {report.utilities.sewer ? "Yes" : "No"}, Water - {report.utilities.water ? "Yes" : "No"}</p>
      <p><strong>ADU Permitted:</strong> {report.aduRules.allowed ? "Yes" : "No"}</p>
      <p><strong>Reason:</strong> {report.aduRules.reason}</p>
      <p><strong>Soil Type:</strong> {report.soilType}</p>
      <p><strong>Slope Risk:</strong> {report.slopeWarning ? "High" : "Low"}</p>
      <p><strong>Greenbelt:</strong> {report.greenbeltFlag ? "Yes" : "No"}</p>
      <p><strong>Heritage Status:</strong> {report.heritageFlag ? "Yes" : "No"}</p>
      <p style={{ marginTop: "1rem" }}>{report.summary}</p>
    </div>
  );
};

// 🧑‍💻 Address Input
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

// 🚀 Main App
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
