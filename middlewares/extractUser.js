import jwt from "jsonwebtoken";
export const extractUser = async (token) => {
  let verify = jwt.verify(token, process.env.SECRET_KEY);

  if (verify) {
    let res = jwt.decode(token, process.env.SECRET_KEY);
    return res;
  }
  return null;
};
