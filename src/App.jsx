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

// 🗺️ Zoning Area = Fallback for Lot Size
const fetchZoningData = async (lat, lon) => {
  const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Zoning_By_law_Boundary/FeatureServer/1/query?f=geojson&geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true`;

  const res = await fetch(url);
  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;

  const zone = data.features[0];
  const lotSize = zone.properties.Shape__Area || 300; // fallback
  return { zoning: zone.properties, lotSizeSqM: lotSize / 1.0 }; // square meters assumed
};

// 🧱 Building Footprint Estimate (via OSM)
const fetchBuildingArea = async (lat, lon) => {
  const overpassQuery = `
    [out:json];
    way(around:50,${lat},${lon})["building"];
    out body;
    >;
    out skel qt;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const area = data.elements.length > 0 ? data.elements.length * 40 : 0; // rough area estimate
    return area;
  } catch {
    return 0;
  }
};

// 🚗 Road Access via Edge Dataset
const fetchAccessInfo = async (lat, lon) => {
  const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Road_Edge/FeatureServer/3/query?f=geojson&geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.features.length > 0;
  } catch {
    return false;
  }
};

// 💡 Streetlight Proximity
const fetchStreetlightProximity = async (lat, lon) => {
  const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Street_Light/FeatureServer/3/query?f=geojson&geometry=${lon},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.features.length > 0;
  } catch {
    return false;
  }
};

// 🔌 Utilities Logic (fallback still enabled)
const fetchUtilitiesData = async (lat, lon, streetlightNearby) => {
  try {
    const sewerAvailable = true; // assume available for now
    const waterAvailable = true;
    return {
      sewer: sewerAvailable,
      water: waterAvailable,
      hydro: streetlightNearby || false,
    };
  } catch {
    return {
      sewer: true,
      water: true,
      hydro: streetlightNearby || false,
    };
  }
};

const checkADUFeasibility = ({ zoning, lotSizeSqM, buildingArea, access, utilities }) => {
  if (!zoning) return { allowed: false, reason: "No zoning data" };

  const zoneField = zoning.ZONING_CODE && zoning.ZONING_DESC
    ? `${zoning.ZONING_CODE} — ${zoning.ZONING_DESC}`
    : "Unknown";

  const allowedZones = ["R1", "R2", "R3", "C", "Mixed Use", "D"];
  const isZoned = allowedZones.some((z) => zoneField.includes(z));
  const allUtilities = utilities.sewer && utilities.water;

  const buildableArea = Math.max(lotSizeSqM - buildingArea, 0);
  const maxADUSize = Math.min(buildableArea * 0.15, 65); // 15% lot coverage rule, capped at 65

  return {
    allowed: isZoned && allUtilities && access,
    zoningCategory: zoneField,
    requiredSetbacks: { rear: 1.5, side: 0.6 },
    maxSize: Math.round(maxADUSize),
    reason: isZoned
      ? allUtilities
        ? access ? "Eligible" : "No legal access"
        : "Missing utility connection"
      : "Zoning restrictions",
  };
};

// 🌱 Other Layers
const fetchHeritageStatus = async () => true;
const fetchSoilType = async () => "Loam";
const fetchSlopeRisk = async () => false;
const fetchGreenbeltStatus = async () => false;

// 📊 Report Generator
const generateFeasibilityReport = async (address) => {
  const { lat, lon } = await geocodeAddress(address);
  const { zoning, lotSizeSqM } = await fetchZoningData(lat, lon);
  const buildingArea = await fetchBuildingArea(lat, lon);
  const accessAvailable = await fetchAccessInfo(lat, lon);
  const nearStreetlight = await fetchStreetlightProximity(lat, lon);
  const utilities = await fetchUtilitiesData(lat, lon, nearStreetlight);

  const aduRules = checkADUFeasibility({
    zoning,
    lotSizeSqM,
    buildingArea,
    access: accessAvailable,
    utilities,
  });

  const heritageFlag = await fetchHeritageStatus();
  const soilType = await fetchSoilType();
  const slopeWarning = await fetchSlopeRisk();
  const greenbeltFlag = await fetchGreenbeltStatus();

  return {
    address,
    aduRules,
    utilities,
    heritageFlag,
    soilType,
    slopeWarning,
    greenbeltFlag,
    summary: `Feasibility complete for ${address}.`,
  };
};

// 🧾 Report Preview (simplified output)
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
      <p><strong>Max ADU Size:</strong> {report.aduRules.maxSize} m²</p>
      <p><strong>Setbacks:</strong> Rear - {report.aduRules.requiredSetbacks.rear}m, Side - {report.aduRules.requiredSetbacks.side}m</p>
      <p><strong>Soil Type:</strong> {report.soilType}</p>
      <p><strong>Slope Risk:</strong> {report.slopeWarning ? "High" : "Low"}</p>
      <p><strong>Greenbelt:</strong> {report.greenbeltFlag ? "Yes" : "No"}</p>
      <p><strong>Heritage Status:</strong> {report.heritageFlag ? "Yes" : "No"}</p>
      <p style={{ marginTop: "1rem" }}>{report.summary}</p>
    </div>
  );
};

// 📥 Address Input
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
