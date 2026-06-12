export interface PreviewSessionResponse {
  id: string;
  root: string;
  url: string;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function toPreviewUrl(path: string): string {
  return `${apiUrl}${path}`;
}

export async function createPreviewSession(
  projectPath: string,
): Promise<PreviewSessionResponse> {
  const response = await fetch(`${apiUrl}/preview/session`, {
    body: JSON.stringify({ projectPath }),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    let message = 'Unable to start preview.';
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return (await response.json()) as PreviewSessionResponse;
}
