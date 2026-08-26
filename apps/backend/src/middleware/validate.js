export const validateBody = (schema) => (req, res, next) => {
  const bodyToValidate = req.body || {};
  const result = schema.safeParse(bodyToValidate);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      errors: result.error.flatten().fieldErrors
    });
  }
  req.validatedBody = result.data;
  next();
};
