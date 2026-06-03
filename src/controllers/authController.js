const authService = require("../services/authService");

exports.register = async (req, res) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.message === "An account with this email already exists.") {
      return res.status(409).json({ error: err.message });
    }
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const tokens = await authService.login(email, password);
    
    res.cookie("access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: tokens });
  } catch (err) {
    if (err.message === "Invalid credentials") return res.status(400).json({ success: false, error: err.message });
    if (err.message.includes("pending approval") || err.message.includes("inactive")) {
      return res.status(403).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.logout = (req, res) => {
  const refresh_token = req.cookies.refresh_token || req.body.refresh_token;
  authService.logout(refresh_token);
  
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.json({ success: true, data: { message: "Logged out" } });
};

exports.refresh = async (req, res) => {
  try {
    const refresh_token = req.cookies.refresh_token || req.body.refresh_token;
    const tokens = await authService.refresh(refresh_token);
    
    res.cookie("access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { access_token: tokens.access_token } });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
};

exports.profile = async (req, res) => {
  try {
    const data = await authService.getProfile(req.user._id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === "User not found") return res.status(404).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};
