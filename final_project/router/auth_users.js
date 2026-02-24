const express = require("express");
const jwt = require("jsonwebtoken");
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

// returns true if username is NOT already taken
const isValid = (username) => {
  return !users.some((u) => u.username === username);
};

// returns true if username/password match records
const authenticatedUser = (username, password) => {
  return users.some((u) => u.username === username && u.password === password);
};

// only registered users can login
regd_users.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  if (!authenticatedUser(username, password)) {
    return res.status(401).json({ message: "Invalid login. Check username and password" });
  }

  // Must match the secret used in index.js auth middleware: jwt.verify(token, "access", ...)
  const accessToken = jwt.sign({ username }, "access", { expiresIn: "1h" });

  // Store token + username in session (index.js middleware reads this)
  req.session.authorization = {
    accessToken,
    username,
  };

  return res.status(200).json({ message: "Customer successfully logged in" });
});

// Add/Modify a book review (logged-in users only)
regd_users.put("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const review = req.query.review;
  const username = req.session?.authorization?.username;

  if (!username) return res.status(403).json({ message: "User not logged in" });
  if (!books[isbn]) return res.status(404).json({ message: "Book not found" });
  if (!review) return res.status(400).json({ message: "Review query is required" });

  if (!books[isbn].reviews) books[isbn].reviews = {};
  books[isbn].reviews[username] = review; // add or overwrite user's review

  return res.status(200).json({
    message: "Review added/updated successfully",
    reviews: books[isbn].reviews,
  });
});

// Delete a book review (user can delete only their own)
regd_users.delete("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const username = req.session?.authorization?.username;

  if (!username) return res.status(403).json({ message: "User not logged in" });
  if (!books[isbn]) return res.status(404).json({ message: "Book not found" });

  const reviews = books[isbn].reviews || {};
  if (!reviews[username]) {
    return res.status(404).json({ message: "No review by this user to delete" });
  }

  delete reviews[username];
  books[isbn].reviews = reviews;

  return res.status(200).json({
    message: "Review deleted successfully",
    reviews: books[isbn].reviews,
  });
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
module.exports.authenticatedUser = authenticatedUser;
