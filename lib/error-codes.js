'use strict';

const ERROR_CODES = {
    BAD_REQUEST: { status: 400, code: 'BAD_REQUEST', message: 'Invalid request' },
    UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED', message: 'Authentication is missing or invalid' },
    FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: 'Forbidden access' },
    NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: 'Not found' },
    METHOD_NOT_ALLOWED: { status: 405, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
    CONFLICT: { status: 409, code: 'CONFLICT', message: 'Resource already exists' },
    PAYLOAD_TOO_LARGE: { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Payload too large' },
    UNPROCESSABLE_ENTITY: { status: 422, code: 'UNPROCESSABLE_ENTITY', message: 'Unprocessable entity' },
    TOO_MANY_REQUESTS: { status: 429, code: 'TOO_MANY_REQUESTS', message: 'Too many requests' },
    INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    SERVICE_UNAVAILABLE: { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' },

    VALIDATION_FAILED: { status: 400, code: 'VALIDATION_FAILED', message: 'Validation failed' },
    INVALID_JSON: { status: 400, code: 'INVALID_JSON', message: 'Invalid JSON body' }
};

for (const entry of Object.values(ERROR_CODES)) Object.freeze(entry);

module.exports = Object.freeze(ERROR_CODES);