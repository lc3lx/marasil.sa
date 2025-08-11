// @desc creat middleware catch error if rules was wrong
const { validationResult } = require("express-validator");

const validatormiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

module.exports = validatormiddleware;
