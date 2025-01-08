import { useEffect, useState } from "react";
import { GoogleMap, LoadScript, HeatmapLayer } from "@react-google-maps/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@db/schema";
import { useQuery } from "@tanstack/react-query";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const center = {
  lat: 37.7749, // San Francisco as default center
  lng: -122.4194,
};

interface PaginatedResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface Location {
  lat: number;
  lng: number;
}

export function ClientLocationHeatmap() {
  const [locations, setLocations] = useState<google.maps.LatLng[]>([]);

  const { data: usersData, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["/api/admin/users"],
  });

  // Function to geocode address to coordinates
  const geocodeAddress = async (address: string): Promise<Location | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    return null;
  };

  // Update locations when users data changes
  useEffect(() => {
    const updateLocations = async () => {
      if (!usersData?.users) return;

      const newLocations: google.maps.LatLng[] = [];

      for (const user of usersData.users) {
        if (user.address) {
          const location = await geocodeAddress(user.address);
          if (location) {
            newLocations.push(new google.maps.LatLng(location.lat, location.lng));
          }
        }
      }

      setLocations(newLocations);
    };

    updateLocations();
  }, [usersData?.users]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Location Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[400px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Location Density</CardTitle>
      </CardHeader>
      <CardContent>
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={["visualization"]}
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={4}
            center={center}
          >
            <HeatmapLayer
              data={locations}
              options={{
                radius: 20,
                opacity: 0.6,
                gradient: [
                  "rgba(0, 255, 255, 0)",
                  "rgba(0, 255, 255, 1)",
                  "rgba(0, 191, 255, 1)",
                  "rgba(0, 127, 255, 1)",
                  "rgba(0, 63, 255, 1)",
                  "rgba(0, 0, 255, 1)",
                  "rgba(0, 0, 223, 1)",
                  "rgba(0, 0, 191, 1)",
                  "rgba(0, 0, 159, 1)",
                  "rgba(0, 0, 127, 1)",
                  "rgba(63, 0, 91, 1)",
                  "rgba(127, 0, 63, 1)",
                  "rgba(191, 0, 31, 1)",
                  "rgba(255, 0, 0, 1)"
                ]
              }}
            />
          </GoogleMap>
        </LoadScript>
      </CardContent>
    </Card>
  );
}
