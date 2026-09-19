export type ApiErrorBody = {
  error: string;
  statusCode: number;
  code?: string;
};

export function errorBody(message: string, statusCode: number, code?: string): ApiErrorBody {
  return { error: message, statusCode, ...(code ? { code } : {}) };
}
