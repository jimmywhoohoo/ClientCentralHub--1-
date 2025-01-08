import { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
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

export function ClientLocationMap() {
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [locations, setLocations] = useState<Map<number, Location>>(new Map());

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

      const newLocations = new Map<number, Location>();

      for (const user of usersData.users) {
        if (user.address) {
          const location = await geocodeAddress(user.address);
          if (location) {
            newLocations.set(user.id, location);
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
          <CardTitle>Client Locations</CardTitle>
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
        <CardTitle>Client Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={4}
            center={center}
          >
            {usersData?.users.map((client) => {
              const location = locations.get(client.id);
              if (!location) return null;

              return (
                <Marker
                  key={client.id}
                  position={location}
                  onClick={() => setSelectedClient(client)}
                />
              );
            })}

            {selectedClient && locations.get(selectedClient.id) && (
              <InfoWindow
                position={locations.get(selectedClient.id)!}
                onCloseClick={() => setSelectedClient(null)}
              >
                <div>
                  <h3 className="font-semibold">{selectedClient.fullName}</h3>
                  <p className="text-sm">{selectedClient.companyName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClient.address}
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      </CardContent>
    </Card>
  );
}