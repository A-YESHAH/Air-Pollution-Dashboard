import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapUpdater({ coords }) {
  const map = useMap();

  useEffect(() => {
    if (coords && coords.length === 2) {
      map.setView(coords, 10); // auto re-center when coords change
    }
  }, [coords, map]);

  return null;
}
