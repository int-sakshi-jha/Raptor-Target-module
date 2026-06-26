import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
//import { api } from "../api";
import axios from "axios";
import { assetEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";
import { cleanQueryFilters, toURLSearchParams, cleanEmptyStrings } from "@/utils/requestQuery";

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDE5ZWFiN2UtZDFhOS03NmVkLTllYjgtMjEzZTQzZDc0ZTg2Iiwic2Vzc2lvbl9pZCI6IjAxOWVmZWNkLTM4OGItNzUwMy05MTE3LTIzMDVmMDI4NTBjZSIsImlhdCI6MTc4MjM5MTMyMiwiZXhwIjoyNjQ2MzkxMzIyfQ.tNrcJ0l7Y4D6M83k3SbfblSAZJnWDC5tlQpynIKbx_M";

const api = axios.create({
  baseURL: "http://192.168.2.69:5000/api/v1",
//   withCredentials: true,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
}); 

const api2 = axios.create({
  baseURL: "http://192.168.2.95:5000/api/v1",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
}); 

export interface AssetListFilters {
  status?: string;
  category_name?: string;
  component_type?: string;

  installation_date_start?: string;
  installation_date_end?: string;

  commissioning_date_start?: string;
  commissioning_date_end?: string;

  purchase_date_start?: string;
  purchase_date_end?: string;

  warranty_start_date_start?: string;
  warranty_start_date_end?: string;

  warranty_end_date_start?: string;
  warranty_end_date_end?: string;

  created_at_start?: string;
  created_at_end?: string;

  updated_at_start?: string;
  updated_at_end?: string;

  sort_by?: string;
  sort_order?: string;
}

export interface AssetRow {
  id: string;
  tenant_id: string;

  plant_id?: string | null;

  category_name: string;
  component_type: string;

  code: string;
  name: string;

  model_number?: string | null;
  serial_number?: string | null;

  manufacturer_name?: string | null;

  specifications?: Record<string, unknown>;

  status: string;

  manufacture_date?: string | null;
  installation_date?: string | null;
  commissioning_date?: string | null;
  purchase_date?: string | null;

  warranty_start_date?: string | null;
  warranty_end_date?: string | null;

  profile_url?: string | null;
  media?: string[];

  status_history?: unknown[];
  replacement_history?: unknown[];

  metadata?: Record<string, unknown>;

  description?: string | null;

  retired_at?: string | null;

  created_by?: string | null;
  updated_by?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  // Enriched fields (optional)
  plant_name?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
}

export type Option = {
  value: string;
  label: string;
};

export type SpecificationEntry = {
  key: string;
  value: string;
};

export interface CreateAssetInput{
  plant_id:string;
  category_name: string;
  component_type: string;
  name: string;
  model_number: string;
  serial_number: string;
  manufacturer_name: string;
  specifications: Record<string,string>;
  status: string;
  manufacture_date: string;
  installation_date: string;
  commissioning_date: string;
  purchase_date: string;
  warranty_start_date: string;
  warranty_end_date: string;
  description: string;
  retired_at: string | null;
  profile_url: string;
  media_files: File[];
}

export interface UpdateAssetInput extends Partial<CreateAssetInput> {
    id: string;
    /** Commercial operation date — updates only; not accepted on create. */
    cod_date?: string | null;
}

export interface ImportAssetsResponse {
    message: string;
    summary: {
        totalRows: number;
        updatedCount: number;
        ignoredCount: number;
        errors: string[];
    };
}

export interface AssetTypeOption {
  value: string;
  label: string;
  id: string;
}

interface GetAssetTypeResponse {
  success: boolean;
  code: number;
  data: {
    id: string;
    value: string;
    label: string;
  }[];
}

export interface ReplaceAssetInput {
    asset_id: string;
    new_asset_id: string;
    remarks?: string;
    reason?: string;
}


export const ASSET_SORT_OPTIONS:Option[] = [
  { value: "created_at", label: "Created At" },
  { value: "updated_at", label: "Updated At" },
  { value: "name", label: "Asset Name" },
  { value: "code", label: "Asset Code" },
  { value: "purchase_date", label: "Purchase Date" },
  { value: "installation_date", label: "Installation Date" },
  { value: "warranty_end_date", label: "Warranty End Date" },
];



export const ASSET_STATUS_OPTIONS: Option[] = [
  { value: "in_stock", label: "In Stock" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "faulty", label: "Faulty" },
  { value: "under_maintenance", label: "Under Maintenance" },
  { value: "replaced", label: "Replaced" },
  { value: "dead", label: "Dead" },
];


export const fetchAssetTypeOptions = async (): Promise<AssetTypeOption[]> => {
  const { data } = await api2.get<GetAssetTypeResponse>(
    assetEndpoints.GET_ASSET_TYPES,
  );

  const rows = Array.isArray(data.data) ? data.data : [];

  return rows.map((row) => ({
    id: row.id,
    value: row.value,
    label: row.label,
  }));
};

export const useGetAssetTypeOptionsQuery = (
  { enabled = true }: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: ["selectOptions", "asset_type"],
    enabled,
    staleTime: 60_000,
    queryFn: fetchAssetTypeOptions,
  });
 

//queries
export const useGetAllAssetsQuery = ({
    search = "",
    filters = {},
    page = 1,
    limit = 50,
    plantId="",
    enabled = true,
}: {
    search?: string;
    filters?: AssetListFilters;
    page?: number;
    limit?: number;
    plantId?:string;
    enabled?: boolean;
}) => {
    const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
    const filterKey = JSON.stringify(cleanFilters);

    return useQuery({
        queryKey: ["assets", "list", "all",plantId, search, filterKey, page, limit],
        enabled,
        staleTime: 0,
        queryFn: async () => {
            const rawParams: Record<string, unknown> = {
                ...(search ? { search } : {}),
                ...(plantId ? { plant_id: plantId } : {}),  // ← send to server
                page: page.toString(),
                limit: limit.toString(),
                ...cleanFilters,
            };

            const params = toURLSearchParams(rawParams);

            const { data } = await api.get(
                assetEndpoints.GET_ALL_ASSETS,
                { params }
            );

            return data;
        },
    });
};

export const useGetAssetDetailsQuery = (id: string | null | undefined) =>
    useQuery({
        queryKey: ["assets", "detail", id],
        enabled: !!id,
        staleTime: 60_000,
        queryFn: async () => {
            if (!id) throw new Error("Asset id is required");
            const { data } = await api.get<any>(assetEndpoints.GET_ASSET_BY_ID(id));
            return data as any;
        },
});

export const useGetAssetStatusHistoryQuery = ({
    assetId,
    enabled = true,
}: {
    assetId: string;
    enabled?: boolean;
}) => {
    return useQuery({
        queryKey: ["assets", "statusHistory", assetId],
        enabled: enabled && !!assetId,
        staleTime: 60_000,
        queryFn: async () => {
            const { data } = await api.get(
                assetEndpoints.GET_ASSET_HISTORY(assetId)
            );
            return data;
        },
    });
};

export const useGetAssetReplacementHistoryQuery = ({
    assetId,
    enabled = true,
}: {
    assetId: string;
    enabled?: boolean;
}) => {
    return useQuery({
        queryKey: ["assets", "replacementHistory", assetId],
        enabled: enabled && !!assetId,
        staleTime: 60_000,
        queryFn: async () => {
            const { data } = await api.get(
                assetEndpoints.GET_REPLACEMENT_HISTORY(assetId)
            );
            return data;
        },
    });
};

export const useGetAssetStatisticsQuery = ({
    plantId,
    enabled = true,
}: {
    plantId?: string;
    enabled?: boolean;
}) => {
    return useQuery({
        queryKey: ["assets", "statistics", plantId],
        enabled: enabled && !!plantId,
        staleTime: 0,
        queryFn: async () => {
            const { data } = await api.get(
                assetEndpoints.GET_ASSET_STATISTICS
            );
        return data as any;
        },
    });
};
//Mutations
export const useCreateAssetMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: CreateAssetInput) => {
            const cleaned = cleanEmptyStrings(input) as CreateAssetInput;
            const { data } = await api.post(assetEndpoints.CREATE_ASSET, cleaned);
            return data as any;
        },
        onSuccess: async (data) => {
            toast.success(
                (data as any)?.data?.message || (data as any)?.message || "Asset created successfully",
            );
            await queryClient.invalidateQueries({ queryKey: ["assets", "list", "all"] });
        },
        onError: toastError,
    });
};

export const useUpdateAssetMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...input }: UpdateAssetInput) => {
            const cleaned = cleanEmptyStrings(input) as Partial<UpdateAssetInput>;
            const { data } = await api.put(assetEndpoints.UPDATE_ASSET(id), cleaned);
            return data as any;
        },
        onSuccess: async (data, variables) => {
            toast.success((data as any)?.message || (data as any)?.data?.message || "Asset updated successfully");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["assets", "list", "all"] }),
                queryClient.invalidateQueries({ queryKey: ["assets", "detail", variables.id] }),
            ]);
        },
        onError: toastError,
    });
};

export const useUpdateAssetStatusMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data } = await api.put(assetEndpoints.UPDATE_STATUS(id),{ status });
            return data as any;
        },
    onSuccess: async (data, variables) => {
            toast.success(
                data?.message || data?.data?.message || "Asset status updated successfully"
            );
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assets", "list", "all"] }),
        queryClient.invalidateQueries({ queryKey: ["assets", "detail", variables.id] }),
    ]);
    },
    onError: toastError,
    });
};

export const useReplaceAssetMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: ReplaceAssetInput) => {
            const { asset_id, ...body } = input;
            const cleaned = cleanEmptyStrings(body);
            const { data } = await api.post(
                assetEndpoints.REPLACE_ASSET(asset_id),
                cleaned
            );
            return data as any;
        },
        onSuccess: (data) => {
            toast.success(
                (data as any)?.data?.message ||
                (data as any)?.message ||
                "Asset replaced successfully"
            );
                queryClient.invalidateQueries({
                queryKey: ["assets", "list", "all"],
            });
        },
        onError: toastError,
    });
};

export const useDeleteAssetMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (targetIds: string[]) => {
            console.log("deleteTarget called with:", targetIds);
            if (!targetIds?.length) {
                throw new Error("No target selected for deletion");
            }
            const { data } = await api.post(
                assetEndpoints.BULK_DELETE,
                {
                    ids: targetIds,
                }
            );

            return data;
        },
        onSuccess: (data) => {
            const msg = (data as any)?.data?.message || (data as any)?.message || "Target(s) deleted successfully";
            toast.success(msg);
            queryClient.invalidateQueries({ queryKey: ["assets", "list", "all"] });
        },
        onError: toastError,
    });
};

// Change the existing useImportAssetsMutation to accept plantId
export const useImportAssetsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, plantId }: { file: File; plantId: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("plant_id", plantId);           // ← add this
      const response = await api.post(assetEndpoints.IMPORT_ASSETS, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
            const msg = (data as any)?.data?.message || (data as any)?.message || "Import Processing Completed";
            toast.success(msg);
            queryClient.invalidateQueries({ queryKey: ["assets", "list", "all"] });
        },
    onError: toastError,
  });
};

export const useExportAssetsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: string) => {
      const response = await api.get(
        assetEndpoints.EXPORT_ASSETS,
        {
          params: { plant_id: plantId },   // ← query param in axios goes here
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `assets_export_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: (data) => {
            const msg = (data as any)?.data?.message || (data as any)?.message || "Export Processing Completed";
            toast.success(msg);
            queryClient.invalidateQueries({ queryKey: ["assets", "list", "all"] });
        },
    onError: toastError,
  });
};

export interface UploadAssetImageResponse {
    message?: string;
    data?: {
        image_url: string;
    };
    image_url?: string;
}

export const useUploadAssetImageMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ file, plantId }: { file: File; plantId: string }) => {
            const formData = new FormData();
            formData.append("image", file);   // ✅ matches upload.single("image")
            formData.append("plant_id", plantId);
            const { data } = await api.post(
                assetEndpoints.UPLOAD_ASSET_IMAGE,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } },
            );
            return data as UploadAssetImageResponse;
        },
        onSuccess: (data) => {
            const msg = data?.message || "Image uploaded successfully";
            toast.success(msg);
            queryClient.invalidateQueries({ queryKey: ["assets", "list", "all"] });
        },
        onError: toastError,
    });
};