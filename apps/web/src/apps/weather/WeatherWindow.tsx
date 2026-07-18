"use client";

import React, { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Navigation, Search } from "lucide-react";

export function WeatherWindow() {
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("Loading location...");
  const [weather, setWeather] = useState<{
    temp: number;
    wind: number;
    code: number;
    text: string;
    humidity: number;
    hourly: { time: string; temp: number; icon: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cityInput, setCityInput] = useState("");

  const WMO_CODES: Record<number, { text: string; icon: any; color: string }> = {
    0: { text: "Clear Sky", icon: Sun, color: "text-amber-400" },
    1: { text: "Partly Cloudy", icon: Cloud, color: "text-zinc-400" },
    2: { text: "Partly Cloudy", icon: Cloud, color: "text-zinc-400" },
    3: { text: "Overcast", icon: Cloud, color: "text-zinc-500" },
    45: { text: "Foggy", icon: Cloud, color: "text-zinc-500" },
    51: { text: "Drizzle", icon: CloudRain, color: "text-blue-400" },
    61: { text: "Light Rain", icon: CloudRain, color: "text-blue-400" },
    63: { text: "Rain", icon: CloudRain, color: "text-blue-500" },
    80: { text: "Heavy Showers", icon: CloudRain, color: "text-blue-600" },
    71: { text: "Light Snow", icon: CloudSnow, color: "text-sky-300" },
    73: { text: "Snow", icon: CloudSnow, color: "text-sky-400" },
    95: { text: "Thunderstorm", icon: CloudLightning, color: "text-purple-400" },
  };

  const getWeatherIcon = (code: number) => {
    const matched = WMO_CODES[code] || WMO_CODES[0];
    const Icon = matched.icon;
    return <Icon className={`w-16 h-16 ${matched.color}`} />;
  };

  const getWeatherText = (code: number) => {
    return (WMO_CODES[code] || WMO_CODES[0]).text;
  };

  const fetchWeather = async (latitude: number, longitude: number, name: string) => {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data && data.current_weather) {
        const temp = Math.round(data.current_weather.temperature);
        const wind = data.current_weather.windspeed;
        const code = data.current_weather.weathercode;
        const text = getWeatherText(code);

        // Simple mock hourly forecast from API data
        const hourly: any[] = [];
        const times = data.hourly.time.slice(12, 18);
        const temps = data.hourly.temperature_2m.slice(12, 18);
        times.forEach((t: string, idx: number) => {
          const hour = new Date(t).getHours();
          hourly.push({
            time: `${hour}:00`,
            temp: Math.round(temps[idx]),
            icon: hour > 6 && hour < 18 ? "☀️" : "🌙",
          });
        });

        setWeather({ temp, wind, code, text, humidity: 62, hourly });
        setLocationName(name);
      }
    } catch (e) {
      console.error("Failed to load Open-Meteo weather data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;

    setLocationName("Searching...");
    try {
      // Use open Geocoding API from open-meteo to fetch coordinates
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput.trim())}&count=1&language=en`);
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const target = data.results[0];
        setLat(target.latitude);
        setLon(target.longitude);
        fetchWeather(target.latitude, target.longitude, `${target.name}, ${target.country}`);
      } else {
        alert("City not found.");
        setLocationName("Location unknown");
      }
    } catch (e) {
      console.error("Geocoding failed:", e);
    }
  };

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          fetchWeather(pos.coords.latitude, pos.coords.longitude, "Your Location");
        },
        () => {
          // Fallback London
          setLat(51.5074);
          setLon(-0.1278);
          fetchWeather(51.5074, -0.1278, "London");
        }
      );
    } else {
      setLat(51.5074);
      setLon(-0.1278);
      fetchWeather(51.5074, -0.1278, "London");
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-[var(--background)] text-[var(--text)] select-none p-5">
      {/* Search Header */}
      <form onSubmit={handleSearchCity} className="flex gap-2 mb-6 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted)]" />
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Search for a city..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text)] outline-none placeholder-[var(--muted)]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition"
        >
          Search
        </button>
      </form>

      {/* Weather Content */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {loading ? (
          <div className="text-xs text-[var(--muted)] animate-pulse flex flex-col items-center gap-2">
            <Navigation className="w-5 h-5 animate-spin text-violet-400" />
            <span>Syncing meteorology sensors...</span>
          </div>
        ) : weather ? (
          <div className="w-full max-w-sm space-y-6 flex flex-col items-center">
            
            {/* Primary Details */}
            <div className="text-center flex flex-col items-center gap-2">
              <div className="flex justify-center mb-1">{getWeatherIcon(weather.code)}</div>
              <div className="text-4xl font-bold tracking-tight">{weather.temp}°C</div>
              <div className="text-sm font-semibold">{weather.text}</div>
              <div className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5 justify-center">
                <Navigation className="w-3 h-3 text-violet-400 rotate-45" />
                <span>{locationName}</span>
              </div>
            </div>

            {/* Sub-parameters */}
            <div className="grid grid-cols-2 gap-4 w-full border-t border-b border-[var(--border)] py-4 text-xs">
              <div className="text-center">
                <div className="text-[var(--muted)] mb-1">Wind Speed</div>
                <div className="font-semibold">{weather.wind} km/h</div>
              </div>
              <div className="text-center border-l border-[var(--border)]">
                <div className="text-[var(--muted)] mb-1">Humidity</div>
                <div className="font-semibold">{weather.humidity}%</div>
              </div>
            </div>

            {/* Hourly Forecast */}
            <div className="w-full">
              <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2.5 px-1">
                Hourly Forecast
              </div>
              <div className="flex justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5">
                {weather.hourly.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 text-xs">
                    <span className="text-[var(--muted)]">{item.time}</span>
                    <span className="text-base my-0.5">{item.icon}</span>
                    <span className="font-semibold">{item.temp}°</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-xs text-rose-400">Weather data forecast unavailable.</div>
        )}
      </div>
    </div>
  );
}
