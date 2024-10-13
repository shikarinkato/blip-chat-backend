const ErrorHandler = (res, error) => {
  const errorMessages = {
    400: error.message || "Bad Request! We can't understand your request.",
    401: error.message || "Unauthorized! You don't have permission for this.",
    403: error.message || "Server is not responding on this request.",
    404:
      error.message || "Sorry, we're unable to find what you're looking for.",
    408: error.message || "Request Time Out! It's taking too much time.",
    429:
      error.message ||
      "Too Many Requests. Please wait for some time before trying again.",
    501:
      error.message ||
      "Not Implemented! The server does not support this operation.",
    502: error.message || "Bad Gateway! Server didn't respond to this request.",
  };

  const message = errorMessages[error.code] || "Internal Server Error.";
  const statusCode = error.code || 500;
  console.log(error.name);

  return res.status(statusCode).json({ message, success: false });
};

export default ErrorHandler;
