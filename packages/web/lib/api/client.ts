interface ApiResponse<T> {
  code: number;
  data: T | null;
  message: string;
}

export async function requestApiData<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.code !== 0 || payload.data === null) {
    throw new Error(payload.message);
  }

  return payload.data;
}
