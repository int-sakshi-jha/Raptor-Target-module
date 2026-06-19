/* eslint-disable @typescript-eslint/no-unused-vars */
import { type ValueFormatterParams } from "@ag-grid-community/core";

export const dateTimeFormatter = (params: ValueFormatterParams): string => {
  if (!params.value) return "";
  try {
    return new Date(params.value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    return "";
  }
};

export const dateFormatter = (params: ValueFormatterParams): string => {
  if (!params.value) return "";
  try {
    return new Date(params.value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "";
  }
};

export const formateDateTime = (params: string) => {
  return new Date(String(params)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const naFormatter = (params: ValueFormatterParams): string => {
  return params.value === null ||
    params.value === undefined ||
    params.value === "N/A"
    ? ""
    : params.value;
};