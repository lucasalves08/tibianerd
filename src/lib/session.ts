import { createAuth } from './auth';

export const getUserId = async (request: Request): Promise<string | null> => {
  const session = await createAuth().api.getSession({
    headers: request.headers,
  });

  return session?.user.id ?? null;
};

export const errorResponse = (code: string, status: number) =>
  Response.json({ error: code }, { status });
