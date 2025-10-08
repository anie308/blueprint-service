import Joi from 'joi';

// Common validation patterns
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const urlPattern = /^https?:\/\/.+/;
const usernamePattern = /^[a-zA-Z0-9_]+$/;
const slugPattern = /^[a-z0-9-]+$/;

// User validation schemas
export const userValidation = {
  register: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(usernamePattern)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
      }),
    email: Joi.string()
      .email()
      .required(),
    password: Joi.string()
      .min(6)
      .max(128)
      .required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords must match'
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required(),
    password: Joi.string()
      .required()
  }),

  updateProfile: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(usernamePattern)
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
      }),
    bio: Joi.string()
      .max(500)
      .allow('', null),
    location: Joi.string()
      .max(100)
      .allow('', null),
    website: Joi.string()
      .pattern(urlPattern)
      .allow('', null)
      .messages({
        'string.pattern.base': 'Website must be a valid URL'
      }),
    socialLinks: Joi.array()
      .items(Joi.string().pattern(urlPattern))
      .max(10)
      .messages({
        'array.max': 'Maximum 10 social links allowed',
        'string.pattern.base': 'Social links must be valid URLs'
      })
  })
};

// Studio validation schemas
export const studioValidation = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required(),
    // slug: Joi.string()
    //   .min(2)
    //   .max(100)
    //   .pattern(slugPattern)
    //   .messages({
    //     'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens'
    //   }),
    description: Joi.string()
      .min(10)
      .max(1000)
      .required(),
    category: Joi.string()
      .max(100)
      .required(),
    isPrivate: Joi.boolean()
      .required(),
    studioRules: Joi.string()
      .max(1000)
      .required()
  }),

  update: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100),
    description: Joi.string()
      .min(10)
      .max(1000),
    location: Joi.string()
      .max(100),
    website: Joi.string()
      .pattern(urlPattern)
      .allow('', null)
      .messages({
        'string.pattern.base': 'Website must be a valid URL'
      })
  })
};

// Project validation schemas
export const projectValidation = {
  create: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200)
      .required(),
    description: Joi.string()
      .min(10)
      .max(5000)
      .required(),
    coverImageUrl: Joi.string()
      .required(),
    mediaUrls: Joi.array()
      .items(Joi.string())
      .max(20)
      .messages({
        'array.max': 'Maximum 20 media files allowed'
      }),
    authorType: Joi.string()
      .valid('User', 'Studio')
      .required(),
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(20)
      .messages({
        'array.max': 'Maximum 20 tags allowed'
      })
  }),

  update: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200),
    description: Joi.string()
      .min(10)
      .max(5000),
    mediaUrls: Joi.array()
      .items(Joi.string())
      .max(20),
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(20)
  })
};

// Post validation schemas
export const postValidation = {
  create: Joi.object({
    content: Joi.string()
      .min(1)
      .max(2000)
      .required(),
    mediaUrl: Joi.string()
      .allow('', null)
  }),

  update: Joi.object({
    content: Joi.string()
      .min(1)
      .max(2000)
  })
};

// Reel validation schemas
export const reelValidation = {
  create: Joi.object({
    title: Joi.string()
      .max(200)
      .allow('', null),
    videoUrl: Joi.string()
      .required(),
    thumbnailUrl: Joi.string()
      .required(),
    description: Joi.string()
      .max(1000)
      .allow('', null)
  }),

  update: Joi.object({
    title: Joi.string()
      .max(200)
      .allow('', null),
    description: Joi.string()
      .max(1000)
      .allow('', null)
  })
};

// Job validation schemas
export const jobValidation = {
  create: Joi.object({
    title: Joi.string()
      .min(5)
      .max(200)
      .required(),
    description: Joi.string()
      .min(50)
      .max(10000)
      .required(),
    location: Joi.string()
      .max(100)
      .required(),
    salaryRange: Joi.string()
      .max(100)
      .required(),
    jobType: Joi.string()
      .valid('full-time', 'part-time', 'contract', 'freelance')
      .required(),
    postedByType: Joi.string()
      .valid('User', 'Studio')
      .required(),
    applicationLink: Joi.string()
      .pattern(urlPattern)
      .allow('', null)
      .messages({
        'string.pattern.base': 'Application link must be a valid URL'
      }),
    expiresAt: Joi.date()
      .greater('now')
      .messages({
        'date.greater': 'Expiry date must be in the future'
      })
  }),

  update: Joi.object({
    title: Joi.string()
      .min(5)
      .max(200),
    description: Joi.string()
      .min(50)
      .max(10000),
    location: Joi.string()
      .max(100),
    salaryRange: Joi.string()
      .max(100),
    jobType: Joi.string()
      .valid('full-time', 'part-time', 'contract', 'freelance'),
    applicationLink: Joi.string()
      .pattern(urlPattern)
      .allow('', null),
    expiresAt: Joi.date()
      .greater('now')
  })
};

// Comment validation schemas
export const commentValidation = {
  create: Joi.object({
    content: Joi.string()
      .min(1)
      .max(1000)
      .required(),
    parentId: Joi.string()
      .pattern(objectIdPattern)
      .allow(null)
      .messages({
        'string.pattern.base': 'Invalid parent comment ID'
      }),
    entityId: Joi.string()
      .pattern(objectIdPattern)
      .required()
      .messages({
        'string.pattern.base': 'Invalid entity ID'
      }),
    entityType: Joi.string()
      .valid('Project', 'Post', 'Reel')
      .required()
  })
};

// Message validation schemas
export const messageValidation = {
  create: Joi.object({
    content: Joi.string()
      .min(1)
      .max(1000)
      .required()
  })
};

// Query parameter validation schemas
export const queryValidation = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),
    sort: Joi.string()
      .valid('newest', 'oldest', 'popular', 'views')
      .default('newest')
  }),

  search: Joi.object({
    q: Joi.string()
      .min(1)
      .max(100),
    tags: Joi.string(),
    location: Joi.string(),
    jobType: Joi.string()
      .valid('full-time', 'part-time', 'contract', 'freelance')
  })
};

// Generic validation schemas
export const genericValidation = {
  objectId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format'
    }),

  like: Joi.object({
    entityId: Joi.string()
      .pattern(objectIdPattern)
      .required(),
    entityType: Joi.string()
      .valid('Project', 'Post', 'Reel')
      .required()
  }),

  save: Joi.object({
    entityId: Joi.string()
      .pattern(objectIdPattern)
      .required(),
    entityType: Joi.string()
      .valid('Project', 'Post', 'Reel', 'Job')
      .required()
  })
};