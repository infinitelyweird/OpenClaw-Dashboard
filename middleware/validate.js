const { body, param, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required.').escape(),
  body('password').notEmpty().withMessage('Password is required.'),
  handleValidation
];

const registerRules = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters.').escape(),
  body('email').trim().isEmail().withMessage('Valid email required.').normalizeEmail()
    .custom(val => val.endsWith('@infinitelyweird.com') ? true : Promise.reject('Must use @infinitelyweird.com email.')),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password needs an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password needs a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password needs a number.')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password needs a special character.'),
  handleValidation
];

const profileUpdateRules = [
  body('displayName').optional().trim().isLength({ max: 100 }).escape(),
  body('bio').optional().trim().isLength({ max: 500 }).escape(),
  body('phone').optional().trim().isLength({ max: 20 }).escape(),
  body('location').optional().trim().isLength({ max: 100 }).escape(),
  body('jobTitle').optional().trim().isLength({ max: 100 }).escape(),
  body('department').optional().trim().isLength({ max: 100 }).escape(),
  handleValidation
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .matches(/[A-Z]/).withMessage('Password needs an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password needs a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password needs a number.')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password needs a special character.')
    .custom((value, { req }) => {
      const minLen = req.user && req.user.isAdmin ? 13 : 8;
      if (value.length < minLen) {
        throw new Error(`Password must be at least ${minLen} characters${req.user && req.user.isAdmin ? ' (Administrator requirement)' : ''}.`);
      }
      return true;
    }),
  handleValidation
];

const taskRules = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 200 }).escape(),
  body('description').optional().trim().isLength({ max: 2000 }).escape(),
  body('status').optional().isIn(['Pending', 'In Progress', 'Completed', 'Cancelled']).withMessage('Invalid status.'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority.'),
  handleValidation
];

const idParam = [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID.'),
  handleValidation
];

module.exports = { loginRules, registerRules, profileUpdateRules, changePasswordRules, taskRules, idParam, handleValidation };
