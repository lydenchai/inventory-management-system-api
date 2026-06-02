module.exports = function (requiredPermission) {
  return (req, res, next) => {
    const user = req.user;
    let perms = [];
    if (user && user.permission) {
      if (Array.isArray(user.permission.permissions)) {
        perms = user.permission.permissions;
      } else if (typeof user.permission.permissions === "string") {
        try {
          perms = JSON.parse(user.permission.permissions);
        } catch (e) {
          perms = [];
        }
      }
    }
    if (!user || !perms.includes(requiredPermission)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    next();
  };
};
