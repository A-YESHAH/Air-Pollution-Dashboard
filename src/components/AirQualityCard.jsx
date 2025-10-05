function AirQualityCard({ data }) {
  const iaqi = data.iaqi || {};
  const aqi = data.aqi;

  const getQuality = (aqi) => {
    if (aqi <= 50) return { label: "Good", color: "#00e400" };
    if (aqi <= 100) return { label: "Moderate", color: "#ffff00" };
    if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "#ff7e00" };
    if (aqi <= 200) return { label: "Unhealthy", color: "#ff0000" };
    if (aqi <= 300) return { label: "Very Unhealthy", color: "#8f3f97" };
    return { label: "Hazardous", color: "#7e0023" };
  };

  const quality = getQuality(aqi);

  return (
    <div
      style={{
        background: "#fff",
        padding: "1rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginBottom: "1rem",
      }}
    >
      <h2>
        {data.city.name} — AQI:{" "}
        <span style={{ color: quality.color }}>{aqi}</span>
      </h2>
      <p>Quality: {quality.label}</p>
      <p>PM2.5: {iaqi.pm25?.v ?? "N/A"}</p>
      <p>PM10: {iaqi.pm10?.v ?? "N/A"}</p>
      <p>NO₂: {iaqi.no2?.v ?? "N/A"}</p>
      <p>O₃: {iaqi.o3?.v ?? "N/A"}</p>
      <p>CO: {iaqi.co?.v ?? "N/A"}</p>
    </div>
  );
}

export default AirQualityCard;
