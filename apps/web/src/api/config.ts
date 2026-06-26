const defaultApiBaseUrl = "http://localhost:3000";

let apiBaseUrl = defaultApiBaseUrl;

export function configureApiBaseUrl(baseUrl: string | undefined): void {
  apiBaseUrl = baseUrl || defaultApiBaseUrl;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}
