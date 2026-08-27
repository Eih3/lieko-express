'use strict';

class ValidationError extends Error {
    constructor(errors) {
        super('Validation failed');
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

class Schema {
    constructor(rules) {
        this.rules = rules;
        this.fields = rules;
    }

    validate(data) {
        const errors = [];
        for (const [field, validators] of Object.entries(this.rules)) {
            const value = data[field];
            for (const validator of validators) {
                const error = validator(value, field, data);
                if (error) {
                    errors.push(error);
                    break;
                }
            }
        }
        if (errors.length > 0) throw new ValidationError(errors);
        return true;
    }
}

const validators = {
    required: (message = 'Field is required') => {
        return (value, field) => {
            if (value === undefined || value === null || value === '') {
                return { field, message, type: 'required' };
            }
            return null;
        };
    },

    requiredTrue: (message = 'Field must be true') => {
        return (value, field) => {
            const normalized = value === true || value === 'true' || value === '1' || value === 1;
            if (!normalized) {
                return { field, message, type: 'requiredTrue' };
            }
            return null;
        }
    },

    optional: () => {
        return () => null;
    },

    string: (message = 'Field must be a string') => {
        return (value, field) => {
            if (value !== undefined && typeof value !== 'string') {
                return { field, message, type: 'string' };
            }
            return null;
        };
    },

    number: (message = 'Field must be a number') => {
        return (value, field) => {
            if (value !== undefined && typeof value !== 'number') {
                return { field, message, type: 'number' };
            }
            return null;
        };
    },

    boolean: (message = 'Field must be a boolean') => {
        return (value, field) => {
            if (value === undefined || value === null || value === '') return null;

            const validTrue = ['true', true, 1, '1'];
            const validFalse = ['false', false, 0, '0'];

            const isValid = validTrue.includes(value) || validFalse.includes(value);

            if (!isValid) {
                return { field, message, type: 'boolean' };
            }

            return null;
        };
    },

    integer: (message = 'Field must be an integer') => {
        return (value, field) => {
            if (value !== undefined && !Number.isInteger(value)) {
                return { field, message, type: 'integer' };
            }
            return null;
        };
    },

    positive: (message = 'Field must be positive') => {
        return (value, field) => {
            if (value !== undefined && value <= 0) {
                return { field, message, type: 'positive' };
            }
            return null;
        };
    },

    negative: (message = 'Field must be negative') => {
        return (value, field) => {
            if (value !== undefined && value >= 0) {
                return { field, message, type: 'negative' };
            }
            return null;
        };
    },

    email: (message = 'Invalid email format') => {
        return (value, field) => {
            if (value !== undefined && value !== null) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    return { field, message, type: 'email' };
                }
            }
            return null;
        };
    },

    min: (minValue, message) => {
        return (value, field) => {
            if (value !== undefined && value !== null) {
                if (typeof value === 'string' && value.length < minValue) {
                    return {
                        field,
                        message: message || `Field must be at least ${minValue} characters`,
                        type: 'min'
                    };
                }
                if (typeof value === 'number' && value < minValue) {
                    return {
                        field,
                        message: message || `Field must be at least ${minValue}`,
                        type: 'min'
                    };
                }
            }
            return null;
        };
    },

    max: (maxValue, message) => {
        return (value, field) => {
            if (value !== undefined && value !== null) {
                if (typeof value === 'string' && value.length > maxValue) {
                    return {
                        field,
                        message: message || `Field must be at most ${maxValue} characters`,
                        type: 'max'
                    };
                }
                if (typeof value === 'number' && value > maxValue) {
                    return {
                        field,
                        message: message || `Field must be at most ${maxValue}`,
                        type: 'max'
                    };
                }
            }
            return null;
        };
    },

    length: (n, message) => {
        return (value, field) => {
            if (typeof value === 'string' && value.length !== n) {
                return {
                    field,
                    message: message || `Field must be exactly ${n} characters`,
                    type: 'length'
                };
            }
            return null;
        };
    },

    minLength: (minLength, message) => {
        return (value, field) => {
            if (value !== undefined && value !== null && typeof value === 'string') {
                if (value.length < minLength) {
                    return {
                        field,
                        message: message || `Field must be at least ${minLength} characters`,
                        type: 'minLength'
                    };
                }
            }
            return null;
        };
    },

    maxLength: (maxLength, message) => {
        return (value, field) => {
            if (value !== undefined && value !== null && typeof value === 'string') {
                if (value.length > maxLength) {
                    return {
                        field,
                        message: message || `Field must be at most ${maxLength} characters`,
                        type: 'maxLength'
                    };
                }
            }
            return null;
        };
    },

    pattern: (regex, message = 'Invalid format') => {
        return (value, field) => {
            if (value !== undefined && value !== null && typeof value === 'string') {
                if (!regex.test(value)) {
                    return { field, message, type: 'pattern' };
                }
            }
            return null;
        };
    },

    oneOf: (allowedValues, message) => {
        return (value, field) => {
            if (value !== undefined && value !== null) {
                if (!allowedValues.includes(value)) {
                    return {
                        field,
                        message: message || `Field must be one of: ${allowedValues.join(', ')}`,
                        type: 'oneOf'
                    };
                }
            }
            return null;
        };
    },

    notOneOf: (values, message) => {
        return (value, field) => {
            if (values.includes(value)) {
                return {
                    field,
                    message: message || `Field cannot be one of: ${values.join(', ')}`,
                    type: 'notOneOf'
                };
            }
            return null;
        };
    },

    custom: (validatorFn, message = 'Validation failed') => {
        return (value, field, data) => {
            const isValid = validatorFn(value, data);
            if (!isValid) {
                return { field, message, type: 'custom' };
            }
            return null;
        };
    },

    equal: (expectedValue, message) => {
        return (value, field) => {
            if (value !== expectedValue) {
                return {
                    field,
                    message: message || `Field must be equal to ${expectedValue}`,
                    type: 'equal'
                };
            }
            return null;
        };
    },

    mustBeTrue: (message = 'This field must be accepted') => {
        return (value, field) => {
            const normalized = value === true || value === 'true' || value === '1' || value === 1;
            if (!normalized) {
                return { field, message, type: 'mustBeTrue' };
            }
            return null;
        };
    },

    mustBeFalse: (message = 'This field must be declined') => {
        return (value, field) => {
            const normalized = value === false || value === 'false' || value === '0' || value === 0;
            if (!normalized) {
                return { field, message, type: 'mustBeFalse' };
            }
            return null;
        };
    },

    date: (message = 'Invalid date') => {
        return (value, field) => {
            if (!value) return null;
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return { field, message, type: 'date' };
            }
            return null;
        };
    },

    before: (limit, message) => {
        return (value, field) => {
            if (!value) return null;
            const d1 = new Date(value);
            const d2 = new Date(limit);
            if (isNaN(d1) || d1 >= d2) {
                return {
                    field,
                    message: message || `Date must be before ${limit}`,
                    type: 'before'
                };
            }
            return null;
        };
    },

    after: (limit, message) => {
        return (value, field) => {
            if (!value) return null;
            const d1 = new Date(value);
            const d2 = new Date(limit);
            if (isNaN(d1) || d1 <= d2) {
                return {
                    field,
                    message: message || `Date must be after ${limit}`,
                    type: 'after'
                };
            }
            return null;
        };
    },

    startsWith: (prefix, message) => {
        return (value, field) => {
            if (typeof value === 'string' && !value.startsWith(prefix)) {
                return {
                    field,
                    message: message || `Field must start with "${prefix}"`,
                    type: 'startsWith'
                };
            }
            return null;
        };
    },

    endsWith: (suffix, message) => {
        return (value, field) => {
            if (typeof value === 'string' && !value.endsWith(suffix)) {
                return {
                    field,
                    message: message || `Field must end with "${suffix}"`,
                    type: 'endsWith'
                };
            }
            return null;
        };
    }
};

function validate(schema) {
    return (req, res, next) => {
        try {
            schema.validate(req.body);
            next();
        } catch (err) {
            if (err instanceof ValidationError) {
                return res.status(400).json({ error: { status: 400, type: "VALIDATION_ERROR", message: 'Validation failed', details: err.errors } });
            }
            throw err;
        }
    };
}

function validatePartial(schema) {
    const partial = {};

    for (const field in schema.fields) {
        const rules = schema.fields[field];

        const filtered = rules.filter(v =>
            v.name !== 'required' &&
            v.name !== 'requiredTrue' &&
            v.name !== 'mustBeTrue'
        );
        partial[field] = [validators.optional(), ...filtered];
    }

    return new Schema(partial);
}

module.exports = {
    Schema,
    ValidationError,
    validators,
    validate,
    validatePartial,

    schema: (...args) => new Schema(...args),
    v: validators,
    validator: validators,
    middleware: {
        validate,
        validatePartial
    }
};
