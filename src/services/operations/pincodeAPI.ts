/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { pincodeEndpoints } from "../endpoints";

// Types -----------------------------

/**
 * Shape of the post office details returned by api.postalpincode.in
 */
export interface PincodePostOffice {
  Name: string;
  Description: string | null;
  BranchType: string;
  DeliveryStatus: string;
  Circle: string;
  District: string;
  Division: string;
  Region: string;
  Block: string;
  State: string;
  Country: string;
  Pincode: string;
}

/**
 * Shape of the root response from api.postalpincode.in
 */
export interface PincodeResponse {
  Message: string;
  Status: "Success" | "Error";
  PostOffice: PincodePostOffice[];
}

// Global API Functions ----------------

/**
 * Fetches address details for a given Indian pincode using an external API.
 * @param pincode 6-digit Indian pincode
 * @returns A promise that resolves to the first matching PostOffice details or null if not found.
 */
export const fetchPincodeDetails = async (
  pincode: string,
): Promise<PincodePostOffice | null> => {
  if (!pincode || pincode.length !== 6) {
    return null;
  }

  const urls = pincodeEndpoints.GET_DETAILS(pincode);

  // Using plain axios instead of the project's custom 'api' instance
  // to avoid sending internal Authorization headers to an external API (CORS issue).
  let lastError: unknown;

  for (const url of urls) {
    try {
      const { data } = await axios.get<PincodeResponse[]>(url);

      if (
        data?.[0]?.Status === "Success" &&
        data[0].PostOffice &&
        data[0].PostOffice.length > 0
      ) {
        return data[0].PostOffice[0];
      }

      if (data?.[0]?.Status === "Error") {
        return null;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
};

// Hooks -------------------------------

/**
 * Hook to fetch pincode details using React Query.
 */
export const useGetPincodeDetailsQuery = (
  pincode: string | null | undefined,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["pincode", pincode],
    queryFn: () => (pincode ? fetchPincodeDetails(pincode) : null),
    enabled: (options?.enabled ?? true) && !!pincode && pincode.length === 6,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};
