import jwt from "jsonwebtoken";
import UserSchema from "../models/UserSchema.js";
import ErrorHandler from "../middlewares/ErrorHandler.js";

const AuthHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return ErrorHandler(res, {
      code: 401,
      message: "No token provided or invalid token format",
    });
  }

  const token = authHeader.split(" ")[1];


  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    const user = await UserSchema.findById(decoded.id).select("-password");

    if (!user) {
      return ErrorHandler(res, {
        code: 404,
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return ErrorHandler(res, {
        code: 403,
        message: "Token has expired",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return ErrorHandler(res, {
        code: 403,
        message: error.message,
      });
    }
    console.log(error.name);
    ErrorHandler(res, error);
  }
};

export default AuthHandler;
