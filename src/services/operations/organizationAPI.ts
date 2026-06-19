import { api } from "../api";
import { organizationEndpoints } from "../endpoints";

interface OrganizationItem {
  id: string;
  name: string;
}

interface GetOrganizationsResponse {
  success: boolean;
  code: number;
  data: OrganizationItem[];
}

export const fetchOrganizationNames = async (
  search = "",
  page = 1,
  limit = 50,
): Promise<{ value: string; label: string }[]> => {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.append("search", search.trim());
  }

  params.append("page", String(page));
  params.append("limit", String(limit));

  const { data } = await api.get<GetOrganizationsResponse>(
    organizationEndpoints.GET_ALL_ORGANIZATIONS,
    { params },
  );

  return (data.data ?? []).map((organization) => ({
    value: String(organization.id),
    label: String(organization.name),
  }));
};
