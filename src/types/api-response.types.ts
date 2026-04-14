export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface OrangeHRMListResponse<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number };
}

export interface OrangeHRMSingleResponse<T> {
  data: T;
}
