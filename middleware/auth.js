const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
     const authHeader = req.header('Authorization') || '';
     const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

     if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

     try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = decoded; // { userId: ... }
          next();
     } catch (err) {
          return res.status(401).json({ error: 'Token is not valid' });
     }
};
