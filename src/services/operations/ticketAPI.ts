import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
//import { api } from "../api";
import axios from "axios";
import { ticketEndpoints } from "../endpoints";
import { toastError } from "@/utils/errorFormatter";
import { cleanQueryFilters, toURLSearchParams, cleanEmptyStrings } from "@/utils/requestQuery";

//http://localhost:5000
// ─── Interfaces ───────────────────────────────────────────────────────────────
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDE5ZWFiN2UtZDFhOS03NmVkLTllYjgtMjEzZTQzZDc0ZTg2Iiwic2Vzc2lvbl9pZCI6IjAxOWVlZWFkLTc3NTQtNzM1ZS1hMzM2LTdmMDE3YmMwZGUwNCIsImlhdCI6MTc4MjEyMDgwNiwiZXhwIjoyNjQ2MTIwODA2fQ.fRsqdKW_m8tb-CzndfT7-2reiGh4J1Cu5s9mOy813Lo";

const api = axios.create({
  baseURL: "http://192.168.2.118:5000/api/v1",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
}); 

export interface TicketListFilters {
  status?: string;
  priority?: string;

  created_at_from?: string;
  created_at_to?: string;

  resolved_at_from?: string;
  resolved_at_to?: string;

  updated_at_from?: string;
  updated_at_to?: string;

  created_by?: string;
  updated_by?: string;

  sort_by?: string;
  sort_order?: string;
}

export interface TicketRow {
  id: string;
  tenant_id: string;

  ticket_number: number;

  // Reporter
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;

  // Context
  component_type_id?: string | null;
  component_id?: string | null;
  plant_id?: string | null;

  // Ticket details
  title: string;
  description?: string | null;
  status: string;
  priority: string;

  assigned_to?: string | null;
  feedback?: Record<string, unknown> | null;
  due_date?: string | null;
  resolved_at?: string | null;
  status_history?: unknown[];

  attachment_ids?: string[];

  // Audit
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;

  // Enriched fields (optional)
  plant_name?: string | null;
  component_type?: string | null;
  component?: string | null;
  assigned_to_name?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
}

export type Option = {
  id?:string;
  value: string;
  label: string;
 
};

export interface CreateTicketInput {
  
  plant_id?: string | null;
  component_type_id?: string | null;
  component_id?: string | null;

  name?: string;
  email?: string;
  phone_number?: string;

  title: string;
  description?: string;
  status?: string;
  priority?: string;

  
  due_date?: string | null;
}

export interface UpdateTicketInput extends Partial<CreateTicketInput> {
  id: string;
}

export interface AssignTicketInput {
  id: string;
  assigned_to: string;
}

export interface ReassignTicketInput {
  id: string;
  assigned_to: string;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export const TICKET_SORT_OPTIONS: Option[] = [
  { value: "created_at", label: "Created At" },
  { value: "updated_at", label: "Updated At" },
  { value: "ticket_number", label: "Ticket Number" },
  { value: "title", label: "Title" },
  { value: "due_date", label: "Due Date" },
  { value: "resolved_at", label: "Resolved At" },
  { value: "priority", label: "Priority" },
];

export const TICKET_STATUS_OPTIONS: Option[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "re_open", label: "Re-Opened" },
  { value: "cancelled", label: "Cancelled" },
];

export const TICKET_PRIORITY_OPTIONS: Option[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

// ─── Queries ──────────────────────────────────────────────────────────────────

// export const useGetAllTicketsQuery = ({
//   search = "",
//   filters = {},
//   page = 1,
//   limit = 50,
//   enabled = true,
// }: {
//   search?: string;
//   filters?: TicketListFilters;
//   page?: number;
//   limit?: number;
//   enabled?: boolean;
// }) => {
//   const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
//   const filterKey = JSON.stringify(cleanFilters);

//   return useQuery({
//     queryKey: ["tickets", "list", "all", search, filterKey, page, limit],
//     enabled,
//     staleTime: 0,
//     queryFn: async () => {
//       const rawParams: Record<string, unknown> = {
//         ...(search ? { search } : {}),
//         page: page.toString(),
//         limit: limit.toString(),
//         ...cleanFilters,
//       };

//       const params = toURLSearchParams(rawParams);

//       const { data } = await api.get(ticketEndpoints.GET_ALL_TICKETS, { params });

//       return data;
//     },
//   });
// };

export const useGetAllTicketsQuery = ({
  
  search = "",
  filters = {},
  page = 1,
  limit = 50,
  enabled = true,
}: {
  plantId?: string;
  search?: string;
  filters?: TicketListFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["tickets", "list", "plant", search, filterKey, page, limit],
    enabled,
    staleTime: 0,
    queryFn: async () => {
      const rawParams: Record<string, unknown> = {
        ...(search ? { search } : {}),
        page: page.toString(),
        limit: limit.toString(),
        ...cleanFilters,
      };

      const params = toURLSearchParams(rawParams);

      const { data } = await api.get(ticketEndpoints.GET_ALL_TICKETS, { params });

      return data;
    },
  });
};

export const useGetTicketByIdQuery = (id: string | null | undefined) =>
  useQuery({
    queryKey: ["tickets", "detail", id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!id) throw new Error("Ticket id is required");
      const { data } = await api.get(ticketEndpoints.GET_TICKET_BY_ID(id));
      return data as TicketRow;
    },
  });

export const useGetMyTicketsQuery = ({
  search = "",
  filters = {},
  page = 1,
  limit = 50,
  enabled = true,
}: {
  search?: string;
  filters?: TicketListFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  const cleanFilters = cleanQueryFilters(filters as Record<string, unknown>);
  const filterKey = JSON.stringify(cleanFilters);

  return useQuery({
    queryKey: ["tickets", "list", "my", search, filterKey, page, limit],
    enabled,
    staleTime: 0,
    queryFn: async () => {
      const rawParams: Record<string, unknown> = {
        ...(search ? { search } : {}),
        page: page.toString(),
        limit: limit.toString(),
        ...cleanFilters,
      };

      const params = toURLSearchParams(rawParams);

      const { data } = await api.get(ticketEndpoints.GET_MY_TICKETS, { params });

      return data;
    },
  });
};

export const useGetTicketHistoryQuery = ({
  ticketId,
  enabled = true,
}: {
  ticketId: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ["tickets", "history", ticketId],
    enabled: enabled && !!ticketId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.get(ticketEndpoints.GET_TICKET_HISTORY);
      return data;
    },
  });
};

export const useGetTicketStatisticsQuery = ({
  plantId,
  enabled = true,
}: {
  plantId?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ["tickets", "statistics", plantId],
    enabled: enabled && !!plantId,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await api.get(ticketEndpoints.GET_TICKET_STATISTICS);
      return data;
    },
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const cleaned = cleanEmptyStrings(input) as CreateTicketInput;
      const { data } = await api.post(ticketEndpoints.CREATE_TICKET, cleaned);
      return data as any;
    },
    onSuccess: (data) => {
      toast.success(
        (data as any)?.data?.message || (data as any)?.message || "Ticket created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["tickets", "list", "plant"] });
    },
    onError: toastError,
  });
};

export const useUpdateTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTicketInput) => {
      const cleaned = cleanEmptyStrings(input) as Partial<UpdateTicketInput>;
      const { data } = await api.put(ticketEndpoints.UPDATE_TICKET(id), cleaned);
      return data as any;
    },
    onSuccess: (data, variables) => {
      toast.success(
        (data as any)?.message || (data as any)?.data?.message || "Ticket updated successfully",
      );
      
      queryClient.invalidateQueries({ queryKey: ["tickets", "list", "plant"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", "detail", variables.id] });
    },
    onError: toastError,
  });
};

export const useAssignTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assigned_to }: AssignTicketInput) => {
      const { data } = await api.patch(ticketEndpoints.ASSIGN_TICKET, { assigned_to });
      return data as any;
    },
    onSuccess: (data, variables) => {
      toast.success(
        (data as any)?.message || (data as any)?.data?.message || "Ticket assigned successfully",
      );
      
      queryClient.invalidateQueries({ queryKey: ["tickets", "list", "plant"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", "detail", variables.id] });
    },
    onError: toastError,
  });
};

export const useReassignTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assigned_to }: ReassignTicketInput) => {
      const { data } = await api.patch(ticketEndpoints.REASSIGN_TICKET, { assigned_to });
      return data as any;
    },
    onSuccess: (data, variables) => {
      toast.success(
        (data as any)?.message || (data as any)?.data?.message || "Ticket reassigned successfully",
      );
      
      queryClient.invalidateQueries({ queryKey: ["tickets", "list", "plant"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", "detail", variables.id] });
    },
    onError: toastError,
  });
};

export const useDeleteTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      if (!ticketIds || ticketIds.length === 0) throw new Error("No ticket selected for deletion");
      await Promise.all(
        ticketIds.map((id) => api.delete(ticketEndpoints.DELETE_TICKET)
      ));
      return { message: "Ticket deleted successfully" };
    },
    onSuccess: (data) => {
      const msg = (data as any)?.data?.message || (data as any)?.message || "Ticket(s) deleted successfully";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["tickets", "list", "plant"] });
    },
    onError: toastError,
  });
};