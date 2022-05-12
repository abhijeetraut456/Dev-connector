const config = require('config');
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('x-auth-token');

  //check if not
  if (!token) {
    return res.status(401).json({ msg: 'No token, Authorization denied' });
  }

  // verify jwt
  try {
    jwt.verify(token, config.get('jwtSecret'), (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: 'Token in not valid' });
      } else {
        req.user = decoded.user;
        next();
      }
    });
  } catch (err) {
    console.error('Something goes wrong in our auth middleware');
    res.status(500).send('Server Error');
  }
};
