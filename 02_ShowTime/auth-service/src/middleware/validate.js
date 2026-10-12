export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const errors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      return res.status(400).json({ success: false, data: null, error: errors.join("; ") });
    }

    req.body = result.data;
    next();
  };
}
