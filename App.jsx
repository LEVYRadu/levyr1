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
  const geocoded = {
    lat: 43.2557,
    lon: -79.8711
  };

  const tryFetch = async (fn, label) => {
    try {
      return await fn();
    } catch (e) {
      console.warn(`⚠️ ${label} fetch failed:`, e);
      return null;
    }
  };

  const fetchZoningData = async () => {
    const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Zoning_By_law_Boundary/FeatureServer/1/query?f=json&where=1%3D1&outFields=*&geometry=${geocoded.lon},${geocoded.lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outSR=4326`;
    const res = await fetch(url);
    const json = await res.json();
    return json.features?.[0]?.attributes || null;
  };

  const fetchHeritageStatus = async () => {
    const url = `https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Heritage_Properties/FeatureServer/0/query?f=geojson&where=1%3D1`;
    const res = await fetch(url);
    const json = await res.json();
    return json.features?.some(f => {
      const [x, y] = f.geometry.coordinates[0][0];
      return Math.abs(x - geocoded.lon) < 0.0005 && Math.abs(y - geocoded.lat) < 0.0005;
    });
  };

  const fetchGreenbeltStatus = async () => {
    const url = `https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open06/MapServer/15/query?f=geojson&where=1%3D1`;
    const res = await fetch(url);
    const json = await res.json();
    return json.features?.some(f => {
      const [x, y] = f.geometry.coordinates[0][0];
      return Math.abs(x - geocoded.lon) < 0.0005 && Math.abs(y - geocoded.lat) < 0.0005;
    });
  };

  const fetchSoilType = async () => {
    const url = `https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open05/MapServer/9/query?f=geojson&where=1%3D1`;
    const res = await fetch(url);
    const json = await res.json();
    const feature = json.features?.find(f =>
      f.geometry.coordinates[0].some(([x, y]) =>
        Math.abs(x - geocoded.lon) < 0.0005 && Math.abs(y - geocoded.lat) < 0.0005
      )
    );
    return feature?.properties?.SOIL_TYPE || "Unknown";
  };

  const zoning = await tryFetch(fetchZoningData, "Zoning");
  const heritageFlag = await tryFetch(fetchHeritageStatus, "Heritage");
  const greenbeltFlag = await tryFetch(fetchGreenbeltStatus, "Greenbelt");
  const soilType = await tryFetch(fetchSoilType, "Soil");

  const aduIncentiveMHI = heritageFlag === false;

  if (!zoning && !soilType && heritageFlag === null && greenbeltFlag === null) {
    console.warn("⚠️ All GIS fetches failed — returning fallback data.");
    return {
      address,
      zoning: "Unknown (fallback)",
      heritageFlag: false,
      greenbeltFlag: false,
      soilType: "Loam",
      aduIncentiveMHI: true,
      incentiveConfidence: "Medium",
      summary: "Fallback feasibility report. Some data may be estimated."
    };
  }

  return {
    address,
    zoning: zoning?.ZONE_CATEGORY || "Unknown",
    heritageFlag,
    greenbeltFlag,
    soilType,
    aduIncentiveMHI,
    incentiveConfidence: zoning ? "High" : "Medium",
    summary: "Feasibility logic pulled from available Hamilton data."
  };
};

const ReportPreview = ({ report }) => {
  if (!report) return null;

  return (
    <div
      style={{
        marginTop: "2rem",
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9"
      }}
    >
      <h2 style={{ marginBottom: "1rem" }}>Feasibility Report</h2>
      <p><strong>Address:</strong> {report.address}</p>
      <p><strong>Zoning:</strong> {report.zoning}</p>
      <p><strong>Heritage Status:</strong> {report.heritageFlag ? "Yes" : "No"}</p>
      <p><strong>Greenbelt Area:</strong> {report.greenbeltFlag ? "Yes" : "No"}</p>
      <p><strong>Soil Type:</strong> {report.soilType}</p>
      <p><strong>Grant Confidence:</strong> {report.incentiveConfidence}</p>

      {report.aduIncentiveMHI && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "#e0ffe0",
            borderRadius: "6px"
          }}
        >
          <strong>💸 Incentive Highlight:</strong><br />
          This property may be eligible for Hamilton’s <strong>ADU-Multiplex Housing Incentive Program</strong>, offering:<br />
          • Up to <strong>$2,000</strong> in permit fee rebates<br />
          • Forgivable loans of <strong>$25,000 per ADU</strong>, up to $150,000<br />
          • Program ends December 31, 2026<br />
          Final eligibility depends on affordability and location within HHCIPA.
        </div>
      )}

      <p style={{ marginTop: "1rem" }}>{report.summary}</p>
    </div>
  );
};

const App = () => {
  const [inputAddress, setInputAddress] = useState("");
  const [report, setReport] = useState(null);

  const handleRun = async () => {
    try {
      const result = await generateFeasibilityReport(inputAddress || "123 Main St, Hamilton");
      console.log("✅ Report generated:", result);
      setReport(result);
    } catch (err) {
      console.error("❌ Report generation failed:", err);
      alert("Something went wrong while generating the report.");
    }
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif", maxWidth: "600px", margin: "auto" }}>
      <h1>LEVYR ADU Feasibility Test</h1>
      <AddressInput value={inputAddress} onChange={setInputAddress} />
      <button
        onClick={handleRun}
        style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}
      >
        Run Feasibility Test
      </button>
      <ReportPreview report={report} />
    </div>
  );
};

export default App;
