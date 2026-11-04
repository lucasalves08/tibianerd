import type { APIRoute } from 'astro';
import { createAuth } from '../../../lib/auth';

export const prerender = false;

export const ALL: APIRoute = ({ request }) => createAuth().handler(request);
