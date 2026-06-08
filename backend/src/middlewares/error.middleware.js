const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log lỗi ra console server để debug
  console.error('ERROR 💥', err);
  // Trả về response chuẩn
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

export { globalErrorHandler };