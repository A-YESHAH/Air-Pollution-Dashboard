import { useState, useEffect } from "react";
import axios from "axios";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

ChartJS.register(
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement
);

// MapCenterUpdater to fix map centering on city change
function MapCenterUpdater({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lon], 12, { animate: true });
    }
  }, [coords]);
  return null;
}

// AQI calculation using US EPA breakpoints
const getAQIFromPM = (pm25, pm10) => {
  const pm25Breakpoints = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
    { cLow: 350.5, cHigh: 500, iLow: 401, iHigh: 500 },
  ];

  const pm10Breakpoints = [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
    { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
    { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
    { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
    { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
    { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
  ];

  const calcAQI = (c, breakpoints) => {
    if (c === null || c === undefined) return null;
    for (let bp of breakpoints) {
      if (c >= bp.cLow && c <= bp.cHigh) {
        return Math.round(
          ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) +
            bp.iLow
        );
      }
    }
    return null;
  };

  const aqiPm25 = calcAQI(pm25, pm25Breakpoints);
  const aqiPm10 = calcAQI(pm10, pm10Breakpoints);

  return Math.max(aqiPm25 || 0, aqiPm10 || 0);
};

// Background based on AQI
const getBackgroundByAQI = (aqi) => {
  if (!aqi)
    return "bg-[url('https://cdn.pixabay.com/photo/2025/01/14/13/55/nature-9332892_640.jpg')] bg-cover bg-fixed";
  if (aqi <= 50)
    return "bg-[url('https://cdn.pixabay.com/photo/2025/01/14/13/55/nature-9332892_640.jpg')] bg-cover bg-fixed";
  if (aqi <= 100)
    return "bg-[url('https://cdn.pixabay.com/photo/2020/01/27/10/24/pollution-4796858_640.jpg')] bg-cover bg-fixed";
  if (aqi <= 150)
    return "bg-[url('https://cdn.pixabay.com/photo/2015/04/10/14/56/smoke-716322_640.jpg')] bg-cover bg-fixed";
  if (aqi <= 200)
    return "bg-[url('https://cdn.pixabay.com/photo/2022/11/06/09/52/ai-generated-7573587_640.jpg')] bg-cover bg-fixed";
  return "bg-[url('https://cdn.pixabay.com/photo/2022/11/06/09/52/ai-generated-7573587_640.jpg')] bg-cover bg-fixed";
};

// AQI color gradient
const getAQIColor = (aqi) => {
  if (!aqi) return "bg-gradient-to-r from-blue-300 to-blue-100/30";
  if (aqi <= 50) return "bg-gradient-to-r from-blue-300 to-blue-100/30";
  if (aqi <= 100) return "bg-gradient-to-r from-yellow-500 to-yellow-300/40";
  if (aqi <= 150) return "bg-gradient-to-r from-orange-700 to-orange-500/50";
  if (aqi <= 200) return "bg-gradient-to-r from-red-800 to-red-600/60";
  if (aqi <= 300) return "bg-gradient-to-r from-purple-900 to-purple-700/60";
  return "bg-gradient-to-r from-black to-gray-800/70";
};

export default function App() {
  const [city, setCity] = useState("Islamabad");
  const [coords, setCoords] = useState({ lat: 33.6844, lon: 73.0479 });
  const [aqData, setAqData] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [pmTrend, setPmTrend] = useState({ pm2_5: [], pm10: [], labels: [] });
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  // On mount: try geolocation first
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lon: longitude });
          fetchAirQuality(latitude, longitude);
        },
        () => fetchAirQuality(coords.lat, coords.lon)
      );
    } else {
      fetchAirQuality(coords.lat, coords.lon);
    }
  }, []);

  const fetchAirQuality = async (lat, lon) => {
    try {
      setLoading(true);

      // === Open-Meteo Air Quality ===
      const res = await axios.get(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_dioxide,ammonia,aerosol_optical_depth,methane,dust,uv_index,uv_index_clear_sky,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen`
      );
      const hourly = res.data.hourly;

      // Latest pollutant values
      const latestValues = {};
      for (let param in hourly) {
        const values = hourly[param];
        const validValues = Array.isArray(values)
          ? values.filter((v) => v !== null && !isNaN(v))
          : [];
        const lastValue =
          validValues.length > 0 ? validValues[validValues.length - 1] : null;
        if (lastValue !== null && lastValue !== undefined)
          latestValues[param] = lastValue;
      }

      // === NASA POWER Atmospheric Data ===
      const nasaRes = await axios.get(
        `https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M,RH2M,WS10M,PS,PRECTOTCORR&community=RE&longitude=${lon}&latitude=${lat}&start=20251005&end=20251005&format=JSON`
      );

      const nasaParams = nasaRes.data?.properties?.parameter || {};
      const nasaLatest = {
        temperature: nasaParams.T2M
          ? Object.values(nasaParams.T2M).pop()
          : null,
        humidity: nasaParams.RH2M ? Object.values(nasaParams.RH2M).pop() : null,
        wind_speed: nasaParams.WS10M
          ? Object.values(nasaParams.WS10M).pop()
          : null,
        pressure: nasaParams.PS ? Object.values(nasaParams.PS).pop() : null,
        precipitation: nasaParams.PRECTOTCORR
          ? Object.values(nasaParams.PRECTOTCORR).pop()
          : null,
      };

      // Merge NASA + Air Quality data
      const combinedData = { ...latestValues, ...nasaLatest };
      setAqData(combinedData);

      // AQI calculation
      const currentAQI = getAQIFromPM(latestValues.pm2_5, latestValues.pm10);
      setAqi(currentAQI);

      // PM trend chart (last 7 hours)
      const pm2_5 = (hourly.pm2_5 || [])
        .filter((v) => v !== null && !isNaN(v))
        .slice(-7);
      const pm10 = (hourly.pm10 || [])
        .filter((v) => v !== null && !isNaN(v))
        .slice(-7);
      const labels = pm2_5.map((_, i) => `Hour ${i + 1}`);
      setPmTrend({ pm2_5, pm10, labels });

      generatePredictions(currentAQI);
    } catch (err) {
      console.error("Error fetching air quality data:", err);
      alert("Failed to fetch air quality or NASA data.");
    } finally {
      setLoading(false);
    }
  };

  // 3-day AQI prediction
  const generatePredictions = (currentAQI) => {
    const nextDays = [1, 2, 3].map((d, i) => {
      const predicted = Math.min(currentAQI + i * 10, 500);
      return { day: `Day ${d}`, aqi: predicted };
    });
    setPredictions(nextDays);
  };

  const fetchCoordsFromCity = async (cityName) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cityName.trim()
        )}&limit=1`
      );
      if (res.data && res.data.length > 0) {
        const { lat, lon } = res.data[0];
        return { lat: parseFloat(lat), lon: parseFloat(lon) };
      }
      return null;
    } catch (err) {
      console.error("Error fetching city coords:", err);
      return null;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city) return;
    const newCoords = await fetchCoordsFromCity(city);
    if (newCoords) {
      setCoords(newCoords);
      fetchAirQuality(newCoords.lat, newCoords.lon);
    } else {
      alert("City not found!");
    }
  };

  return (
    <div className={`relative min-h-screen ${getBackgroundByAQI(aqi)}`}>
      <div className={`absolute inset-0 ${getAQIColor(aqi)} z-0`}></div>
      <div className="relative z-10 text-gray-800 transition-all duration-700">
        <header className="bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg p-6 mt-6 w-full">
          <h1 className="text-4xl font-extrabold text-yellow-400 text-center drop-shadow-lg">
            🌍 Air Quality Dashboard
          </h1>
        </header>

        <main className="p-6 max-w-7xl mx-auto space-y-10">
          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="flex justify-center space-x-3 mt-4"
          >
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-5 py-3 w-72 rounded-full border border-gray-300 shadow focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all"
              placeholder="Enter city..."
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full shadow hover:scale-105 transform transition-all"
            >
              Search
            </button>
          </form>

          {/* Loading */}
          {loading && (
            <p className="text-center text-blue-800 font-medium">
              Loading latest air quality and NASA data...
            </p>
          )}

          {/* Pollutants + NASA Data */}
          {!loading && aqData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
              {Object.entries(aqData)
                // ✅ Remove -999, null, or NaN cards completely
                .filter(
                  ([_, value]) =>
                    value !== null && value !== -999 && !isNaN(value)
                )
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-white/30 backdrop-blur-md p-4 rounded-2xl shadow-lg text-center hover:scale-105 transform transition-all"
                  >
                    <h3 className="text-sm font-semibold uppercase text-blue-800">
                      {key.replaceAll("_", " ")}
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 drop-shadow">
                      {value}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {/* Trend, Map, Predictions, Health Advice */}
          {!loading && pmTrend.pm2_5.length > 0 && (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 p-6 bg-white/30 backdrop-blur-md rounded-2xl shadow-xl border border-blue-200 hover:shadow-2xl transition-all">
                <h2 className="text-xl font-semibold mb-4 text-blue-800">
                  PM2.5 & PM10 Trend (Line Chart)
                </h2>
                <div className="h-[350px]">
                  <Line
                    key={pmTrend.labels.join(",")}
                    data={{
                      labels: pmTrend.labels,
                      datasets: [
                        {
                          label: "PM2.5",
                          data: pmTrend.pm2_5,
                          borderColor: "rgb(37, 99, 235)",
                          backgroundColor: "rgba(37, 99, 235, 0.3)",
                          tension: 0.3,
                          fill: true,
                        },
                        {
                          label: "PM10",
                          data: pmTrend.pm10,
                          borderColor: "rgb(59, 130, 246)",
                          backgroundColor: "rgba(59, 130, 246, 0.2)",
                          tension: 0.3,
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "top" } },
                      scales: { y: { beginAtZero: true } },
                    }}
                  />
                </div>
              </div>

              <div className="flex-1 p-6 bg-white/30 backdrop-blur-md rounded-2xl shadow-xl border border-blue-200 hover:shadow-2xl transition-all">
                <h2 className="text-xl font-semibold mb-4 text-blue-800">
                  PM2.5 & PM10 Levels (Bar Chart)
                </h2>
                <div className="h-[350px]">
                  <Bar
                    data={{
                      labels: pmTrend.labels,
                      datasets: [
                        {
                          label: "PM2.5",
                          data: pmTrend.pm2_5,
                          backgroundColor: "rgba(37, 99, 235, 0.7)",
                        },
                        {
                          label: "PM10",
                          data: pmTrend.pm10,
                          backgroundColor: "rgba(59, 130, 246, 0.5)",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: "top" } },
                      scales: { y: { beginAtZero: true } },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {!loading && predictions.length > 0 && (
            <div className="bg-white/30 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-blue-200 hover:shadow-2xl transition-all">
              <h2 className="text-xl font-semibold mb-4 text-blue-800">
                🔮 3-Day AQI Prediction
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {predictions.map((p) => (
                  <div
                    key={p.day}
                    className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow text-center"
                  >
                    <h3 className="text-lg font-bold">{p.day}</h3>
                    <p className="text-3xl font-bold text-blue-600">{p.aqi}</p>
                    <p className="text-sm text-gray-700">Predicted AQI</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && coords && (
            <div className="p-6 bg-white/30 backdrop-blur-md rounded-2xl shadow-xl border border-blue-200 hover:shadow-2xl transition-all">
              <h2 className="text-xl font-semibold mb-4 text-blue-800">
                📍 Location Map
              </h2>
              <MapContainer
                center={[coords.lat, coords.lon]}
                zoom={11}
                scrollWheelZoom={false}
                className="h-[400px] w-full rounded-xl shadow"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapCenterUpdater coords={coords} />
                <Marker position={[coords.lat, coords.lon]}>
                  <Popup>{city}</Popup>
                </Marker>
              </MapContainer>
            </div>
          )}

          {/* Health Advice */}
          {!loading && aqi && (
            <div className="bg-white/40 backdrop-blur-md p-6 rounded-2xl shadow-lg text-center border border-blue-200 mt-6">
              <h2 className="text-2xl font-bold text-blue-800">
                Health Advice
              </h2>
              <p className="mt-2 text-lg font-medium">
                {aqi <= 50
                  ? "Air quality is good. Enjoy outdoor activities!"
                  : aqi <= 100
                  ? "Moderate air quality. Sensitive people should limit outdoor activity."
                  : aqi <= 150
                  ? "Unhealthy for sensitive groups. Avoid outdoor exercise."
                  : aqi <= 200
                  ? "Unhealthy air! Stay indoors with filtered air."
                  : "Very unhealthy! Avoid going outside and use air purifiers."}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
