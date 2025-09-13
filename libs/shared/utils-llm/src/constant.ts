import assert from 'assert';

assert(process.env['OPEN_ROUTER_API_KEY'], 'OPEN_ROUTER_API_KEY not provided at utils-llm');

export const OPEN_ROUTER_API_KEY = process.env['OPEN_ROUTER_API_KEY'];
