import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function AirQualityChart({ data }) {
  const iaqi = data.iaqi || {};

  const pollutants = {
    PM25: iaqi.pm25 ? iaqi.pm25.v : null,
    PM10: iaqi.pm10 ? iaqi.pm10.v : null,
    NO2: iaqi.no2 ? iaqi.no2.v : null,
    O3: iaqi.o3 ? iaqi.o3.v : null,
    CO: iaqi.co ? iaqi.co.v : null,
  };

  const labels = Object.keys(pollutants).filter((p) => pollutants[p] !== null);
  const values = Object.values(pollutants).filter((v) => v !== null);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Pollutant Levels (µg/m³)",
        data: values,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  return (
    <div
      style={{
        background: "#fff",
        padding: "1rem",
        borderRadius: "8px",
        marginTop: "1rem",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h3>📊 Pollutant Breakdown</h3>
      <Bar data={chartData} />
    </div>
  );
}

export default AirQualityChart;
