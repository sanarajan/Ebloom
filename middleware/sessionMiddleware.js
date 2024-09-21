function sessionMiddleware(req, res, next) {
    // Attach session data to response locals
    res.locals.user = req.session.useremail || null;
    // You can add more session variables if needed
    res.locals.isAuthenticated = !!req.session.useremail;
    
    next();
  }
  
  module.exports = sessionMiddleware;
  