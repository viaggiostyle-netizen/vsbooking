export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(_req, res) {
  res.status(404).json({
    ok: false,
    code: "NOT_FOUND",
    message: "Recurso no encontrado",
  });
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode ?? 500;
  const code = error.code ?? "INTERNAL_ERROR";
  const message = error.message ?? "Error interno";

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  res.status(statusCode).json({
    ok: false,
    code,
    message,
    details: error.details ?? null,
  });
}

export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
