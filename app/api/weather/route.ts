import { NextResponse } from "next/server";

// Kórnik, Poland
const LAT = 52.2395;
const LON = 17.0907;

const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: "Bezchmurnie", emoji: "☀️" },
  1: { label: "Przeważnie słonecznie", emoji: "🌤️" },
  2: { label: "Częściowe zachmurzenie", emoji: "⛅" },
  3: { label: "Zachmurzenie", emoji: "☁️" },
  45: { label: "Mgła", emoji: "🌫️" },
  48: { label: "Szron", emoji: "🌫️" },
  51: { label: "Mżawka", emoji: "🌦️" },
  53: { label: "Mżawka", emoji: "🌦️" },
  55: { label: "Silna mżawka", emoji: "🌦️" },
  61: { label: "Lekki deszcz", emoji: "🌧️" },
  63: { label: "Deszcz", emoji: "🌧️" },
  65: { label: "Silny deszcz", emoji: "🌧️" },
  71: { label: "Lekki śnieg", emoji: "🌨️" },
  73: { label: "Śnieg", emoji: "❄️" },
  75: { label: "Silny śnieg", emoji: "❄️" },
  80: { label: "Przelotny deszcz", emoji: "🌦️" },
  81: { label: "Przelotny deszcz", emoji: "🌦️" },
  95: { label: "Burza", emoji: "⛈️" },
  99: { label: "Burza z gradem", emoji: "⛈️" },
};

export interface WeatherData {
  temp: number;
  feels_like: number;
  description: string;
  emoji: string;
  wind: number;
  windMs: number;
  humidity: number;
  precipitationChance: number;
  city: string;
  updated: string;
}

export async function GET() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,weathercode,wind_speed_10m,relative_humidity_2m&daily=precipitation_probability_max&timezone=Europe/Warsaw&forecast_days=1`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

    const json = await res.json();
    const cur = json.current as {
      temperature_2m: number;
      apparent_temperature: number;
      weathercode: number;
      wind_speed_10m: number;
      relative_humidity_2m: number;
    };
    const daily = json.daily as { precipitation_probability_max: number[] };

    const wmo = WMO_CODES[cur.weathercode] ?? { label: "Nieznane", emoji: "🌡️" };
    const windKmh = Math.round(cur.wind_speed_10m);
    const windMs = Math.round(windKmh / 3.6);

    const data: WeatherData = {
      temp: Math.round(cur.temperature_2m),
      feels_like: Math.round(cur.apparent_temperature),
      description: wmo.label,
      emoji: wmo.emoji,
      wind: windKmh,
      windMs,
      humidity: cur.relative_humidity_2m,
      precipitationChance: daily.precipitation_probability_max[0] ?? 0,
      city: "Kórnik",
      updated: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, weather: data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd pogody" },
      { status: 500 },
    );
  }
}
