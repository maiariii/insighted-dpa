export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
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
